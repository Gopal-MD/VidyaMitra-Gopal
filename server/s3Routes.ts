/**
 * VidyaMitra S3 Routes
 * Handles file uploads/downloads/listing/deletion via AWS S3.
 * Bucket: vidyamitra-uploads-629496
 */

import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { loadEnv } from 'vite';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { trackS3Upload, trackS3Download, trackS3Delete, trackS3List } from './awsUsageCounter';

const REGION = 'us-east-1';

// Allowed folder prefixes for uploads
const ALLOWED_PREFIXES = ['resumes/', 'profile-pictures/', 'institution-logos/', 'exports/'];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
];

let s3Client: S3Client | null = null;
let bucketName = 'vidyamitra-uploads-629496';

export function initS3(env: Record<string, string>) {
  bucketName = env.S3_BUCKET_NAME || bucketName;

  const credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: env.AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || undefined,
  };

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    console.warn('  ⚠️  AWS credentials not found — S3 routes will not work');
    return;
  }

  s3Client = new S3Client({
    region: env.AWS_REGION || REGION,
    credentials,
  });
}

export function registerS3Routes(
  server: ViteDevServer,
  _keys: any,
  getSession: (req: IncomingMessage) => { userId: string; email: string; isAdmin: boolean; name: string } | null,
  getSessionAsync: (req: IncomingMessage) => Promise<{ userId: string; email: string; isAdmin: boolean; name: string } | null>,
  sendJson: (res: ServerResponse, status: number, data: any) => void,
  parseBody: (req: IncomingMessage) => Promise<any>,
) {
  if (!s3Client) {
    console.warn('  ⚠️  S3 client not initialized — skipping S3 route registration');
    return;
  }
  const s3 = s3Client;

  // ==================== LIST FILES (Admin only) ====================
  server.middlewares.use('/api/s3/files', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const url = new URL(req.url || '', 'http://localhost');
      const prefix = url.searchParams.get('prefix') || '';
      const maxKeys = Math.min(parseInt(url.searchParams.get('limit') || '100'), 1000);
      const continuationToken = url.searchParams.get('token') || undefined;

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
        Delimiter: prefix ? undefined : '/',
      });

      const result = await s3.send(command);

      const files = (result.Contents || [])
        .filter(obj => obj.Key && !obj.Key.endsWith('/')) // Skip folder markers
        .map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          etag: obj.ETag,
        }));

      const folders = (result.CommonPrefixes || []).map(p => p.Prefix);

      trackS3List(); // Track list operation

      sendJson(res, 200, {
        files,
        folders,
        totalFiles: files.length,
        nextToken: result.NextContinuationToken || null,
        isTruncated: result.IsTruncated || false,
      });
    } catch (err: any) {
      console.error('S3 list error:', err);
      sendJson(res, 500, { error: 'Failed to list files: ' + err.message });
    }
  });

  // ==================== GET PRESIGNED DOWNLOAD URL ====================
  server.middlewares.use('/api/s3/download', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session) return sendJson(res, 401, { error: 'Authentication required' });

      const url = new URL(req.url || '', 'http://localhost');
      const key = url.searchParams.get('key');
      if (!key) return sendJson(res, 400, { error: 'File key required' });

      // Non-admins can only download their own files (key contains userId)
      if (!session.isAdmin && !key.includes(session.userId)) {
        return sendJson(res, 403, { error: 'Access denied' });
      }

      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 min

      trackS3Download(); // Track download operation

      sendJson(res, 200, { url: presignedUrl, expiresIn: 300 });
    } catch (err: any) {
      console.error('S3 download error:', err);
      sendJson(res, 500, { error: 'Failed to generate download URL: ' + err.message });
    }
  });

  // ==================== GET PRESIGNED UPLOAD URL ====================
  server.middlewares.use('/api/s3/upload-url', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session) return sendJson(res, 401, { error: 'Authentication required' });

      const { fileName, contentType, folder } = await parseBody(req);
      if (!fileName || !contentType || !folder) {
        return sendJson(res, 400, { error: 'fileName, contentType, and folder are required' });
      }

      // Validate folder
      const folderPrefix = folder.endsWith('/') ? folder : folder + '/';
      if (!ALLOWED_PREFIXES.includes(folderPrefix)) {
        return sendJson(res, 400, { error: `Invalid folder. Allowed: ${ALLOWED_PREFIXES.join(', ')}` });
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        return sendJson(res, 400, { error: `File type not allowed: ${contentType}` });
      }

      // Sanitize filename - only allow alphanumeric, dash, underscore, dot
      const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const key = `${folderPrefix}${session.userId}/${timestamp}_${sanitized}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: {
          'uploaded-by': session.userId,
          'original-name': sanitized,
        },
      });

      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 min

      trackS3Upload(); // Track upload operation

      sendJson(res, 200, {
        uploadUrl: presignedUrl,
        key,
        expiresIn: 600,
      });
    } catch (err: any) {
      console.error('S3 upload URL error:', err);
      sendJson(res, 500, { error: 'Failed to generate upload URL: ' + err.message });
    }
  });

  // ==================== DELETE FILE (Admin only) ====================
  server.middlewares.use('/api/s3/delete', async (req: any, res: any, next: any) => {
    if (req.method !== 'DELETE') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const url = new URL(req.url || '', 'http://localhost');
      const key = url.searchParams.get('key');
      if (!key) return sendJson(res, 400, { error: 'File key required' });

      // Prevent deleting folder markers
      if (key.endsWith('/')) {
        return sendJson(res, 400, { error: 'Cannot delete folder markers' });
      }

      await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));

      trackS3Delete(); // Track delete operation

      sendJson(res, 200, { success: true, message: `Deleted: ${key}` });
    } catch (err: any) {
      console.error('S3 delete error:', err);
      sendJson(res, 500, { error: 'Failed to delete file: ' + err.message });
    }
  });

  // ==================== BULK DELETE (Admin only) ====================
  server.middlewares.use('/api/s3/bulk-delete', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const { keys } = await parseBody(req);
      if (!Array.isArray(keys) || keys.length === 0) {
        return sendJson(res, 400, { error: 'keys array required' });
      }
      if (keys.length > 100) {
        return sendJson(res, 400, { error: 'Maximum 100 files per bulk delete' });
      }

      const results: { key: string; success: boolean; error?: string }[] = [];
      for (const key of keys) {
        if (typeof key !== 'string' || key.endsWith('/')) {
          results.push({ key, success: false, error: 'Invalid key' });
          continue;
        }
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
          trackS3Delete(); // Track each successful delete
          results.push({ key, success: true });
        } catch (err: any) {
          results.push({ key, success: false, error: err.message });
        }
      }

      sendJson(res, 200, {
        deleted: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      });
    } catch (err: any) {
      console.error('S3 bulk delete error:', err);
      sendJson(res, 500, { error: 'Bulk delete failed: ' + err.message });
    }
  });

  // ==================== STORAGE STATS (Admin only) ====================
  server.middlewares.use('/api/s3/stats', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    try {
      const session = await getSessionAsync(req);
      if (!session?.isAdmin) return sendJson(res, 403, { error: 'Admin access required' });

      const stats: Record<string, { count: number; totalSize: number }> = {};
      let totalFiles = 0;
      let totalSize = 0;

      for (const prefix of ALLOWED_PREFIXES) {
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        });
        const result = await s3.send(command);
        const files = (result.Contents || []).filter(obj => !obj.Key?.endsWith('/'));
        const folderSize = files.reduce((sum, f) => sum + (f.Size || 0), 0);

        stats[prefix.replace('/', '')] = {
          count: files.length,
          totalSize: folderSize,
        };
        totalFiles += files.length;
        totalSize += folderSize;
      }

      sendJson(res, 200, {
        bucketName: bucketName,
        region: REGION,
        folders: stats,
        totalFiles,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      });
    } catch (err: any) {
      console.error('S3 stats error:', err);
      sendJson(res, 500, { error: 'Failed to get stats: ' + err.message });
    }
  });

  console.log('  ☁️  S3 routes registered (bucket: ' + bucketName + ')');
}
