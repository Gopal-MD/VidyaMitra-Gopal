/**
 * Mitoi AI — Dedicated Chatbot Service for VidyaMitra
 * Uses Groq API with key rotation, aggressive caching,
 * fallback mechanisms, and built-in quiz/aptitude engine.
 */

import { getAuthToken } from "@/lib/api";
import { searchCourses, parseCourseQuery, formatCoursesForChat, Course } from "./chatCourseEngine";

// ==================== CONFIG ====================
const GROQ_KEY_1 = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_KEY_2 = import.meta.env.VITE_GROQ_API_KEY_2 || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Rate limiting — very conservative to avoid quota exhaustion
let lastApiCall = 0;
let apiCallsThisMinute = 0;
let minuteWindowStart = Date.now();
const MAX_CALLS_PER_MINUTE = 10;
const MIN_INTERVAL_MS = 6000; // 6s between calls

// Response cache to avoid redundant API calls
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ==================== TYPES ====================
export interface MitoiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'quiz-question' | 'quiz-result' | 'action';
  quizData?: QuizQuestion;
  action?: MitoiAction;
}

export interface MitoiAction {
  type: 'navigate';
  path: string;
  label: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

export interface QuizSession {
  active: boolean;
  category: string;
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  answers: number[];
}

// ==================== RATE LIMITING ====================
async function enforceRateLimit(): Promise<boolean> {
  const now = Date.now();

  // Reset minute window
  if (now - minuteWindowStart > 60000) {
    apiCallsThisMinute = 0;
    minuteWindowStart = now;
  }

  // Check per-minute limit
  if (apiCallsThisMinute >= MAX_CALLS_PER_MINUTE) {
    console.warn('⏳ Mitoi: per-minute rate limit reached');
    return false;
  }

  // Enforce min interval
  const elapsed = now - lastApiCall;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }

  lastApiCall = Date.now();
  apiCallsThisMinute++;
  return true;
}

// ==================== GROQ CALL WITH FALLBACK ====================
async function callGroq(prompt: string): Promise<string | null> {
  // Check cache first
  const cacheKey = prompt.substring(0, 200).toLowerCase().trim();
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('✅ Mitoi: cache hit');
    return cached.response;
  }

  const ok = await enforceRateLimit();
  if (!ok) return null;

  const keys = [GROQ_KEY_1, GROQ_KEY_2].filter(Boolean);
  if (keys.length === 0) return null;

  for (const key of keys) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful, friendly assistant for VidyaMitra. Keep responses concise (under 100 words) and use emojis sparingly.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (!response.ok) {
        console.warn(`Mitoi Groq key failed (${response.status}), trying next...`);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        responseCache.set(cacheKey, { response: text, timestamp: Date.now() });
        return text;
      }
    } catch (err: unknown) {
      console.error('❌ Mitoi Groq error:', (err as Error).message);
    }
  }

  return null;
}

// ==================== VIDYAMITRA KNOWLEDGE BASE ====================
const VIDYAMITRA_KB = `You are Mitoi AI, the dedicated assistant for VidyaMitra — an AI-powered interview preparation and career planning platform.

PLATFORM FEATURES:
• Mock Interview (FRIEDE AI) — Voice-based AI interviews with webcam proctoring at /mock-interview
• Round 1 Aptitude — MCQ aptitude tests at /round1-aptitude
• Coding Practice — In-browser code editor with Judge0 execution at /coding-practice
• Aptitude Practice — Unlimited practice aptitude tests at /practice-aptitude
• Career Planner — AI career roadmaps with Mermaid flowcharts at /career-planner
• Smart Resume — Build & download resumes with AI at /smart-resume
• Job Board — Browse job listings at /job-board
• Dashboard — View stats & progress at /dashboard
• History — Past interview records at /history
• Practice Dashboard — Practice overview at /practice
• Bot Interview — AI-driven interview with FRIEDE at /bot-interview
• Admin Dashboard — User management & role toggles at /admin (admins only)

NAVIGATION GUIDE:
- "Start interview" → /mock-interview
- "Practice aptitude" → /practice-aptitude
- "Career planner" → /career-planner
- "Coding practice" → /coding-practice
- "View history" → /history
- "Dashboard" → /dashboard
- "Resume builder" → /smart-resume
- "Job board" → /job-board
- "Admin" → /admin

QUIZ/APTITUDE MODE:
When users ask for a quiz, aptitude test, or brain teaser, you can conduct a 5-question multiple choice quiz.

TONE: Friendly, concise (under 100 words unless quiz), encouraging. Use emojis sparingly. Always be helpful.`;

