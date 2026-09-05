/**
 * AWS Parameter Store Integration
 * 
 * Securely loads API keys and credentials from AWS Systems Manager Parameter Store.
 * Falls back to .env file if USE_AWS_SECRETS_MANAGER=false (for local development).
 * 
 * Zero disruption to existing code - provides same interface as loadEnv().
 * 
 * Parameter Store is FREE and available in AWS Learner Lab!
 */

import { SSMClient, GetParametersByPathCommand, GetParameterCommand } from '@aws-sdk/client-ssm';

// Cache secrets to avoid repeated AWS API calls
let secretsCache: Record<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all parameters from a path in AWS Parameter Store
 */
async function getParametersByPath(
  client: SSMClient, 
  path: string
): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  let nextToken: string | undefined;

  try {
    do {
      const response = await client.send(
        new GetParametersByPathCommand({
          Path: path,
          Recursive: true,
          WithDecryption: true, // Decrypt SecureString parameters using KMS
          NextToken: nextToken,
        })
      );

      // Extract parameter name and value
      for (const param of response.Parameters || []) {
        if (param.Name && param.Value) {
          // Convert /vidyamitra/api-keys/GEMINI_API_KEY to GEMINI_API_KEY
          const keyName = param.Name.split('/').pop() || param.Name;
          params[keyName] = param.Value;
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return params;
  } catch (error: any) {
    console.warn(`⚠️  Failed to fetch parameters from ${path}:`, error.message);
    return {};
  }
}

/**
 * Load all secrets from AWS Parameter Store
 * Fetches from 3 parameter paths and merges them
 */
async function loadSecretsFromParameterStore(region = 'us-east-1'): Promise<Record<string, any>> {
  // Check cache first
  const now = Date.now();
  if (secretsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return secretsCache;
  }

  try {
    console.log('🔐 Fetching secrets from AWS Parameter Store...');

    const client = new SSMClient({ region });

    // Fetch all parameter groups in parallel
    const [awsParams, dbParams, apiParams, configParams] = await Promise.all([
      getParametersByPath(client, '/vidyamitra/aws'),
      getParametersByPath(client, '/vidyamitra/database'),
      getParametersByPath(client, '/vidyamitra/api-keys'),
      getParametersByPath(client, '/vidyamitra/config'),
    ]);

    // Merge all parameters into one object
    const allSecrets = {
      ...awsParams,
      ...dbParams,
      ...apiParams,
      ...configParams,
    };

    const totalParams = Object.keys(allSecrets).length;

    if (totalParams === 0) {
      console.warn('⚠️  No parameters found in AWS Parameter Store');
      console.warn('   Make sure parameters exist under /vidyamitra/*');
      throw new Error('No parameters found');
    }

    // Update cache
    secretsCache = allSecrets;
    cacheTimestamp = now;

    console.log(`✅ Loaded ${totalParams} secrets from AWS Parameter Store`);
    return allSecrets;

  } catch (error: any) {
    console.error('❌ Failed to load secrets from AWS Parameter Store:', error.message);
    throw error;
  }
}

/**
 * Enhanced loadEnv that supports AWS Parameter Store
 * 
 * @param env - Environment variables from Vite's loadEnv()
 * @returns Merged environment with AWS secrets (if enabled)
 */
export async function loadEnvWithSecrets(env: Record<string, any>): Promise<Record<string, any>> {
  const useSecretsManager = env.USE_AWS_SECRETS_MANAGER === 'true';

  if (!useSecretsManager) {
    // Local development mode - use .env file as-is
    return env;
  }

  try {
    // Production mode - fetch from AWS Parameter Store
    const awsRegion = env.AWS_REGION || 'us-east-1';
    const secrets = await loadSecretsFromParameterStore(awsRegion);

    // Merge: AWS Parameters override .env values EXCEPT for AWS credentials
    // AWS credentials must come from .env because they expire every 4 hours in Learner Lab
    const merged = {
      ...env,      // .env values (fallback)
      ...secrets,  // AWS Parameter Store (priority for API keys)
      // ALWAYS use AWS credentials from .env (they expire every 4 hours)
      AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
      AWS_SESSION_TOKEN: env.AWS_SESSION_TOKEN,
    };

    console.log('✅ Hybrid mode: API keys from Parameter Store, AWS credentials from .env');
    return merged;

  } catch (error: any) {
    console.warn('⚠️  AWS Parameter Store failed, falling back to .env file');
    console.warn('   Error:', error.message);
    return env; // Fallback to .env on error
  }
}

/**
 * Manually clear secrets cache (useful for testing or credential rotation)
 */
export function clearSecretsCache() {
  secretsCache = null;
  cacheTimestamp = 0;
  console.log('🧹 Secrets cache cleared');
}
