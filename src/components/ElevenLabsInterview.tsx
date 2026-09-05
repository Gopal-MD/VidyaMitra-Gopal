/**
 * ElevenLabs Voice Interview Component
 *
 * Clean two-panel layout:
 *   Left  – Webcam (top) + FRIEDE avatar (bottom)
 *   Right – Status header, toggleable live conversation, tips
 *
 * Feedback is 100 % derived from conversation metrics (no hardcoded bases).
 * Proctoring removed per design spec.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Conversation } from '@11labs/client';
import { useAuth } from '@/contexts/AuthContext';
import { saveBotInterviewResult } from '@/lib/firebaseService';
import WebcamPanel from '@/components/WebcamPanel';
import {
  isElevenLabsAvailable,
  startSession,
  endSession,
  getAgentId,
  getUsageStats,
} from '@/utils/elevenLabsService';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  PhoneOff,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Volume2,
  BarChart3,
  ArrowLeft,
  Phone,
  MessageSquare,
  Lightbulb,
  User,
} from 'lucide-react';

// ─── props ───────────────────────────────────────────────
interface ElevenLabsInterviewProps {
  candidateName: string;
  role: string;
  isFirstTime: boolean;
  onFallbackToFriede: () => void;
  onComplete: () => void;
}

// ─── component ───────────────────────────────────────────
export default function ElevenLabsInterview({
  candidateName,
  role,
  isFirstTime,
  onFallbackToFriede,
  onComplete,
}: ElevenLabsInterviewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionStartRef = useRef<number>(0);
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── state ──
  const [status, setStatus] = useState<
    'loading' | 'requesting-mic' | 'connecting' | 'active' | 'ended' | 'error'
  >('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [agentMode, setAgentMode] = useState<'listening' | 'speaking'>('listening');
  const [isMuted, setIsMuted] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showConversation, setShowConversation] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [animTick, setAnimTick] = useState(0);
  const [conversationLog, setConversationLog] = useState<
    Array<{ speaker: 'user' | 'friede'; text: string; timestamp: number }>
  >([]);
  const [feedbackData, setFeedbackData] = useState<{
    overallScore: number;
    communication: number;
    engagement: number;
    clarity: number;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  void isFirstTime; // unused but required by parent

  // ── animation tick (audio bars) ──
  useEffect(() => {
    if (status !== 'active') return;
    const id = setInterval(() => setAnimTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [status]);

  // ── timer ──
  useEffect(() => {
    if (status !== 'active') return;
    const id = setInterval(() => {
      if (sessionStartRef.current > 0)
        setElapsedTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // ── auto-scroll conversation ──
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationLog]);

  // ================================================================
  // FEEDBACK — purely derived from conversation data, zero hardcoded
  // ================================================================
  const generateFeedback = useCallback((log: typeof conversationLog) => {
    const userMsgs = log.filter((m) => m.speaker === 'user');
    const friedeMsgs = log.filter((m) => m.speaker === 'friede');
    const totalMsgs = log.length;
    const totalWords = userMsgs.reduce((s, m) => s + m.text.split(/\s+/).filter(Boolean).length, 0);
    const avgWords = userMsgs.length > 0 ? totalWords / userMsgs.length : 0;
    const duration = sessionStartRef.current > 0
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : 0;

    // Communication: based on how many words, average length, and variety
    let communication = 0;
    if (userMsgs.length > 0) {
      const lengthScore = Math.min(40, avgWords * 1.5);           // up to 40 for ~27+ avg words
      const countScore = Math.min(30, userMsgs.length * 5);       // up to 30 for 6+ answers
      const durationScore = Math.min(30, Math.floor(duration / 20) * 5); // up to 30 for 2+ min
      communication = Math.round(lengthScore + countScore + durationScore);
    }

    // Engagement: how balanced the conversation is (turn-taking ratio)
    let engagement = 0;
    if (totalMsgs > 0) {
      const ratio = userMsgs.length / Math.max(1, friedeMsgs.length);
      const ratioScore = ratio >= 0.5 && ratio <= 1.5 ? 50 : Math.max(0, 50 - Math.abs(ratio - 1) * 30);
      const volumeScore = Math.min(30, totalMsgs * 3);            // up to 30 for 10+ total
      const timeScore = Math.min(20, Math.floor(duration / 30) * 5);
      engagement = Math.round(ratioScore + volumeScore + timeScore);
    }

    // Clarity: longer, well-formed answers score higher
    let clarity = 0;
    if (userMsgs.length > 0) {
      const detailScore = Math.min(50, avgWords * 2);             // up to 50 for ~25+ avg words
      const consistencyScore = Math.min(30, userMsgs.length * 4); // up to 30
      const longAnswers = userMsgs.filter((m) => m.text.split(/\s+/).length > 15).length;
      const depthScore = Math.min(20, longAnswers * 5);           // up to 20
      clarity = Math.round(detailScore + consistencyScore + depthScore);
    }

    communication = Math.min(100, communication);
    engagement = Math.min(100, engagement);
    clarity = Math.min(100, clarity);
    const overallScore = Math.round((communication + engagement + clarity) / 3);

    // Strengths & improvements (dynamic, not hardcoded)
    const strengths: string[] = [];
    const improvements: string[] = [];

    if (userMsgs.length >= 5) strengths.push('Maintained active dialogue throughout the session');
    if (avgWords > 25) strengths.push('Provided detailed and thoughtful responses');
    if (communication >= 60) strengths.push('Demonstrated strong communication skills');
    if (engagement >= 60) strengths.push('Showed excellent engagement and participation');
    if (duration >= 120) strengths.push('Completed a thorough interview session');
    if (clarity >= 60) strengths.push('Answers were well-structured and clear');

    if (userMsgs.length === 0) {
      improvements.push('Try to respond when FRIEDE asks you questions');
    } else {
      if (avgWords < 12) improvements.push('Elaborate more — aim for at least 2-3 sentences per answer');
      if (userMsgs.length < 3) improvements.push('Engage more actively by answering more questions');
      if (engagement < 40) improvements.push('Balance the conversation — respond to each question');
      if (clarity < 40) improvements.push('Structure answers with clear examples and reasoning');
      if (duration < 60) improvements.push('Try to sustain the interview for at least 2 minutes');
    }

    if (strengths.length === 0) strengths.push('Attempted the voice AI interview');
    if (improvements.length === 0) improvements.push('Keep practicing to sharpen your delivery');

    return {
      overallScore,
      communication,
      engagement,
      clarity,
      strengths: strengths.slice(0, 4),
      improvements: improvements.slice(0, 4),
    };
  }, []);

  // ── save results ──
  const handleInterviewEnd = useCallback(
    async (currentLog?: typeof conversationLog) => {
      endSession();
      setStatus('ended');

      const log = currentLog || conversationLog;
      const feedback = generateFeedback(log);
      setFeedbackData(feedback);

      if (user) {
        try {
          const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          await saveBotInterviewResult(
            {
              userId: user.id || user.email,
              candidateName,
              role,
              conversationLog:
                log.length > 0
                  ? log
                  : [
                      {
                        speaker: 'friede' as const,
                        text: `[ElevenLabs Voice Interview - Duration: ${mins}m ${secs}s]`,
                        timestamp: Date.now(),
                      },
                    ],
              feedback: {
                overallScore: feedback.overallScore,
                communication: feedback.communication,
                engagement: feedback.engagement,
                clarity: feedback.clarity,
                strengths: feedback.strengths,
                improvements: feedback.improvements,
                detailedFeedback: `Voice interview completed via ElevenLabs AI (${mins}m ${secs}s). Communication: ${feedback.communication}/100, Engagement: ${feedback.engagement}/100, Clarity: ${feedback.clarity}/100.`,
              },
              completedAt: new Date().toISOString(),
              interviewType: 'elevenlabs-voice',
            },
            user.id || user.email,
          );
        } catch (err) {
          console.error('Failed to save ElevenLabs interview:', err);
        }
      }
    },
    [user, candidateName, role, conversationLog, generateFeedback],
  );

  // ── end call (captures log before async teardown to avoid stale closures) ──
  const handleManualEnd = useCallback(async () => {
    const currentLog = [...conversationLog];
    try {
      if (conversationRef.current) {
        await conversationRef.current.endSession();
        conversationRef.current = null;
      }
    } catch (err) {
      console.warn('Error ending ElevenLabs session:', err);
    }
    handleInterviewEnd(currentLog);
  }, [handleInterviewEnd, conversationLog]);

  // ── mute / volume ──
  const toggleMute = useCallback(async () => {
    if (!conversationRef.current) return;
    try {
      await conversationRef.current.setVolume({ volume: isMuted ? volume : 0 });
      setIsMuted(!isMuted);
    } catch (err) {
      console.warn('Error toggling mute:', err);
    }
  }, [isMuted, volume]);

  const changeVolume = useCallback(
    async (v: number) => {
      setVolume(v);
      if (conversationRef.current && !isMuted) {
        try {
          await conversationRef.current.setVolume({ volume: v });
        } catch (err) {
          console.warn('Error changing volume:', err);
        }
      }
    },
    [isMuted],
  );

  // ================================================================
  // INIT — start ElevenLabs session
  // ================================================================
  useEffect(() => {
    let cancelled = false;

    const go = async () => {
      const avail = isElevenLabsAvailable();
      if (!avail.available) {
        setErrorMsg(avail.reason || 'ElevenLabs unavailable');
        setStatus('error');
        setTimeout(() => onFallbackToFriede(), 3000);
        return;
      }

      setStatus('requesting-mic');
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (cancelled) return;
        setErrorMsg('Microphone permission denied. Voice AI requires microphone access.');
        setStatus('error');
        setTimeout(() => onFallbackToFriede(), 3000);
        return;
      }

      if (cancelled) return;
      setStatus('connecting');
      startSession(candidateName, role);
      sessionStartRef.current = Date.now();

      try {
        const agentId = getAgentId();
        const conversation = await Conversation.startSession({
          agentId,
          connectionType: 'websocket' as const,
          onConnect: () => {
            if (!cancelled) setStatus('active');
          },
          onDisconnect: () => {
            if (!cancelled) handleInterviewEnd();
          },
          onError: (message: string) => {
            if (!cancelled) {
              setErrorMsg('Voice AI error: ' + message);
              setStatus('error');
              setTimeout(() => onFallbackToFriede(), 3000);
            }
          },
          onModeChange: (mode: { mode: 'speaking' | 'listening' }) => {
            if (!cancelled) setAgentMode(mode.mode);
          },
          onMessage: (props: { message: string; source: 'user' | 'ai' }) => {
            if (!cancelled) {
              setConversationLog((prev) => [
                ...prev,
                {
                  speaker: props.source === 'user' ? 'user' : 'friede',
                  text: props.message,
                  timestamp: Date.now(),
                },
              ]);
            }
          },
        });

        if (cancelled) {
          await conversation.endSession();
          return;
        }
        conversationRef.current = conversation;
      } catch (err) {
        if (cancelled) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        setErrorMsg('Failed to connect: ' + errMsg);
        setStatus('error');
        setTimeout(() => onFallbackToFriede(), 3000);
      }
    };

    go();
    return () => {
      cancelled = true;
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {});
        conversationRef.current = null;
      }
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ──
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const scoreLabel = (v: number) => (v >= 80 ? 'Excellent' : v >= 60 ? 'Good' : v >= 40 ? 'Fair' : 'Needs Work');
  const scoreColor = (v: number) => (v >= 80 ? 'text-green-400' : v >= 60 ? 'text-yellow-400' : v >= 40 ? 'text-orange-400' : 'text-red-400');
  const barColor = (v: number) => (v >= 80 ? 'bg-green-500' : v >= 60 ? 'bg-yellow-500' : v >= 40 ? 'bg-orange-500' : 'bg-red-500');
  const strokeColor = (v: number) => (v >= 80 ? '#22c55e' : v >= 60 ? '#eab308' : v >= 40 ? '#f97316' : '#ef4444');

  const barH = (i: number) => {
    if (agentMode !== 'speaking') return 5;
    return 6 + Math.abs(Math.sin(animTick * 0.3 + i * 0.8)) * 22;
  };

  const stats = getUsageStats();

  // ────────────────────────────────────────
  // AVATAR helper (reusable)
  // ────────────────────────────────────────
  const Avatar = ({ size = 112, border = true, glow = false }: { size?: number; border?: boolean; glow?: boolean }) => {
    const px = `${size}px`;
    const outerPx = `${size + 12}px`;
    const speaking = agentMode === 'speaking';
    return (
      <div className="relative shrink-0" style={{ width: outerPx, height: outerPx }}>
        {/* Animated glow ring behind the avatar when speaking */}
        {glow && speaking && (
          <div
            className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, #3b82f6, #06b6d4, #8b5cf6, #3b82f6)',
              opacity: 0.7,
              filter: 'blur(3px)',
            }}
          />
        )}
        {/* Dark ring border (always visible) */}
        <div
          className={`absolute inset-0 rounded-full ${
            border
              ? speaking && glow
                ? 'bg-gradient-to-br from-blue-500/40 to-cyan-500/40'
                : 'bg-gray-700/80'
              : 'bg-transparent'
          }`}
        />
        {/* Actual image circle, inset by the ring width */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{ top: 4, left: 4, width: `${size + 4}px`, height: `${size + 4}px` }}
        >
          {avatarError ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <User className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} />
            </div>
          ) : (
            <img
              src="/steven-image.png"
              alt="FRIEDE"
              className="w-full h-full object-cover object-center"
              onError={() => setAvatarError(true)}
            />
          )}
        </div>
      </div>
    );
  };

  // ================================================================
  //  ERROR screen
  // ================================================================
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500 shrink-0" />
            <div>
              <h3 className="text-white font-semibold text-lg">Voice AI Unavailable</h3>
              <p className="text-gray-400 text-sm">{errorMsg}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">Switching to FRIEDE text+voice interview...</p>
          <div className="flex gap-3">
            <Button onClick={onFallbackToFriede} className="flex-1">
              Switch to FRIEDE Now
            </Button>
            <Button variant="outline" onClick={() => navigate('/practice')}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  //  LOADING / CONNECTING screen
  // ================================================================
  if (status === 'loading' || status === 'requesting-mic' || status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/40 to-gray-900 flex items-center justify-center p-8">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <Loader2 className="w-24 h-24 text-blue-400 animate-spin" />
            {status === 'requesting-mic' && (
              <Mic className="w-8 h-8 text-blue-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
            {status === 'connecting' && (
              <Phone className="w-8 h-8 text-green-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {status === 'loading' && 'Initializing...'}
            {status === 'requesting-mic' && 'Allow Microphone Access'}
            {status === 'connecting' && 'Connecting to FRIEDE...'}
          </h2>
          <p className="text-blue-300">
            {status === 'loading' && 'Checking availability...'}
            {status === 'requesting-mic' && 'Please allow microphone access when prompted'}
            {status === 'connecting' && `Setting up voice interview for ${candidateName}`}
          </p>
        </div>
      </div>
    );
  }

  // ================================================================
  //  FEEDBACK / ENDED screen
  // ================================================================
  if (status === 'ended') {
    const fb = feedbackData ?? {
      overallScore: 0,
      communication: 0,
      engagement: 0,
      clarity: 0,
      strengths: ['Attempted the voice AI interview'],
      improvements: ['Try to respond when FRIEDE asks you questions'],
    };

    const C = 2 * Math.PI * 42;
    const dash = (fb.overallScore / 100) * C;

    const subs = [
      { label: 'Communication', value: fb.communication },
      { label: 'Engagement', value: fb.engagement },
      { label: 'Clarity', value: fb.clarity },
    ];

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-2xl space-y-4">
          {/* header */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Interview Complete!</h2>
                <p className="text-gray-400 text-sm">
                  Great job, {candidateName} &middot; {role}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Duration</p>
              <p className="text-white text-xl font-mono font-bold">{fmt(elapsedTime)}</p>
            </div>
          </div>

          {/* overall score */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#374151" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={strokeColor(fb.overallScore)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${C}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${scoreColor(fb.overallScore)}`}>
                    {fb.overallScore}
                  </span>
                  <span className="text-gray-500 text-[10px]">/100</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm">Overall Score</p>
                <p className={`text-2xl font-bold ${scoreColor(fb.overallScore)}`}>
                  {scoreLabel(fb.overallScore)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {subs.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-gray-500 text-xs mb-1">{label}</p>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${barColor(value)} transition-all duration-1000`}
                          style={{ width: `${Math.max(value, 2)}%` }}
                        />
                      </div>
                      <p className={`text-xs font-bold mt-0.5 ${scoreColor(value)}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* strengths / improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> STRENGTHS
              </h3>
              <ul className="space-y-2">
                {fb.strengths.map((s, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&bull;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 rounded-xl border border-orange-900/30 p-5">
              <h3 className="text-orange-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> IMPROVE
              </h3>
              <ul className="space-y-2">
                {fb.improvements.map((s, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">&bull;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* conversation highlights */}
          {conversationLog.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="text-gray-400 font-semibold text-xs uppercase tracking-wider mb-3">
                Conversation Highlights
              </h3>
              <div className="text-sm text-gray-300 space-y-2 max-h-52 overflow-y-auto">
                {conversationLog.slice(0, 10).map((msg, i) => (
                  <p key={i}>
                    <span
                      className={`font-semibold ${msg.speaker === 'friede' ? 'text-blue-400' : 'text-green-400'}`}
                    >
                      {msg.speaker === 'friede' ? 'FRIEDE: ' : 'You: '}
                    </span>
                    {msg.text.length > 150 ? msg.text.slice(0, 150) + '...' : msg.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => navigate('/practice')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-base font-medium h-auto"
            >
              Back to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={onComplete}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 py-3 rounded-xl text-base font-medium h-auto"
            >
              New Interview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  //  ACTIVE INTERVIEW
  // ================================================================
  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* ─── top bar ─── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 border-b border-gray-800 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleManualEnd();
              navigate('/practice');
            }}
            className="text-gray-400 hover:text-white gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Exit
          </Button>
          <div className="h-5 w-px bg-gray-700" />
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                agentMode === 'speaking' ? 'bg-blue-500' : 'bg-green-500'
              }`}
            />
            <span
              className={`text-sm font-medium ${
                agentMode === 'speaking' ? 'text-blue-400' : 'text-green-400'
              }`}
            >
              {agentMode === 'speaking' ? '🔊 FRIEDE is Speaking...' : '🎙 Listening to you...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-lg font-mono text-white bg-gray-800 px-3 py-1 rounded-lg">
            {fmt(elapsedTime)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="text-gray-400 hover:text-white"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={handleManualEnd} className="gap-2">
            <PhoneOff className="w-4 h-4" /> End Interview
          </Button>
        </div>
      </div>

      {/* ─── optional stats bar ─── */}
      {showStats && (
        <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-2 shrink-0">
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <span>
              Monthly: {stats.charsUsed}/{stats.monthlyLimit} chars ({stats.percentUsed}%)
            </span>
            <span>Today: {stats.sessionsToday} sessions</span>
            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, stats.percentUsed)}%`,
                  backgroundColor:
                    stats.percentUsed > 80
                      ? '#ef4444'
                      : stats.percentUsed > 50
                        ? '#f59e0b'
                        : '#22c55e',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── main 2-column body ─── */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-3 overflow-hidden min-h-0">
        {/* ═══════ LEFT COLUMN ═══════ */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Webcam — proctoring OFF */}
          <div className="relative flex-[3] rounded-xl overflow-hidden border border-gray-800 bg-black min-h-0">
            <div className="absolute inset-0">
              <WebcamPanel proctoring={false} objectDetection={false} />
            </div>
            {/* LIVE badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/90 px-2.5 py-1 rounded-full z-10">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-[10px] font-bold tracking-wider">LIVE</span>
            </div>
            {/* Name overlay */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 z-10">
              <p className="text-white text-sm font-semibold uppercase">{candidateName}</p>
              <p className="text-gray-300 text-xs">{role}</p>
            </div>
          </div>

          {/* FRIEDE avatar */}
          <div className="flex-[2] rounded-xl overflow-hidden border border-gray-800 bg-gradient-to-br from-slate-900 via-blue-950/60 to-slate-900 flex flex-col items-center justify-center relative min-h-0">
            {/* Soft pulsing halo when speaking */}
            {agentMode === 'speaking' && (
              <div
                className="absolute rounded-full opacity-30 animate-pulse"
                style={{
                  width: 180,
                  height: 180,
                  background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)',
                  animationDuration: '2s',
                }}
              />
            )}

            <div className="relative z-10 mb-2">
              <Avatar size={100} border glow />
              {agentMode === 'speaking' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-gray-950 bg-blue-500 animate-pulse" />
              )}
            </div>

            <h3 className="text-white text-base font-bold z-10">FRIEDE</h3>
            <p
              className={`text-xs font-medium mt-0.5 z-10 ${
                agentMode === 'speaking' ? 'text-blue-400' : 'text-green-400'
              }`}
            >
              {agentMode === 'speaking' ? '🔊 Speaking...' : '🎙 Listening...'}
            </p>

            {/* Audio bars */}
            <div className="flex items-end gap-[3px] h-8 mt-2 z-10">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    agentMode === 'speaking' ? 'bg-blue-400' : 'bg-gray-600'
                  }`}
                  style={{ height: `${barH(i)}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT COLUMN ═══════ */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* FRIEDE header card */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/20 rounded-xl border border-blue-800/20 p-4 flex items-center gap-4 shrink-0">
            <Avatar size={52} border={false} />
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-sm font-semibold">FRIEDE Voice AI</h3>
              <p className="text-blue-300/60 text-xs">Powered by ElevenLabs &bull; Voice: George</p>
              <p
                className={`text-xs mt-0.5 font-medium ${
                  agentMode === 'speaking' ? 'text-blue-400' : 'text-green-400'
                }`}
              >
                {agentMode === 'speaking' ? '🔊 Speaking...' : '🎙 Listening — speak now!'}
              </p>
            </div>
            {/* Mini audio bars */}
            <div className="flex items-center gap-[2px] h-8 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-all duration-100 ${
                    agentMode === 'speaking' ? 'bg-blue-400' : 'bg-gray-600'
                  }`}
                  style={{
                    height: `${
                      agentMode === 'speaking'
                        ? 8 + Math.abs(Math.sin(animTick * 0.25 + i * 1.2)) * 20
                        : 6
                    }px`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Live Conversation — TOGGLE: when open fills space, hides tips */}
          <div className={`flex flex-col bg-gray-900 rounded-xl border border-gray-800 min-h-0 ${showConversation ? 'flex-1' : 'shrink-0'}`}>
            <button
              onClick={() => setShowConversation((p) => !p)}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-800/50 transition-colors shrink-0"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm font-medium">Live Conversation</span>
                {conversationLog.length > 0 && (
                  <span className="bg-blue-600/30 text-blue-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {conversationLog.length}
                  </span>
                )}
              </div>
              <span className="text-gray-500 text-xs">{showConversation ? 'Hide' : 'Show'}</span>
            </button>

            {showConversation && (
              <div className="flex-1 overflow-y-auto border-t border-gray-800 p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {conversationLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-500 text-sm py-6">
                    <Volume2 className="w-7 h-7 mb-2 opacity-40" />
                    <p>FRIEDE is starting the conversation...</p>
                    <p className="text-xs mt-1 text-gray-600">Speak naturally when it&apos;s your turn</p>
                  </div>
                ) : (
                  conversationLog.map((msg, i) => (
                    <div key={i} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          msg.speaker === 'user'
                            ? 'bg-green-600/10 border border-green-700/20 text-green-100'
                            : 'bg-blue-600/10 border border-blue-700/20 text-blue-100'
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold mb-0.5 ${
                            msg.speaker === 'user' ? 'text-green-400' : 'text-blue-400'
                          }`}
                        >
                          {msg.speaker === 'user' ? candidateName : 'FRIEDE'}
                        </p>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            )}
          </div>

          {/* Interview in progress + tips — only visible when conversation is collapsed */}
          {!showConversation && (
            <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-4 flex flex-col justify-center min-h-0 overflow-hidden">
              <div className="text-center mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-2">
                  <Mic className="w-5 h-5 text-blue-400" />
                </div>
                <h4 className="text-white font-semibold text-sm">Your interview is in progress</h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  FRIEDE is evaluating your responses in real-time
                </p>
              </div>

              <div className="bg-gray-800/40 rounded-lg p-3 mb-3">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Quick Tips
                </p>
                <div className="space-y-1.5">
                  {[
                    { c: 'bg-red-400', t: 'Stay on topic and be concise' },
                    { c: 'bg-blue-400', t: 'Use examples from past experience' },
                    { c: 'bg-purple-400', t: 'Aim for 60-90 second answers' },
                    { c: 'bg-pink-400', t: 'Think aloud when solving problems' },
                  ].map(({ c, t }) => (
                    <p key={t} className="text-gray-400 text-xs flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${c} shrink-0`} />
                      {t}
                    </p>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500">
                <p>&bull; Speak clearly and naturally</p>
                <p>&bull; Wait for FRIEDE to finish speaking</p>
                <p>&bull; Take a breath before answering</p>
                <p>&bull; Ask for clarification if needed</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── bottom bar: mic + volume ─── */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 bg-gray-900/90 border-t border-gray-800 backdrop-blur-sm shrink-0">
        <Button
          variant={isMuted ? 'destructive' : 'ghost'}
          size="sm"
          onClick={toggleMute}
          className="gap-2"
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-green-400" />}
          {isMuted ? 'Unmute' : 'Mic On'}
        </Button>
        <div className="h-5 w-px bg-gray-700" />
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="w-32 accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