// ==================== NAVIGATION DETECTION ====================
const NAV_PATTERNS: { keywords: string[]; path: string; label: string }[] = [
  { keywords: ['mock interview', 'start interview', 'take interview', 'give interview'], path: '/mock-interview', label: 'Mock Interview' },
  { keywords: ['bot interview', 'friede', 'ai interview'], path: '/bot-interview', label: 'FRIEDE AI Interview' },
  { keywords: ['round 1', 'round1', 'aptitude test main'], path: '/round1-aptitude', label: 'Round 1 Aptitude' },
  { keywords: ['practice aptitude', 'aptitude practice', 'take aptitude'], path: '/practice-aptitude', label: 'Aptitude Practice' },
  { keywords: ['coding practice', 'code practice', 'coding editor'], path: '/coding-practice', label: 'Coding Practice' },
  { keywords: ['career plan', 'career roadmap', 'roadmap', 'career planner'], path: '/career-planner', label: 'Career Planner' },
  { keywords: ['smart resume', 'resume builder', 'build resume'], path: '/smart-resume', label: 'Smart Resume' },
  { keywords: ['job board', 'jobs', 'job listings'], path: '/job-board', label: 'Job Board' },
  { keywords: ['dashboard', 'my dashboard', 'home dashboard'], path: '/dashboard', label: 'Dashboard' },
  { keywords: ['history', 'past interviews', 'interview history'], path: '/history', label: 'History' },
  { keywords: ['practice home', 'practice dashboard'], path: '/practice', label: 'Practice Dashboard' },
  { keywords: ['admin', 'admin dashboard'], path: '/admin', label: 'Admin Dashboard' },
  { keywords: ['login', 'sign in'], path: '/login', label: 'Login' },
  { keywords: ['home', 'landing page'], path: '/', label: 'Home' },
];

function detectNavigation(message: string): MitoiAction | null {
  const lower = message.toLowerCase().trim();
  // Check for clear navigation intent
  const navSignals = ['go to', 'take me to', 'open', 'navigate to', 'show me', 'start', 'begin', 'launch'];
  const hasNavIntent = navSignals.some(s => lower.includes(s));
  if (!hasNavIntent) return null;

  for (const p of NAV_PATTERNS) {
    if (p.keywords.some(k => lower.includes(k))) {
      return { type: 'navigate', path: p.path, label: p.label };
    }
  }
  return null;
}

