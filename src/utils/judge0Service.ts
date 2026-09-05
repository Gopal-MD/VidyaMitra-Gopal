/**
 * JDoodle Code Execution Service
 *
 * Replaces Judge0. JDoodle is SYNCHRONOUS — one call returns output immediately,
 * no polling needed. This is critical for preserving the 20 free credits/day.
 *
 * Credit usage:
 *   • JavaScript → 0 credits (runs locally in-browser via localEvaluator)
 *   • Python / Java / C++ → 1 credit per test case execution
 *
 * Server proxy: /api/jdoodle/execute (keeps clientId + clientSecret server-side)
 */

import { SECURITY_CONFIG } from '@/config/apiKeys';
import { getAuthToken } from '@/lib/api';
import { ProgrammingLanguage } from '@/types/coding';

// ── JDoodle language identifiers ─────────────────────────────────────────────
// Full list: https://www.jdoodle.com/compiler-api/
export const JDOODLE_LANGUAGES: Record<ProgrammingLanguage, { language: string; versionIndex: string }> = {
  javascript: { language: 'nodejs',  versionIndex: '4' },  // Node.js 20 (handled locally, no credits used)
  python:     { language: 'python3', versionIndex: '3' },  // Python 3.9
  java:       { language: 'java',    versionIndex: '4' },  // Java 17
  cpp:        { language: 'cpp17',   versionIndex: '0' },  // C++17
};

// Legacy Judge0 language IDs — kept for any external references
export const LANGUAGE_IDS: Record<ProgrammingLanguage, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memory?: number;
  statusDescription?: string;
}

// ── Auth header helper ────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// ── Code sanitizer (unchanged from Judge0 service) ────────────────────────────

const sanitizeCode = (
  code: string,
  language: ProgrammingLanguage
): { sanitized: string; warnings: string[] } => {
  const warnings: string[] = [];
  let sanitized = code;

  if (!SECURITY_CONFIG.ENABLE_CODE_SANITIZATION) {
    return { sanitized, warnings };
  }

  if (code.length > SECURITY_CONFIG.MAX_CODE_LENGTH) {
    throw new Error(
      `Code exceeds maximum length of ${SECURITY_CONFIG.MAX_CODE_LENGTH} characters`
    );
  }

  const dangerousPatterns: Record<ProgrammingLanguage, RegExp[]> = {
    javascript: [
      /require\s*\(\s*['"]child_process['"]\s*\)/gi,
      /require\s*\(\s*['"]fs['"]\s*\)/gi,
    ],
    python: [/import\s+subprocess/gi, /__import__\s*\(/gi],
    java:   [/Runtime\.getRuntime\(\)/gi, /ProcessBuilder/gi],
    cpp:    [/system\s*\(/gi, /popen\s*\(/gi],
  };

  const patterns = dangerousPatterns[language] || [];
  for (const pattern of patterns) {
    if (pattern.test(code)) {
      warnings.push(`Potentially dangerous pattern detected: ${pattern.source}`);
    }
  }

  // eslint-disable-next-line no-control-regex
  sanitized = sanitized
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return { sanitized, warnings };
};

// ── Core JDoodle execution via server proxy ───────────────────────────────────

/**
 * Execute code via the server-side JDoodle proxy (/api/jdoodle/execute).
 * JDoodle is synchronous — result comes back in the same HTTP response.
 * No polling, no tokens, minimal API calls = minimal credit usage.
 */
export const executeWithJDoodle = async (
  sourceCode: string,
  language: ProgrammingLanguage,
  stdin: string = ''
): Promise<ExecutionResult> => {
  const startTime = performance.now();

  const langConfig = JDOODLE_LANGUAGES[language];
  if (!langConfig) throw new Error(`Unsupported language: ${language}`);

  const res = await fetch('/api/jdoodle/execute', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      script: sourceCode,
      language: langConfig.language,
      versionIndex: langConfig.versionIndex,
      stdin,
    }),
  });

  const execTimeMs = performance.now() - startTime;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as any;
    // 429 = daily limit hit
    if (res.status === 429) {
      return {
        success: false,
        output: '',
        error: err.error || 'JDoodle daily limit reached (20/day). Try using JavaScript which runs locally.',
        executionTime: execTimeMs,
        statusDescription: 'Rate Limited',
      };
    }
    // 503 = not configured
    if (res.status === 503) {
      return {
        success: false,
        output: '',
        error: 'Code execution not configured. Contact the administrator to set up JDoodle credentials.',
        executionTime: execTimeMs,
        statusDescription: 'Not Configured',
      };
    }
    throw new Error(err.error || `JDoodle proxy error (${res.status})`);
  }

  const data = await res.json() as {
    output: string;
    statusCode: number;
    memory: string;
    cpuTime: string;
    isExecutionSuccess: boolean;
    error?: string;
  };

  if (!data.isExecutionSuccess && data.error) {
    return {
      success: false,
      output: data.output || '',
      error: data.error,
      executionTime: parseFloat(data.cpuTime || '0') * 1000 || execTimeMs,
      statusDescription: 'Error',
    };
  }

  const output = (data.output || '').trim();

  // JDoodle includes compile errors in output when execution fails
  const isCompileError = !data.isExecutionSuccess &&
    (output.includes('error:') || output.includes('Exception') || output.includes('SyntaxError'));

  if (!data.isExecutionSuccess) {
    return {
      success: false,
      output: '',
      error: output || 'Execution failed',
      executionTime: parseFloat(data.cpuTime || '0') * 1000 || execTimeMs,
      statusDescription: isCompileError ? 'Compilation Error' : 'Runtime Error',
    };
  }

  return {
    success: true,
    output,
    executionTime: parseFloat(data.cpuTime || '0') * 1000 || execTimeMs,
    statusDescription: 'Accepted',
  };
};

// ── Backward-compatible wrapper (replaces Judge0's submitCodeExecution) ────────

/**
 * Drop-in replacement for the old Judge0 `submitCodeExecution`.
 * Called by codeExecutionService.ts for non-JavaScript languages.
 */
export const submitCodeExecution = async (
  code: string,
  language: ProgrammingLanguage,
  input: string = ''
): Promise<ExecutionResult> => {
  const { sanitized, warnings } = sanitizeCode(code, language);
  if (warnings.length > 0) console.warn('Code sanitization warnings:', warnings);

  return executeWithJDoodle(sanitized, language, input);
};

/**
 * Test JDoodle connection with a simple Python hello-world.
 */
export const testJDoodleConnection = async (): Promise<boolean> => {
  try {
    const result = await submitCodeExecution('print("Hello JDoodle!")', 'python', '');
    return result.success && result.output.includes('Hello');
  } catch {
    return false;
  }
};

// Legacy alias for any code that imported testJudge0Connection
export const testJudge0Connection = testJDoodleConnection;

export default {
  executeWithJDoodle,
  submitCodeExecution,
  testJDoodleConnection,
  testJudge0Connection,
  JDOODLE_LANGUAGES,
  LANGUAGE_IDS,
};
