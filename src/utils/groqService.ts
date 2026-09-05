/**
 * Groq AI Service
 * API wrapper for Groq with advanced rate limiting and retry logic
 */

import type { AIATSAnalysis, GeneratedQuestion } from './geminiService';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_KEY_2 = import.meta.env.VITE_GROQ_API_KEY_2 || '';
const MODEL = 'llama-3.3-70b-versatile'; // Primary Groq model for resume analysis
const MODEL_QUESTIONS = 'llama-3.1-8b-instant'; // Fast, lightweight model for question generation

// ==================== ADVANCED RATE LIMITING ====================

// Token bucket rate limiter
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async consume(tokens: number = 1): Promise<void> {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }
    
    // Wait until we have enough tokens
    const tokensNeeded = tokens - this.tokens;
    const waitTime = (tokensNeeded / this.refillRate) * 1000; // milliseconds
    console.log(`⏳ Rate limit: waiting ${Math.round(waitTime)}ms for token bucket refill`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.refill();
    this.tokens -= tokens;
  }
}

// Global token bucket: 30 requests per minute (0.5 req/sec)
const rateLimiter = new TokenBucket(30, 0.5);

// Request tracking for additional safety
let requestCount = 0;
let windowStart = Date.now();
const MAX_REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60000;

async function enforceRateLimit(): Promise<void> {
  // Token bucket rate limiting
  await rateLimiter.consume(1);
  
  // Additional sliding window check
  const now = Date.now();
  if (now - windowStart > WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }
  
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = WINDOW_MS - (now - windowStart);
    console.log(`⏳ Rate limit: waiting ${Math.round(waitTime)}ms for window reset`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    windowStart = Date.now();
  }
  
  requestCount++;
}

// Exponential backoff retry logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (400-499)
      if (error?.message?.includes('400') || error?.message?.includes('401') || 
          error?.message?.includes('403') || error?.message?.includes('404')) {
        throw error;
      }
      
      // Retry on 429 (rate limit) or 5xx (server errors)
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ==================== API FUNCTIONS ====================

