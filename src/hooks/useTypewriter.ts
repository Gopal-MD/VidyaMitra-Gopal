import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  words: readonly string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  variableSpeed?: { min: number; max: number };
}

/**
 * Typewriter hook — types each word char-by-char, pauses, deletes, then loops.
 * Settings mirror the design-spec:
 *   typingSpeed   75 ms  (per char)
 *   pauseDuration 1500 ms
 *   deletingSpeed 50 ms  (per char)
 *   variableSpeed { min: 60, max: 120 } for human-like feel
 */
export function useTypewriter({
  words,
  typingSpeed = 75,
  deletingSpeed = 50,
  pauseDuration = 1500,
  variableSpeed,
}: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const currentWord = words[wordIndex];

    if (phase === 'typing') {
      if (displayText.length < currentWord.length) {
        const speed = variableSpeed
          ? Math.random() * (variableSpeed.max - variableSpeed.min) + variableSpeed.min
          : typingSpeed;
        const id = setTimeout(
          () => setDisplayText(currentWord.slice(0, displayText.length + 1)),
          speed,
        );
        return () => clearTimeout(id);
      }
      // Finished typing — pause before deleting
      const id = setTimeout(() => setPhase('deleting'), pauseDuration);
      return () => clearTimeout(id);
    }

    if (phase === 'deleting') {
      if (displayText.length > 0) {
        const id = setTimeout(
          () => setDisplayText(prev => prev.slice(0, -1)),
          deletingSpeed,
        );
        return () => clearTimeout(id);
      }
      // Finished deleting — advance to next word
      setWordIndex(i => (i + 1) % words.length);
      setPhase('typing');
    }
  }, [displayText, phase, wordIndex, words, typingSpeed, deletingSpeed, pauseDuration, variableSpeed]);

  return {
    displayText,
    isTyping: phase === 'typing',
    isDeleting: phase === 'deleting',
  };
}
