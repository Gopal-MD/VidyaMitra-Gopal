/**
 * AWS Usage & Cost Tracking Routes
 *
 * Active AWS services: Rekognition, SSM Parameter Store, S3, Lambda.
 *
 * Endpoints:
 *   GET /api/aws/usage        - usage snapshot for active services
 *   GET /api/aws/health       - quick connectivity check per service
 */

import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { RekognitionClient, DescribeCollectionCommand } from '@aws-sdk/client-rekognition';
import { SSMClient, DescribeParametersCommand } from '@aws-sdk/client-ssm';
import { S3Client, HeadBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { getUsageStats } from './awsUsageCounter';

//  Helpers 

function makeAwsCreds(env: Record<string, string>) {
  return {
    accessKeyId:     env.AWS_ACCESS_KEY_ID     || process.env.AWS_ACCESS_KEY_ID     || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken:    env.AWS_SESSION_TOKEN     || process.env.AWS_SESSION_TOKEN     || undefined,
  };
}

function getRegion(env: Record<string, string>) {
  return env.AWS_REGION || process.env.AWS_REGION || 'us-east-1';
}

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// -- CloudWatch metric helper -------------------------------------------------

async function cwMetricSum(
  creds: ReturnType<typeof makeAwsCreds>,
  region: string,
  namespace: string,
  metricName: string,
  dimensions: { Name: string; Value: string }[],
  stat: 'Sum' | 'Maximum' = 'Sum',
): Promise<number> {
  try {
    const cw = new CloudWatchClient({ region, credentials: creds });
    const start = monthStart();
    const end = new Date();
    if (end.getTime() - start.getTime() < 60_000) return 0; // too close to month boundary

    const res = await cw.send(new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: metricName,
      Dimensions: dimensions,
      StartTime: start,
      EndTime: end,
      Period: 86400,      // 1-day buckets
      Statistics: [stat],
    }));
    const points = res.Datapoints ?? [];
    if (stat === 'Maximum') {
      // Take the most recent maximum (for billing metrics)
      const sorted = [...points].sort((a, b) => (b.Timestamp?.getTime() ?? 0) - (a.Timestamp?.getTime() ?? 0));
      return sorted[0]?.Maximum ?? 0;
    }
    return points.reduce((s, d) => s + (d.Sum ?? 0), 0);
  } catch {
    return 0;
  }
}

// -- Multi-strategy cost fetching ---------------------------------------------
// Priority:
//   1. CloudWatch AWS/Billing EstimatedCharges (real charges, if billing alerts enabled)
//   2. Cost Explorer (non-Learner-Lab accounts only)
//   3. Detailed per-service CloudWatch metrics + price calculation
//   4. S3: exact size from bucket listing (always available)

const CE_SERVICE_MAP: Record<string, string> = {
  'Amazon Simple Storage Service':          's3',
  'AWS Lambda':                             'lambda',
  'Amazon Rekognition':                     'rekognition',
  'AWS Systems Manager':                    'ssm',
  'AWS Secrets Manager':                    'secretsManager',
  'Amazon Simple Notification Service':     'sns',
  'Amazon Simple Email Service':            'ses',
};

// Strategy 1: CloudWatch AWS/Billing (updated daily, works if billing alerts enabled)
async function getBillingFromCloudWatch(env: Record<string, string>): Promise<Record<string, number> | null> {
  const creds = makeAwsCreds(env);
  if (!creds.accessKeyId) return null;

  // Billing metrics are always in us-east-1
  const total = await cwMetricSum(creds, 'us-east-1', 'AWS/Billing', 'EstimatedCharges',
    [{ Name: 'Currency', Value: 'USD' }], 'Maximum');

  if (total === 0) return null; // billing alerts disabled or no charges yet

  const costs: Record<string, number> = { total };

  const serviceNames: Record<string, string> = {
    'Amazon Simple Storage Service': 's3',
    'AWS Lambda': 'lambda',
    'Amazon Rekognition': 'rekognition',
    'AWS Systems Manager': 'ssm',
    'Amazon Simple Notification Service': 'sns',
    'Amazon Simple Email Service': 'ses',
  };
  for (const [awsName, key] of Object.entries(serviceNames)) {
    const cost = await cwMetricSum(creds, 'us-east-1', 'AWS/Billing', 'EstimatedCharges', [
      { Name: 'Currency', Value: 'USD' },
      { Name: 'ServiceName', Value: awsName },
    ], 'Maximum');
    costs[key] = cost;
  }
  return costs;
}

