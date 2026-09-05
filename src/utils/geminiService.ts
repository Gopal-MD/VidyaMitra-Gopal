import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_KEYS, RATE_LIMIT } from '@/config/apiKeys';

// Guard: only initialise if a key is actually available
const GEMINI_KEY = API_KEYS.GEMINI_MAIN;
const geminiConfigured = !!GEMINI_KEY;

// Initialize Google Gemini only when key is present
const genAI = geminiConfigured ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// Rate limiting tracker to prevent exceeding 15 RPM limit
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = RATE_LIMIT.MIN_API_CALL_INTERVAL;

function requireGemini(): GoogleGenerativeAI {
  if (!genAI) throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file or switch to Groq.');
  return genAI;
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  
  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
    console.log(`⏳ Gemini rate limiting: waiting ${waitTime}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastApiCallTime = Date.now();
}

// Using Gemini 1.5 Flash for reliable, high-quality responses (1500 req/day)
const model = geminiConfigured ? requireGemini().getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  }
}) : null;

// For evaluation tasks, use lower temperature for consistency
const evaluationModel = geminiConfigured ? requireGemini().getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 1500,
  }
}) : null;

// For ATS analysis, use optimized settings for structured output
const atsModel = geminiConfigured ? requireGemini().getGenerativeModel({ 
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 3000,
  }
}) : null;

export interface GeneratedQuestion {
  id: string;
  text: string;
  category: "technical" | "behavioral" | "situational";
}

export const generateQuestionsWithGemini = async (roleTitle: string): Promise<GeneratedQuestion[]> => {
  if (!model) throw new Error('Gemini not configured. Add VITE_GEMINI_API_KEY to .env or switch to Groq.');
  try {
    const prompt = `You are an expert HR interviewer.

Generate exactly 10 interview questions for the job role: "${roleTitle}".

The questions must be strictly related to this role. 
Include a balanced mix of:
1. Technical questions
2. Conceptual understanding
3. Problem-solving / scenario-based
4. Behavioral / soft-skill related questions

Important rules:
- Do NOT include answers.
- Do NOT number them.
- Keep questions clear, realistic, and suitable for real interviews.
- Return the questions only as a JSON array of strings.`;

    console.log('Generating questions with Gemini for role:', roleTitle);
    
    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    console.log('Gemini response received:', content?.substring(0, 200) + '...');

    if (!content) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse the JSON response
    let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Additional cleaning for common Gemini response patterns
    cleanContent = cleanContent.replace(/^.*?\[/, '[').replace(/\].*?$/, ']');
    
    console.log('Cleaned content for parsing:', cleanContent);
    const questionsArray = JSON.parse(cleanContent);
    
    // Convert to our Question format
    const questions: GeneratedQuestion[] = questionsArray.map((questionText: string, index: number) => {
      // Determine category based on keywords in the question
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

      return {
        id: `ai-q-${index + 1}`,
        text: questionText,
        category
      };
    });

    return questions;
  } catch (error) {
    console.error('Error generating questions with Gemini:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      name: error?.name
    });
    
    // Check for specific error types
    if (error?.message?.includes('API_KEY') || error?.message?.includes('authentication')) {
      console.error('🔑 API Key authentication error - check your Gemini API key');
    } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
      console.error('📊 API quota or rate limit exceeded');
    } else if (error?.message?.includes('model') || error?.message?.includes('not found')) {
      console.error('🤖 Model not found or unavailable - using gemini-2.5-flash-lite model');
    }
    
    console.log('🔄 Using fallback questions due to Gemini API error');
    
    // Fallback to a basic set of questions if Gemini fails
    return [
      { id: "fallback-1", text: `Tell me about your experience relevant to the ${roleTitle} position.`, category: "behavioral" },
      { id: "fallback-2", text: `What interests you most about working as a ${roleTitle}?`, category: "behavioral" },
      { id: "fallback-3", text: `Describe a challenging project you've worked on.`, category: "situational" },
      { id: "fallback-4", text: `How do you stay updated with industry trends?`, category: "behavioral" },
      { id: "fallback-5", text: `Walk me through your problem-solving approach.`, category: "situational" },
      { id: "fallback-6", text: `What are your key strengths for this role?`, category: "behavioral" },
      { id: "fallback-7", text: `Describe a time you had to learn something new quickly.`, category: "situational" },
      { id: "fallback-8", text: `How do you handle tight deadlines?`, category: "situational" },
      { id: "fallback-9", text: `What motivates you in your work?`, category: "behavioral" },
      { id: "fallback-10", text: `Where do you see yourself in 5 years?`, category: "behavioral" }
    ];
  }
};

