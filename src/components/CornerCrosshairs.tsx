interface CornerCrosshairsProps {
  tone?: 'zinc' | 'emerald' | 'amber';
}

export function CornerCrosshairs({ tone = 'zinc' }: CornerCrosshairsProps) {
  const colorStyle =
    tone === 'emerald'
      ? { color: 'var(--cf-emerald-text)', opacity: 0.72 }
      : tone === 'amber'
        ? { color: 'var(--cf-amber-text)', opacity: 0.72 }
        : { color: 'var(--cf-text-muted)', opacity: 0.65 };

  return (
    <div
      aria-hidden="true"
      style={colorStyle}
      className="pointer-events-none select-none absolute inset-0"
    >
      <span className="absolute -top-[5px] -left-[5px] w-2.5 h-2.5 flex items-center justify-center font-mono text-[11px] leading-none">
        +
      </span>
      <span className="absolute -top-[5px] -right-[5px] w-2.5 h-2.5 flex items-center justify-center font-mono text-[11px] leading-none">
        +
      </span>
      <span className="absolute -bottom-[5px] -left-[5px] w-2.5 h-2.5 flex items-center justify-center font-mono text-[11px] leading-none">
        +
      </span>
      <span className="absolute -bottom-[5px] -right-[5px] w-2.5 h-2.5 flex items-center justify-center font-mono text-[11px] leading-none">
        +
      </span>
    </div>
  );
}
