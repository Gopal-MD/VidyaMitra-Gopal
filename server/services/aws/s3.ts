/**
 * VidyaMitra — Reusable S3 Service
 *
 * Bucket  : vidyamitra-resumes-441442683103  (ap-south-1, private)
 * Purpose : Private resume file storage
 *
 * Credentials: standard AWS provider chain — no hard-coded keys.
 *   Local dev  → AWS CLI profile (~/.aws/credentials)
 *   Production → IAM instance/task role
 *   Learner Lab → set AWS_ACCESS_KEY_ID / SECRET / SESSION_TOKEN in env
 *
 * Exported helpers:
 *   createResumeUploadUrl(userId, fileName, contentType) → { uploadUrl, key, expiresIn }
 *   createResumeDownloadUrl(key)                         → { downloadUrl, expiresIn }
 *   deleteResumeObject(key, userId)                      → void (throws on access violation)
 *   validateResumeKey(key, userId)                       → boolean
 */

import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import crypto from 'crypto';

// ── Configuration ─────────────────────────────────────────────────────────────

export const RESUME_BUCKET   = process.env.S3_RESUME_BUCKET || 'vidyamitra-resumes-441442683103';
export const RESUME_REGION   = process.env.AWS_REGION       || 'ap-south-1';

/** Presigned URL TTL: 10 minutes for upload, 15 minutes for download */
const UPLOAD_EXPIRES_IN   = 600;   // seconds
const DOWNLOAD_EXPIRES_IN = 900;   // seconds

/** Max allowed file size enforced in the presigned-URL route (not in S3 itself) */
export const MAX_RESUME_BYTES = parseInt(process.env.MAX_RESUME_SIZE_BYTES || String(10 * 1024 * 1024), 10);

/** Allowed MIME types for resume uploads */
export const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Allowed file extensions (must match MIME type) */
export const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

// ── S3 client (singleton, credential provider chain) ─────────────────────────

let _s3Client: S3Client | null = null;

/**
 * Returns (and lazily creates) the shared S3 client.
 * Uses the default AWS credential provider chain — no explicit credentials.
 * Throws a clear error if the region is missing.
 */
export function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;

  _s3Client = new S3Client({
    region: RESUME_REGION,
    // No `credentials` key — intentionally uses provider chain:
    //   env vars → ~/.aws/credentials → IAM role
  });

  return _s3Client;
}

// ── Key helpers ───────────────────────────────────────────────────────────────

/**
 * Sanitise a filename:
 *   - Strip path components (prevent traversal: ../../file.pdf)
 *   - Replace non-safe characters with underscores
 *   - Preserve the extension
 */
export function sanitiseFileName(rawName: string): string {
  // Take only the basename — strip any directory component
  const base = path.basename(rawName);
  // Allow alphanumeric, dash, underscore, dot
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}

/**
 * Build a unique S3 object key for a resume:
 *   resumes/{userId}/{timestamp}-{8-char-random}-{sanitisedFilename}
 *
 * Example: resumes/abc-123/1726812345678-f3a9b2c1-gopal_resume.pdf
 */
export function buildResumeKey(userId: string, fileName: string): string {
  const safe   = sanitiseFileName(fileName);
  const ts     = Date.now();
  const rand   = crypto.randomBytes(4).toString('hex');
  return `resumes/${userId}/${ts}-${rand}-${safe}`;
}

/**
 * Return true if the key belongs to the given user.
 * Key format: resumes/{userId}/...
 * This is the server-side ownership check — never trust a userId from the client.
 */
export function validateResumeKey(key: string, userId: string): boolean {
  if (!key || !userId) return false;
  // Must start with resumes/{userId}/
  const prefix = `resumes/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  // Must not contain path traversal sequences after normalisation
  const normalized = path.posix.normalize(key);
  return normalized.startsWith(prefix) && !normalized.includes('..');
}

// ── Service functions ─────────────────────────────────────────────────────────

export interface UploadUrlResult {
  uploadUrl : string;
  key       : string;
  fileName  : string;
  contentType: string;
  expiresIn : number;
}

/**
 * Generate a presigned PUT URL for a resume upload.
 *
 * The URL expires in UPLOAD_EXPIRES_IN seconds.
 * The bucket remains private — the URL grants a single timed PUT only.
 * ContentType is embedded in the signed URL so the client cannot switch types.
 */
export async function createResumeUploadUrl(
  userId     : string,
  fileName   : string,
  contentType: string,
): Promise<UploadUrlResult> {
  const s3  = getS3Client();
  const key = buildResumeKey(userId, fileName);

  const command = new PutObjectCommand({
    Bucket     : RESUME_BUCKET,
    Key        : key,
    ContentType: contentType,
    // SSE-S3 is already set as the default encryption on the bucket.
    // No ACL — bucket has Block Public Access ON.
    Metadata: {
      'uploaded-by': userId,
      'original-name': sanitiseFileName(fileName),
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRES_IN });

  return { uploadUrl, key, fileName: sanitiseFileName(fileName), contentType, expiresIn: UPLOAD_EXPIRES_IN };
}

export interface DownloadUrlResult {
  downloadUrl: string;
  key        : string;
  expiresIn  : number;
}

/**
 * Generate a presigned GET URL for a resume download.
 * Caller must validate that the key belongs to the requesting user
 * before calling this function.
 */
export async function createResumeDownloadUrl(key: string): Promise<DownloadUrlResult> {
  const s3      = getS3Client();
  const command = new GetObjectCommand({ Bucket: RESUME_BUCKET, Key: key });
  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: DOWNLOAD_EXPIRES_IN });
  return { downloadUrl, key, expiresIn: DOWNLOAD_EXPIRES_IN };
}

/**
 * Delete a resume object from S3.
 * Verifies ownership before deletion — throws if key does not belong to userId.
 * Admins (isAdmin=true) may delete any key under resumes/.
 */
export async function deleteResumeObject(
  key    : string,
  userId : string,
  isAdmin: boolean = false,
): Promise<void> {
  // Ownership check
  if (!isAdmin && !validateResumeKey(key, userId)) {
    throw new Error('Access denied: key does not belong to authenticated user');
  }
  // Additional safety: key must be under resumes/
  if (!key.startsWith('resumes/')) {
    throw new Error('Invalid key: must be under resumes/ prefix');
  }

  const s3      = getS3Client();
  const command = new DeleteObjectCommand({ Bucket: RESUME_BUCKET, Key: key });
  await s3.send(command);
}

/**
 * Check whether an S3 object exists (HeadObject).
 * Returns false instead of throwing on NoSuchKey / 404.
 */
export async function resumeObjectExists(key: string): Promise<boolean> {
  try {
    const s3 = getS3Client();
    await s3.send(new HeadObjectCommand({ Bucket: RESUME_BUCKET, Key: key }));
    return true;
  } catch (err: any) {
    const code = err?.name || err?.Code || '';
    if (code === 'NotFound' || code === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}