export interface AIEvaluationResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  final_feedback: string;
}

export const evaluateAnswerWithGemini = async (question: string, answer: string): Promise<AIEvaluationResult> => {
  if (!evaluationModel) throw new Error('Gemini not configured. Add VITE_GEMINI_API_KEY to .env or switch to Groq.');
  try {
    const prompt = `You are an expert HR interviewer and domain specialist.

Evaluate the following interview answer based on:
1. Technical Accuracy
2. Relevance to the Question
3. Clarity & Structure
4. Communication Quality
5. Depth of Understanding
6. Confidence Level
7. Missing or Incorrect Details

Your output must be in this JSON structure:

{
  "score": number (0-10),
  "strengths": [list of strengths],
  "weaknesses": [list of weaknesses],
  "improvements": [list of suggested improvements],
  "final_feedback": "one short paragraph of overall feedback"
}

Here is the question:
"${question}"

Here is the candidate's answer:
"${answer}"

Evaluate strictly based on the answer given. Do not be overly generous.
Provide a fair, realistic score.`;

    console.log('Evaluating answer with Gemini');
    
    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    const result = await evaluationModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    console.log('Gemini evaluation response:', content?.substring(0, 200) + '...');

    if (!content) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse the JSON response
    let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Extract JSON object from response
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }
    
    console.log('Cleaned evaluation content:', cleanContent);
    const evaluation = JSON.parse(cleanContent);
    
    // Validate the response structure
    if (!evaluation.score || !evaluation.strengths || !evaluation.weaknesses || 
        !evaluation.improvements || !evaluation.final_feedback) {
      throw new Error('Invalid evaluation structure from Gemini');
    }

    return evaluation as AIEvaluationResult;
  } catch (error) {
    console.error('Error evaluating answer with Gemini:', error);
    
    // Fallback evaluation if Gemini fails
    return {
      score: 5,
      strengths: ["Provided a response to the question"],
      weaknesses: ["Unable to evaluate due to technical issues"],
      improvements: ["Please try again - evaluation system temporarily unavailable"],
      final_feedback: "Technical evaluation unavailable. Your answer has been recorded and will be reviewed."
    };
  }
};

// ============= BATCH EVALUATION (90% API reduction) =============
export interface BatchEvaluationInput {
  question: string;
  answer: string;
}

export interface BatchEvaluationResult {
  evaluations: AIEvaluationResult[];
}

export const evaluateBatchAnswersWithGemini = async (
  questionsAndAnswers: BatchEvaluationInput[]
): Promise<BatchEvaluationResult> => {
  if (!evaluationModel) throw new Error('Gemini not configured. Add VITE_GEMINI_API_KEY to .env or switch to Groq.');
  try {
    console.log(`🚀 Batch evaluating ${questionsAndAnswers.length} answers in ONE API call`);
    
    // Build the batch prompt
    const qaList = questionsAndAnswers
      .map((qa, index) => `
Q${index + 1}: "${qa.question}"
A${index + 1}: "${qa.answer}"`)
      .join('\n\n');

    const prompt = `You are an expert HR interviewer and domain specialist.

Evaluate ALL of the following interview answers in ONE response based on:
1. Technical Accuracy
2. Relevance to the Question
3. Clarity & Structure
4. Communication Quality
5. Depth of Understanding
6. Confidence Level
7. Missing or Incorrect Details

${qaList}

Your output must be a JSON array with ${questionsAndAnswers.length} evaluation objects:

[
  {
    "score": number (0-10),
    "strengths": [list of strengths],
    "weaknesses": [list of weaknesses],
    "improvements": [list of suggested improvements],
    "final_feedback": "one short paragraph of overall feedback"
  },
  ...
]

Evaluate strictly based on the answers given. Do not be overly generous.
Provide fair, realistic scores. Return ONLY the JSON array, no extra text.`;

    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    const result = await evaluationModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    console.log('✅ Gemini batch evaluation response received');

    if (!content) {
      throw new Error('No response from Gemini');
    }

    // Clean and parse the JSON response
    let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Extract JSON array from response
    const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }
    
    const evaluations = JSON.parse(cleanContent);
    
    // Validate we got the right number of evaluations
    if (!Array.isArray(evaluations) || evaluations.length !== questionsAndAnswers.length) {
      throw new Error(`Expected ${questionsAndAnswers.length} evaluations, got ${evaluations?.length}`);
    }

    console.log(`✅ Batch evaluation successful: ${evaluations.length} answers evaluated in 1 API call`);
    
    return { evaluations: evaluations as AIEvaluationResult[] };
    
  } catch (error) {
    console.error('❌ Error in batch evaluation, falling back to individual evaluations:', error);
    
    // 🚨 CRITICAL FIX: Use sequential calls with delays instead of Promise.all
    // Promise.all would fire 10 API calls simultaneously → instant 429 error!
    // Sequential with 4s delays: 10 calls over 40s → stays under 15 RPM limit
    console.log('⏳ Using sequential evaluation with delays...');
    
    const evaluations = [];
    for (const qa of questionsAndAnswers) {
      try {
        // evaluateAnswerWithGemini now has built-in rate limiting via enforceRateLimit()
        const evaluation = await evaluateAnswerWithGemini(qa.question, qa.answer);
        evaluations.push(evaluation);
      } catch (error) {
        console.error('Error evaluating answer:', error);
        // Add fallback evaluation
        evaluations.push({
          score: 5,
          strengths: ["Provided a response"],
          weaknesses: ["Unable to evaluate"],
          improvements: ["Please try again"],
          final_feedback: "Evaluation unavailable"
        });
      }
    }
    
    console.log(`✅ Sequential evaluation complete: ${evaluations.length} answers evaluated`);
    return { evaluations };
  }
};

