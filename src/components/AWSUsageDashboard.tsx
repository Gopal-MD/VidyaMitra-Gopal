/**
 * AWSUsageDashboard
 *
 * AWS usage & cost tracking panel for the Admin Dashboard.
 * Active services: Rekognition, SSM Parameter Store, S3, Lambda.
 */

import { useState, useCallback } from 'react';
import {
  Cloud, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  DollarSign, Shield, Activity, Package, Wifi, WifiOff,
  Server, TrendingUp, BarChart2, Database, Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// -- Types --------------------------------------------------------------------

interface RekognitionStats {
  service: string;
  status: 'ok' | 'error';
  region: string;
  collectionId: string;
  faceCount?: number;
  costs: { monthlyCostEstimate: number; freeTierNote: string; costSource?: string };
  error?: string;
}

interface SSMStats {
  service: string;
  status: 'ok' | 'error';
  region: string;
  parameterCount?: number;
  costs: { monthlyCostEstimate: number; freeTierNote: string; costSource?: string };
  error?: string;
}

interface S3Stats {
  service: string;
  status: 'ok' | 'error';
  region: string;
  bucketName?: string;
  totalFiles?: number;
  totalSizeBytes?: number;
  folderStats?: Record<string, { count: number; sizeBytes: number }>;
  apiCalls?: { uploads: number; downloads: number; deletes: number; lists: number };
  costs: { monthlyCostEstimate: number; freeTierNote: string; costSource?: string };
  error?: string;
}

interface LambdaStats {
  service: string;
  status: 'ok' | 'error';
  region: string;
  functionName?: string;
  runtime?: string;
  memorySize?: number;
  codeSize?: number;
  lastModified?: string;
  invocationsThisMonth?: number;
  durationMsThisMonth?: number;
  costs: { monthlyCostEstimate: number; freeTierNote: string; costSource?: string };
  error?: string;
}

interface ConfiguredService { name: string; envKey: string; configured: boolean; note: string }
interface HealthCheck { ok: boolean; detail: string }

interface UsageResponse {
  configured: boolean;
  region?: string;
  credentialsType?: string;
  budget?: number;
  isLearnerLab?: boolean;
  totalMonthlyCost?: number;
  remainingBudget?: number;
  costSource?: string;
  configuredServices?: ConfiguredService[];
  services?: {
    rekognition: RekognitionStats | null;
    ssm: SSMStats | null;
    s3: S3Stats | null;
    lambda: LambdaStats | null;
  };
  fetchedAt?: string;
  message?: string;
}

interface HealthResponse {
  checks: Record<string, HealthCheck>;
  checkedAt: string;
}

// -- Fetch helpers -------------------------------------------------------------

async function fetchUsage(): Promise<UsageResponse> {
  return apiFetch('/api/aws/usage');
}

async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch('/api/aws/health');
}

// -- Metric Card --------------------------------------------------------------