// Strategy 2: Cost Explorer (blocked in Learner Lab — silently returns null)
async function getBillingFromCostExplorer(env: Record<string, string>): Promise<Record<string, number> | null> {
  const creds = makeAwsCreds(env);
  if (!creds.accessKeyId) return null;
  try {
    const ce = new CostExplorerClient({ region: 'us-east-1', credentials: creds });
    const now = new Date();
    const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate = now.toISOString().split('T')[0];
    if (startDate === endDate) return null;

    const result = await ce.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }));
    const costs: Record<string, number> = {};
    let totalCost = 0;
    for (const group of result.ResultsByTime?.[0]?.Groups ?? []) {
      const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0');
      const key = CE_SERVICE_MAP[group.Keys?.[0] ?? ''];
      if (key) costs[key] = (costs[key] ?? 0) + amount;
      totalCost += amount;
    }
    if (totalCost === 0) return null;
    costs['total'] = totalCost;
    return costs;
  } catch {
    return null;
  }
}

// Strategy 3: Per-service CloudWatch usage metrics + AWS pricing calculation
// This works in Learner Lab — these are operational metrics, not billing metrics.
interface CWUsageMetrics {
  // Lambda
  lambdaInvocations: number;
  lambdaDurationMs: number;      // Sum of Duration (ms) for the month
  // Rekognition
  rekognitionRequests: number;
  // S3 request metrics (CloudWatch, best-effort)
  s3GetRequests: number;
  s3PutRequests: number;
}

async function getPerServiceCWMetrics(
  env: Record<string, string>,
  functionName: string,
): Promise<CWUsageMetrics> {
  const creds = makeAwsCreds(env);
  const region = getRegion(env);
  const bucketName = env.S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'vidyamitra-uploads-629496';

  const [lambdaInvocations, lambdaDurationMs, rekognitionRequests, s3GetRequests, s3PutRequests] = await Promise.all([
    cwMetricSum(creds, region, 'AWS/Lambda', 'Invocations', [{ Name: 'FunctionName', Value: functionName }]),
    cwMetricSum(creds, region, 'AWS/Lambda', 'Duration',    [{ Name: 'FunctionName', Value: functionName }]),
    // Rekognition: Number of successful API calls
    cwMetricSum(creds, region, 'AWS/Rekognition', 'SuccessfulRequestCount', []),
    // S3 request metrics (available if request metrics enabled on bucket — best effort)
    cwMetricSum(creds, region, 'AWS/S3', 'GetRequests', [
      { Name: 'BucketName', Value: bucketName },
      { Name: 'FilterId', Value: 'EntireBucket' },
    ]),
    cwMetricSum(creds, region, 'AWS/S3', 'PutRequests', [
      { Name: 'BucketName', Value: bucketName },
      { Name: 'FilterId', Value: 'EntireBucket' },
    ]),
  ]);

  return { lambdaInvocations, lambdaDurationMs, rekognitionRequests, s3GetRequests, s3PutRequests };
}

function computeLambdaCost(invocations: number, durationMs: number, memoryMB: number): number {
  const FREE_REQUESTS = 1_000_000;
  const FREE_GB_SECONDS = 400_000;
  const gbSeconds = (durationMs / 1000) * (memoryMB / 1024);
  const requestCost = Math.max(0, invocations - FREE_REQUESTS) * 0.0000002;
  const durationCost = Math.max(0, gbSeconds - FREE_GB_SECONDS) * 0.0000166667;
  return requestCost + durationCost;
}

function computeRekognitionCost(requests: number, inMemoryCount: number): number {
  const total = Math.max(requests, inMemoryCount); // use whichever is higher
  return Math.max(0, total - 1_000) * 0.001;      // first 1,000/month free
}

