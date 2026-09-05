import { GoogleGenerativeAI } from "@google/generative-ai";
import { API_KEYS, RATE_LIMIT } from "@/config/apiKeys";
import { getAIProvider } from "./aiProviderService";
import { sendChatMessageWithOpenAI } from "./openaiService";

const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_CHATBOT);

// Rate limiting tracker to prevent exceeding 15 RPM limit
let lastChatbotApiCall = 0;
const MIN_API_CALL_INTERVAL = RATE_LIMIT.MIN_API_CALL_INTERVAL;

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastChatbotApiCall;
  
  if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
    const waitTime = MIN_API_CALL_INTERVAL - timeSinceLastCall;
    console.log(`⏳ Chatbot rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastChatbotApiCall = Date.now();
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: ChatAction;
}

export interface ChatAction {
  type: 'navigate' | 'fetch-data' | 'multi-step';
  payload: {
    path?: string;
    autoStart?: boolean;
    dataType?: string;
    steps?: string[];
    [key: string]: unknown;
  };
  description: string;
}

export interface ChatContext {
  currentPage?: string;
  userRole?: 'candidate' | 'recruiter' | 'admin';
  userName?: string;
  practiceStats?: {
    aptitudeTests: number;
    interviewSessions: number;
    averageScore: number;
  };
}

const FAQ_RESPONSES: Record<string, string> = {
  'how do i start practice': 'Click "Start Practicing Now" on the home page, or go to Practice Home to choose between Aptitude Tests or Interview Practice.',
  'where is my history': 'Click "Practice History" on the Practice Home page, or navigate to /practice-history.',
  'how to prepare': 'Start with aptitude tests to build fundamentals, then practice role-specific interviews. Review feedback and follow YouTube recommendations.',
  'what is practice mode': 'Practice Mode lets you take unlimited tests without pressure. Results are saved for tracking progress.',
  'how does ai work': 'We use Gemini AI to generate questions, evaluate answers, and provide detailed feedback.',
  'resume upload': 'On the Interview page, click "Upload Resume" for AI-analyzed, tailored questions.',
  'how is score calculated': 'Scores are based on accuracy, clarity, completeness, and relevance. Aptitude tests are automatic, interviews are AI-evaluated.',
  'improve score': 'Focus on weak areas from feedback, practice regularly, follow YouTube resources, and give detailed answers.',
};

// Available routes with descriptions
const AVAILABLE_ROUTES = {
  '/home': 'Landing page with platform overview and features - start your interview here',
  '/login': 'Login/signup page for authentication',
  '/dashboard': 'User dashboard with overview, statistics, and quick actions',
  '/interview': 'Main interview page (monitored test mode) with resume upload and AI questions',
  '/practice': 'Practice home page - choose between aptitude tests or interview practice',
  '/practice-interview': 'Interview practice mode (unlimited, no monitoring) with AI evaluation',
  '/practice-aptitude': 'Aptitude test practice with 100+ MCQ questions across categories',
  '/practice-history': 'Practice history showing past aptitude tests and interview sessions',
  '/summary': 'Interview summary page with detailed results and feedback',
  '/history': 'Complete interview history with all test results',
  '/admin': 'Admin dashboard for managing users and system settings',
  '/api-test': 'Gemini API testing page for admins',
  '/openai-test': 'OpenAI API testing page for admins'
};

// AI-powered action detection using Gemini
export async function detectActionWithAI(message: string): Promise<ChatAction | null> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
      }
    });

    const availableRoutesText = Object.entries(AVAILABLE_ROUTES)
      .map(([path, desc]) => `${path}: ${desc}`)
      .join('\n');

    const prompt = `You are an intent classifier for a web application. Analyze if the user wants to navigate to a page or fetch data.

Available Routes:
${availableRoutesText}

User message: "${message}"

Respond ONLY with a JSON object (no markdown, no explanation):
- If navigation intent: {"action": "navigate", "path": "/route-path", "description": "Brief action message"}
- If data fetch intent: {"action": "fetch-data", "dataType": "type-name", "description": "Brief action message"}
- If just a question (no action): {"action": "none"}

Examples:
"view history" → {"action": "navigate", "path": "/history", "description": "Opening your history..."}
"start aptitude test" → {"action": "navigate", "path": "/practice-aptitude", "description": "Starting Aptitude Test..."}
"take me to practice" → {"action": "navigate", "path": "/practice", "description": "Opening Practice Home..."}
"open my dashboard" → {"action": "navigate", "path": "/dashboard", "description": "Opening your dashboard..."}
"show interview page" → {"action": "navigate", "path": "/interview", "description": "Opening Interview page..."}
"go to admin" → {"action": "navigate", "path": "/admin", "description": "Opening Admin Dashboard..."}
"what is aptitude test?" → {"action": "none"}
"view practice history" → {"action": "navigate", "path": "/practice-history", "description": "Opening your practice history..."}

Now analyze: "${message}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);

    if (parsed.action === 'none') {
      return null;
    }

    if (parsed.action === 'navigate') {
      return {
        type: 'navigate',
        payload: { path: parsed.path },
        description: parsed.description || 'Navigating...'
      };
    }

    if (parsed.action === 'fetch-data') {
      return {
        type: 'fetch-data',
        payload: { dataType: parsed.dataType },
        description: parsed.description || 'Fetching data...'
      };
    }

    return null;
  } catch (error) {
    console.error('❌ AI action detection error:', error);
    // Fallback to basic pattern matching
    return detectActionBasic(message);
  }
}