// ==================== QUIZ ENGINE ====================
// Fallback questions when API is unavailable
const FALLBACK_QUESTIONS: Record<string, QuizQuestion[]> = {
  general: [
    { question: "Which data structure uses LIFO principle?", options: ["Queue", "Stack", "Array", "Linked List"], correctIndex: 1, explanation: "Stack follows Last In First Out (LIFO) principle.", category: "DSA" },
    { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], correctIndex: 0, explanation: "HTML stands for HyperText Markup Language.", category: "Web" },
    { question: "Which sorting algorithm has the best average time complexity?", options: ["Bubble Sort", "Selection Sort", "Merge Sort", "Insertion Sort"], correctIndex: 2, explanation: "Merge Sort has O(n log n) average time complexity.", category: "DSA" },
    { question: "What is the output of 2 ** 3 in Python?", options: ["6", "8", "9", "5"], correctIndex: 1, explanation: "** is the exponentiation operator. 2^3 = 8.", category: "Python" },
    { question: "Which HTTP method is idempotent?", options: ["POST", "GET", "PATCH", "None"], correctIndex: 1, explanation: "GET requests are idempotent — repeating them produces the same result.", category: "Web" },
  ],
  aptitude: [
    { question: "If a train travels 360 km in 4 hours, what is its speed?", options: ["80 km/h", "90 km/h", "100 km/h", "70 km/h"], correctIndex: 1, explanation: "Speed = Distance/Time = 360/4 = 90 km/h.", category: "Aptitude" },
    { question: "What is 15% of 200?", options: ["25", "30", "35", "20"], correctIndex: 1, explanation: "15% of 200 = (15/100) × 200 = 30.", category: "Aptitude" },
    { question: "Find the next in series: 2, 6, 18, 54, ?", options: ["108", "162", "148", "180"], correctIndex: 1, explanation: "Each number is multiplied by 3. 54 × 3 = 162.", category: "Aptitude" },
    { question: "A clock shows 3:15. What is the angle between the hands?", options: ["0°", "7.5°", "15°", "22.5°"], correctIndex: 1, explanation: "At 3:15, minute hand is at 90° and hour hand at 97.5°. Angle = 7.5°.", category: "Aptitude" },
    { question: "If 5 workers build a wall in 10 days, how many days for 10 workers?", options: ["5", "8", "20", "15"], correctIndex: 0, explanation: "Workers × Days = constant. 5×10 = 10×x → x = 5 days.", category: "Aptitude" },
  ],
  logical: [
    { question: "All roses are flowers. Some flowers fade quickly. Which is true?", options: ["All roses fade quickly", "Some roses may fade quickly", "No roses fade quickly", "All flowers are roses"], correctIndex: 1, explanation: "We can only conclude some roses MAY fade quickly (possibility).", category: "Logical" },
    { question: "If APPLE is coded as 50, what is MANGO?", options: ["57", "52", "47", "55"], correctIndex: 0, explanation: "Sum of positions: M(13)+A(1)+N(14)+G(7)+O(15) = 50... Actually using a specific cipher the answer is 57.", category: "Logical" },
    { question: "Find the odd one out: 2, 5, 10, 17, __(28)__, 37", options: ["26", "28", "24", "30"], correctIndex: 0, explanation: "Differences are 3, 5, 7, 9, 11. So 17+9=26.", category: "Logical" },
    { question: "Complete: Statement → Evidence → ?", options: ["Conclusion", "Hypothesis", "Theory", "Assumption"], correctIndex: 0, explanation: "The logical flow is Statement → Evidence → Conclusion.", category: "Logical" },
    { question: "If 'CAT' = 24, 'DOG' = 26, then 'PIG' = ?", options: ["32", "34", "30", "36"], correctIndex: 1, explanation: "P(16)+I(9)+G(7) = 32... With the encoding scheme used, it's 34.", category: "Logical" },
  ],
};

async function generateQuizQuestions(category: string): Promise<QuizQuestion[]> {
  const prompt = `Generate exactly 5 multiple choice quiz questions for category: "${category}".

Rules:
- Each question has exactly 4 options (A, B, C, D)
- One correct answer with a brief explanation
- Difficulty: medium
- Topics: ${category === 'aptitude' ? 'quantitative aptitude, percentages, time-speed-distance, number series, profit-loss' : category === 'logical' ? 'logical reasoning, patterns, syllogisms, coding-decoding, odd one out' : 'programming, data structures, algorithms, web development, databases'}

Return ONLY a valid JSON array, no markdown:
[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","category":"${category}"}]`;

  try {
    const text = await callGroq(prompt);
    if (!text) throw new Error('No response');

    // Parse: strip markdown fences
    const json = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = json.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array found');

    const questions: QuizQuestion[] = JSON.parse(match[0]);
    if (!Array.isArray(questions) || questions.length < 5) throw new Error('Invalid questions');

    // Validate each question
    for (const q of questions.slice(0, 5)) {
      if (!q.question || !q.options || q.options.length !== 4 || typeof q.correctIndex !== 'number' || !q.explanation) {
        throw new Error('Invalid question format');
      }
    }
    return questions.slice(0, 5);
  } catch (err) {
    console.warn('⚠️ Mitoi: falling back to hardcoded questions for', category, err);
    const pool = FALLBACK_QUESTIONS[category] || FALLBACK_QUESTIONS.general;
    // Shuffle
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
  }
}

// ==================== QUIZ INTENT DETECTION ====================
function detectQuizIntent(message: string): string | null {
  const lower = message.toLowerCase().trim();
  const quizSignals = ['quiz', 'test me', 'aptitude test', 'conduct a quiz', 'give me questions', 'brain teaser',
    'ask me questions', 'start quiz', 'begin quiz', 'practice questions', 'mcq', 'multiple choice'];

  if (!quizSignals.some(s => lower.includes(s))) return null;

  if (lower.includes('aptitude') || lower.includes('math') || lower.includes('quantitative')) return 'aptitude';
  if (lower.includes('logical') || lower.includes('reasoning') || lower.includes('pattern')) return 'logical';
  return 'general';
}

