import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { TestResult, CodeExecutionResult } from '@/types/coding';
import { formatExecutionTime } from '@/utils/codeExecutionService';
import { motion } from 'framer-motion';

interface TestCaseResultsProps {
  result: CodeExecutionResult | null;
  isRunning: boolean;
}

export const TestCaseResults = ({ result, isRunning }: TestCaseResultsProps) => {
  if (isRunning) {
    return (
      <div className="h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 dark:border-gray-500 mx-auto mb-3"></div>
          <p className="text-foreground font-medium text-sm mb-1">Compiling and running...</p>
          <p className="text-muted-foreground text-xs">Please wait</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-full w-fit mx-auto mb-3">
            <Zap className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <p className="text-foreground font-medium text-sm mb-1">No output yet</p>
          <p className="text-muted-foreground text-xs">
            Click <span className="text-foreground font-medium">"Run Code"</span> to test your solution
          </p>
        </div>
      </div>
    );
  }

  const { testResults = [], success, error, executionTime, memoryUsed } = result;
  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header with Status */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {success ? (
          <div className="text-left">
            <h3 className="text-green-400 text-lg font-semibold mb-1">
              ✓ Success
            </h3>
            <p className="text-muted-foreground text-sm">
              All test cases passed
            </p>
          </div>
        ) : error ? (
          <div className="text-left">
            <h3 className="text-red-400 text-lg font-semibold mb-1">
              Compilation Error
            </h3>
            <p className="text-muted-foreground text-sm">
              Please fix the errors and try again
            </p>
          </div>
        ) : (
          <div className="text-left">
            <h3 className="text-red-400 text-lg font-semibold mb-1">
              Wrong Answer :(
            </h3>
            <p className="text-muted-foreground text-sm">
              {passedCount}/{totalCount} test cases failed
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          /* Compilation Error */
          <div className="p-4">
            <div className="bg-gray-200 dark:bg-gray-800 rounded p-4 border border-gray-300 dark:border-gray-700">
              <h4 className="text-red-400 font-semibold mb-2">Compiler Message</h4>
              <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 border border-gray-300 dark:border-gray-600">
                <pre className="text-foreground text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {error}
                </pre>
              </div>
            </div>
          </div>
        ) : testResults.length > 0 ? (
          /* Test Cases */
          <div className="flex h-full">
            {/* Left: Test Case Tabs */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-200 dark:bg-gray-800">
              <div className="p-3">
                {testResults.map((test, index) => (
                  <div
                    key={test.testCaseId}
                    className={`p-3 mb-2 cursor-pointer flex items-center gap-2 text-sm ${
                      test.passed
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {test.passed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="font-medium">
                      {test.isHidden ? `Test case ${index + 1}` : `Sample Test case ${index}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Test Details */}
            <div className="flex-1 p-4">
              {!success && testResults.length > 0 && (
                <div className="space-y-4">
                  {/* Show first failed test case */}
                  {(() => {
                    const firstFailed = testResults.find(t => !t.passed);
                    if (!firstFailed) return null;

                    return (
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Input */}
                          <div>
                            <h4 className="text-muted-foreground text-sm font-semibold mb-2">Input (stdin)</h4>
                            <div className="bg-gray-200 dark:bg-gray-800 rounded p-3 border border-gray-300 dark:border-gray-600 min-h-24">
                              <pre className="text-foreground text-sm font-mono whitespace-pre-wrap">
                                {firstFailed.input}
                              </pre>
                            </div>
                          </div>

                          {/* Your Output */}
                          <div>
                            <h4 className="text-muted-foreground text-sm font-semibold mb-2">Your Output (stdout)</h4>
                            <div className="bg-gray-200 dark:bg-gray-800 rounded p-3 border border-gray-300 dark:border-gray-600 min-h-24">
                              <pre className="text-foreground text-sm font-mono whitespace-pre-wrap">
                                {firstFailed.actualOutput || 'No output'}
                              </pre>
                            </div>
                          </div>

                          {/* Expected Output */}
                          <div className="col-span-2">
                            <h4 className="text-muted-foreground text-sm font-semibold mb-2">Expected Output</h4>
                            <div className="bg-gray-200 dark:bg-gray-800 rounded p-3 border border-gray-300 dark:border-gray-600">
                              <pre className="text-foreground text-sm font-mono whitespace-pre-wrap">
                                {firstFailed.expectedOutput}
                              </pre>
                            </div>
                          </div>
                        </div>

                        {/* Download link */}
                        <div className="mt-4">
                          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                            Download
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {success && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <p className="text-foreground text-lg font-semibold mb-2">All test cases passed!</p>
                  <div className="text-muted-foreground text-sm">
                    <p>Execution time: {formatExecutionTime(executionTime)}</p>
                    <p>Memory used: {memoryUsed}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
