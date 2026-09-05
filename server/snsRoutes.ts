/**
 * VidyaMitra SNS Routes
 * Handles AWS SNS for email marketing - topics, subscriptions, and notifications.
 * Used in AWS Learner Lab environment.
 */

import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  SNSClient,
  CreateTopicCommand,
  DeleteTopicCommand,
  ListTopicsCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
  PublishCommand,
  GetTopicAttributesCommand,
  SetTopicAttributesCommand,
  ConfirmSubscriptionCommand,
} from '@aws-sdk/client-sns';
import { trackSNSSubscribe, trackSNSPublish, trackSNSTopicCreate } from './awsUsageCounter';

const REGION = 'us-east-1';

let snsClient: SNSClient | null = null;

// Store topic metadata locally (SNS doesn't store custom metadata)
const topicMetadata: Map<string, { name: string; description: string; createdAt: string }> = new Map();

export function initSNS(env: Record<string, string>) {
  const credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: env.AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || undefined,
  };

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    console.warn('  ⚠️  AWS credentials not found — SNS routes will not work');
    return;
  }

  snsClient = new SNSClient({
    region: env.AWS_REGION || REGION,
    credentials,
  });

  console.log('  📢 SNS: ✅ (Marketing notifications enabled)');
}

export function registerSNSRoutes(
  server: ViteDevServer,
  _env: Record<string, string>,
  getSessionAsync: (req: IncomingMessage) => Promise<{ userId: string; email: string; isAdmin: boolean; name: string } | null>,
  sendJson: (res: ServerResponse, status: number, data: any) => void,
  parseBody: (req: IncomingMessage) => Promise<any>,
) {
  if (!snsClient) {
    console.warn('  ⚠️  SNS client not initialized — skipping SNS route registration');
    return;
  }
  const sns = snsClient;

  // ==================== CREATE TOPIC ====================
  server.middlewares.use('/api/sns/topics/create', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const body = await parseBody(req);
      const { name, displayName, description } = body;

      if (!name || typeof name !== 'string') {
        return sendJson(res, 400, { error: 'Topic name is required' });
      }

      // SNS topic names can only contain alphanumeric, hyphens, and underscores
      const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 256);
      const topicName = `vidyamitra-${sanitizedName}`;

      const command = new CreateTopicCommand({
        Name: topicName,
        Attributes: {
          DisplayName: displayName || name,
        },
        Tags: [
          { Key: 'Project', Value: 'VidyaMitra' },
          { Key: 'Purpose', Value: 'Marketing' },
        ],
      });

      const result = await sns.send(command);

      // Store metadata locally
      if (result.TopicArn) {
        topicMetadata.set(result.TopicArn, {
          name: displayName || name,
          description: description || '',
          createdAt: new Date().toISOString(),
        });
        trackSNSTopicCreate(); // Track topic creation
      }

      return sendJson(res, 201, {
        success: true,
        topicArn: result.TopicArn,
        name: displayName || name,
        description: description || '',
      });
    } catch (err: any) {
      console.error('[SNS] Create topic error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to create topic' });
    }
  });

  // ==================== LIST TOPICS ====================
  server.middlewares.use('/api/sns/topics', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const command = new ListTopicsCommand({});
      const result = await sns.send(command);

      // Filter to only show VidyaMitra topics and enrich with metadata
      const topics = (result.Topics || [])
        .filter(t => t.TopicArn?.includes('vidyamitra'))
        .map(t => {
          const arn = t.TopicArn || '';
          const meta = topicMetadata.get(arn);
          const arnParts = arn.split(':');
          const topicName = arnParts[arnParts.length - 1] || '';
          
          return {
            topicArn: arn,
            topicName,
            displayName: meta?.name || topicName.replace('vidyamitra-', ''),
            description: meta?.description || '',
            createdAt: meta?.createdAt || null,
          };
        });

      return sendJson(res, 200, { topics, count: topics.length });
    } catch (err: any) {
      console.error('[SNS] List topics error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to list topics' });
    }
  });

  // ==================== GET TOPIC DETAILS ====================
  server.middlewares.use('/api/sns/topics/details', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const url = new URL(req.url || '', 'http://localhost');
      const topicArn = url.searchParams.get('arn');

      if (!topicArn) {
        return sendJson(res, 400, { error: 'Topic ARN is required' });
      }

      const [attrResult, subsResult] = await Promise.all([
        sns.send(new GetTopicAttributesCommand({ TopicArn: topicArn })),
        sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn })),
      ]);

      const meta = topicMetadata.get(topicArn);

      return sendJson(res, 200, {
        topicArn,
        displayName: attrResult.Attributes?.DisplayName || meta?.name || '',
        description: meta?.description || '',
        subscriptionCount: parseInt(attrResult.Attributes?.SubscriptionsConfirmed || '0'),
        subscriptionsPending: parseInt(attrResult.Attributes?.SubscriptionsPending || '0'),
        subscriptions: (subsResult.Subscriptions || []).map(sub => ({
          subscriptionArn: sub.SubscriptionArn,
          protocol: sub.Protocol,
          endpoint: sub.Endpoint,
        })),
      });
    } catch (err: any) {
      console.error('[SNS] Get topic details error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to get topic details' });
    }
  });

  // ==================== DELETE TOPIC ====================
  server.middlewares.use('/api/sns/topics/delete', async (req: any, res: any, next: any) => {
    if (req.method !== 'DELETE') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const url = new URL(req.url || '', 'http://localhost');
      const topicArn = url.searchParams.get('arn');

      if (!topicArn) {
        return sendJson(res, 400, { error: 'Topic ARN is required' });
      }

      await sns.send(new DeleteTopicCommand({ TopicArn: topicArn }));
      topicMetadata.delete(topicArn);

      return sendJson(res, 200, { success: true, message: 'Topic deleted successfully' });
    } catch (err: any) {
      console.error('[SNS] Delete topic error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to delete topic' });
    }
  });

  // ==================== SUBSCRIBE EMAIL TO TOPIC ====================
  server.middlewares.use('/api/sns/subscribe', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const body = await parseBody(req);
      const { topicArn, email, protocol = 'email' } = body;

      if (!topicArn || !email) {
        return sendJson(res, 400, { error: 'Topic ARN and email are required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendJson(res, 400, { error: 'Invalid email address' });
      }

      const command = new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: protocol,
        Endpoint: email,
        ReturnSubscriptionArn: true,
      });

      const result = await sns.send(command);

      trackSNSSubscribe(); // Track subscription

      return sendJson(res, 201, {
        success: true,
        subscriptionArn: result.SubscriptionArn,
        message: protocol === 'email' 
          ? `Confirmation email sent to ${email}. They must confirm to receive notifications.`
          : `Subscribed ${email} to topic`,
      });
    } catch (err: any) {
      console.error('[SNS] Subscribe error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to subscribe' });
    }
  });

  // ==================== BULK SUBSCRIBE EMAILS ====================
  server.middlewares.use('/api/sns/subscribe/bulk', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const body = await parseBody(req);
      const { topicArn, emails } = body;

      if (!topicArn || !Array.isArray(emails) || emails.length === 0) {
        return sendJson(res, 400, { error: 'Topic ARN and emails array are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const results: { email: string; success: boolean; error?: string }[] = [];

      // Process in batches of 10 to avoid rate limiting
      for (const email of emails.slice(0, 100)) { // Limit to 100 at a time
        if (!emailRegex.test(email)) {
          results.push({ email, success: false, error: 'Invalid email format' });
          continue;
        }

        try {
          await sns.send(new SubscribeCommand({
            TopicArn: topicArn,
            Protocol: 'email',
            Endpoint: email,
          }));
          trackSNSSubscribe(); // Track each successful subscription
          results.push({ email, success: true });
        } catch (err: any) {
          results.push({ email, success: false, error: err.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return sendJson(res, 200, {
        success: true,
        message: `Subscribed ${successCount} emails, ${failCount} failed`,
        results,
        total: emails.length,
        processed: results.length,
      });
    } catch (err: any) {
      console.error('[SNS] Bulk subscribe error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to bulk subscribe' });
    }
  });

  // ==================== UNSUBSCRIBE ====================
  server.middlewares.use('/api/sns/unsubscribe', async (req: any, res: any, next: any) => {
    if (req.method !== 'DELETE') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const url = new URL(req.url || '', 'http://localhost');
      const subscriptionArn = url.searchParams.get('arn');

      if (!subscriptionArn || subscriptionArn === 'PendingConfirmation') {
        return sendJson(res, 400, { error: 'Valid subscription ARN is required (cannot unsubscribe pending)' });
      }

      await sns.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));

      return sendJson(res, 200, { success: true, message: 'Unsubscribed successfully' });
    } catch (err: any) {
      console.error('[SNS] Unsubscribe error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to unsubscribe' });
    }
  });

  // ==================== PUBLISH MESSAGE TO TOPIC ====================
  server.middlewares.use('/api/sns/publish', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const body = await parseBody(req);
      const { topicArn, subject, message } = body;

      if (!topicArn || !message) {
        return sendJson(res, 400, { error: 'Topic ARN and message are required' });
      }

      if (message.length > 262144) {
        return sendJson(res, 400, { error: 'Message too long (max 256KB)' });
      }

      const command = new PublishCommand({
        TopicArn: topicArn,
        Subject: subject || 'VidyaMitra Notification',
        Message: message,
      });

      const result = await sns.send(command);

      trackSNSPublish(); // Track message publication

      return sendJson(res, 200, {
        success: true,
        messageId: result.MessageId,
        message: 'Notification sent to all confirmed subscribers',
      });
    } catch (err: any) {
      console.error('[SNS] Publish error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to publish message' });
    }
  });

  // ==================== GET SUBSCRIPTION STATUS ====================
  server.middlewares.use('/api/sns/subscriptions', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const url = new URL(req.url || '', 'http://localhost');
      const topicArn = url.searchParams.get('arn');

      if (!topicArn) {
        return sendJson(res, 400, { error: 'Topic ARN is required' });
      }

      const result = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));

      const subscriptions = (result.Subscriptions || []).map(sub => ({
        subscriptionArn: sub.SubscriptionArn,
        protocol: sub.Protocol,
        endpoint: sub.Endpoint,
        isPending: sub.SubscriptionArn === 'PendingConfirmation',
      }));

      return sendJson(res, 200, {
        subscriptions,
        total: subscriptions.length,
        confirmed: subscriptions.filter(s => !s.isPending).length,
        pending: subscriptions.filter(s => s.isPending).length,
      });
    } catch (err: any) {
      console.error('[SNS] List subscriptions error:', err);
      return sendJson(res, 500, { error: err.message || 'Failed to list subscriptions' });
    }
  });

  console.log('  ☁️  SNS routes registered (marketing notifications)');
}