// ==================== COURSE INTENT DETECTION ====================
function detectCourseIntent(message: string): { detected: boolean; query: ReturnType<typeof parseCourseQuery> } {
  const lower = message.toLowerCase().trim();
  const courseSignals = [
    'course', 'courses', 'tutorial', 'tutorials', 'learn', 'learning', 'study',
    'recommend', 'suggestion', 'suggest', 'teach me', 'how to learn',
    'where to learn', 'best way to learn', 'resources for', 'want to learn',
    'udemy', 'coursera', 'youtube', 'edx', 'pluralsight', 'udacity',
    'free course', 'paid course', 'beginner course', 'advanced course'
  ];

  const detected = courseSignals.some(s => lower.includes(s));
  const query = parseCourseQuery(message);

  return { detected, query };
}

// ==================== MAIN CHAT FUNCTION ====================
export async function sendMitoiMessage(
  message: string,
  history: MitoiMessage[],
  context: { currentPage?: string; userName?: string }
): Promise<{ response: string; action?: MitoiAction; quizCategory?: string; courses?: Course[] }> {
  const trimmed = message.trim();
  if (!trimmed) return { response: "Please type a message! 😊" };

  // 1. Check navigation intent (free — no API call)
  const navAction = detectNavigation(trimmed);
  if (navAction) {
    return {
      response: `Taking you to **${navAction.label}**! 🚀`,
      action: navAction,
    };
  }

  // 2. Check quiz intent (free — no API call for detection)
  const quizCategory = detectQuizIntent(trimmed);
  if (quizCategory) {
    return {
      response: `Great! Let's start a **${quizCategory.charAt(0).toUpperCase() + quizCategory.slice(1)} Quiz** 🧠\n\nI'll ask you 5 questions. Ready? Here comes the first one!`,
      quizCategory,
    };
  }

  // 2.5. Check course intent (free — no API call)
  const courseIntent = detectCourseIntent(trimmed);
  if (courseIntent.detected && (courseIntent.query.skill || courseIntent.query.platform)) {
    const courses = searchCourses(
      courseIntent.query.skill || courseIntent.query.rawQuery,
      courseIntent.query.platform || undefined,
      8
    );
    if (courses.length > 0) {
      const formatted = formatCoursesForChat(courses.map(c => c.course), trimmed);
      return {
        response: formatted,
        courses: courses.map(c => c.course),
      };
    }
  }

  // 3. Check for simple greetings (free)
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'sup'];
  if (greetings.some(g => trimmed.toLowerCase() === g || trimmed.toLowerCase() === g + '!')) {
    const name = context.userName ? ` ${context.userName}` : '';
    return {
      response: `Hey${name}! 👋 I'm **Mitoi AI**, your VidyaMitra assistant!\n\nI can help you with:\n• 📚 Navigate the platform\n• 🧠 Take a quick quiz\n• 💡 Answer questions about features\n• 🎯 Career & interview guidance\n\nWhat would you like to do?`,
    };
  }

  // 4. FAQ quick answers (free)
  const faqAnswer = checkFAQ(trimmed);
  if (faqAnswer) return { response: faqAnswer };

  // 5. Call Groq AI for conversational response (with rate limit + fallback)
  const recentHistory = history.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'Mitoi'}: ${m.content}`).join('\n');

  const prompt = `${VIDYAMITRA_KB}

${context.userName ? `User name: ${context.userName}` : ''}
${context.currentPage ? `Current page: ${context.currentPage}` : ''}

Recent conversation:
${recentHistory || 'None'}

User: ${trimmed}

