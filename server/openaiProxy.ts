/**
 * OpenAI Proxy Server Plugin for Vite
 * 
 * This runs on the Vite dev server (Node.js) — the OpenAI API key
 * is NEVER sent to the browser. All requests go through /api/openai/*.
 * 
 * Security: OPENAI_API_KEY is read from .env WITHOUT the VITE_ prefix,
 * so Vite will NOT expose it to the client bundle.
 */

import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { loadEnv } from 'vite';
import { loadEnvWithSecrets } from './secretsManager';
import path from 'path';

// ==================== RATE LIMITING ====================
interface RateLimitState {
  lastRequestTime: number;
  minuteRequests: number[];  // timestamps of requests in the last minute
  dayRequests: number[];     // timestamps of requests today
  dayStart: number;          // start of the current day
}

const rateLimitState: RateLimitState = {
  lastRequestTime: 0,
  minuteRequests: [],
  dayRequests: [],
  dayStart: new Date().setHours(0, 0, 0, 0),
};

const RATE_LIMITS = {
  MIN_INTERVAL_MS: 1000,     // 1 request per second
  MAX_PER_MINUTE: 20,        // 20 requests per minute
  MAX_PER_DAY: 100,          // 100 requests per day
  MAX_TOKENS: 2048,          // Max tokens per request (safe default)
};

function checkRateLimit(): { allowed: boolean; error?: string; retryAfter?: number } {
  const now = Date.now();

  // Reset daily counter if new day
  const todayStart = new Date().setHours(0, 0, 0, 0);
  if (todayStart !== rateLimitState.dayStart) {
    rateLimitState.dayRequests = [];
    rateLimitState.dayStart = todayStart;
  }

  // Per-second check
  const timeSinceLast = now - rateLimitState.lastRequestTime;
  if (timeSinceLast < RATE_LIMITS.MIN_INTERVAL_MS) {
    return {
      allowed: false,
      error: `Rate limit: Please wait ${Math.ceil((RATE_LIMITS.MIN_INTERVAL_MS - timeSinceLast) / 1000)}s between requests.`,
      retryAfter: Math.ceil((RATE_LIMITS.MIN_INTERVAL_MS - timeSinceLast) / 1000),
    };
  }

  // Per-minute check
  const oneMinuteAgo = now - 60000;
  rateLimitState.minuteRequests = rateLimitState.minuteRequests.filter(t => t > oneMinuteAgo);
  if (rateLimitState.minuteRequests.length >= RATE_LIMITS.MAX_PER_MINUTE) {
    const oldestInWindow = rateLimitState.minuteRequests[0];
    const retryAfter = Math.ceil((oldestInWindow + 60000 - now) / 1000);
    return {
      allowed: false,
      error: `Rate limit: ${RATE_LIMITS.MAX_PER_MINUTE} requests per minute exceeded. Try again in ${retryAfter}s.`,
      retryAfter,
    };
  }

  // Per-day check
  rateLimitState.dayRequests = rateLimitState.dayRequests.filter(t => t > todayStart);
  if (rateLimitState.dayRequests.length >= RATE_LIMITS.MAX_PER_DAY) {
    return {
      allowed: false,
      error: `Daily limit reached (${RATE_LIMITS.MAX_PER_DAY} requests/day). Please try again tomorrow.`,
      retryAfter: 3600,
    };
  }

  // All checks passed
  rateLimitState.lastRequestTime = now;
  rateLimitState.minuteRequests.push(now);
  rateLimitState.dayRequests.push(now);

  return { allowed: true };
}

function getRateLimitInfo() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const todayStart = new Date().setHours(0, 0, 0, 0);

  const minuteCount = rateLimitState.minuteRequests.filter(t => t > oneMinuteAgo).length;
  const dayCount = rateLimitState.dayRequests.filter(t => t > todayStart).length;

  return {
    requestsThisMinute: minuteCount,
    requestsToday: dayCount,
    minuteLimit: RATE_LIMITS.MAX_PER_MINUTE,
    dayLimit: RATE_LIMITS.MAX_PER_DAY,
    remainingMinute: RATE_LIMITS.MAX_PER_MINUTE - minuteCount,
    remainingDay: RATE_LIMITS.MAX_PER_DAY - dayCount,
  };
}

// ==================== OPENAI CALLS ====================