function computeS3Cost(totalSizeBytes: number, cwGetRequests: number, cwPutRequests: number, sessionCounters: ReturnType<typeof getUsageStats>): number {
  const totalSizeGB = totalSizeBytes / (1024 ** 3);
  const storageCost = Math.max(0, totalSizeGB - 5) * 0.023; // first 5 GB free

  // Use CloudWatch metrics if available, else fall back to in-memory counters
  const getReqs  = cwGetRequests  > 0 ? cwGetRequests  : sessionCounters.s3Download + sessionCounters.s3List;
  const putReqs  = cwPutRequests  > 0 ? cwPutRequests  : sessionCounters.s3Upload;
  const getCost  = Math.max(0, getReqs  - 20_000) * 0.0000004;
  const putCost  = Math.max(0, putReqs  -  2_000) * 0.000005;
  return storageCost + getCost + putCost;
}

// Master function: tries all strategies in priority order
async function fetchCostData(env: Record<string, string>, functionName: string): Promise<{
  billedCosts: Record<string, number> | null;
  cwMetrics: CWUsageMetrics;
  costSource: string;
}> {
  // Run billing strategies and CW metrics in parallel
  const [cwBilling, ceCosts, cwMetrics] = await Promise.all([
    getBillingFromCloudWatch(env),
    getBillingFromCostExplorer(env),
    getPerServiceCWMetrics(env, functionName),
  ]);

  if (cwBilling) {
    return { billedCosts: cwBilling, cwMetrics, costSource: 'CloudWatch Billing Metrics (actual charges, updated daily)' };
  }
  if (ceCosts) {
    return { billedCosts: ceCosts, cwMetrics, costSource: 'AWS Cost Explorer (actual billed)' };
  }
  return { billedCosts: null, cwMetrics, costSource: 'CloudWatch Usage Metrics + AWS Pricing (Learner Lab)' };
}

// -- Rekognition Stats --------------------------------------------------------

async function getRekognitionStats(
  env: Record<string, string>,
  billedCosts: Record<string, number> | null,
  cwMetrics: CWUsageMetrics,
  costSource: string,
) {
  const creds = makeAwsCreds(env);
  const region = getRegion(env);
  const collectionId = env.REKOGNITION_COLLECTION_ID || process.env.REKOGNITION_COLLECTION_ID || '';

  if (!creds.accessKeyId) return null;

  const rekognition = new RekognitionClient({ region, credentials: creds });
  const sessionCounter = getUsageStats().rekognitionAnalysis;

  try {
    let faceCount = 0;
    if (collectionId) {
      const desc = await rekognition.send(new DescribeCollectionCommand({ CollectionId: collectionId }));
      faceCount = desc.FaceCount ?? 0;
    }

    const monthlyCostEstimate = billedCosts?.rekognition
      ?? computeRekognitionCost(cwMetrics.rekognitionRequests, sessionCounter);

    const requestCount = Math.max(cwMetrics.rekognitionRequests, sessionCounter);

    return {
      service: 'Rekognition',
      status: 'ok' as const,
      region,
      collectionId: collectionId || 'not configured',
      faceCount,
      requestCount,
      costs: {
        monthlyCostEstimate,
        costSource,
        freeTierNote: 'First 1,000 face analyses/month free. $0.001 per 1,000 images after that.',
      },
    };
  } catch (err: any) {
    return {
      service: 'Rekognition',
      status: 'error' as const,
      error: err?.message || 'Failed to fetch Rekognition stats',
      region,
      collectionId: collectionId || 'not configured',
    };
  }
}

// -- SSM Parameter Store Stats ------------------------------------------------