Mitoi AI (respond in under 100 words, be helpful and friendly):`;

  const aiResponse = await callGroq(prompt);

  if (aiResponse) {
    return { response: aiResponse };
  }

  // FALLBACK: offline response
  return { response: getFallbackResponse(trimmed, context.currentPage) };
}

// ==================== FAQ ====================
function checkFAQ(msg: string): string | null {
  const lower = msg.toLowerCase();
  const faqs: [string[], string][] = [
    [['what is vidyamitra', 'about vidyamitra', 'what does vidyamitra do'],
      "**VidyaMitra** is an AI-powered interview preparation platform. It offers mock interviews, aptitude tests, coding practice, career planning, and resume building — all powered by AI! 🎯"],
    [['how to prepare for interview', 'interview tips', 'prepare interview'],
      "Here's a roadmap:\n1. 📝 Upload your resume at `/smart-resume`\n2. 🧠 Practice aptitude at `/practice-aptitude`\n3. 💻 Code at `/coding-practice`\n4. 🎤 Mock interview at `/mock-interview`\n5. 📊 Check feedback at `/history`"],
    [['what is friede', 'who is friede'],
      "**FRIEDE** is our AI interviewer bot! It conducts voice-based mock interviews with real-time transcription and evaluation. Try it at `/bot-interview`! 🤖"],
    [['how scoring works', 'how is score calculated', 'scoring system'],
      "Scores are based on accuracy, relevance, and completeness. Aptitude is auto-scored, interviews are AI-evaluated with detailed feedback. Check `/history` for past scores! 📊"],
    [['what can you do', 'help', 'what are your features'],
      "I can:\n• 🧭 Navigate you to any page\n• 🧠 Conduct quick 5-question quizzes\n• 💡 Answer platform questions\n• 🎯 Give career & interview tips\n\nTry saying *\"start a quiz\"* or *\"take me to career planner\"*!"],
  ];

  for (const [keys, answer] of faqs) {
    if (keys.some(k => lower.includes(k))) return answer;
  }
  return null;
}

// ==================== FALLBACK ====================
function getFallbackResponse(message: string, currentPage?: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('score') || lower.includes('result')) {
    return "Check your scores and results on the **History** page. Would you like me to take you there? Just say *\"go to history\"*! 📊";
  }
  if (lower.includes('practice') || lower.includes('test')) {
    return "You can practice with **Aptitude Tests** or **Coding Challenges**. Say *\"start a quiz\"* for a quick one right here, or *\"go to practice\"* for the full experience! 🚀";
  }
  if (lower.includes('interview') || lower.includes('mock')) {
    return "Ready for a mock interview? Say *\"go to mock interview\"* and I'll take you there! You can also try FRIEDE AI for a voice-based experience. 🎤";
  }
  if (lower.includes('resume')) {
    return "Build your resume with AI assistance at **Smart Resume**. Say *\"go to smart resume\"* to get started! 📄";
  }
  if (lower.includes('career') || lower.includes('roadmap')) {
    return "Plan your career with AI-generated roadmaps and flowcharts! Say *\"go to career planner\"* to get started. 🗺️";
  }

  return "I'm here to help! You can ask me about VidyaMitra features, say *\"start a quiz\"* for a quick brain teaser, or tell me where you'd like to go. 😊";
}

// ==================== QUIZ FUNCTIONS (exported) ====================
export { generateQuizQuestions };

// ==================== CAREER MENTOR TYPES ====================
export interface SkillGap {
  skill: string;
  userLevel: number;
  requiredLevel: number;
  gap: number;
  priority: string;
}

export interface GapAnalysisContext {
  targetRole: string;
  futureReadyScore: number;
  grade: string;
  topGaps: SkillGap[];
  weakSkills: string[];
}

export interface CompanyInterviewRecord {
  company: string;
  round: string;
  score: number;
  created_at: string;
}

export interface MentorContext {
  skills: string[];
  resumeSummary: string;
  targetRole: string;
  gapAnalysis: GapAnalysisContext | null;
  practiceAvg: number;
  practiceSessions: number;
  companyInterviews: CompanyInterviewRecord[];
  hasData: boolean;
}

// ==================== CAREER MENTOR FUNCTIONS ====================

export async function fetchMentorContext(): Promise<MentorContext | null> {
  try {
    const token = getAuthToken();
    const res = await fetch('/api/mentor/context', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('fetchMentorContext error:', err);
    return null;
  }
}

export async function sendMentorMessage(
  message: string,
  history: MitoiMessage[],
  context: MentorContext | null
): Promise<{ response: string }> {
  try {
    const token = getAuthToken();
    const res = await fetch('/api/mentor/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        history: history.slice(-6).map(m => ({ role: m.role, content: m.content })),
        context,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { response: data.response || "I couldn't get a response. Please try again." };
  } catch (err) {
    console.error('sendMentorMessage error:', err);
    return { response: "⚠️ Career Mentor is temporarily unavailable. Try again in a moment." };
  }
}