export const analyzeResumeWithGroq = async (resumeText: string, targetRole: string): Promise<AIATSAnalysis> => {
  try {
    // Validate input
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Resume text is too short or empty');
    }

    if (!GROQ_API_KEY) {
      throw new Error('GROQ API key not configured');
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
  "improvements": [
    "List 5-8 SPECIFIC, ACTIONABLE improvements for THIS resume to better match ${targetRole}",
    "Examples: 'Add quantified metrics to project descriptions (e.g., increased performance by X%)',",
    "'Include specific ${targetRole} keywords like [skill/tool names]',",
    "'Highlight leadership experience in technical team settings',",
    "'Add a professional summary emphasizing ${targetRole} expertise',",
    "'Reorganize skills section to prioritize ${targetRole} requirements',",
    "'Include more details about [specific missing technical skill/project type]'",
    "Be SPECIFIC to this candidate's resume content, not generic advice"
  ],
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

    console.log('📤 Sending resume to Groq for analysis (Target role:', targetRole, ')');
    
    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    // API call with retry logic
    const makeAPICall = async () => {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert ATS system and HR recruiter. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          top_p: 1,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Groq API error:', response.status, errorText);
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    };
    
    // Execute with retry
    const data = await retryWithBackoff(makeAPICall);
    const content = data.choices?.[0]?.message?.content;

    console.log('📥 Groq ATS response received:', content?.substring(0, 150) + '...');

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from Groq API');
    }

    // Clean and parse the JSON response
    let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Extract JSON object from response (handle cases where AI adds extra text)
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    } else {
      throw new Error('No valid JSON found in Groq response');
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
      throw new Error('Invalid skills data structure from Groq');
    }
    
    if (!analysis.role_specific_analysis || typeof analysis.role_specific_analysis !== 'object') {
      console.warn('⚠️ Missing or invalid role_specific_analysis in response');
      throw new Error('Invalid role analysis structure from Groq');
    }
    
    // Ensure all required arrays exist
    analysis.skills_extracted.technical_skills = analysis.skills_extracted.technical_skills || [];
    analysis.skills_extracted.soft_skills = analysis.skills_extracted.soft_skills || [];
    analysis.skills_extracted.tools_and_technologies = analysis.skills_extracted.tools_and_technologies || [];
    analysis.skills_extracted.domains = analysis.skills_extracted.domains || [];
    analysis.education = analysis.education || [];
    analysis.achievements = analysis.achievements || [];
    analysis.missing_skills_for_target_role = analysis.missing_skills_for_target_role || [];
    analysis.red_flags = analysis.red_flags || [];
    analysis.improvements = analysis.improvements || [];
    analysis.role_specific_analysis.matched_skills = analysis.role_specific_analysis.matched_skills || [];
    analysis.role_specific_analysis.unmatched_skills = analysis.role_specific_analysis.unmatched_skills || [];

    console.log('✅ Resume analysis validated successfully with Groq');
    console.log('📝 AI-generated improvements:', analysis.improvements.length);
    console.log('🎯 Missing skills identified:', analysis.missing_skills_for_target_role.length);
    return analysis as AIATSAnalysis;
    
  } catch (error) {
    console.error('❌ Error analyzing resume with Groq:', error);
    console.error('Error type:', error?.name);
    console.error('Error message:', error?.message);
    
    // Check for specific error types
    if (error?.message?.includes('API_KEY') || error?.message?.includes('authentication')) {
      console.error('🔑 API Key authentication error');
    }
    
    throw new Error(`Groq API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const testGroqAPI = async (): Promise<{ success: boolean; response?: string; error?: string }> => {
  try {
    if (!GROQ_API_KEY) {
      return { success: false, error: 'GROQ_API_KEY not configured' };
    }

    // Enforce rate limiting
    await enforceRateLimit();

    const makeTestCall = async () => {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: 'Say "Groq API is working!" in exactly 5 words.'
            }
          ],
          max_tokens: 20
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    };

    const data = await retryWithBackoff(makeTestCall);
    const content = data.choices?.[0]?.message?.content || '';
    
    return { success: true, response: content };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// ==================== QUESTION GENERATION ====================

/**
 * Generate interview questions using Groq API
 * Uses separate API key from resume analysis to avoid rate limiting conflicts
 */
export const generateQuestionsWithGroq = async (roleTitle: string): Promise<GeneratedQuestion[]> => {
  try {
    const availableKeys = [GROQ_API_KEY_2, GROQ_API_KEY].filter(Boolean);
    if (availableKeys.length === 0) {
      console.warn('⚠️ Groq questions API key not configured, using fallback');
      throw new Error('GROQ_API_KEY not configured');
    }

    const prompt = `You are an expert HR interviewer.

Generate exactly 10 interview questions for the job role: "${roleTitle}".

The questions must be strictly related to this role. 
Include a balanced mix of:
1. Technical questions (3-4 questions)
2. Conceptual understanding (2-3 questions)
3. Problem-solving / scenario-based (2-3 questions)
4. Behavioral / soft-skill related questions (1-2 questions)

Important rules:
- Do NOT include answers.
- Do NOT number them.
- Keep questions clear, realistic, and suitable for real interviews.
- Return ONLY a JSON array of strings, nothing else.

Example format:
["Question 1 text here", "Question 2 text here", ...]`;

    console.log('📤 Generating questions with Groq for role:', roleTitle);
    
    // Enforce rate limiting before API call
    await enforceRateLimit();
    
    // Try each available key until one works (key rotation)
    let data: any = null;
    for (const key of availableKeys) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: MODEL_QUESTIONS,
            messages: [
              { role: 'system', content: 'You are an expert HR interviewer. Always respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
            top_p: 1,
            stream: false
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️ Groq key failed (${response.status}), trying next key...`);
          continue; // Try next key on any error (401, 429, etc.)
        }

        data = await response.json();
        break; // Success — stop trying keys
      } catch (err: any) {
        console.warn('⚠️ Groq key network error, trying next key:', err.message);
        continue;
      }
    }
    
    if (!data) throw new Error('All Groq API keys failed');
    const content = data.choices?.[0]?.message?.content;

    console.log('📥 Groq questions response received');

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from Groq API');
    }

    // Clean and parse the JSON response
    let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    
    // Additional cleaning
    cleanContent = cleanContent.replace(/^.*?\[/, '[').replace(/\].*?$/, ']');
    
    const questionsArray = JSON.parse(cleanContent);
    
    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      throw new Error('Invalid response format from Groq');
    }

    // Convert to our GeneratedQuestion format
    const questions: GeneratedQuestion[] = questionsArray.map((questionText: string, index: number) => {
      // Determine category based on keywords in the question
      let category: "technical" | "behavioral" | "situational" = "behavioral";
      
      const lowerText = questionText.toLowerCase();
      if (lowerText.includes('technical') || lowerText.includes('code') || lowerText.includes('algorithm') || 
          lowerText.includes('technology') || lowerText.includes('framework') || lowerText.includes('database') ||
          lowerText.includes('programming') || lowerText.includes('software') || lowerText.includes('system') ||
          lowerText.includes('design pattern') || lowerText.includes('architecture')) {
        category = "technical";
      } else if (lowerText.includes('scenario') || lowerText.includes('situation') || lowerText.includes('problem') ||
                 lowerText.includes('challenge') || lowerText.includes('difficult') || lowerText.includes('handle') ||
                 lowerText.includes('example') || lowerText.includes('time when') || lowerText.includes('describe a')) {
        category = "situational";
      }

      return {
        id: `groq-q-${index + 1}`,
        text: questionText,
        category
      };
    });

    console.log(`✅ Generated ${questions.length} questions with Groq`);
    return questions;

  } catch (error) {
    console.error('❌ Error generating questions with Groq:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name
    });
    
    console.log('🔄 Using fallback questions due to Groq API error');
    
    // Fallback to a basic set of questions if Groq fails
    return [
      { id: "fallback-1", text: `Tell me about your experience relevant to the ${roleTitle} position.`, category: "behavioral" },
      { id: "fallback-2", text: `What interests you most about working as a ${roleTitle}?`, category: "behavioral" },
      { id: "fallback-3", text: `Describe a challenging project you've worked on.`, category: "situational" },
      { id: "fallback-4", text: `How do you stay updated with industry trends?`, category: "behavioral" },
      { id: "fallback-5", text: `Walk me through your problem-solving approach.`, category: "situational" },
      { id: "fallback-6", text: `What are your key technical strengths for this role?`, category: "technical" },
      { id: "fallback-7", text: `How do you handle tight deadlines and pressure?`, category: "situational" },
      { id: "fallback-8", text: `Describe your experience working in a team.`, category: "behavioral" },
      { id: "fallback-9", text: `What motivates you in your professional career?`, category: "behavioral" },
      { id: "fallback-10", text: `Where do you see yourself in the next 3-5 years?`, category: "behavioral" }
    ];
  }
};