async function getSSMStats(
  env: Record<string, string>,
  billedCosts: Record<string, number> | null,
  costSource: string,
) {
  const creds = makeAwsCreds(env);
  const region = getRegion(env);

  if (!creds.accessKeyId) return null;

  const ssm = new SSMClient({ region, credentials: creds });

  try {
    const resp = await ssm.send(new DescribeParametersCommand({ MaxResults: 50 }));
    const paramCount = resp.Parameters?.length ?? 0;
    // Standard SSM parameters are always free; Advanced parameters cost $0.05/param/month
    const monthlyCostEstimate = billedCosts?.ssm ?? 0;
    return {
      service: 'SSM Parameter Store',
      status: 'ok' as const,
      region,
      parameterCount: paramCount,
      costs: {
        monthlyCostEstimate,
        costSource: billedCosts?.ssm !== undefined ? costSource : 'Standard params are FREE',
        freeTierNote: 'Standard parameters are FREE (up to 10,000 parameters, unlimited API calls).',
      },
    };
  } catch (err: any) {
    return {
      service: 'SSM Parameter Store',
      status: 'error' as const,
      error: err?.message || 'Failed to fetch SSM stats',
      region,
    };
  }
}

// -- S3 Stats -----------------------------------------------------------------

function getLambdaFunctionName(env: Record<string, string>): string {
  const apiUrl = env.AWS_LAMBDA_RESUME_API || process.env.AWS_LAMBDA_RESUME_API || '';
  if (apiUrl) {
    const parts = apiUrl.split('/').filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return 'vidyamitra-textract-resume';
}

async function getS3Stats(
  env: Record<string, string>,
  billedCosts: Record<string, number> | null,
  cwMetrics: CWUsageMetrics,
  costSource: string,
) {
  const creds = makeAwsCreds(env);
  const region = getRegion(env);
  const bucketName = env.S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'vidyamitra-uploads-629496';

  if (!creds.accessKeyId) return null;

  const s3 = new S3Client({ region, credentials: creds });
  const counters = getUsageStats();

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));

    const folders = ['resumes/', 'profile-pictures/', 'institution-logos/', 'exports/'];
    let totalFiles = 0;
    let totalSizeBytes = 0;
    const folderStats: Record<string, { count: number; sizeBytes: number }> = {};

    for (const folder of folders) {
      const result = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: folder }));
      const files = (result.Contents || []).filter(o => !o.Key?.endsWith('/'));
      const size = files.reduce((sum, o) => sum + (o.Size || 0), 0);
      folderStats[folder.replace('/', '')] = { count: files.length, sizeBytes: size };
      totalFiles += files.length;
      totalSizeBytes += size;
    }

    const monthlyCostEstimate = billedCosts?.s3
      ?? computeS3Cost(totalSizeBytes, cwMetrics.s3GetRequests, cwMetrics.s3PutRequests, counters);

    const getReqs = cwMetrics.s3GetRequests > 0 ? cwMetrics.s3GetRequests : counters.s3Download + counters.s3List;
    const putReqs = cwMetrics.s3PutRequests > 0 ? cwMetrics.s3PutRequests : counters.s3Upload;

    return {
      service: 'S3',
      status: 'ok' as const,
      region,
      bucketName,
      totalFiles,
      totalSizeBytes,
      folderStats,
      apiCalls: {
        uploads: counters.s3Upload,
        downloads: counters.s3Download,
        deletes: counters.s3Delete,
        lists: counters.s3List,
        cwGetRequests: getReqs,
        cwPutRequests: putReqs,
      },
      costs: {
        monthlyCostEstimate,
        costSource: billedCosts?.s3 !== undefined ? costSource : 'Bucket listing + request counts',
        freeTierNote: 'Free tier: 5 GB storage, 20,000 GET & 2,000 PUT requests/month.',
      },
    };
  } catch (err: any) {
    return {
      service: 'S3',
      status: 'error' as const,
      error: err?.message || 'Failed to fetch S3 stats',
      region,
      bucketName,
    };
  }
}

// -- Lambda Stats -------------------------------------------------------------

