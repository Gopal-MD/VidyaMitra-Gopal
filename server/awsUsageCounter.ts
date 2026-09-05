/**
 * AWS Usage Counter
 * 
 * Tracks AWS service API calls for internal metrics and cost estimation.
 * Note: The main cost tracking now happens via CloudWatch metrics in awsUsageRoutes.ts
 * These counters are lightweight in-memory trackers for immediate feedback.
 */

interface UsageStats {
  s3Upload: number;
  s3Download: number;
  s3Delete: number;
  s3List: number;
  sesEmail: number;
  snsSubscribe: number;
  snsPublish: number;
  snsTopicCreate: number;
  rekognitionAnalysis: number;
}

// In-memory usage counters (resets on server restart)
const usageStats: UsageStats = {
  s3Upload: 0,
  s3Download: 0,
  s3Delete: 0,
  s3List: 0,
  sesEmail: 0,
  snsSubscribe: 0,
  snsPublish: 0,
  snsTopicCreate: 0,
  rekognitionAnalysis: 0,
};

// S3 Tracking Functions
export function trackS3Upload() {
  usageStats.s3Upload++;
}

export function trackS3Download() {
  usageStats.s3Download++;
}

export function trackS3Delete() {
  usageStats.s3Delete++;
}

export function trackS3List() {
  usageStats.s3List++;
}

// SES Tracking Functions
export function trackSESEmail() {
  usageStats.sesEmail++;
}

// SNS Tracking Functions
export function trackSNSSubscribe() {
  usageStats.snsSubscribe++;
}

export function trackSNSPublish() {
  usageStats.snsPublish++;
}

export function trackSNSTopicCreate() {
  usageStats.snsTopicCreate++;
}

// Rekognition Tracking Functions
export async function trackRekognitionAnalysis(count: number = 1) {
  usageStats.rekognitionAnalysis += count;
}

// Get current stats (for debugging or admin dashboard)
export function getUsageStats(): UsageStats {
  return { ...usageStats };
}

// Reset counters (optional utility)
export function resetUsageStats() {
  usageStats.s3Upload = 0;
  usageStats.s3Download = 0;
  usageStats.s3Delete = 0;
  usageStats.s3List = 0;
  usageStats.sesEmail = 0;
  usageStats.snsSubscribe = 0;
  usageStats.snsPublish = 0;
  usageStats.snsTopicCreate = 0;
  usageStats.rekognitionAnalysis = 0;
}