function MetricCard({
  label, value, sub, color = 'blue',
}: { label: string; value: string | number; sub?: string; color?: string }) {
  const bg: Record<string, string> = {
    blue:   'bg-blue-950/20 border-blue-800/30',
    green:  'bg-green-950/20 border-green-800/30',
    yellow: 'bg-yellow-950/20 border-yellow-800/30',
    orange: 'bg-orange-950/20 border-orange-800/30',
    red:    'bg-red-950/20 border-red-800/30',
    purple: 'bg-purple-950/20 border-purple-800/30',
    cyan:   'bg-cyan-950/20 border-cyan-800/30',
  };
  const txt: Record<string, string> = {
    blue:   'text-blue-400',   green: 'text-green-400',   yellow: 'text-yellow-400',
    orange: 'text-orange-400', red:   'text-red-400',    purple: 'text-purple-400',
    cyan:   'text-cyan-400',
  };
  return (
    <div className={`rounded-lg border p-3 ${bg[color] ?? bg.blue}`}>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${txt[color] ?? txt.blue}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// -- Rekognition Panel --------------------------------------------------------

function RekognitionPanel({ data }: { data: RekognitionStats }) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" /> Rekognition Face Detection
          </CardTitle>
          <Badge variant="outline" className="text-blue-400 border-blue-600/40 text-[10px]">
            {data.region}
          </Badge>
        </div>
        <CardDescription className="text-[11px]">
          Collection: <span className="font-mono">{data.collectionId}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.error && <p className="text-xs text-red-400">{data.error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Faces Registered" value={data.faceCount ?? 0} color="blue" />
          <MetricCard
            label="Est. Cost/mo"
            value={`$${data.costs.monthlyCostEstimate.toFixed(4)}`}
            sub={data.costs.costSource ?? 'Free tier'}
            color="green"
          />
        </div>
        <p className="text-[10px] text-muted-foreground italic">{data.costs.freeTierNote}</p>
      </CardContent>
    </Card>
  );
}

// -- SSM Panel ----------------------------------------------------------------

function SSMPanel({ data }: { data: SSMStats }) {
  return (
    <Card className="border-l-4 border-l-cyan-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-cyan-400" /> SSM Parameter Store
          </CardTitle>
          <Badge variant="outline" className="text-cyan-400 border-cyan-600/40 text-[10px]">
            {data.region}
          </Badge>
        </div>
        <CardDescription className="text-[11px]">
          API keys &amp; secrets secured in AWS Parameter Store
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.error && <p className="text-xs text-red-400">{data.error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Parameters" value={data.parameterCount ?? 0} color="cyan" />
          <MetricCard
            label="Est. Cost/mo"
            value={`$${data.costs.monthlyCostEstimate.toFixed(4)}`}
            sub={data.costs.costSource ?? 'Always free'}
            color="green"
          />
        </div>
        <p className="text-[10px] text-muted-foreground italic">{data.costs.freeTierNote}</p>
      </CardContent>
    </Card>
  );
}

// -- S3 Panel -----------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function S3Panel({ data }: { data: S3Stats }) {
  const totalApiCalls = data.apiCalls
    ? data.apiCalls.uploads + data.apiCalls.downloads + data.apiCalls.deletes + data.apiCalls.lists
    : 0;
  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-400" /> S3 File Storage
          </CardTitle>
          <Badge variant="outline" className="text-orange-400 border-orange-600/40 text-[10px]">
            {data.region}
          </Badge>
        </div>
        <CardDescription className="text-[11px] font-mono">
          {data.bucketName ?? 'vidyamitra-uploads-629496'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.error && <p className="text-xs text-red-400">{data.error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Total Files" value={data.totalFiles ?? 0} color="orange" />
          <MetricCard label="Storage Used" value={formatBytes(data.totalSizeBytes ?? 0)} color="yellow" />
          <MetricCard label="API Calls (session)" value={totalApiCalls} color="blue" />
          <MetricCard
            label="Est. Cost/mo"
            value={`$${(data.costs.monthlyCostEstimate ?? 0).toFixed(4)}`}
            sub={data.costs.costSource ?? 'Storage + requests'}
            color="green"
          />
        </div>
        {data.folderStats && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {Object.entries(data.folderStats).map(([folder, stats]) => (
              <div key={folder} className="flex items-center justify-between rounded border border-border/40 bg-muted/20 px-2 py-1">
                <span className="text-[10px] text-muted-foreground font-mono">{folder}/</span>
                <span className="text-[10px] text-orange-400 font-semibold">{stats.count} files</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground italic">{data.costs.freeTierNote}</p>
      </CardContent>
    </Card>
  );
}

// -- Lambda Panel -------------------------------------------------------------

function LambdaPanel({ data }: { data: LambdaStats }) {
  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" /> Lambda (Textract)
          </CardTitle>
          <Badge variant="outline" className="text-purple-400 border-purple-600/40 text-[10px]">
            {data.region}
          </Badge>
        </div>
        <CardDescription className="text-[11px] font-mono">
          {data.functionName ?? 'vidyamitra-textract-resume'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.error && <p className="text-xs text-red-400">{data.error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Runtime" value={data.runtime ?? '—'} color="purple" />
          <MetricCard label="Memory" value={data.memorySize ? `${data.memorySize} MB` : '—'} color="blue" />
          <MetricCard
            label="Invocations (MTD)"
            value={data.invocationsThisMonth !== undefined ? data.invocationsThisMonth.toLocaleString() : '—'}
            sub="via CloudWatch"
            color="yellow"
          />
          <MetricCard
            label="Est. Cost/mo"
            value={`$${(data.costs.monthlyCostEstimate ?? 0).toFixed(6)}`}
            sub={data.costs.costSource ?? 'Free tier'}
            color="green"
          />
        </div>
        {data.lastModified && (
          <p className="text-[10px] text-muted-foreground">Last modified: {new Date(data.lastModified).toLocaleString()}</p>
        )}
        <p className="text-[10px] text-muted-foreground italic">{data.costs.freeTierNote}</p>
      </CardContent>
    </Card>
  );
}

// -- Service Inventory --------------------------------------------------------

function ServiceInventory({ services }: { services: ConfiguredService[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" /> AWS Service Inventory
        </CardTitle>
        <CardDescription className="text-[11px]">
          Auto-detected from environment variables
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {services.map(svc => (
            <div
              key={svc.envKey}
              className={`flex items-start gap-2 rounded-lg border p-2.5 transition-colors ${
                svc.configured
                  ? 'border-green-700/30 bg-green-950/10'
                  : 'border-border/40 bg-muted/20 opacity-60'
              }`}
            >
              {svc.configured
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                : <XCircle    className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className={`text-xs font-medium ${svc.configured ? '' : 'text-muted-foreground'}`}>{svc.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">{svc.note}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// -- Health Panel -------------------------------------------------------------

function HealthPanel({
  health, loading, onCheck,
}: { health: HealthResponse | null; loading: boolean; onCheck: () => void }) {
  const SERVICE_LABELS: Record<string, string> = {
    rekognition: 'Rekognition',
    ssm:         'SSM Parameter Store',
    s3:          'S3 File Storage',
    lambda:      'Lambda (Textract)',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Connectivity Health Check
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onCheck} disabled={loading} className="gap-1 h-7 text-xs">
            {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
            Run Check
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!health ? (
          <p className="text-xs text-muted-foreground italic">Click "Run Check" to test connectivity</p>
        ) : (
          <div className="space-y-1.5">
            {Object.entries(health.checks).map(([key, check]) => (
              <div key={key} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
                check.ok ? 'border-green-700/30 bg-green-950/10' : 'border-red-700/30 bg-red-950/10'
              }`}>
                <div className="flex items-center gap-2">
                  {check.ok
                    ? <Wifi    className="h-3.5 w-3.5 text-green-400" />
                    : <WifiOff className="h-3.5 w-3.5 text-red-400" />}
                  <span className="text-xs font-medium">{SERVICE_LABELS[key] ?? key}</span>
                </div>
                <span className={`text-[10px] font-mono ${check.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {check.detail}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground text-right">
              Checked at {new Date(health.checkedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -- Main Component -----------------------------------------------------------

export default function AWSUsageDashboard() {
  const [healthData, setHealthData]     = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery<UsageResponse>({
    queryKey: ['aws-usage'],
    queryFn:  fetchUsage,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const runHealthCheck = useCallback(async () => {
    setHealthLoading(true);
    try {
      const r = await fetchHealth();
      setHealthData(r);
    } catch {
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const budget = data?.budget ?? 50;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-400" />
            AWS Services Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active services: Rekognition + SSM + S3 + Lambda
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Fetching AWS metrics</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-700/40 bg-red-950/10 p-4">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">Failed to fetch AWS usage data. Check server logs.</p>
        </div>
      )}

      {/* Not configured */}
      {data && !data.configured && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-700/40 bg-yellow-950/10 p-4">
          <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-400">{data.message ?? 'AWS credentials not configured.'}</p>
        </div>
      )}

      {data?.configured && (
        <>
          {/* Learner Lab warning */}
          {data.isLearnerLab && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-700/40 bg-amber-950/20 p-4">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400">AWS Learner Lab Detected</p>
                <p className="text-xs text-amber-300/90 mt-1">
                  Using temporary STS credentials. Budget: ${budget}.
                </p>
              </div>
            </div>
          )}

          {/* Summary ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Region</p>
                <p className="text-lg font-bold text-purple-400">{data.region}</p>
                <p className="text-[10px] text-muted-foreground truncate">{data.credentialsType}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Services Active</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {data.configuredServices?.filter(s => s.configured).length ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  of {data.configuredServices?.length ?? 0} tracked
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AWS Parameter Store Security */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                AWS Parameter Store Security
              </CardTitle>
              <CardDescription className="text-xs">
                API keys stored securely in AWS Systems Manager Parameter Store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border border-blue-700/40 bg-blue-950/20 p-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-400">Parameter Store Active</p>
                    <p className="text-xs text-blue-300/90 mt-1">
                      API keys &amp; configurations secured in AWS Parameter Store (FREE tier).
                      Keys are encrypted with KMS and never exposed in source code or GitHub.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold">API Keys</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-400">24</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Gemini, OpenAI, Groq, ElevenLabs, YouTube, Pexels, News, Judge0, Razorpay, etc.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-semibold">Database</span>
                    </div>
                    <p className="text-xl font-bold text-purple-400">2</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Supabase URL, Service Role Key
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Cloud className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-semibold">AWS Config</span>
                    </div>
                    <p className="text-xl font-bold text-cyan-400">3</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Rekognition, Region, AWS credentials
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Security Features:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { icon: Shield,       label: 'KMS Encryption',  detail: 'SecureString parameters encrypted at rest' },
                      { icon: Wifi,         label: 'In-Transit',      detail: 'HTTPS-only API calls with IAM auth' },
                      { icon: Activity,     label: '5-min Cache',     detail: 'Reduces API calls, improves performance' },
                      { icon: CheckCircle2, label: 'Hybrid Mode',     detail: 'AWS creds in .env, API keys in Parameter Store' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/20">
                        <f.icon className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">{f.label}</span>
                          <p className="text-muted-foreground text-[10px]">{f.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-2 border-t">
                  <DollarSign className="h-3 w-3 shrink-0" />
                  <span>
                    <strong className="text-green-400">$0.00/month</strong> - Parameter Store is FREE (Standard tier, &lt;10K parameters)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Inventory */}
          {data.configuredServices && (
            <ServiceInventory services={data.configuredServices} />
          )}

          {/* Health Check */}
          <HealthPanel health={healthData} loading={healthLoading} onCheck={runHealthCheck} />

          {/* Pricing reference */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Pricing Reference (AWS US-East-1)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {[
                  { service: 'Rekognition',        detail: '$0.001 per 1,000 images (first 1,000/month free)' },
                  { service: 'SSM Parameter Store', detail: 'FREE for Standard tier (<10K params, unlimited calls)' },
                  { service: 'Secrets Manager',     detail: '$0.40/secret/month + $0.05/10K API calls' },
                ].map(r => (
                  <div key={r.service} className="flex items-start gap-1.5 p-2 rounded bg-muted/30">
                    <BarChart2 className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{r.service}</span>
                      <p className="text-muted-foreground">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Last fetched */}
          {dataUpdatedAt > 0 && (
            <p className="text-[10px] text-muted-foreground text-right">
              Data fetched at {new Date(dataUpdatedAt).toLocaleTimeString()}  refreshes every 2 min
            </p>
          )}
        </>
      )}
    </div>
  );
}