async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; max_tokens?: number; model?: string } = {}
): Promise<{ success: boolean; content?: string; error?: string; usage?: any }> {
  const model = options.model || 'gpt-4.1-mini';
  const temperature = options.temperature ?? 0.7;
  const max_tokens = Math.min(options.max_tokens || 500, RATE_LIMITS.MAX_TOKENS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `OpenAI API error: ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.error?.message || errorMessage;
      } catch {}

      if (response.status === 429) {
        errorMessage = 'OpenAI rate limit exceeded. Please wait and try again.';
      } else if (response.status === 401) {
        errorMessage = 'Invalid OpenAI API key. Check your .env file.';
      } else if (response.status === 403) {
        errorMessage = 'OpenAI API access denied. Check your API key permissions.';
      }

      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return { success: false, error: 'Empty response from OpenAI' };
    }

    return {
      success: true,
      content,
      usage: data.usage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to OpenAI API',
    };
  }
}

// ==================== REQUEST BODY PARSER ====================

function parseRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
      // Limit body size to 1MB
      if (body.length > 1048576) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON in request body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ==================== ROUTE HANDLERS ====================

async function handleTest(apiKey: string, _body: any, res: ServerResponse) {
  const result = await callOpenAI(apiKey, [
    { role: 'user', content: "Hello, please respond with 'API is working' if you receive this message." }
  ], { max_tokens: 50, temperature: 0.3 });

  if (result.success) {
    sendJSON(res, 200, { success: true, response: result.content, usage: result.usage });
  } else {
    sendJSON(res, 500, { success: false, error: result.error });
  }
}

async function handleGenerateQuestions(apiKey: string, body: any, res: ServerResponse) {
  const { roleTitle } = body;
  if (!roleTitle) {
    return sendJSON(res, 400, { success: false, error: 'roleTitle is required' });
  }

  const result = await callOpenAI(apiKey, [
    {
      role: 'system',
      content: 'You are an expert HR interviewer. Always respond with valid JSON only, no markdown.'
    },
    {
      role: 'user',
      content: `Generate exactly 10 interview questions for the job role: "${roleTitle}".

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
- Return the questions ONLY as a JSON array of strings.`
    }
  ], { temperature: 0.7, max_tokens: 2048 });

  if (!result.success) {
    return sendJSON(res, 500, { success: false, error: result.error });
  }

  try {
    let content = result.content!.replace(/```json\n?|\n?```/g, '').trim();
    content = content.replace(/^.*?\[/, '[').replace(/\].*?$/, ']');
    const questions = JSON.parse(content);
    sendJSON(res, 200, { success: true, questions, usage: result.usage });
  } catch {
    sendJSON(res, 500, { success: false, error: 'Failed to parse OpenAI response as JSON' });
  }
}

async function handleEvaluateAnswer(apiKey: string, body: any, res: ServerResponse) {
  const { question, answer } = body;
  if (!question || !answer) {
    return sendJSON(res, 400, { success: false, error: 'question and answer are required' });
  }

  const result = await callOpenAI(apiKey, [
    {
      role: 'system',
      content: 'You are an expert HR interviewer and domain specialist. Always respond with valid JSON only, no markdown.'
    },
    {
      role: 'user',
      content: `Evaluate the following interview answer based on:
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
Provide a fair, realistic score.`
    }
  ], { temperature: 0.3, max_tokens: 1500 });

  if (!result.success) {
    return sendJSON(res, 500, { success: false, error: result.error });
  }

  try {
    let content = result.content!.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];
    const evaluation = JSON.parse(content);
    sendJSON(res, 200, { success: true, evaluation, usage: result.usage });
  } catch {
    sendJSON(res, 500, { success: false, error: 'Failed to parse evaluation response' });
  }
}

async function handleBatchEvaluate(apiKey: string, body: any, res: ServerResponse) {
  const { questionsAndAnswers } = body;
  if (!questionsAndAnswers || !Array.isArray(questionsAndAnswers)) {
    return sendJSON(res, 400, { success: false, error: 'questionsAndAnswers array is required' });
  }

  const qaList = questionsAndAnswers
    .map((qa: any, i: number) => `Q${i + 1}: "${qa.question}"\nA${i + 1}: "${qa.answer}"`)
    .join('\n\n');

  const result = await callOpenAI(apiKey, [
    {
      role: 'system',
      content: 'You are an expert HR interviewer. Always respond with valid JSON only, no markdown.'
    },
    {
      role: 'user',
      content: `Evaluate ALL of the following interview answers in ONE response based on:
1. Technical Accuracy
2. Relevance to the Question
3. Clarity & Structure
4. Communication Quality
5. Depth of Understanding

${qaList}

Your output must be a JSON array with ${questionsAndAnswers.length} evaluation objects:

[
  {
    "score": number (0-10),
    "strengths": [list of strengths],
    "weaknesses": [list of weaknesses],
    "improvements": [list of suggested improvements],
    "final_feedback": "one short paragraph of overall feedback"
  }
]

Evaluate strictly. Return ONLY the JSON array, no extra text.`
    }
  ], { temperature: 0.3, max_tokens: 2048 });

  if (!result.success) {
    return sendJSON(res, 500, { success: false, error: result.error });
  }

  try {
    let content = result.content!.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) content = jsonMatch[0];
    const evaluations = JSON.parse(content);
    sendJSON(res, 200, { success: true, evaluations, usage: result.usage });
  } catch {
    sendJSON(res, 500, { success: false, error: 'Failed to parse batch evaluation response' });
  }
}

async function handleAnalyzeResume(apiKey: string, body: any, res: ServerResponse) {
  const { resumeText, targetRole } = body;
  if (!resumeText || !targetRole) {
    return sendJSON(res, 400, { success: false, error: 'resumeText and targetRole are required' });
  }

  // Truncate long resumes
  const maxLength = 15000;
  const truncatedText = resumeText.length > maxLength
    ? resumeText.substring(0, maxLength) + '...[truncated]'
    : resumeText;

  const result = await callOpenAI(apiKey, [
    {
      role: 'system',
      content: `You are an ATS (Applicant Tracking System) expert and strict HR recruiter evaluating resumes for "${targetRole}" position. Always respond with valid JSON only, no markdown. BE STRICT AND REALISTIC with scoring - if the candidate's background doesn't match the target role, the score MUST be low.`
    },
    {
      role: 'user',
      content: `CRITICAL: Evaluate this resume SPECIFICALLY for the "${targetRole}" role. The ats_match_score MUST reflect how well this candidate fits THIS SPECIFIC ROLE.

Scoring Guidelines for "${targetRole}":
- 80-100: Excellent match - has most required skills, relevant experience, appropriate education
- 60-79: Good match - has some relevant skills but may lack key requirements
- 40-59: Fair match - has transferable skills but significant gaps
- 20-39: Poor match - lacks most requirements
- 0-19: Not a match - no relevant background

BE STRICT: If candidate's background doesn't align with "${targetRole}" requirements, score MUST be LOW even if they have good credentials in other fields.

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
- ats_match_score and match_percentage should be very close (within 5 points)
- Return ONLY valid JSON, no extra text.`
    }
  ], { temperature: 0.2, max_tokens: 2048 });

  if (!result.success) {
    return sendJSON(res, 500, { success: false, error: result.error });
  }

  try {
    let content = result.content!.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];
    const analysis = JSON.parse(content);

    // Ensure required arrays exist
    analysis.skills_extracted = analysis.skills_extracted || {};
    analysis.skills_extracted.technical_skills = analysis.skills_extracted.technical_skills || [];
    analysis.skills_extracted.soft_skills = analysis.skills_extracted.soft_skills || [];
    analysis.skills_extracted.tools_and_technologies = analysis.skills_extracted.tools_and_technologies || [];
    analysis.skills_extracted.domains = analysis.skills_extracted.domains || [];
    analysis.education = analysis.education || [];
    analysis.achievements = analysis.achievements || [];
    analysis.role_specific_analysis = analysis.role_specific_analysis || {};
    analysis.role_specific_analysis.matched_skills = analysis.role_specific_analysis.matched_skills || [];
    analysis.role_specific_analysis.unmatched_skills = analysis.role_specific_analysis.unmatched_skills || [];

    sendJSON(res, 200, { success: true, analysis, usage: result.usage });
  } catch {
    sendJSON(res, 500, { success: false, error: 'Failed to parse resume analysis response' });
  }
}

async function handleChat(apiKey: string, body: any, res: ServerResponse) {
  const { message, conversationHistory, systemPrompt } = body;
  if (!message) {
    return sendJSON(res, 400, { success: false, error: 'message is required' });
  }

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Add conversation history
  if (conversationHistory && Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory.slice(-6)) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  messages.push({ role: 'user', content: message });

  const result = await callOpenAI(apiKey, messages, { temperature: 0.7, max_tokens: 500 });

  if (result.success) {
    sendJSON(res, 200, { success: true, response: result.content, usage: result.usage });
  } else {
    sendJSON(res, 500, { success: false, error: result.error });
  }
}

async function handleFriedeInterview(apiKey: string, body: any, res: ServerResponse) {
  const { action, systemPrompt, message, conversationHistory } = body;

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  if (conversationHistory && Array.isArray(conversationHistory)) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role === 'candidate' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  if (message) {
    messages.push({ role: 'user', content: message });
  }

  const result = await callOpenAI(apiKey, messages, {
    temperature: 0.7,
    max_tokens: action === 'feedback' ? 1500 : 200,
  });

  if (result.success) {
    sendJSON(res, 200, { success: true, response: result.content, usage: result.usage });
  } else {
    sendJSON(res, 500, { success: false, error: result.error });
  }
}

async function handleCodingHints(apiKey: string, body: any, res: ServerResponse) {
  const { prompt, action } = body;
  if (!prompt) {
    return sendJSON(res, 400, { success: false, error: 'prompt is required' });
  }

  const maxTokens = action === 'explain' ? 1500 : 800;

  const result = await callOpenAI(apiKey, [
    {
      role: 'system',
      content: 'You are an expert coding instructor. Always respond with valid JSON only, no markdown.'
    },
    { role: 'user', content: prompt }
  ], { temperature: 0.5, max_tokens: maxTokens });

  if (result.success) {
    sendJSON(res, 200, { success: true, response: result.content, usage: result.usage });
  } else {
    sendJSON(res, 500, { success: false, error: result.error });
  }
}

// ==================== VITE PLUGIN ====================

export function openaiProxyPlugin(): Plugin {
  let apiKey = '';

  return {
    name: 'openai-proxy',

    async configResolved(config) {
      // Load env vars (including non-VITE_ prefixed ones) for the server
      const baseEnv = loadEnv(config.mode, config.root, '');
      // Load secrets from AWS Secrets Manager (if enabled) or fallback to .env
      const env = await loadEnvWithSecrets(baseEnv);
      apiKey = env.OPENAI_API_KEY || '';

      if (apiKey) {
        console.log('✅ OpenAI API key loaded (server-side only, not exposed to browser)');
      } else {
        console.warn('⚠️  OPENAI_API_KEY not found in .env — OpenAI features will be disabled');
      }
    },

    configureServer(server: ViteDevServer) {
      // Handle CORS preflight
      server.middlewares.use('/api/openai', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }
        next();
      });

      // Rate limit info endpoint (GET)
      server.middlewares.use('/api/openai/rate-limit', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== 'GET') return next();
        sendJSON(res, 200, getRateLimitInfo());
      });

      // All POST routes
      const routes: Record<string, (apiKey: string, body: any, res: ServerResponse) => Promise<void>> = {
        '/api/openai/test': handleTest,
        '/api/openai/generate-questions': handleGenerateQuestions,
        '/api/openai/evaluate-answer': handleEvaluateAnswer,
        '/api/openai/batch-evaluate': handleBatchEvaluate,
        '/api/openai/analyze-resume': handleAnalyzeResume,
        '/api/openai/chat': handleChat,
        '/api/openai/friede': handleFriedeInterview,
        '/api/openai/coding-hints': handleCodingHints,
      };

      for (const [route, handler] of Object.entries(routes)) {
        server.middlewares.use(route, async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.method !== 'POST') return next();

          // Check if API key is configured
          if (!apiKey) {
            return sendJSON(res, 503, {
              success: false,
              error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.',
            });
          }

          // Check rate limits
          const rateCheck = checkRateLimit();
          if (!rateCheck.allowed) {
            res.writeHead(429, {
              'Content-Type': 'application/json',
              'Retry-After': String(rateCheck.retryAfter || 1),
            });
            res.end(JSON.stringify({
              success: false,
              error: rateCheck.error,
              retryAfter: rateCheck.retryAfter,
              ...getRateLimitInfo(),
            }));
            return;
          }

          try {
            const body = await parseRequestBody(req);
            await handler(apiKey, body, res);
          } catch (error: any) {
            sendJSON(res, 500, {
              success: false,
              error: error.message || 'Internal server error',
            });
          }
        });
      }
    },
  };
}
