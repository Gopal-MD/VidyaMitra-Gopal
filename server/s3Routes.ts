/**
 * VidyaMitra — S3 Resume Routes
 *
 * Bucket  : vidyamitra-resumes-441442683103  (ap-south-1, private)
 * Prefix  : resumes/{userId}/{timestamp}-{rand}-{filename}
 *
 * Endpoints registered by registerS3ResumeRoutes():
 *
 *   POST   /api/aws/resume/upload          — generate presigned PUT URL
 *   GET    /api/aws/resume/download        — generate presigned GET URL  (?key=…)
 *   DELETE /api/aws/resume/delete          — delete object               (?key=…)
 *   PUT    /api/aws/resume/metadata        — attach s3_key to existing DB resume row
 *   GET    /api/aws/resume/status          — health-check: is bucket reachable?
 *
 * Security:
 *   - Every endpoint requires a valid Bearer session token.
 *   - userId is always taken from the server-side session, never from the request body.
 *   - validateResumeKey() enforces ownership — users cannot access each other's files.
 *   - Admins (session.isAdmin) may download/delete any key under resumes/.
 *   - Bucket stays private: no public-read ACL, Block Public Access remains ON.
 *   - Presigned URLs have short TTLs (10 min upload, 15 min download).
 *   - Filenames are sanitised; path traversal sequences are rejected.
 */