export interface AIATSAnalysis {
  candidate_summary: string;
  detected_role: string;
  skills_extracted: {
    technical_skills: string[];
    soft_skills: string[];
    tools_and_technologies: string[];
    domains: string[];
  };
  experience: {
    total_years: number;
    relevant_experience_years: number;
    project_summary: string[];
  };
  education: string[];
  achievements: string[];
  ats_match_score: number;
  missing_skills_for_target_role: string[];
  red_flags: string[];
  improvements: string[];
  role_specific_analysis: {
    target_role: string;
    match_percentage: number;
    matched_skills: string[];
    unmatched_skills: string[];
  };
}

export const analyzeResumeWithGemini = async (resumeText: string, targetRole: string): Promise<AIATSAnalysis> => {
  if (!atsModel) throw new Error('Gemini not configured. Add VITE_GEMINI_API_KEY to .env or switch to Groq.');
  try {
    // Validate input
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Resume text is too short or empty');
    }
    
    // Truncate extremely long resumes to avoid token limits
    const maxLength = 15000;
    const truncatedText = resumeText.length > maxLength 
      ? resumeText.substring(0, maxLength) + '...[truncated]'
      : resumeText;
    
    const prompt = `You are an ATS (Applicant Tracking System) expert and strict HR recruiter evaluating resumes for "${targetRole}" position.

CRITICAL: You MUST evaluate this resume SPECIFICALLY for the "${targetRole}" role. The ats_match_score and match_percentage MUST reflect how well this candidate fits THIS SPECIFIC ROLE, not just their general qualifications.

Scoring Guidelines for "${targetRole}":
- 80-100: Excellent match - candidate has most required skills, relevant experience, and appropriate education for ${targetRole}
- 60-79: Good match - candidate has some relevant skills but may lack key requirements for ${targetRole}
- 40-59: Fair match - candidate has transferable skills but significant gaps for ${targetRole}
- 20-39: Poor match - candidate lacks most requirements for ${targetRole}
- 0-19: Not a match - resume shows no relevant background for ${targetRole}

BE STRICT: If the candidate's background (education, skills, experience) does NOT align with "${targetRole}" requirements, the score MUST be LOW even if they have good credentials in other fields.

Examples of strict scoring:
- A marketing graduate with no technical skills applying for Software Engineer → Score: 15-25%
- A chef with no design experience applying for UX Designer → Score: 10-20%
- A lawyer with no coding background applying for Game Developer → Score: 5-15%

Your output MUST follow this JSON structure:

{
  "candidate_summary": "short 3–4 line summary of the candidate",
  "detected_role": "best-fit job role based on resume (may differ from target role)",
  "skills_extracted": {
      "technical_skills": [list],
      "soft_skills": [list],
      "tools_and_technologies": [list],
      "domains": [list]
  },
  "experience": {
      "total_years": number,
      "relevant_experience_years": number (ONLY count experience relevant to ${targetRole}),
      "project_summary": [list of short project descriptions]
  },
  "education": [list of degrees and institutions],
  "achievements": [list],
  "ats_match_score": number (0-100, MUST reflect fit for ${targetRole} specifically),
  "missing_skills_for_target_role": [list of skills required for ${targetRole} that candidate lacks],
  "red_flags": [list of concerns - include if candidate's background doesn't match ${targetRole}],
  "improvements": [list of recommendations to improve resume for ${targetRole}],
  "role_specific_analysis": {
      "target_role": "${targetRole}",
      "match_percentage": number (0-100, same strict criteria as ats_match_score),
      "matched_skills": [list of skills relevant to ${targetRole}],
      "unmatched_skills": [list of required ${targetRole} skills candidate lacks]
  }
}

Here is the resume text:
"${truncatedText}"

Important rules:
- BE REALISTIC AND STRICT - do not inflate scores
- If the candidate's background doesn't match ${targetRole}, score MUST be below 40%
- Extract skills accurately but only count RELEVANT skills for role matching
- ats_match_score and match_percentage should be very close (within 5 points)
- Ensure all arrays exist even if empty
- Return ONLY valid JSON, no extra text.`;

    console.log('📤 Sending resume to Gemini for analysis (Target role:', targetRole, ')');
    
    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    const result = await atsModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    console.log('📥 Gemini ATS response received:', content?.substring(0, 150) + '...');

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    // Clean and parse the JSON response
    let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Extract JSON object from response (handle cases where AI adds extra text)
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    } else {
      throw new Error('No valid JSON found in Gemini response');
    }
    
    console.log('🧹 Cleaned content ready for parsing');
    const analysis = JSON.parse(cleanContent);
    
    // Validate the response structure with detailed checks
    if (!analysis.candidate_summary) {
      console.warn('⚠️ Missing candidate_summary in response');
      analysis.candidate_summary = "Resume analysis completed";
    }
    
    if (!analysis.skills_extracted || typeof analysis.skills_extracted !== 'object') {
      console.warn('⚠️ Missing or invalid skills_extracted in response');
      throw new Error('Invalid skills data structure from Gemini');
    }
    
    if (!analysis.role_specific_analysis || typeof analysis.role_specific_analysis !== 'object') {
      console.warn('⚠️ Missing or invalid role_specific_analysis in response');
      throw new Error('Invalid role analysis structure from Gemini');
    }
    
    // Ensure all required arrays exist
    analysis.skills_extracted.technical_skills = analysis.skills_extracted.technical_skills || [];
    analysis.skills_extracted.soft_skills = analysis.skills_extracted.soft_skills || [];
    analysis.skills_extracted.tools_and_technologies = analysis.skills_extracted.tools_and_technologies || [];
    analysis.skills_extracted.domains = analysis.skills_extracted.domains || [];
    analysis.education = analysis.education || [];
    analysis.achievements = analysis.achievements || [];
    analysis.role_specific_analysis.matched_skills = analysis.role_specific_analysis.matched_skills || [];
    analysis.role_specific_analysis.unmatched_skills = analysis.role_specific_analysis.unmatched_skills || [];

    console.log('✅ Resume analysis validated successfully');
    return analysis as AIATSAnalysis;
    
  } catch (error) {
    console.error('❌ Error analyzing resume with Gemini:', error);
    console.error('Error type:', error?.name);
    console.error('Error message:', error?.message);
    
    // Check for specific error types
    if (error?.message?.includes('API_KEY') || error?.message?.includes('authentication')) {
      console.error('🔑 API Key authentication error');
    } else if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
      console.error('📊 API quota or rate limit exceeded');
    } else if (error?.message?.includes('JSON') || error?.message?.includes('parse')) {
      console.error('📝 JSON parsing error - Gemini returned invalid format');
    }
    
    // Re-throw the error to trigger fallback in processResume
    throw new Error(`Gemini API failed: ${error?.message || 'Unknown error'}`);
  }
};

// Test function to verify Gemini API connectivity
export const testGeminiAPI = async () => {
  if (!genAI) return { success: false, error: 'Gemini API key not configured' };
  try {
    console.log('🔍 Testing Gemini API connectivity...');
    
    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    const testModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await testModel.generateContent("Hello, please respond with 'API is working' if you receive this message.");
    const response = await result.response;
    const content = response.text();
    
    console.log('✅ Gemini API test successful:', content);
    return { success: true, response: content };
  } catch (error) {
    console.error('❌ Gemini API test failed:', error);
    return { success: false, error: error.message };
  }
};

// Backward compatibility exports
export const generateQuestionsWithOpenAI = generateQuestionsWithGemini;
export const evaluateAnswerWithOpenAI = evaluateAnswerWithGemini;
export const analyzeResumeWithAI = analyzeResumeWithGemini;

export default genAI;