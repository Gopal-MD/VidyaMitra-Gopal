// Enhanced Error Handling and User Feedback System
// Provides robust error management with user-friendly messages

export class CodeExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public suggestions: string[] = []
  ) {
    super(message);
    this.name = 'CodeExecutionError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public userMessage: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Error messages with user-friendly explanations
 */
export const ERROR_MESSAGES = {
  // Execution Errors
  TIMEOUT: {
    title: 'Execution Timeout',
    message: 'Your code took too long to execute.',
    suggestions: [
      'Check for infinite loops',
      'Optimize your algorithm',
      'Review time complexity'
    ]
  },
  MEMORY_LIMIT: {
    title: 'Memory Limit Exceeded',
    message: 'Your code used too much memory.',
    suggestions: [
      'Reduce array sizes',
      'Use more efficient data structures',
      'Avoid unnecessary copies of data'
    ]
  },
  COMPILATION_ERROR: {
    title: 'Compilation Error',
    message: 'Your code has syntax errors.',
    suggestions: [
      'Check for missing semicolons or brackets',
      'Verify variable declarations',
      'Review language syntax'
    ]
  },
  RUNTIME_ERROR: {
    title: 'Runtime Error',
    message: 'An error occurred while running your code.',
    suggestions: [
      'Check array bounds',
      'Verify null/undefined values',
      'Add error handling'
    ]
  },
  
  // Validation Errors
  INVALID_INPUT: {
    title: 'Invalid Input',
    message: 'The provided input is not valid.',
    suggestions: [
      'Check input format',
      'Verify data types',
      'Review problem requirements'
    ]
  },
  CODE_TOO_LONG: {
    title: 'Code Too Long',
    message: 'Your code exceeds the maximum allowed length.',
    suggestions: [
      'Simplify your solution',
      'Remove unnecessary code',
      'Focus on core logic'
    ]
  },
  MISSING_FUNCTION: {
    title: 'Function Not Found',
    message: 'Could not find the required function in your code.',
    suggestions: [
      'Check function name matches requirements',
      'Ensure function is properly defined',
      'Verify function signature'
    ]
  },
  
  // API Errors
  API_UNAVAILABLE: {
    title: 'Service Unavailable',
    message: 'The code execution service is temporarily unavailable.',
    suggestions: [
      'Try again in a few moments',
      'Check your internet connection',
      'Contact support if problem persists'
    ]
  },
  RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'You\'ve made too many requests. Please wait a moment.',
    suggestions: [
      'Wait a few seconds before trying again',
      'Avoid rapid consecutive submissions',
      'Consider testing locally first'
    ]
  },
  API_KEY_INVALID: {
    title: 'Configuration Error ',
    message: 'There\'s a problem with the service configuration.',
    suggestions: [
      'Contact your administrator',
      'Check system configuration',
      'Verify API credentials'
    ]
  },
  
  // Network Errors
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Could not connect to the server.',
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Verify firewall settings'
    ]
  },
  
  // Generic Error
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    suggestions: [
      'Try submitting your code again',
      'Check browser console for details',
      'Report this issue if it persists'
    ]
  }
};

/**
 * Parse error and provide user-friendly feedback
 */
export const parseExecutionError = (error: unknown): {
  title: string;
  message: string;
  technicalDetails: string;
  suggestions: string[];
  severity: 'error' | 'warning' | 'info';
} => {
  // Handle known error types
  if (error instanceof CodeExecutionError) {
    const errorInfo = ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.UNKNOWN_ERROR;
    return {
      title: errorInfo.title,
      message: error.userMessage || errorInfo.message,
      technicalDetails: error.message,
      suggestions: error.suggestions.length > 0 ? error.suggestions : errorInfo.suggestions,
      severity: 'error'
    };
  }

  if (error instanceof ValidationError) {
    return {
      title: 'Validation Error',
      message: error.userMessage,
      technicalDetails: `Field: ${error.field} - ${error.message}`,
      suggestions: ['Please correct the highlighted field', 'Check input requirements'],
      severity: 'warning'
    };
  }

  if (error instanceof APIError) {
    let errorKey: keyof typeof ERROR_MESSAGES = 'UNKNOWN_ERROR';
    
    if (error.statusCode === 429) errorKey = 'RATE_LIMIT';
    else if (error.statusCode === 503) errorKey = 'API_UNAVAILABLE';
    else if (error.statusCode === 401 || error.statusCode === 403) errorKey = 'API_KEY_INVALID';
    
    const errorInfo = ERROR_MESSAGES[errorKey];
    
    return {
      title: errorInfo.title,
      message: error.userMessage || errorInfo.message,
      technicalDetails: `Status ${error.statusCode}: ${error.message}`,
      suggestions: errorInfo.suggestions,
      severity: 'error'
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Check for specific error patterns in message
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('time limit')) {
      return {
        ...ERROR_MESSAGES.TIMEOUT,
        technicalDetails: error.message,
        severity: 'error'
      };
    }
    
    if (message.includes('memory')) {
      return {
        ...ERROR_MESSAGES.MEMORY_LIMIT,
        technicalDetails: error.message,
        severity: 'error'
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        ...ERROR_MESSAGES.NETWORK_ERROR,
        technicalDetails: error.message,
        severity: 'error'
      };
    }
    
    if (message.includes('syntax') || message.includes('parse')) {
      return {
        ...ERROR_MESSAGES.COMPILATION_ERROR,
        technicalDetails: error.message,
        severity: 'error'
      };
    }
    
    return {
      ...ERROR_MESSAGES.UNKNOWN_ERROR,
      technicalDetails: error.message,
      severity: 'error'
    };
  }

  // Unknown error type
  return {
    ...ERROR_MESSAGES.UNKNOWN_ERROR,
    technicalDetails: String(error),
    severity: 'error'
  };
};

/**
 * Log error with context for debugging
 */
export const logError = (
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void => {
  const timestamp = new Date().toISOString();
  const parsed = parseExecutionError(error);
  
  console.error(`[${timestamp}] ${context}:`, {
    ...parsed,
    additionalData,
    stack: error instanceof Error ? error.stack : undefined
  });
};

/**
 * Create success feedback message
 */
export const createSuccessMessage = (title: string, message: string): {
  title: string;
  message: string;
  severity: 'success';
} => ({
  title,
  message,
  severity: 'success'
});

/**
 * Create warning feedback message
 */
export const createWarningMessage = (title: string, message: string, suggestions: string[] = []): {
  title: string;
  message: string;
  suggestions: string[];
  severity: 'warning';
} => ({
  title,
  message,
  suggestions,
  severity: 'warning'
});

/**
 * Create info feedback message
 */
export const createInfoMessage = (title: string, message: string): {
  title: string;
  message: string;
  severity: 'info';
} => ({
  title,
  message,
  severity: 'info'
});

/**
 * Retry helper with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export default {
  parseExecutionError,
  logError,
  createSuccessMessage,
  createWarningMessage,
  createInfoMessage,
  retryWithBackoff,
  CodeExecutionError,
  ValidationError,
  APIError,
};