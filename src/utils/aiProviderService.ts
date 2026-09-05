/**
 * AI Provider Service — Unified abstraction layer
 * 
 * Routes AI calls to either Gemini (direct frontend), OpenAI (backend proxy), or Groq (direct frontend)
 * based on the current provider selection.
 * 
 * Provider preference is stored in localStorage and can be toggled
 * from the Admin Dashboard.
 */

// Gemini services (direct frontend calls)
import {
  generateQuestionsWithGemini,
  evaluateAnswerWithGemini,
  evaluateBatchAnswersWithGemini,
  analyzeResumeWithGemini,
  testGeminiAPI,
} from './geminiService';
import type {
  GeneratedQuestion,
  AIEvaluationResult,
  BatchEvaluationInput,
  BatchEvaluationResult,
  AIATSAnalysis,
} from './geminiService';

// OpenAI services (via backend proxy)
import {
  generateQuestionsWithOpenAI,
  evaluateAnswerWithOpenAI,
  evaluateBatchAnswersWithOpenAI,
  analyzeResumeWithOpenAI,
  testOpenAIAPI,
} from './openaiService';

// Groq services (direct frontend calls)
import {
  analyzeResumeWithGroq,
  generateQuestionsWithGroq,
  testGroqAPI,
} from './groqService';

// ==================== TYPES ====================

export type AIProvider = 'gemini' | 'openai' | 'groq';

export interface AIProviderConfig {
  provider: AIProvider;
  displayName: string;
  description: string;
  model: string;
  isBackendProxy: boolean;
}

// ==================== PROVIDER CONFIG ====================

const PROVIDER_CONFIGS: Record<AIProvider, AIProviderConfig> = {
  gemini: {
    provider: 'gemini',
    displayName: 'Google Gemini',
    description: 'Direct frontend calls to Gemini 2.5 Flash Lite',
    model: 'gemini-2.5-flash-lite',
    isBackendProxy: false,
  },
  openai: {
    provider: 'openai',
    displayName: 'OpenAI GPT-4.1 Mini',
    description: 'Secure backend proxy to GPT-4.1-mini',
    model: 'gpt-4.1-mini',
    isBackendProxy: true,
  },
  groq: {
    provider: 'groq',
    displayName: 'Groq GPT-OSS 120B',
    description: 'Direct frontend calls to GPT-OSS 120B via Groq',
    model: 'openai/gpt-oss-120b',
    isBackendProxy: false,
  },
};

const STORAGE_KEY = 'mockmate_ai_provider';

// ==================== PROVIDER MANAGEMENT ====================

/**
 * Get the currently selected AI provider
 */
export function getAIProvider(): AIProvider {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'gemini' || stored === 'openai' || stored === 'groq') {
      // If Gemini is stored but no key is configured, fall back to Groq
      if (stored === 'gemini' && !import.meta.env.VITE_GEMINI_API_KEY) {
        return 'groq';
      }
      return stored;
    }
  } catch {}
  return 'groq'; // Default: Groq (Gemini key not configured)
}

/**
 * Set the AI provider
 */
export function setAIProvider(provider: AIProvider): void {
  localStorage.setItem(STORAGE_KEY, provider);
  console.log(`🔄 AI Provider switched to: ${PROVIDER_CONFIGS[provider].displayName}`);
}

/**
 * Toggle between Gemini and OpenAI
 */
export function toggleAIProvider(): AIProvider {
  const current = getAIProvider();
  const next: AIProvider = current === 'gemini' ? 'openai' : 'gemini';
  setAIProvider(next);
  return next;
}

/**
 * Get config for the current provider
 */
export function getAIProviderConfig(): AIProviderConfig {
  return PROVIDER_CONFIGS[getAIProvider()];
}

/**
 * Get config for a specific provider
 */
export function getProviderConfig(provider: AIProvider): AIProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

// ==================== UNIFIED AI FUNCTIONS ====================

/**
 * Test API connectivity for the current provider
 */
export async function testCurrentAI(): Promise<{ success: boolean; response?: string; error?: string }> {
  const provider = getAIProvider();
  console.log(`🔍 Testing ${provider} API...`);
  
  if (provider === 'openai') {
    return testOpenAIAPI();
  }
  if (provider === 'groq') {
    return testGroqAPI();
  }
  if (provider === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY) {
    return testGeminiAPI();
  }
  return testGroqAPI();
}

/**
 * Generate interview questions using the current provider
 */
export async function generateQuestions(roleTitle: string): Promise<GeneratedQuestion[]> {
  const provider = getAIProvider();
  console.log(`📤 Generating questions with ${provider} for: ${roleTitle}`);
  
  if (provider === 'openai') {
    return generateQuestionsWithOpenAI(roleTitle);
  }
  if (provider === 'groq') {
    return generateQuestionsWithGroq(roleTitle);
  }
  if (provider === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY) {
    return generateQuestionsWithGemini(roleTitle);
  }
  // Default: Groq (Gemini not configured)
  return generateQuestionsWithGroq(roleTitle);
}

/**
 * Evaluate an answer using the current provider
 */
export async function evaluateAnswer(question: string, answer: string): Promise<AIEvaluationResult> {
  const provider = getAIProvider();
  
  if (provider === 'openai') {
    return evaluateAnswerWithOpenAI(question, answer);
  }
  if (provider === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY) {
    return evaluateAnswerWithGemini(question, answer);
  }
  // Default: OpenAI proxy (Gemini not configured)
  return evaluateAnswerWithOpenAI(question, answer);
}

/**
 * Batch evaluate answers using the current provider
 */
export async function evaluateBatchAnswers(
  questionsAndAnswers: BatchEvaluationInput[]
): Promise<BatchEvaluationResult> {
  const provider = getAIProvider();
  console.log(`📤 Batch evaluating with ${provider}`);
  
  if (provider === 'openai') {
    return evaluateBatchAnswersWithOpenAI(questionsAndAnswers);
  }
  if (provider === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY) {
    return evaluateBatchAnswersWithGemini(questionsAndAnswers);
  }
  // Default: OpenAI proxy (Gemini not configured)
  return evaluateBatchAnswersWithOpenAI(questionsAndAnswers);
}

/**
 * Analyze resume using the current provider
 */
export async function analyzeResume(resumeText: string, targetRole: string): Promise<AIATSAnalysis> {
  const provider = getAIProvider();
  console.log(`📤 Analyzing resume with ${provider}`);
  
  if (provider === 'openai') {
    return analyzeResumeWithOpenAI(resumeText, targetRole);
  }
  if (provider === 'groq') {
    return analyzeResumeWithGroq(resumeText, targetRole);
  }
  if (provider === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY) {
    return analyzeResumeWithGemini(resumeText, targetRole);
  }
  // Default: Groq (Gemini not configured)
  return analyzeResumeWithGroq(resumeText, targetRole);
}

// Re-export types for convenience
export type { GeneratedQuestion, AIEvaluationResult, BatchEvaluationInput, BatchEvaluationResult, AIATSAnalysis };
