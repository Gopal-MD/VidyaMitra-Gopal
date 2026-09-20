/**
 * VidyaMitra — Bedrock Service Placeholder
 *
 * Amazon Bedrock Runtime is NOT currently authorized on this account.
 * authorizationStatus = NOT_AUTHORIZED for amazon.nova-lite-v1:0
 *
 * This file defines the interfaces and future flow so Bedrock can be
 * dropped in once authorized — without touching the rest of the codebase.
 *
 * Future flow (DO NOT implement until Bedrock is authorized):
 *   1. User uploads resume → S3:  resumes/{userId}/{key}
 *   2. Server invokes Bedrock with resume text + prompt
 *   3. Bedrock returns structured analysis JSON
 *   4. Analysis stored in DB (resume_analyses table — not yet created)
 *
 * To activate:
 *   1. Request model access in AWS Console → Amazon Bedrock → Model access
 *   2. Confirm authorizationStatus = AUTHORIZED
 *   3. Install:  npm install @aws-sdk/client-bedrock-runtime
 *   4. Implement invokeBedrockAnalysis() below
 *   5. Add POST /api/aws/resume/analyze route in s3Routes.ts
 */

// ── Future input / output types ───────────────────────────────────────────────

/** Input to a future Bedrock resume analysis call */
export interface BedrockResumeAnalysisInput {
  /** Raw text extracted from the resume (from PDF.js or Textract) */
  resumeText : string;
  /** Target job role for the analysis */
  targetRole : string;
  /** S3 key of the source resume file */
  s3Key      : string;
  /** Authenticated user ID */
  userId     : string;
}

/** Output from a future Bedrock resume analysis call */
export interface BedrockResumeAnalysisResult {
  summary          : string;
  strengthsCount   : number;
  weaknessesCount  : number;
  recommendedRoles : string[];
  fitScore         : number;   // 0-100
  rawResponse      : string;
}

// ── Not-yet-implemented stubs ─────────────────────────────────────────────────

/**
 * Invoke Amazon Bedrock to analyse a resume.
 *
 * NOT IMPLEMENTED — Bedrock is not yet authorized.
 * Throws NotAuthorizedError so callers can provide a meaningful fallback.
 */
export async function invokeBedrockResumeAnalysis(
  _input: BedrockResumeAnalysisInput,
): Promise<BedrockResumeAnalysisResult> {
  throw new NotAuthorizedError(
    'Amazon Bedrock is not yet authorized on this account. ' +
    'Request model access in the AWS Console before calling this function.',
  );
}

/** Thrown when Bedrock is called before authorization is granted */
export class NotAuthorizedError extends Error {
  readonly code = 'BEDROCK_NOT_AUTHORIZED';
  constructor(message: string) {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

/**
 * Return true only when Bedrock Runtime is both authorized and reachable.
 * Currently always returns false.
 * Replace with an actual InvokeModel ping once credentials are authorized.
 */
export async function isBedrockAvailable(): Promise<boolean> {
  return false;
}
