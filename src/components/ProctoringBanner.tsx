import { useEffect, useState, useRef } from 'react';
import { ShieldAlert, ShieldX, AlertTriangle, Smartphone, Eye, Users, X, Mouse, Monitor, Copy, Clipboard, Terminal, ExternalLink } from 'lucide-react';
import { type FaceViolation } from '@/hooks/useFaceDetection';

interface ProctoringBannerProps {
  /** The latest violation from WebcamPanel (warning or fatal). */
  violation: FaceViolation | null;
  /** How many strikes so far (0, 1, or 2). */
  strikeCount: number;
}

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  no_face:           Eye,
  multiple_faces:    Users,
  prohibited_object: Smartphone,
  right_click:       Mouse,
  split_screen:      Monitor,
  copy_attempt:      Copy,
  paste_attempt:     Clipboard,
  devtools_attempt:  Terminal,
  tab_switch:        ExternalLink,
};

/** Extract the specific object name from a prohibited_object violation message */
function extractObjectNames(message: string): string {
  const match = message.match(/Prohibited object detected:\s*([^—\n]+)/i);
  return match ? match[1].trim() : 'Prohibited object';
}

/** Get the human-readable reason for the violation (without strike prefix/suffix) */
function getViolationDetail(violation: FaceViolation, isFatal: boolean): string {
  const type = violation.type;
  if (type === 'no_face') {
    return isFatal
      ? 'Face not visible twice. Your session has been terminated.'
      : 'Your face is not visible. Return to frame immediately or your session will be aborted!';
  }
  if (type === 'multiple_faces') {
    return isFatal
      ? 'Multiple people detected again. Your session has been terminated.'
      : 'Another person is visible in your camera! Remove them immediately — next offense aborts the session.';
  }
  if (type === 'prohibited_object') {
    const obj = extractObjectNames(violation.message);
    return isFatal
      ? `${obj} detected again. Your session has been terminated.`
      : `${obj} detected in frame! Remove it immediately — next offense aborts the session.`;
  }
  if (type === 'right_click') {
    return isFatal
      ? 'Right-clicking detected again. Your session has been terminated.'
      : 'Right-clicking is not allowed during the session. Next offense will abort it.';
  }
  if (type === 'split_screen') {
    return isFatal
      ? 'Split-screen detected again. Your session has been terminated.'
      : 'Split-screen is not allowed. Use a full-size window — next offense will abort the session.';
  }
  if (type === 'copy_attempt') {
    return isFatal
      ? 'Copying content detected again. Your session has been terminated.'
      : 'Copying content is not allowed during the session. Next offense will abort it.';
  }
  if (type === 'paste_attempt') {
    return isFatal
      ? 'Pasting content detected again. Your session has been terminated.'
      : 'Pasting is not allowed during the session. Next offense will abort it.';
  }
  if (type === 'devtools_attempt') {
    return isFatal
      ? 'Developer tools detected again. Your session has been terminated.'
      : 'Opening developer tools is not allowed. Next offense will abort the session.';
  }
  if (type === 'tab_switch') {
    return isFatal
      ? 'Tab switching detected again. Your session has been terminated.'
      : 'Switching tabs or windows is not allowed. Next offense will abort the session.';
  }
  // Generic fallback — use the raw message detail
  const cleaned = violation.message
    .replace(/^[^\w]*(Strike \d+:\s*)?/i, '')
    .replace(/\s*—\s*(Next violation.*|Interview aborted.*)$/i, '');
  return cleaned || 'A proctoring violation was detected.';
}

/**
 * A full-width, attention-grabbing banner that overlays the top of the screen
 * whenever a proctoring violation fires. Auto-dismisses after a timeout for
 * warnings, stays visible for fatal violations.
 */
export default function ProctoringBanner({ violation, strikeCount }: ProctoringBannerProps) {
  const [visible, setVisible] = useState(false);
  const [currentViolation, setCurrentViolation] = useState<FaceViolation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Show banner whenever a new violation arrives
  useEffect(() => {
    if (!violation) return;

    // Clear any existing auto-dismiss timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setCurrentViolation(violation);
    setVisible(true);

    if (!violation.isFatal) {
      // Warning: show for 8 seconds with countdown
      setCountdown(8);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 8000);
    } else {
      // Fatal: stays until page navigates away
      setCountdown(0);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [violation]);

  // Countdown ticker for warnings
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!visible || !currentViolation) return null;

  const isFatal = currentViolation.isFatal;
  const ViolationIcon = ICON_MAP[currentViolation.type] || AlertTriangle;

  return (
    <>
      {/* Full-screen dim overlay for fatal violations */}
      {isFatal && (
        <div className="fixed inset-0 bg-black/40 z-[998] pointer-events-none animate-in fade-in duration-300" />
      )}

      {/* Banner */}
      <div
        className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-500 animate-in slide-in-from-top ${
          isFatal
            ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 shadow-[0_4px_30px_rgba(220,38,38,0.5)]'
            : 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 shadow-[0_4px_20px_rgba(245,158,11,0.4)]'
        }`}
      >
        {/* Pulsing top-edge highlight */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            isFatal ? 'bg-red-400 animate-pulse' : 'bg-yellow-300 animate-pulse'
          }`}
        />

        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div
              className={`flex-shrink-0 rounded-full p-2.5 ${
                isFatal ? 'bg-red-800/50' : 'bg-yellow-700/40'
              }`}
            >
              {isFatal ? (
                <ShieldX className="h-7 w-7 text-white animate-pulse" />
              ) : (
                <ShieldAlert className="h-7 w-7 text-white animate-bounce" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-base md:text-lg">
                  {isFatal ? '⛔ INTERVIEW ABORTED' : '⚠️ PROCTORING WARNING'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    isFatal
                      ? 'bg-red-900/60 text-red-100'
                      : 'bg-yellow-800/50 text-yellow-100'
                  }`}
                >
                  Strike {strikeCount}/2
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-white/90 text-sm md:text-base">
                <ViolationIcon className="h-4 w-4 flex-shrink-0" />
                <span>{getViolationDetail(currentViolation, isFatal)}</span>
              </div>
            </div>

            {/* Right side: countdown or fatal icon */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {!isFatal && countdown > 0 && (
                <span className="text-white/70 text-xs tabular-nums">{countdown}s</span>
              )}
              {!isFatal && (
                <button
                  onClick={() => setVisible(false)}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4 text-white/80" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom progress bar for warnings */}
        {!isFatal && (
          <div className="h-1 bg-yellow-900/30">
            <div
              className="h-full bg-white/60 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 8) * 100}%` }}
            />
          </div>
        )}
      </div>
    </>
  );
}