// Fallback basic pattern matching
function detectActionBasic(message: string): ChatAction | null {
  const normalized = message.toLowerCase().trim();
  
  // Quick navigation patterns
  const patterns: Array<{ keywords: string[]; path: string; desc: string }> = [
    { keywords: ['start practice', 'practice home', 'go to practice', 'practice page', 'begin practice'], path: '/practice', desc: 'Opening Practice Home...' },
    { keywords: ['start aptitude', 'begin aptitude', 'aptitude test'], path: '/practice-aptitude', desc: 'Starting Aptitude Test...' },
    { keywords: ['start interview', 'begin interview', 'interview practice'], path: '/practice-interview', desc: 'Starting Interview Practice...' },
    { keywords: ['show history', 'my history', 'view history' ], path: '/history', desc: 'Opening your history...' },
    { keywords: ['dashboard', 'user home', 'my dashboard'], path: '/dashboard', desc: 'Opening your dashboard...' },
    { keywords: ['interview page', 'main interview', 'take interview'], path: '/home', desc: 'Opening Interview page...' },
    { keywords: ['admin', 'admin dashboard', 'admin page'], path: '/admin', desc: 'Opening Admin Dashboard...' },
    { keywords: ['summary', 'results', 'show summary'], path: '/summary', desc: 'Opening Summary page...' },
    { keywords: ['login', 'sign in', 'log in'], path: '/login', desc: 'Opening Login page...' },
    { keywords: ['home page', 'landing', 'main page', 'home'], path: '/home', desc: 'Going to home page...' },
    { keywords: ['practice history', 'my practice history', 'view practice history'], path: '/practice-history', desc: 'Opening your practice history...' },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some(keyword => normalized.includes(keyword))) {
      return {
        type: 'navigate',
        payload: { path: pattern.path },
        description: pattern.desc
      };
    }
  }

  return null;
}

function getFAQResponse(question: string): string | null {
  const normalized = question.toLowerCase().trim();
  for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
    if (normalized.includes(key)) return response;
  }
  return null;
}

