/**
 * Centralized API Keys Configuration
 * 
 * API keys are now loaded from environment variables for better security.
 * Make sure to set these in your .env file:
 * - VITE_GEMINI_API_KEY (main Gemini API key)
 * - VITE_GEMINI_CHATBOT_API_KEY (chatbot service)
 * - VITE_GEMINI_FRIEDE_API_KEY (FRIEDE bot interview)
 * 
 * Judge0 keys are server-side only (JUDGE0_HOST, JUDGE0_RAPIDAPI_KEY)
 * Code execution goes through /api/judge0/* proxy endpoints.
 */

// Get API keys from environment variables without fallbacks for security
const getEnvVar = (key: string, required: boolean = true): string => {
  const value = import.meta.env[key];
  if (!value && required) {
    console.error(`❌ ${key} not found in environment variables. Please add it to your .env file.`);
    return '';
  }
  return value || '';
};

export const API_KEYS = {
  // Gemini API Keys — optional, Groq is now the primary AI provider
  GEMINI_MAIN: getEnvVar('VITE_GEMINI_API_KEY', false),
  
  // Chatbot service API key (now using Groq instead)
  GEMINI_CHATBOT: getEnvVar('VITE_GEMINI_CHATBOT_API_KEY', false),
  
  // FRIEDE bot interview API key (optional)
  GEMINI_FRIEDE: getEnvVar('VITE_GEMINI_FRIEDE_API_KEY', false),
  
  // Judge0 keys are now server-side only (no VITE_ prefix)
  // Code execution goes through /api/judge0/* proxy
  
  // ElevenLabs Conversational AI (agent ID is public, API key stays server-side)
  ELEVENLABS_AGENT_ID: getEnvVar('VITE_ELEVENLABS_AGENT_ID', false),
} as const;

// Rate limiting configuration shared across all services
export const RATE_LIMIT = {
  MIN_API_CALL_INTERVAL: 4000, // 4 seconds (15 requests per minute)
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  MAX_CODE_LENGTH: parseInt(getEnvVar('VITE_MAX_CODE_LENGTH', false) || '50000'),
  MAX_EXECUTION_TIME: parseInt(getEnvVar('VITE_MAX_EXECUTION_TIME', false) || '10000'),
  ENABLE_CODE_SANITIZATION: getEnvVar('VITE_ENABLE_CODE_SANITIZATION', false) !== 'false',
} as const;
