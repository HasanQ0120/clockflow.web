const CIPHER_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%';

/**
 * Computes a deterministic intermediate cipher-scramble string for a given
 * completion progress [0..1]. Once progress >= 1, always returns the exact
 * target text unmodified.
 */
export function computeCipherFrame(
  targetText: string,
  progress: number,
  tick: number = 0
): string {
  if (!targetText || progress >= 1) {
    return targetText;
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const settledCount = Math.floor(clamped * targetText.length);
  let result = '';

  for (let i = 0; i < targetText.length; i += 1) {
    const ch = targetText[i];
    if (i < settledCount || ch === ' ' || ch === '\n' || ch === '\t') {
      result += ch;
    } else {
      const idx =
        Math.abs((i * 17 + tick * 13 + ch.charCodeAt(0) * 7) | 0) %
        CIPHER_GLYPHS.length;
      result += CIPHER_GLYPHS[idx];
    }
  }

  return result;
}