function generateSystemPrompt(context: ChatContext): string {
  let prompt = `You are VidyaMitra Assistant, an AI agent for an AI-powered career companion platform.

AVAILABLE FEATURES & PAGES:
- Aptitude Practice: 100+ MCQ questions across 5 categories
- Interview Practice: AI-generated role-specific questions with evaluation
- Resume Upload & Analysis: Tailored questions based on resume
- Practice History: Track all your tests and interviews
- Learning Recommendations: YouTube resources for improvement
- User Dashboard: Overview of your progress
- Admin Dashboard: System management (for admins)

IMPORTANT: When users ask about pages or features, I can help them navigate there by understanding their intent. I should be helpful and conversational.

Be friendly, concise (2-3 sentences), encouraging, and actionable.`;

  if (context.userName) prompt += `\nUser: ${context.userName}`;
  if (context.userRole) prompt += `\nRole: ${context.userRole}`;
  if (context.currentPage) {
    prompt += `\nCurrent Page: ${context.currentPage}`;
    if (context.currentPage.includes('practice') && !context.currentPage.includes('history')) {
      prompt += '\nSuggest starting tests or provide guidance.';
    }
    if (context.currentPage.includes('history')) {
      prompt += '\nHelp analyze performance and suggest improvements.';
    }
    if (context.currentPage.includes('interview')) {
      prompt += '\nProvide interview preparation tips.';
    }
  }
  if (context.practiceStats) {
    const { aptitudeTests, interviewSessions, averageScore } = context.practiceStats;
    prompt += `\nStats: ${aptitudeTests} tests, ${interviewSessions} interviews, ${averageScore}% avg`;
    if (averageScore < 50) prompt += '. Encourage more practice.';
    if (averageScore > 80) prompt += '. Congratulate excellence!';
  }
  return prompt;
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[],
  context: ChatContext
): Promise<{ response: string; action?: ChatAction }> {
  try {
    console.log('🤖 Processing:', message);
    console.log('🔑 Using API key from centralized config');
    
    // STEP 1: Check FAQ first (instant response, no API call)
    const faqResponse = getFAQResponse(message);
    if (faqResponse) {
      console.log('✅ FAQ match - no API call needed');
      return { response: faqResponse };
    }
    
    // STEP 2: Try basic pattern matching for navigation (no API call)
    console.log('🔍 Checking basic patterns...');
    const basicAction = detectActionBasic(message);
    if (basicAction) {
      console.log('✅ Basic action detected - no AI needed:', basicAction.type);
      return {
        response: basicAction.description,
        action: basicAction
      };
    }
    
    // STEP 3: Generate conversational response with AI
    const provider = getAIProvider();
    console.log(`🌐 Calling ${provider} AI for conversational response...`);
    
    const systemPrompt = generateSystemPrompt(context);
    const conversationText = conversationHistory
      .slice(-6)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    let text: string;
    
    if (provider === 'openai') {
      // Use OpenAI via backend proxy
      const historyForOpenAI = conversationHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
      text = await sendChatMessageWithOpenAI(message, historyForOpenAI, systemPrompt);
    } else {
      // Use Gemini directly
      await enforceRateLimit();
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });
      
      const fullPrompt = `${systemPrompt}\n\nConversation:\n${conversationText || 'None'}\n\nUser: ${message}\n\nAssistant: Be helpful and concise (under 150 words).`;

      console.log('📤 Sending prompt to Gemini');
      const result = await model.generateContent(fullPrompt);
      console.log('📥 Received response from Gemini');
      
      const response = result.response;
      text = response.text();
    }
    
    console.log('✅ AI response generated:', text.substring(0, 50) + '...');
    return { response: text.trim() };

  } catch (error: unknown) {
    console.error('❌ Chatbot error:', error);
    const err = error as { message?: string; code?: string; status?: string };
    console.error('❌ Error details:', {
      message: err.message,
      code: err.code,
      status: err.status,
      fullError: JSON.stringify(error, null, 2)
    });
    
    // More helpful error messages
    if (err.message?.includes('API key')) {
      return { response: "There's an issue with the API configuration. Please contact support." };
    }
    if (err.message?.includes('quota')) {
      return { response: "I'm temporarily unavailable due to high usage. Please try again in a moment." };
    }
    if (err.message?.includes('network')) {
      return { response: "I'm having trouble connecting. Please check your internet connection." };
    }
    return { response: "I'm having trouble processing your request right now. Please try again!" };
  }
}

export function getQuickReplies(currentPage: string): string[] {
  if (currentPage.includes('practice') && !currentPage.includes('history')) {
    return [
      '🚀 Start aptitude test',
      '💼 Begin interview practice',
      '📚 How to prepare?'
    ];
  }
  if (currentPage.includes('history')) {
    return [
      '📊 Show my stats',
      '🎯 How to improve?',
      '🚀 Start new test'
    ];
  }
  if (currentPage.includes('interview')) {
    return [
      '📝 Upload resume tips',
      '💡 Interview strategies',
      '🏠 Go to dashboard'
    ];
  }
  if (currentPage === '/dashboard') {
    return [
      '🚀 Take me to practice',
      '📊 Show practice history',
      '💼 Start interview'
    ];
  }
  if (currentPage.includes('admin')) {
    return [
      '👥 Manage users',
      '📊 View analytics',
      '🏠 Go to dashboard'
    ];
  }
  return [
    '🚀 Start practice',
    '💼 Begin interview',
    '📊 View history'
  ];
}
