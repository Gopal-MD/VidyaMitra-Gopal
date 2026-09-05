/**
 * OpenAI Service - Frontend Client
 * 
 * Calls the backend proxy at /api/openai/* endpoints.
 * The OpenAI API key is NEVER exposed to the browser.
 * All calls go through the Vite dev server proxy which holds the key server-side.
 * 
 * Rate limiting, token limits, and error handling are all enforced server-side.
 */

// Re-export types from geminiService for compatibility
import type { GeneratedQuestion, AIEvaluationResult, BatchEvaluationInput, BatchEvaluationResult, AIATSAnalysis } from './geminiService';

const API_BASE = '/api/openai';

// ==================== INTERNAL HELPERS ====================

async function postJSON<T>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Request failed with status ${response.status}`;

    // Handle rate limiting gracefully
    if (response.status === 429) {
      throw new Error(`⏳ ${errorMsg}`);
    }

    throw new Error(errorMsg);
  }

  return data;
}

// ==================== PUBLIC API ====================

/**
 * Test basic OpenAI API connectivity
 */
export const testOpenAIAPI = async (): Promise<{ success: boolean; response?: string; error?: string; usage?: any }> => {
  try {
    console.log('🔍 Testing OpenAI API connectivity via backend proxy...');
    const data = await postJSON<{ success: boolean; response: string; usage?: any }>('/test');
    console.log('✅ OpenAI API test successful:', data.response);
    return { success: true, response: data.response, usage: data.usage };
  } catch (error: any) {
    console.error('❌ OpenAI API test failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Generate interview questions using OpenAI
 */
export const generateQuestionsWithOpenAI = async (roleTitle: string): Promise<GeneratedQuestion[]> => {
  try {
    console.log('📤 Generating questions with OpenAI for role:', roleTitle);
    const data = await postJSON<{ success: boolean; questions: string[] }>('/generate-questions', { roleTitle });

    const questions: GeneratedQuestion[] = data.questions.map((questionText: string, index: number) => {
      let category: "technical" | "behavioral" | "situational" = "behavioral";
      const lowerText = questionText.toLowerCase();

      if (lowerText.includes('technical') || lowerText.includes('code') || lowerText.includes('algorithm') ||
          lowerText.includes('technology') || lowerText.includes('framework') || lowerText.includes('database') ||
          lowerText.includes('programming') || lowerText.includes('software') || lowerText.includes('system')) {
        category = "technical";
      } else if (lowerText.includes('scenario') || lowerText.includes('situation') || lowerText.includes('problem') ||
                 lowerText.includes('challenge') || lowerText.includes('difficult') || lowerText.includes('handle') ||
                 lowerText.includes('example') || lowerText.includes('time when')) {
        category = "situational";
      }

      return { id: `openai-q-${index + 1}`, text: questionText, category };
    });

    console.log('✅ OpenAI generated', questions.length, 'questions');
    return questions;
  } catch (error: any) {
    console.error('❌ OpenAI question generation failed:', error.message);
    throw error;
  }
};

/**
 * Evaluate an answer using OpenAI
 */
export const evaluateAnswerWithOpenAI = async (question: string, answer: string): Promise<AIEvaluationResult> => {
  try {
    console.log('📤 Evaluating answer with OpenAI');
    const data = await postJSON<{ success: boolean; evaluation: AIEvaluationResult }>('/evaluate-answer', { question, answer });
    console.log('✅ OpenAI evaluation complete, score:', data.evaluation.score);
    return data.evaluation;
  } catch (error: any) {
    console.error('❌ OpenAI answer evaluation failed:', error.message);
    throw error;
  }
};

/**
 * Evaluate multiple answers in a single batch call
 */
export const evaluateBatchAnswersWithOpenAI = async (
  questionsAndAnswers: BatchEvaluationInput[]
): Promise<BatchEvaluationResult> => {
  try {
    console.log(`📤 Batch evaluating ${questionsAndAnswers.length} answers with OpenAI`);
    const data = await postJSON<{ success: boolean; evaluations: AIEvaluationResult[] }>('/batch-evaluate', { questionsAndAnswers });

    if (!Array.isArray(data.evaluations) || data.evaluations.length !== questionsAndAnswers.length) {
      throw new Error(`Expected ${questionsAndAnswers.length} evaluations, got ${data.evaluations?.length}`);
    }

    console.log('✅ OpenAI batch evaluation complete');
    return { evaluations: data.evaluations };
  } catch (error: any) {
    console.error('❌ OpenAI batch evaluation failed, falling back to sequential:', error.message);

    // Sequential fallback with 1.5s delays to respect rate limits
    const evaluations: AIEvaluationResult[] = [];
    for (const qa of questionsAndAnswers) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const evaluation = await evaluateAnswerWithOpenAI(qa.question, qa.answer);
        evaluations.push(evaluation);
      } catch {
        evaluations.push({
          score: 5,
          strengths: ["Provided a response"],
          weaknesses: ["Unable to evaluate"],
          improvements: ["Please try again"],
          final_feedback: "Evaluation unavailable"
        });
      }
    }
    return { evaluations };
  }
};

/**
 * Analyze a resume using OpenAI
 */
export const analyzeResumeWithOpenAI = async (resumeText: string, targetRole: string): Promise<AIATSAnalysis> => {
  try {
    console.log('📤 Analyzing resume with OpenAI for role:', targetRole);
    const data = await postJSON<{ success: boolean; analysis: AIATSAnalysis }>('/analyze-resume', { resumeText, targetRole });
    console.log('✅ OpenAI resume analysis complete');
    return data.analysis;
  } catch (error: any) {
    console.error('❌ OpenAI resume analysis failed:', error.message);
    throw error;
  }
};

/**
 * Send a chat message via OpenAI
 */
export const sendChatMessageWithOpenAI = async (
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string> => {
  try {
    const data = await postJSON<{ success: boolean; response: string }>('/chat', {
      message,
      conversationHistory,
      systemPrompt,
    });
    return data.response;
  } catch (error: any) {
    console.error('❌ OpenAI chat failed:', error.message);
    throw error;
  }
};

/**
 * FRIEDE interview via OpenAI
 */
export const friedeInterviewWithOpenAI = async (
  action: string,
  systemPrompt: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> => {
  try {
    const data = await postJSON<{ success: boolean; response: string }>('/friede', {
      action,
      systemPrompt,
      message,
      conversationHistory,
    });
    return data.response;
  } catch (error: any) {
    console.error('❌ OpenAI FRIEDE call failed:', error.message);
    throw error;
  }
};

/**
 * Get coding hints via OpenAI
 */
export const getCodingHintsWithOpenAI = async (
  prompt: string,
  action: string = 'hint'
): Promise<string> => {
  try {
    const data = await postJSON<{ success: boolean; response: string }>('/coding-hints', { prompt, action });
    return data.response;
  } catch (error: any) {
    console.error('❌ OpenAI coding hints failed:', error.message);
    throw error;
  }
};

/**
 * Get current rate limit information
 */
export const getOpenAIRateLimitInfo = async (): Promise<{
  requestsThisMinute: number;
  requestsToday: number;
  minuteLimit: number;
  dayLimit: number;
  remainingMinute: number;
  remainingDay: number;
}> => {
  const response = await fetch(`${API_BASE}/rate-limit`);
  return response.json();
};
