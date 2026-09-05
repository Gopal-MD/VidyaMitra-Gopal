// Code Execution Service for Coding Practice
// JavaScript: runs locally in-browser via localEvaluator (instant, offline, 0 credits).
// Other languages (Python/Java/C++): execute via JDoodle API (server-side proxy, 1 credit each).

import {
  CodeExecutionResult,
  TestCase,
  TestResult,
  CodingQuestion,
  ProgrammingLanguage
} from '@/types/coding';
import { submitCodeExecution } from './judge0Service';
import { evaluateLocally } from './localEvaluator';

// ─── Compare outputs ───────────────────────────────────────────────────────

const compareOutputs = (actual: string, expected: string): boolean => {
  const a = actual.trim().replace(/\s+/g, ' ');
  const e = expected.trim().replace(/\s+/g, ' ');
  if (a === e) return true;

  // Normalize array brackets
  const norm = (s: string) => s.replace(/[[\]\s]/g, '');
  if (norm(a) === norm(e)) return true;

  // Numeric comparison
  const nA = parseFloat(a), nE = parseFloat(e);
  if (!isNaN(nA) && !isNaN(nE) && Math.abs(nA - nE) < 1e-5) return true;

  // JSON comparison
  try {
    const jA = JSON.parse(a);
    const jE = e.startsWith('[') || e.startsWith('{') ? JSON.parse(e) : JSON.parse(`[${e}]`);
    if (JSON.stringify(jA) === JSON.stringify(jE)) return true;
  } catch { /* not JSON */ }

  // Boolean
  if (a.toLowerCase() === e.toLowerCase() && (a.toLowerCase() === 'true' || a.toLowerCase() === 'false')) return true;

  return false;
};

// ─── Run a single test case ─────────────────────────────────────────────────

const runTestCase = async (
  code: string,
  testCase: TestCase,
  language: ProgrammingLanguage
): Promise<TestResult> => {
  try {
    // ── LOCAL EVALUATION (instant, no network) for JavaScript ──────────
    if (language === 'javascript') {
      const localResult = await evaluateLocally(code, language, testCase);
      if (localResult.statusDescription !== 'Detection Error') {
        // Local eval worked — use the result
        if (!localResult.success) {
          return {
            testCaseId: testCase.id,
            passed: false,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: localResult.output || '',
            executionTime: localResult.executionTime,
            error: localResult.error,
            isHidden: testCase.isHidden
          };
        }
        const passed = compareOutputs(localResult.output, testCase.expectedOutput);
        return {
          testCaseId: testCase.id,
          passed,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: localResult.output,
          executionTime: localResult.executionTime,
          isHidden: testCase.isHidden
        };
      }
      // Detection Error → fall through to JDoodle
    }

    // ── JDOODLE (server-side, for non-JS or JS fallback) ──────────────
    const execution = await submitCodeExecution(code, language, testCase.input);

    if (execution.error) {
      return {
        testCaseId: testCase.id,
        passed: false,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: execution.output || '',
        executionTime: execution.executionTime,
        error: execution.error,
        isHidden: testCase.isHidden
      };
    }

    const passed = compareOutputs(execution.output, testCase.expectedOutput);

    return {
      testCaseId: testCase.id,
      passed,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: execution.output,
      executionTime: execution.executionTime,
      isHidden: testCase.isHidden
    };
  } catch (error: unknown) {
    return {
      testCaseId: testCase.id,
      passed: false,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: '',
      executionTime: 0,
      error: error instanceof Error ? error.message : 'Execution failed',
      isHidden: testCase.isHidden
    };
  }
};

// ─── Execute code against all test cases ────────────────────────────────────

/**
 * Execute user code against test cases via Judge0.
 * @param code            User's source code
 * @param question        The coding question (has test cases)
 * @param language        Programming language
 * @param runHiddenTests  false → sample tests only ("Run Code"), true → all ("Submit")
 */
export const executeCode = async (
  code: string,
  question: CodingQuestion,
  language: ProgrammingLanguage = 'javascript',
  runHiddenTests: boolean = false
): Promise<CodeExecutionResult> => {
  const startTime = performance.now();

  try {
    if (!code || code.trim().length === 0) {
      return { success: false, output: '', error: 'No code provided', executionTime: 0, memoryUsed: '0 KB' };
    }

    const testCasesToRun = runHiddenTests
      ? question.testCases
      : question.testCases.filter(tc => !tc.isHidden);

    if (testCasesToRun.length === 0) {
      return { success: false, output: '', error: 'No test cases available', executionTime: 0, memoryUsed: '0 KB' };
    }

    // Run each test case sequentially (1 JDoodle credit per test case — JS runs locally/free)
    const testResults: TestResult[] = [];
    for (const tc of testCasesToRun) {
      const result = await runTestCase(code, tc, language);
      testResults.push(result);
    }

    const totalTime = performance.now() - startTime;
    const passedTests = testResults.filter(r => r.passed).length;
    const totalTests = testResults.length;
    const allPassed = passedTests === totalTests;
    const memoryUsed = `${Math.round(code.length / 1024)} KB`;

    return {
      success: allPassed,
      output: allPassed
        ? `All test cases passed! (${passedTests}/${totalTests})`
        : `${passedTests}/${totalTests} test cases passed`,
      executionTime: totalTime,
      memoryUsed,
      testResults,
    };
  } catch (error: unknown) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unexpected error during execution',
      executionTime: performance.now() - startTime,
      memoryUsed: '0 KB',
    };
  }
};

// ─── Utility helpers (unchanged, still exported) ────────────────────────────

export const checkSyntax = (code: string, _language: ProgrammingLanguage = 'javascript'): { valid: boolean; error?: string } => {
  // Quick JS-only check; other languages rely on Judge0 compile feedback
  if (_language !== 'javascript') return { valid: true };
  try { new Function(code); return { valid: true }; }
  catch (e: unknown) { return { valid: false, error: e instanceof Error ? e.message : 'Syntax error' }; }
};

export const estimateComplexity = (code: string): { time: string; space: string } => {
  const hasNestedLoops = (code.match(/for|while/g) || []).length >= 2;
  const hasRecursion = code.includes('function') && code.match(/(\w+)\s*\(.*\).*\1\s*\(/);
  const hasSorting = /sort\(|Sort|quicksort|mergesort/i.test(code);
  const hasHashMap = /Map|Set|object|dictionary/i.test(code);

  let time = 'O(n)', space = 'O(1)';
  if (hasNestedLoops) time = 'O(n²)';
  else if (hasSorting) time = 'O(n log n)';
  else if (hasRecursion) { time = 'O(2^n)?'; space = 'O(n)'; }
  if (hasHashMap) space = 'O(n)';
  return { time, space };
};

export const getCodeTemplate = (language: ProgrammingLanguage, question: CodingQuestion): string => {
  return question.starterCode[language] || question.starterCode['javascript'] || '// Start coding here...';
};

export const formatExecutionTime = (timeMs: number): string => {
  if (timeMs < 1) return `${Math.round(timeMs * 1000)} μs`;
  if (timeMs < 1000) return `${Math.round(timeMs)} ms`;
  return `${(timeMs / 1000).toFixed(2)} s`;
};