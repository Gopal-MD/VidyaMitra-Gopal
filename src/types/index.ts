
export interface JobRole {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export interface Question {
  id: number | string;
  text: string;
  category: "technical" | "behavioral" | "situational";
}

export interface Feedback {
  relevance: number;
  clarity: number;
  confidence: number;
  suggestions: string[];
  tone: "confident" | "neutral" | "uncertain";
  overall: number;
  possiblyAI?: boolean;
  aiConfidence?: number; // 0-100 confidence score
  aiAnalysis?: {
    indicators: string[];
    humanSignals: string[];
    structureScore: number;
    vocabularyScore: number;
    naturalnessScore: number;
  };
  strengths?: string[];
  weaknesses?: string[];
  final_feedback?: string;
}

export interface Answer {
  questionId: number | string;
  text: string;
  feedback?: Feedback;
}

export interface ResumeData {
  fileName: string;
  uploadDate: string;
  parsedData: {
    name?: string;
    email?: string;
    phone?: string;
    skills: string[];
    experience: string[];
    education: string[];
    certifications: string[];
    totalExperienceYears?: number;
  };
  atsScore: number;
  atsAnalysis: {
    matchedSkills: string[];
    missingSkills: string[];
    experienceMatch: number;
    educationMatch: number;
    overallMatch: number;
  };
}

export interface InterviewSession {
  id: string;
  roleId: string;
  roleName: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  userId?: string;
  userEmail?: string;
  questions: Question[];
  answers: Answer[];
  completed: boolean;
  score?: number;
  feedback?: string;
  selected?: boolean;
  messageGenerated?: boolean;
  aborted?: boolean;
  abortReason?: string;
  aiDetectionCount?: number;
  resume?: ResumeData;
  isPracticeMode?: boolean;
  outcome?: string;
  // Multi-round interview fields
  round?: number; // 1 for aptitude, 2 for mock interview
  aptitudeRoundId?: string; // Reference to Round 1 aptitude result
  selectedForRound2?: boolean; // Admin selection for Round 2
  round2EmailSent?: boolean; // Track if email notification was sent
}

// Utility types and helpers for type safety
export type FeedbackTone = "confident" | "neutral" | "uncertain";

export const ensureValidTone = (tone: string): FeedbackTone => {
  if (tone === "confident" || tone === "uncertain") {
    return tone;
  }
  return "neutral"; // Default fallback
};

// Interview outcome based on score
export type InterviewOutcome = "passed" | "conditionalPass" | "failed";

export const getInterviewOutcome = (score: number): InterviewOutcome => {
  if (score >= 6) return "passed";
  if (score >= 4) return "conditionalPass";
  return "failed";
};

// Round 1 (Aptitude) Result for Formal Interviews
export interface RoundOneAptitudeResult {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  roleId: string;
  roleName: string;
  score: number; // Percentage score
  totalQuestions: number;
  correctAnswers: number;
  categoryPerformance: {
    [category: string]: {
      correct: number;
      total: number;
      percentage: number;
    };
  };
  completedAt: string;
  // Proctoring / Abort
  aborted?: boolean;
  abortReason?: string;
  // Admin actions
  selectedForRound2?: boolean;
  round2EmailSent?: boolean;
  round2InterviewId?: string; // Link to Round 2 interview if completed
}
