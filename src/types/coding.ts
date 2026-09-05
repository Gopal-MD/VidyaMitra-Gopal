// Type definitions for Coding Practice feature

export interface CodingQuestion {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string; // Arrays, Strings, Dynamic Programming, etc.
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: CodingExample[];
  testCases: TestCase[];
  starterCode: Record<string, string>; // language -> code template
  hints: string[];
  topics: string[]; // For learning recommendations
  timeLimit?: number; // in minutes (optional for practice)
  memoryLimit?: string; // e.g., "256 MB"
}

export interface CodingExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean; // Some test cases are hidden from user view
  weight: number; // For weighted scoring
  description?: string;
}

export interface CodingSubmission {
  questionId: string;
  questionTitle: string;
  code: string;
  language: string;
  passed: boolean;
  passedTests: number;
  totalTests: number;
  executionTime: number; // in milliseconds
  memoryUsed: string;
  attempts: number;
  hintsUsed: number;
  timestamp: string;
  feedback: SubmissionFeedback;
}

export interface SubmissionFeedback {
  correctness: number; // 0-100
  efficiency: number; // 0-100 (based on time complexity)
  codeQuality: number; // 0-100 (AI analysis)
  overallScore: number; // 0-100
  suggestions: string[];
  strengths: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface CodingSession {
  id: string;
  userId: string;
  userEmail?: string;
  date: string;
  startTime: string;
  endTime?: string;
  problemsSolved: number;
  totalProblems: number;
  score: number; // Average score across all submissions
  timeSpent: number; // in minutes
  submissions: CodingSubmission[];
  weakAreas: string[]; // Categories where user struggled
  strongAreas: string[];
  completed: boolean;
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  error?: string;
  isHidden: boolean;
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed: string;
  testResults?: TestResult[];
}

export type ProgrammingLanguage = 'javascript' | 'python' | 'java' | 'cpp';

export interface LanguageConfig {
  id: ProgrammingLanguage;
  name: string;
  monacoId: string; // Monaco editor language ID
  extension: string;
  commentSymbol: string;
}

// Supported programming languages
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoId: 'javascript',
    extension: '.js',
    commentSymbol: '//'
  },
  {
    id: 'python',
    name: 'Python',
    monacoId: 'python',
    extension: '.py',
    commentSymbol: '#'
  },
  {
    id: 'java',
    name: 'Java',
    monacoId: 'java',
    extension: '.java',
    commentSymbol: '//'
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoId: 'cpp',
    extension: '.cpp',
    commentSymbol: '//'
  }
];

// Helper function to get language config
export const getLanguageConfig = (langId: ProgrammingLanguage): LanguageConfig => {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === langId) || SUPPORTED_LANGUAGES[0];
};

// Difficulty colors for UI
export const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  hard: 'bg-red-100 text-red-800 border-red-300'
} as const;

// Category colors for UI
export const CATEGORY_COLORS: Record<string, string> = {
  'Arrays': 'bg-blue-100 text-blue-800',
  'Strings': 'bg-purple-100 text-purple-800',
  'Hash Maps': 'bg-pink-100 text-pink-800',
  'Two Pointers': 'bg-indigo-100 text-indigo-800',
  'Sliding Window': 'bg-cyan-100 text-cyan-800',
  'Dynamic Programming': 'bg-orange-100 text-orange-800',
  'Trees': 'bg-green-100 text-green-800',
  'Graphs': 'bg-teal-100 text-teal-800',
  'Linked Lists': 'bg-rose-100 text-rose-800',
  'Recursion': 'bg-amber-100 text-amber-800',
  'Backtracking': 'bg-lime-100 text-lime-800',
  'Sorting': 'bg-emerald-100 text-emerald-800',
  'Searching': 'bg-violet-100 text-violet-800'
};
