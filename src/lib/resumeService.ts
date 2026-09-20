/**
 * Resume Service
 * Handles S3 file upload (presigned PUT) and database metadata storage.
 *
 * S3 Architecture:
 *   Browser → POST /api/aws/resume/upload → Backend generates presigned PUT URL
 *   Browser → PUT {presignedUrl} (direct to S3, no server hop for the file)
 *   Browser → PUT /api/aws/resume/metadata (optional — attach s3Key to DB row)
 *
 * AWS credentials never reach the browser.
 * The bucket remains private (Block Public Access ON).
 */

import { resumesApi, resumeS3Api } from './api';
import { ParsedResume } from '@/utils/resumeParser';

// ── Max file size (10 MB) — mirrors the server-side constant ──────────────────
const MAX_FILE_BYTES = 10 * 1024 * 1024;

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

// ── Result type ───────────────────────────────────────────────────────────────
export interface S3UploadResult {
  s3Key      : string;
  fileName   : string;
  contentType: string;
  fileSize   : number;
}

/**
 * Upload a resume file to private S3 using a server-generated presigned PUT URL.
 *
 * Flow:
 *   1. Client-side validation (type + size).
 *   2. POST /api/aws/resume/upload  → backend returns { uploadUrl, key, … }.
 *   3. PUT  {uploadUrl}             → file goes directly to S3 (no server hop).
 *   4. Return the S3 key so callers can persist it to the DB.
 *
 * Returns null if S3 is not configured (e.g. local dev without AWS credentials).
 * Never throws — failures are logged and null is returned so callers can degrade
 * gracefully (ATS analysis still works without S3).
 */
export const uploadResumeToS3 = async (file: File): Promise<S3UploadResult | null> => {
  // 1. Client-side validation
  if (!ALLOWED_TYPES.has(file.type)) {
    console.warn('[S3] Skipped upload — unsupported type:', file.type);
    return null;
  }
  if (file.size > MAX_FILE_BYTES) {
    console.warn('[S3] Skipped upload — file too large:', file.size, 'bytes');
    return null;
  }
  if (file.size === 0) {
    console.warn('[S3] Skipped upload — empty file');
    return null;
  }

  try {
    // 2. Get presigned PUT URL from backend
    const { uploadUrl, key } = await resumeS3Api.requestUploadUrl(
      file.name,
      file.type,
      file.size,
    );

    if (!uploadUrl || !key) {
      console.warn('[S3] Backend did not return uploadUrl/key — S3 may not be configured');
      return null;
    }

    // 3. PUT file directly to S3 (presigned URL is short-lived, ~10 min)
    await resumeS3Api.uploadToS3(uploadUrl, file);

    console.log('[S3] Resume uploaded successfully:', key);
    return {
      s3Key      : key,
      fileName   : file.name,
      contentType: file.type,
      fileSize   : file.size,
    };

  } catch (err: any) {
    // S3 errors must never block the resume ATS analysis workflow
    const msg: string = err?.message || String(err);
    const isCredential = /credential|ExpiredToken|NoCredential|aws/i.test(msg);
    if (isCredential) {
      console.warn('[S3] AWS credentials not configured — resume stored in DB only');
    } else {
      console.error('[S3] Upload failed:', msg);
    }
    return null;
  }
};

// ── saveResumeToFirestore (name kept for backward compat) ─────────────────────
// Saves resume metadata to the VidyaMitra DB via /api/resumes.
// If an s3Key is provided it is included in the POST body.
export const saveResumeToFirestore = async (
  userId: string,
  resume: ParsedResume,
  s3Result?: S3UploadResult | null,
): Promise<{ success: boolean; resumeId: string }> => {
  try {
    const data = await resumesApi.save({
      fileName   : resume.fileName,
      rawText    : resume.rawText,
      parsedData : resume.extractedData,
      atsScore   : 0,
      targetRole : '',
      // S3 fields — only present when upload succeeded
      ...(s3Result ? {
        s3Key      : s3Result.s3Key,
        contentType: s3Result.contentType,
        fileSize   : s3Result.fileSize,
      } : {}),
    });
    return { success: true, resumeId: data.id || '' };
  } catch (error) {
    console.error('[DB] Error saving resume metadata:', error);
    return { success: false, resumeId: '' };
  }
};

// ── getUserResumes ─────────────────────────────────────────────────────────────
export const getUserResumes = async (_userId: string): Promise<ParsedResume[]> => {
  try {
    const data = await resumesApi.getAll();
    return (data.resumes || []).map((r: any) => ({
      fileName   : r.file_name || r.fileName,
      rawText    : r.raw_text  || r.rawText  || '',
      extractedData: typeof r.parsed_data === 'string'
        ? JSON.parse(r.parsed_data)
        : (r.parsed_data || r.parsedData || {}),
    }));
  } catch {
    return [];
  }
};

// ── processResumeForInterview ─────────────────────────────────────────────────
export const processResumeForInterview = async (
  file  : File,
  userId: string,
): Promise<{ success: boolean; resume?: ParsedResume; error?: string }> => {
  try {
    const { parseResumeFile } = await import('@/utils/resumeParser');
    const parsedResume = await parseResumeFile(file);

    // Fire-and-forget S3 upload — does not block interview flow
    const s3Result = await uploadResumeToS3(file);

    const { success } = await saveResumeToFirestore(userId, parsedResume, s3Result);
    if (!success) {
      return { success: false, error: 'Failed to save resume to database' };
    }
    return { success: true, resume: parsedResume };
  } catch (error) {
    console.error('Error processing resume for interview:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process resume',
    };
  }
};