import type { ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import {
  RESUME_BUCKET,
  RESUME_REGION,
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_RESUME_BYTES,
  createResumeUploadUrl,
  createResumeDownloadUrl,
  deleteResumeObject,
  validateResumeKey,
  sanitiseFileName,
  getS3Client,
} from './services/aws/s3.js';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import path from 'path';

// ── Types (must match what apiServer.ts exposes) ──────────────────────────────

type Session = { userId: string; email: string; isAdmin: boolean; name: string };
type GetSessionAsync = (req: IncomingMessage) => Promise<Session | null>;
type SendJson = (res: ServerResponse, status: number, data: unknown) => void;
type ParseBody = (req: IncomingMessage) => Promise<any>;

// ── Route registration ────────────────────────────────────────────────────────

export function registerS3ResumeRoutes(
  server      : ViteDevServer | { middlewares: any },
  getSessionAsync: GetSessionAsync,
  sendJson    : SendJson,
  parseBody   : ParseBody,
) {
  // ── POST /api/aws/resume/upload ─────────────────────────────────────────────
  // Request body: { fileName: string, contentType: string, fileSize?: number }
  // Response:     { success, uploadUrl, key, fileName, contentType, expiresIn }
  server.middlewares.use('/api/aws/resume/upload', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();

    try {
      // 1. Authenticate
      const session = await getSessionAsync(req);
      if (!session) return sendJson(res, 401, { error: 'Authentication required' });

      // 2. Parse body
      const body = await parseBody(req);
      const { fileName, contentType, fileSize } = body || {};

      // 3. Validate fileName
      if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
        return sendJson(res, 400, { error: 'fileName is required' });
      }

      // 4. Validate contentType
      if (!contentType || typeof contentType !== 'string') {
        return sendJson(res, 400, { error: 'contentType is required' });
      }
      if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
        return sendJson(res, 400, {
          error: `Unsupported file type: ${contentType}. Allowed: PDF, DOC, DOCX`,
        });
      }

      // 5. Validate file extension (must match contentType)
      const ext = path.extname(fileName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return sendJson(res, 400, {
          error: `Unsupported extension "${ext}". Allowed: .pdf, .doc, .docx`,
        });
      }

      // 6. Validate file size (if client sent it — not enforced by S3 itself)
      if (fileSize !== undefined) {
        const size = Number(fileSize);
        if (!Number.isFinite(size) || size <= 0) {
          return sendJson(res, 400, { error: 'fileSize must be a positive number' });
        }
        if (size > MAX_RESUME_BYTES) {
          const maxMB = (MAX_RESUME_BYTES / 1024 / 1024).toFixed(0);
          return sendJson(res, 400, { error: `File too large. Maximum allowed: ${maxMB} MB` });
        }
      }

      // 7. Prevent path traversal in fileName
      const safe = sanitiseFileName(fileName);
      if (safe !== path.basename(safe) || safe.includes('..')) {
        return sendJson(res, 400, { error: 'Invalid filename' });
      }

      // 8. Generate presigned PUT URL — userId comes from server session only
      const result = await createResumeUploadUrl(session.userId, safe, contentType);

      // 9. Return — never expose bucket name or region to client in prod, but
      //    key and uploadUrl are required for the frontend PUT.
      return sendJson(res, 200, {
        success    : true,
        uploadUrl  : result.uploadUrl,
        key        : result.key,
        fileName   : result.fileName,
        contentType: result.contentType,
        expiresIn  : result.expiresIn,
      });

    } catch (err: any) {
      console.error('[S3] POST /api/aws/resume/upload error:', err?.message);
      // Do not leak AWS internals — return a generic message
      const isCredentialError = /credential|ExpiredToken|InvalidClientTokenId|NoCredential/i.test(
        err?.message || err?.name || '',
      );
      if (isCredentialError) {
        return sendJson(res, 503, {
          error: 'AWS credentials not available. Configure AWS CLI or set environment variables.',
        });
      }
      return sendJson(res, 500, { error: 'Failed to generate upload URL. Please try again.' });
    }
  });

  // ── GET /api/aws/resume/download?key=resumes/…  ─────────────────────────────
  // Response: { success, downloadUrl, key, expiresIn }
  server.middlewares.use('/api/aws/resume/download', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    try {
      const session = await getSessionAsync(req);
      if (!session) return sendJson(res, 401, { error: 'Authentication required' });

      const url = new URL(req.url || '', 'http://localhost');
      const key = url.searchParams.get('key') || '';

      if (!key) return sendJson(res, 400, { error: 'key query parameter is required' });

      // Ownership check — admins may download any resume key
      if (!session.isAdmin && !validateResumeKey(key, session.userId)) {
        return sendJson(res, 403, { error: 'Access denied: this file does not belong to you' });
      }

      // Extra safety: key must be under resumes/
      if (!key.startsWith('resumes/')) {
        return sendJson(res, 400, { error: 'Invalid key: must be under resumes/ prefix' });
      }

      const result = await createResumeDownloadUrl(key);

      return sendJson(res, 200, {
        success    : true,
        downloadUrl: result.downloadUrl,
        key        : result.key,
        expiresIn  : result.expiresIn,
      });

    } catch (err: any) {
      console.error('[S3] GET /api/aws/resume/download error:', err?.message);
      const isCredentialError = /credential|ExpiredToken|InvalidClientTokenId|NoCredential/i.test(
        err?.message || err?.name || '',
      );
      if (isCredentialError) {
        return sendJson(res, 503, { error: 'AWS credentials not available.' });
      }
      return sendJson(res, 500, { error: 'Failed to generate download URL. Please try again.' });
    }
  });

  // ── DELETE /api/aws/resume/delete?key=resumes/…  ────────────────────────────
  // Response: { success, message }
  server.middlewares.use('/api/aws/resume/delete', async (req: any, res: any, next: any) => {
    if (req.method !== 'DELETE') return next();

    try {
      const session = await getSessionAsync(req);
      if (!session) return sendJson(res, 401, { error: 'Authentication required' });

      const url = new URL(req.url || '', 'http://localhost');
      const key = url.searchParams.get('key') || '';

      if (!key) return sendJson(res, 400, { error: 'key query parameter is required' });

      // deleteResumeObject enforces ownership internally
      await deleteResumeObject(key, session.userId, session.isAdmin);

      return sendJson(res, 200, { success: true, message: `Deleted: ${key}` });

    } catch (err: any) {
      if (err?.message?.startsWith('Access denied')) {
        return sendJson(res, 403, { error: err.message });
      }
      if (err?.message?.startsWith('Invalid key')) {
        return sendJson(res, 400, { error: err.message });
      }
      console.error('[S3] DELETE /api/aws/resume/delete error:', err?.message);
      return sendJson(res, 500, { error: 'Failed to delete resume. Please try again.' });
    }
  });

  // ── PUT /api/aws/resume/metadata ─────────────────────────────────────────────
  // Attach the confirmed S3 key to an existing resume DB row.
  // Called by the frontend after a successful presigned PUT to S3.
  // Body: { resumeId: string, s3Key: string, fileSize?: number }
  // Response: { success }
  //
  // Note: This route imports DB lazily to avoid circular dependencies.
  server.middlewares.use('/api/aws/resume/metadata', async (req: any, res: any, next: any) => {
    if (req.method !== 'PUT') return next();

    try {
      const session = await getSessionAsync(req);
      if (!session) return sendJson(res, 401, { error: 'Authentication required' });

      const body = await parseBody(req);
      const { resumeId, s3Key, fileSize } = body || {};

      if (!resumeId || typeof resumeId !== 'string') {
        return sendJson(res, 400, { error: 'resumeId is required' });
      }
      if (!s3Key || typeof s3Key !== 'string') {
        return sendJson(res, 400, { error: 's3Key is required' });
      }

      // Verify the key belongs to this user (not an admin-only check — every user
      // can only attach their own keys)
      if (!validateResumeKey(s3Key, session.userId)) {
        return sendJson(res, 403, { error: 'Access denied: s3Key does not belong to your account' });
      }

      // Lazy import DB to avoid circular module issues at startup
      const { DB } = await import('./database.js');

      // Verify the resume row belongs to this user
      const row = await DB.get(
        'SELECT id, user_id FROM resumes WHERE id = ?',
        [resumeId],
      ) as { id: string; user_id: string } | null;

      if (!row) return sendJson(res, 404, { error: 'Resume record not found' });
      if (row.user_id !== session.userId) {
        return sendJson(res, 403, { error: 'Access denied: resume belongs to a different user' });
      }

      // Update the resume row with S3 metadata
      await DB.run(
        'UPDATE resumes SET s3_key = ?, file_size = ? WHERE id = ? AND user_id = ?',
        [s3Key, fileSize ?? null, resumeId, session.userId],
      );

      return sendJson(res, 200, { success: true });

    } catch (err: any) {
      console.error('[S3] PUT /api/aws/resume/metadata error:', err?.message);
      return sendJson(res, 500, { error: 'Failed to save resume metadata. Please try again.' });
    }
  });

  // ── GET /api/aws/resume/status ───────────────────────────────────────────────
  // Quick connectivity check — authenticated users only.
  // Response: { configured, bucket, region, reachable, error? }
  server.middlewares.use('/api/aws/resume/status', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    const session = await getSessionAsync(req);
    if (!session) return sendJson(res, 401, { error: 'Authentication required' });

    try {
      const s3 = getS3Client();
      await s3.send(new HeadBucketCommand({ Bucket: RESUME_BUCKET }));
      return sendJson(res, 200, {
        configured: true,
        bucket    : RESUME_BUCKET,
        region    : RESUME_REGION,
        reachable : true,
      });
    } catch (err: any) {
      const isCredentialError = /credential|ExpiredToken|InvalidClientTokenId|NoCredential/i.test(
        err?.message || err?.name || '',
      );
      return sendJson(res, 200, {
        configured: true,
        bucket    : RESUME_BUCKET,
        region    : RESUME_REGION,
        reachable : false,
        error     : isCredentialError
          ? 'AWS credentials not configured'
          : (err?.message || 'Bucket unreachable'),
      });
    }
  });

  console.log(
    `  ☁️  S3 resume routes registered` +
    ` (bucket: ${RESUME_BUCKET}, region: ${RESUME_REGION})`,
  );
}
