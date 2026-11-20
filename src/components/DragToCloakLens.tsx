import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';

export function DragToCloakLens() {
  const [splitPct, setSplitPct] = useState<number>(48);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const rawPct = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.max(0, Math.min(100, rawPct));
    setSplitPct(clamped);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMove = (e: PointerEvent) => {
      updateFromClientX(e.clientX);
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    };
  }, [isDragging, updateFromClientX]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events without an active pointerId still fall back to window listeners
    }
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic event cleanup errors
    }
    setIsDragging(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSplitPct((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPct((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitPct(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSplitPct(100);
    }
  };

  const displayPct = Math.round(splitPct);

  return (
    <div
      style={{
        backgroundColor: 'var(--cf-surface)',
        borderColor: 'var(--cf-border)',
      }}
      className="relative border rounded-md"
    >
      <CornerCrosshairs />

      {/* Instrument Header Bar */}
      <div
        style={{ borderColor: 'var(--cf-border)' }}
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            style={{ color: 'var(--cf-text-secondary)' }}
            className="font-mono text-[11px] uppercase tracking-wider"
          >
            SPLIT LENS // DRAG LEFT-TO-RIGHT TO CLOAK
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums">
          <span style={{ color: 'var(--cf-rose-text)' }}>RAW RAM</span>
          <span style={{ color: 'var(--cf-text-muted)' }}>/</span>
          <span
            data-testid="split-lens-pct-label"
            style={{ color: 'var(--cf-emerald-text)' }}
          >
            CLOAKED {displayPct}% · LEAK // 0.00B
          </span>
        </div>
      </div>

      {/* Interactive Split Comparison Viewport (0% to 100% full width) */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Drag to cloak privacy lens slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayPct}
        data-testid="drag-to-cloak-lens"
        data-split-pct={displayPct}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative select-none touch-none cursor-ew-resize min-h-[112px] sm:min-h-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        <div className="relative overflow-hidden rounded-b-md">
          {/* Base Layer (Right of handle): Raw Sensitive Secrets in Browser RAM */}
          <div
            style={{ color: 'var(--cf-text-secondary)' }}
            className="px-5 py-6 font-mono text-xs sm:text-sm md:text-base leading-relaxed dot-matrix-surface"
          >
            <p className="leading-loose">
              Authorize wire{' '}
              <span
                style={{
                  borderColor: 'var(--cf-rose-border)',
                  backgroundColor: 'var(--cf-rose-soft)',
                  color: 'var(--cf-rose-text)',
                }}
                className="inline-flex justify-center min-w-[12ch] border-b px-1.5 py-0.5"
              >
                PKR 850,000
              </span>{' '}
              to{' '}
              <span
                style={{
                  borderColor: 'var(--cf-rose-border)',
                  backgroundColor: 'var(--cf-rose-soft)',
                  color: 'var(--cf-rose-text)',
                }}
                className="inline-flex justify-center min-w-[12ch] border-b px-1.5 py-0.5"
              >
                Usman Tariq
              </span>{' '}
              immediately using production key{' '}
              <span
                style={{
                  borderColor: 'var(--cf-rose-border)',
                  backgroundColor: 'var(--cf-rose-soft)',
                  color: 'var(--cf-rose-text)',
                }}
                className="inline-flex justify-center min-w-[13ch] border-b px-1.5 py-0.5"
              >
                sk-live-9988
              </span>{' '}
              before close.
            </p>
          </div>

          {/* Clipped Overlay Layer (Left of handle): Cloaked Zero-Leak Tokens */}
          <div
            aria-hidden="true"
            data-testid="split-lens-cloaked-layer"
            style={{
              clipPath: `inset(0 ${100 - splitPct}% 0 0)`,
              backgroundColor: 'var(--cf-lens-cloaked-bg)',
              color: 'var(--cf-text-secondary)',
            }}
            className="absolute inset-0 px-5 py-6 font-mono text-xs sm:text-sm md:text-base leading-relaxed"
          >
            <p className="leading-loose">
              Authorize wire{' '}
              <span
                style={{
                  borderColor: 'var(--cf-emerald-border)',
                  backgroundColor: 'var(--cf-emerald-soft)',
                  color: 'var(--cf-emerald-text)',
                }}
                className="inline-flex justify-center min-w-[12ch] border px-1.5 py-0.5"
              >
                [Amount 1]
              </span>{' '}
              to{' '}
              <span
                style={{
                  borderColor: 'var(--cf-emerald-border)',
                  backgroundColor: 'var(--cf-emerald-soft)',
                  color: 'var(--cf-emerald-text)',
                }}
                className="inline-flex justify-center min-w-[12ch] border px-1.5 py-0.5"
              >
                [Name 1]
              </span>{' '}
              immediately using production key{' '}
              <span
                style={{
                  borderColor: 'var(--cf-emerald-border)',
                  backgroundColor: 'var(--cf-emerald-soft)',
                  color: 'var(--cf-emerald-text)',
                }}
                className="inline-flex justify-center min-w-[13ch] border px-1.5 py-0.5"
              >
                [Key 1]
              </span>{' '}
              before close.
            </p>
          </div>
        </div>

        {/* Draggable Vertical Laser Divider Handle */}
        <div
          aria-hidden="true"
          data-testid="split-lens-handle"
          style={{ left: `${splitPct}%` }}
          className="pointer-events-none absolute inset-y-0 z-10 -translate-x-1/2 flex flex-col items-center justify-center"
        >
          <div className="w-px flex-1 bg-emerald-500/90" />
          <div
            style={{
              backgroundColor: 'var(--cf-surface-solid)',
              borderColor: 'var(--cf-emerald-border)',
              color: 'var(--cf-emerald-text)',
            }}
            className="my-1 flex h-8 w-6 items-center justify-center rounded-sm border shadow-sm"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div className="w-px flex-1 bg-emerald-500/90" />
        </div>
      </div>
    </div>
  );
}
