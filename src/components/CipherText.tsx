import { useEffect, useState } from 'react';
import { computeCipherFrame } from '../utils/cipherScramble';

interface CipherTextProps {
  text: string;
  triggerKey: string | number;
  className?: string;
  durationMs?: number;
  title?: string;
  dataRestoredHighlight?: string;
}

export function CipherText({
  text,
  triggerKey,
  className = '',
  durationMs = 250,
  title,
  dataRestoredHighlight,
}: CipherTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayText(text);
      setIsAnimating(false);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayText(text);
      setIsAnimating(false);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    let tick = 0;
    setIsAnimating(true);

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      tick += 1;
      setDisplayText(computeCipherFrame(text, progress, tick));
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        setDisplayText(text);
        setIsAnimating(false);
      }
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [text, triggerKey, durationMs]);

  return (
    <span
      title={title}
      data-restored-highlight={dataRestoredHighlight}
      className={`${
        isAnimating ? 'font-mono tabular-nums tracking-tight' : ''
      } ${className}`.trim()}
    >
      {displayText}
    </span>
  );
}
