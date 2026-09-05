/**
 * ElevenLabs Conversational AI Service
 * 
 * Manages ElevenLabs voice AI integration with:
 * - Rate limiting (tracks character usage against 10k/month free tier)
 * - Session management (one active session at a time)
 * - Signed URL generation via backend proxy (keeps API key server-side)
 * - Fallback to FRIEDE when ElevenLabs is unavailable
 * - Local storage persistence for usage tracking
 */

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || '';

// ==================== RATE LIMITING ====================
const MONTHLY_CHAR_LIMIT = 9000; // 9k of 10k to leave buffer
const STORAGE_KEY = 'elevenlabs_usage';

interface UsageData {
  monthKey: string; // e.g., "2026-02"
  charsUsed: number;
  sessionsToday: number;
  lastSessionDate: string;
  totalSessions: number;
}

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function loadUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: UsageData = JSON.parse(raw);
      // Reset if new month
      if (data.monthKey !== getMonthKey()) {
        return {
          monthKey: getMonthKey(),
          charsUsed: 0,
          sessionsToday: 0,
          lastSessionDate: getTodayKey(),
          totalSessions: 0,
        };
      }
      // Reset daily counter if new day
      if (data.lastSessionDate !== getTodayKey()) {
        data.sessionsToday = 0;
        data.lastSessionDate = getTodayKey();
      }
      return data;
    }
  } catch {
    // Ignore parse errors
  }
  return {
    monthKey: getMonthKey(),
    charsUsed: 0,
    sessionsToday: 0,
    lastSessionDate: getTodayKey(),
    totalSessions: 0,
  };
}

function saveUsage(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// ==================== SESSION MANAGEMENT ====================
interface ElevenLabsSession {
  id: string;
  startedAt: number;
  candidateName: string;
  role: string;
  isActive: boolean;
  signedUrl?: string;
  estimatedCharsUsed: number;
}

let currentSession: ElevenLabsSession | null = null;
let signedUrlCache: { url: string; expiresAt: number } | null = null;

// ==================== PUBLIC API ====================

/**
 * Check if ElevenLabs is available (within rate limits)
 */
export function isElevenLabsAvailable(): {
  available: boolean;
  reason?: string;
  charsRemaining: number;
  sessionsToday: number;
} {
  if (!AGENT_ID) {
    return {
      available: false,
      reason: 'ElevenLabs Agent ID not configured',
      charsRemaining: 0,
      sessionsToday: 0,
    };
  }

  const usage = loadUsage();
  const charsRemaining = MONTHLY_CHAR_LIMIT - usage.charsUsed;

  if (charsRemaining <= 500) {
    return {
      available: false,
      reason: `Monthly character limit nearly exhausted (${charsRemaining} chars remaining). Using FRIEDE instead.`,
      charsRemaining,
      sessionsToday: usage.sessionsToday,
    };
  }

  // Max 5 sessions per day to conserve quota
  if (usage.sessionsToday >= 5) {
    return {
      available: false,
      reason: 'Daily session limit reached (5/day). Using FRIEDE instead.',
      charsRemaining,
      sessionsToday: usage.sessionsToday,
    };
  }

  return {
    available: true,
    charsRemaining,
    sessionsToday: usage.sessionsToday,
  };
}

/**
 * Get a signed URL from the backend for secure widget initialization.
 * Falls back to using the public agent-id if signed URL fails.
 */
export async function getSignedUrl(): Promise<string | null> {
  // Check cache (signed URLs are typically valid for a short time)
  if (signedUrlCache && signedUrlCache.expiresAt > Date.now()) {
    return signedUrlCache.url;
  }

  try {
    const response = await fetch('/api/elevenlabs-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn('⚠️ Failed to get signed URL, will use agent-id fallback');
      return null;
    }

    const data = await response.json();
    if (data.signedUrl) {
      // Cache for 4 minutes (URLs typically expire in 5 min)
      signedUrlCache = {
        url: data.signedUrl,
        expiresAt: Date.now() + 4 * 60 * 1000,
      };
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('⚠️ Signed URL request failed:', err);
  }

  return null;
}

/**
 * Start an ElevenLabs voice interview session
 */
export function startSession(candidateName: string, role: string): ElevenLabsSession {
  // End any existing session
  if (currentSession?.isActive) {
    endSession();
  }

  const session: ElevenLabsSession = {
    id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    candidateName,
    role,
    isActive: true,
    estimatedCharsUsed: 0,
  };

  currentSession = session;

  // Update usage tracking
  const usage = loadUsage();
  usage.sessionsToday++;
  usage.totalSessions++;
  saveUsage(usage);

  console.log(`🎙️ ElevenLabs session started: ${session.id}`);
  return session;
}

/**
 * Track estimated characters used in current session
 */
export function trackCharsUsed(chars: number): void {
  if (currentSession) {
    currentSession.estimatedCharsUsed += chars;
  }

  const usage = loadUsage();
  usage.charsUsed += chars;
  saveUsage(usage);
}

/**
 * End the current session and finalize usage
 */
export function endSession(): void {
  if (!currentSession) return;

  const duration = (Date.now() - currentSession.startedAt) / 1000;
  
  // Estimate ~50 chars per 10 seconds of conversation (conservative)
  const estimatedChars = Math.ceil(duration / 10) * 50;
  trackCharsUsed(estimatedChars);

  console.log(
    `🎙️ ElevenLabs session ended: ${currentSession.id}, ` +
    `duration: ${Math.round(duration)}s, ` +
    `est. chars: ${currentSession.estimatedCharsUsed + estimatedChars}`
  );

  currentSession.isActive = false;
  currentSession = null;
}

/**
 * Get the current session info
 */
export function getCurrentSession(): ElevenLabsSession | null {
  return currentSession;
}

/**
 * Get the agent ID
 */
export function getAgentId(): string {
  return AGENT_ID;
}

/**
 * Get ElevenLabs usage stats for display
 */
export function getUsageStats(): {
  charsUsed: number;
  charsRemaining: number;
  monthlyLimit: number;
  sessionsToday: number;
  totalSessions: number;
  percentUsed: number;
} {
  const usage = loadUsage();
  const charsRemaining = Math.max(0, MONTHLY_CHAR_LIMIT - usage.charsUsed);
  return {
    charsUsed: usage.charsUsed,
    charsRemaining,
    monthlyLimit: MONTHLY_CHAR_LIMIT,
    sessionsToday: usage.sessionsToday,
    totalSessions: usage.totalSessions,
    percentUsed: Math.round((usage.charsUsed / MONTHLY_CHAR_LIMIT) * 100),
  };
}

/**
 * Reset usage data (admin function)
 */
export function resetUsage(): void {
  localStorage.removeItem(STORAGE_KEY);
  signedUrlCache = null;
  console.log('🔄 ElevenLabs usage data reset');
}
