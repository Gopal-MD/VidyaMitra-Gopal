import { useEffect, useRef, useState, useCallback } from 'react';

export type BehaviorViolationType =
  | 'right_click'
  | 'split_screen'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'devtools_attempt';

export interface BehaviorEvent {
  type: BehaviorViolationType;
  message: string;
  timestamp: number;
}

interface UseBehaviorProctorOptions {
  /** Whether behavior monitoring is active */
  enabled?: boolean;
}

interface UseBehaviorProctorReturn {
  /** Latest behavioral violation event — null until something fires */
  latestEvent: BehaviorEvent | null;
  /** Clear the latest event after you've handled it */
  clearEvent: () => void;
}

/** Per-type cooldown (ms) to prevent rapid-fire duplicates */
const COOLDOWN: Record<BehaviorViolationType, number> = {
  right_click: 3000,
  split_screen: 6000,
  copy_attempt: 3000,
  paste_attempt: 3000,
  devtools_attempt: 5000,
};

/**
 * Detects behavioral cheating signals during an interview:
 *   - right_click: contextmenu event
 *   - copy_attempt: copy/cut events
 *   - paste_attempt: paste event
 *   - devtools_attempt: F12 / Ctrl+Shift+I / Ctrl+U
 *   - split_screen: window width drops below 65% of starting width
 *
 * Does NOT handle tab-switching (visibilitychange) — that is handled
 * directly in Interview.tsx as an immediate abort.
 */
export function useBehaviorProctor(
  options: UseBehaviorProctorOptions = {}
): UseBehaviorProctorReturn {
  const { enabled = true } = options;
  const [latestEvent, setLatestEvent] = useState<BehaviorEvent | null>(null);
  const lastFiredAt = useRef<Partial<Record<BehaviorViolationType, number>>>({});
  const initialWidth = useRef(window.innerWidth);

  const fire = useCallback((type: BehaviorViolationType, message: string) => {
    const now = Date.now();
    const last = lastFiredAt.current[type] ?? 0;
    if (now - last < COOLDOWN[type]) return;
    lastFiredAt.current[type] = now;
    setLatestEvent({ type, message, timestamp: now });
  }, []);

  const clearEvent = useCallback(() => setLatestEvent(null), []);

  useEffect(() => {
    if (!enabled) return;

    // Capture initial window width when monitoring starts
    initialWidth.current = window.innerWidth;

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      fire('right_click', 'Right-click detected during interview');
    };

    const onCopy = () => fire('copy_attempt', 'Content copied during interview');
    const onCut = () => fire('copy_attempt', 'Content cut during interview');
    const onPaste = () => fire('paste_attempt', 'Paste detected during interview');

    const onKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        fire('devtools_attempt', 'Developer tools shortcut (F12) detected');
        return;
      }
      // Ctrl/Cmd + Shift + I (dev tools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        fire('devtools_attempt', 'Developer tools shortcut detected');
        return;
      }
      // Ctrl/Cmd + Shift + J (console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        fire('devtools_attempt', 'Console shortcut detected');
        return;
      }
      // Ctrl/Cmd + U (view source)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        fire('devtools_attempt', 'View source shortcut detected');
        return;
      }
    };

    const onResize = () => {
      const ratio = window.innerWidth / initialWidth.current;
      // Narrowed to less than 65% of original width → split-screen
      if (ratio < 0.65) {
        fire(
          'split_screen',
          `Split-screen detected (window at ${Math.round(ratio * 100)}% width)`
        );
      }
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, fire]);

  return { latestEvent, clearEvent };
}
