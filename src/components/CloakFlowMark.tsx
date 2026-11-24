interface CloakFlowMarkProps {
  size?: number;
  className?: string;
}

/**
 * Geometric Open-Hexagon "C" brand mark for CloakFlow.
 * Thick angled hexagon segments (strokeWidth="4", sharp mitered corners)
 * open on the right side, framing a solid emerald diamond accent node.
 */
export function CloakFlowMark({
  size = 28,
  className = '',
}: CloakFlowMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {/* 6-sided geometric hexagon open on the right side ("C") */}
      <path
        d="M 21.5 8.5 L 14 4 L 6 8.5 L 6 19.5 L 14 24 L 21.5 19.5"
        stroke="var(--cf-text, #FAFAFA)"
        strokeWidth="4"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* Solid emerald diamond accent node inside the center-right opening */}
      <polygon
        points="19.5,11 22.5,14 19.5,17 16.5,14"
        fill="#10B981"
      />
    </svg>
  );
}