async function getLambdaStats(
  env: Record<string, string>,
  billedCosts: Record<string, number> | null,
  cwMetrics: CWUsageMetrics,
  costSource: string,
) {
  const creds = makeAwsCreds(env);
  const region = getRegion(env);
  const functionName = getLambdaFunctionName(env);

  if (!creds.accessKeyId) return null;

  const lambda = new LambdaClient({ region, credentials: creds });

  try {
    const fn = await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
    const config = fn.Configuration;
    const memoryMB = config?.MemorySize || 128;

    const monthlyCostEstimate = billedCosts?.lambda
      ?? computeLambdaCost(cwMetrics.lambdaInvocations, cwMetrics.lambdaDurationMs, memoryMB);

    return {
      service: 'Lambda',
      status: 'ok' as const,
      region,
      functionName,
      runtime: config?.Runtime || 'nodejs',
      memorySize: memoryMB,
      codeSize: config?.CodeSize || 0,
      lastModified: config?.LastModified || '',
      invocationsThisMonth: cwMetrics.lambdaInvocations,
      durationMsThisMonth: cwMetrics.lambdaDurationMs,
      costs: {
        monthlyCostEstimate,
        costSource: billedCosts?.lambda !== undefined ? costSource
          : cwMetrics.lambdaInvocations > 0 ? 'CloudWatch Invocations × Pricing'
          : 'Within free tier (0 invocations recorded)',
        freeTierNote: 'First 1M requests/month free. $0.0000002/request after. Used for Textract PDF parsing.',
      },
    };
  } catch (err: any) {
    return {
      service: 'Lambda',
      status: 'error' as const,
      error: err?.message || 'Failed to fetch Lambda stats',
      region,
      functionName,
    };
  }
}

// -- Configured services list -------------------------------------------------

function getConfiguredServices(env: Record<string, string>): Array<{ name: string; envKey: string; configured: boolean; note: string }> {
  const allEnv = { ...process.env, ...env };
  return [
    {
      name: 'Rekognition Face Detection',
      envKey: 'REKOGNITION_COLLECTION_ID',
      configured: !!allEnv.AWS_ACCESS_KEY_ID,
      note: allEnv.AWS_ACCESS_KEY_ID ? 'Active — Face analysis available' : 'Requires AWS credentials',
    },
    {
      name: 'SSM Parameter Store',
      envKey: 'AWS_ACCESS_KEY_ID',
      configured: !!allEnv.AWS_ACCESS_KEY_ID,
      note: allEnv.AWS_ACCESS_KEY_ID ? 'Active - API keys secured (FREE tier)' : 'Requires AWS credentials',
    },
    {
      name: 'S3 File Storage',
      envKey: 'S3_BUCKET_NAME',
      configured: !!(allEnv.S3_BUCKET_NAME && allEnv.AWS_ACCESS_KEY_ID),
      note: allEnv.S3_BUCKET_NAME ? `Bucket: ${allEnv.S3_BUCKET_NAME}` : 'S3_BUCKET_NAME not set',
    },
    {
      name: 'Lambda (Textract)',
      envKey: 'AWS_LAMBDA_RESUME_API',
      configured: !!allEnv.AWS_LAMBDA_RESUME_API,
      note: allEnv.AWS_LAMBDA_RESUME_API ? 'Active — Resume PDF parser' : 'AWS_LAMBDA_RESUME_API not set',
    },
  ];
}

// -- Route registration -------------------------------------------------------

export function registerAwsUsageRoutes(
  server: ViteDevServer,
  env: Record<string, string>,
  getSessionAsync: (req: IncomingMessage) => Promise<{ userId: string; email: string; isAdmin: boolean; name: string } | null>,
  sendJson: (res: ServerResponse, status: number, data: any) => void,
) {
  // GET /api/aws/usage -- full snapshot (admin only)
  server.middlewares.use('/api/aws/usage', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    const session = await getSessionAsync(req);
    if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

    const creds = makeAwsCreds(env);
    if (!creds.accessKeyId) {
      return sendJson(res, 200, {
        configured: false,
        message: 'AWS credentials not configured in .env',
        services: [],
      });
    }

    const isLearnerLab = !!creds.sessionToken;
    const region = getRegion(env);
    const credentialsType = creds.sessionToken ? 'STS/Learner Lab (temporary)' : 'IAM (permanent)';
    const configuredServices = getConfiguredServices(env);

    // Fetch costs (tries CloudWatch Billing → Cost Explorer → per-service CW metrics)
    const functionName = getLambdaFunctionName(env);
    const { billedCosts, cwMetrics, costSource } = await fetchCostData(env, functionName);

    // Fetch per-service stats in parallel, all receiving cost data
    const [rekognition, ssm, s3, lambda] = await Promise.all([
      getRekognitionStats(env, billedCosts, cwMetrics, costSource).catch(err => ({ error: err?.message ?? 'Failed', service: 'Rekognition', status: 'error' as const })),
      getSSMStats(env, billedCosts, costSource).catch(err => ({ error: err?.message ?? 'Failed', service: 'SSM Parameter Store', status: 'error' as const })),
      getS3Stats(env, billedCosts, cwMetrics, costSource).catch(err => ({ error: err?.message ?? 'Failed', service: 'S3', status: 'error' as const })),
      getLambdaStats(env, billedCosts, cwMetrics, costSource).catch(err => ({ error: err?.message ?? 'Failed', service: 'Lambda', status: 'error' as const })),
    ]);

    const totalMonthlyCost = billedCosts?.total ?? (
      ((rekognition as any)?.costs?.monthlyCostEstimate ?? 0) +
      ((ssm as any)?.costs?.monthlyCostEstimate ?? 0) +
      ((s3 as any)?.costs?.monthlyCostEstimate ?? 0) +
      ((lambda as any)?.costs?.monthlyCostEstimate ?? 0)
    );

    sendJson(res, 200, {
      configured: true,
      region,
      credentialsType,
      budget: 50,
      isLearnerLab,
      totalMonthlyCost,
      remainingBudget: Math.max(0, 50 - totalMonthlyCost),
      costSource,
      configuredServices,
      services: { rekognition, ssm, s3, lambda },
      fetchedAt: new Date().toISOString(),
    });
  });

  // GET /api/aws/health -- quick connectivity ping (admin only)
  server.middlewares.use('/api/aws/health', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    const session = await getSessionAsync(req);
    if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

    const creds = makeAwsCreds(env);
    const region = getRegion(env);
    const collectionId = env.REKOGNITION_COLLECTION_ID || process.env.REKOGNITION_COLLECTION_ID || '';

    const checks: Record<string, { ok: boolean; detail: string }> = {};

    // Rekognition ping
    try {
      const rekognition = new RekognitionClient({ region, credentials: creds });
      if (collectionId) {
        await rekognition.send(new DescribeCollectionCommand({ CollectionId: collectionId }));
        checks.rekognition = { ok: true, detail: `Collection "${collectionId}" accessible` };
      } else {
        checks.rekognition = { ok: true, detail: 'Rekognition client reachable (no collection configured)' };
      }
    } catch (e: any) {
      checks.rekognition = { ok: false, detail: e?.message ?? 'Rekognition check failed' };
    }

    // SSM ping
    try {
      const ssm = new SSMClient({ region, credentials: creds });
      await ssm.send(new DescribeParametersCommand({ MaxResults: 1 }));
      checks.ssm = { ok: true, detail: 'SSM Parameter Store accessible' };
    } catch (e: any) {
      checks.ssm = { ok: false, detail: e?.message ?? 'SSM check failed' };
    }

    // S3 ping
    try {
      const bucketName = env.S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'vidyamitra-uploads-629496';
      const s3 = new S3Client({ region, credentials: creds });
      await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
      checks.s3 = { ok: true, detail: `Bucket "${bucketName}" accessible` };
    } catch (e: any) {
      checks.s3 = { ok: false, detail: e?.message ?? 'S3 check failed' };
    }

    // Lambda ping
    try {
      const functionName = getLambdaFunctionName(env);
      const lambda = new LambdaClient({ region, credentials: creds });
      await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
      checks.lambda = { ok: true, detail: `Function "${functionName}" reachable` };
    } catch (e: any) {
      checks.lambda = { ok: false, detail: e?.message ?? 'Lambda check failed' };
    }

    sendJson(res, 200, { checks, checkedAt: new Date().toISOString() });
  });
}