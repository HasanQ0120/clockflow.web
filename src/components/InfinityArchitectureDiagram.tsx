import { useState } from 'react';
import { Lock } from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';

interface LoopNode {
  id: number;
  title: string;
  subtitle: string;
  zone: 'local' | 'cloud' | 'gate';
  payloadSample: string;
}

const LOOP_NODES: LoopNode[] = [
  {
    id: 1,
    title: '1. Paste Text',
    subtitle: 'Secrets stay inside browser RAM.',
    zone: 'local',
    payloadSample: '"Wire PKR 850,000 to Zainab Raza via sk-live-9988"',
  },
  {
    id: 2,
    title: '2. Hide Locally',
    subtitle: 'Masked into safe tokens in <5ms.',
    zone: 'local',
    payloadSample: '"Wire [AMOUNT_1] to [PERSON_1] via [API_KEY_1]"',
  },
  {
    id: 0,
    title: '0 Secrets Cross',
    subtitle: 'Only anonymous tokens cross online.',
    zone: 'gate',
    payloadSample: 'OUTBOUND: [PERSON_1] · [API_KEY_1] · LEAK: 0.00B',
  },
  {
    id: 3,
    title: '3. Cloud Solves',
    subtitle: 'Cloud Gemini reasons on safe tokens.',
    zone: 'cloud',
    payloadSample: '"Approve [AMOUNT_1] for [PERSON_1]; rotate [API_KEY_1]."',
  },
  {
    id: 4,
    title: '4. Restore Here',
    subtitle: 'Real details return on your laptop.',
    zone: 'local',
    payloadSample: '"Approve PKR 850,000 for Zainab Raza; rotate sk-live-9988."',
  },
];

const LEFT_LOOP_PATH =
  'M 560 205 C 495 145, 430 82, 315 82 C 205 82, 108 124, 108 205 C 108 286, 205 328, 315 328 C 430 328, 495 265, 560 205';

const RIGHT_LOOP_PATH =
  'M 560 205 C 625 145, 690 82, 805 82 C 915 82, 1012 124, 1012 205 C 1012 286, 915 328, 805 328 C 690 328, 625 265, 560 205';

const FULL_INFINITY_PATH =
  'M 108 205 C 108 286, 205 328, 315 328 C 430 328, 495 265, 560 205 C 625 145, 690 82, 805 82 C 915 82, 1012 124, 1012 205 C 1012 286, 915 328, 805 328 C 690 330, 625 265, 560 205 C 495 145, 430 82, 315 82 C 205 82, 108 124, 108 205 Z';

interface InfinityArchitectureDiagramProps {
  embedded?: boolean;
}

export function InfinityArchitectureDiagram({
  embedded = false,
}: InfinityArchitectureDiagramProps) {
  const [selectedStepId, setSelectedStepId] = useState<number>(0);

  const selectedNode =
    LOOP_NODES.find((n) => n.id === selectedStepId) || LOOP_NODES[2];

  const innerContent = (
    <>
      {!embedded && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p
              style={{ color: 'var(--cf-emerald-text)' }}
              className="text-xs font-semibold tracking-wider uppercase"
            >
              How data travels
            </p>
            <h2
              id="infinity-loop-heading"
              style={{ color: 'var(--cf-text)' }}
              className="mt-1.5 font-display text-3xl sm:text-4xl font-bold tracking-tight"
            >
              One loop. Zero leaks.
            </h2>
          </div>
          <p style={{ color: 'var(--cf-text-muted)' }} className="text-sm">
            Click any step to inspect data.
          </p>
        </div>
      )}

      {/* Main Figure-8 Instrument Card */}
      <div
        style={{
          backgroundColor: 'var(--cf-surface)',
          borderColor: 'var(--cf-border)',
        }}
        className="relative border rounded-lg p-5 sm:p-6"
      >
        <CornerCrosshairs />

        {/* Zone Legend Header */}
        <div
          style={{ borderColor: 'var(--cf-border)' }}
          className="flex flex-wrap items-center justify-between gap-4 pb-3.5 mb-4 border-b text-xs"
        >
          <div className="flex items-center gap-2">
            <span
              style={{ color: 'var(--cf-emerald-text)' }}
              className="font-semibold tracking-wide"
            >
              Your Laptop (Local RAM)
            </span>
          </div>

          <div
            style={{
              borderColor: 'var(--cf-emerald-border)',
              backgroundColor: 'var(--cf-emerald-soft)',
              color: 'var(--cf-emerald-text)',
            }}
            className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1 font-mono text-[11px] font-semibold"
          >
            <Lock className="w-3 h-3" aria-hidden="true" />
            <span>0 Secrets Cross</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              style={{ color: 'var(--cf-amber-text)' }}
              className="font-semibold tracking-wide"
            >
              Cloud AI (Safe Tokens Only)
            </span>
          </div>
        </div>

        {/* Desktop Wide Interactive Figure-8 SVG */}
        <div
          data-testid="infinity-loop-diagram"
          className="relative w-full overflow-x-auto"
        >
          <div className="min-w-[760px] max-w-[1120px] mx-auto relative">
            <svg
              viewBox="0 0 1120 410"
              className="w-full h-auto block select-none"
              role="img"
              aria-label="CloakFlow horizontal Figure-8 hybrid privacy loop diagram"
            >
              <defs>
                <filter
                  id="emeraldGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="amberGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Soft Zone Backdrop Halos */}
              <ellipse
                cx="315"
                cy="205"
                rx="225"
                ry="145"
                fill="rgba(16, 185, 129, 0.05)"
                stroke="rgba(16, 185, 129, 0.2)"
                strokeDasharray="6 6"
                strokeWidth="1"
              />
              <ellipse
                cx="805"
                cy="205"
                rx="225"
                ry="145"
                fill="rgba(245, 158, 11, 0.05)"
                stroke="rgba(245, 158, 11, 0.2)"
                strokeDasharray="6 6"
                strokeWidth="1"
              />

              {/* Base Structural Figure-8 Track */}
              <path
                d={FULL_INFINITY_PATH}
                fill="none"
                stroke="var(--cf-svg-track)"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Left Loop Track (Emerald) */}
              <path
                d={LEFT_LOOP_PATH}
                fill="none"
                stroke="#10B981"
                strokeOpacity="0.45"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Right Loop Track (Amber) */}
              <path
                d={RIGHT_LOOP_PATH}
                fill="none"
                stroke="#F59E0B"
                strokeOpacity="0.45"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Continuous Animated Emerald & Amber Orbit Pulses */}
              <path
                d={LEFT_LOOP_PATH}
                fill="none"
                stroke="#34D399"
                strokeWidth="4.5"
                strokeLinecap="round"
                filter="url(#emeraldGlow)"
                className="animate-infinity-pulse"
              />
              <path
                d={RIGHT_LOOP_PATH}
                fill="none"
                stroke="#FBBF24"
                strokeWidth="4.5"
                strokeLinecap="round"
                filter="url(#amberGlow)"
                className="animate-infinity-pulse"
              />

              {/* Directional Arrow Chevrons on Track */}
              <path
                d="M 185 112 L 198 119 L 188 128"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="rotate(152 190 120)"
              />
              <path
                d="M 442 292 L 456 298 L 444 307"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="rotate(-24 448 298)"
              />
              <path
                d="M 665 115 L 679 121 L 667 130"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="rotate(-26 671 122)"
              />
              <path
                d="M 668 282 L 682 288 L 670 297"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="rotate(-152 674 289)"
              />

              {/* Center Crossing Gate Node */}
              <g onClick={() => setSelectedStepId(0)} className="cursor-pointer">
                <rect
                  x="484"
                  y="164"
                  width="152"
                  height="82"
                  rx="8"
                  fill="var(--cf-surface-solid)"
                  stroke={
                    selectedStepId === 0 ? '#10B981' : 'var(--cf-border-strong)'
                  }
                  strokeWidth={selectedStepId === 0 ? '2.5' : '1.5'}
                />
                <text
                  x="560"
                  y="192"
                  textAnchor="middle"
                  fill="var(--cf-emerald-text)"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  GATE // 0.00B
                </text>
                <text
                  x="560"
                  y="214"
                  textAnchor="middle"
                  fill="var(--cf-text)"
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  0 Secrets Cross
                </text>
                <text
                  x="560"
                  y="233"
                  textAnchor="middle"
                  fill="var(--cf-amber-text)"
                  fontSize="10.5"
                  fontFamily="var(--font-mono)"
                >
                  [Name 1] · [Key 1]
                </text>
              </g>

              {/* Station 1: Far-Left (1. Paste Text) */}
              <g onClick={() => setSelectedStepId(1)} className="cursor-pointer">
                <rect
                  x="22"
                  y="168"
                  width="172"
                  height="74"
                  rx="8"
                  fill="var(--cf-surface-solid)"
                  stroke={
                    selectedStepId === 1
                      ? '#10B981'
                      : 'var(--cf-emerald-border)'
                  }
                  strokeWidth={selectedStepId === 1 ? '2.5' : '1.5'}
                />
                <text
                  x="108"
                  y="196"
                  textAnchor="middle"
                  fill="var(--cf-emerald-text)"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  LOCAL RAM
                </text>
                <text
                  x="108"
                  y="220"
                  textAnchor="middle"
                  fill="var(--cf-text)"
                  fontSize="14.5"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  1. Paste Text
                </text>
              </g>

              {/* Station 2: Bottom-Left (2. Hide Locally) */}
              <g onClick={() => setSelectedStepId(2)} className="cursor-pointer">
                <rect
                  x="228"
                  y="292"
                  width="184"
                  height="74"
                  rx="8"
                  fill="var(--cf-surface-solid)"
                  stroke={
                    selectedStepId === 2
                      ? '#10B981'
                      : 'var(--cf-emerald-border)'
                  }
                  strokeWidth={selectedStepId === 2 ? '2.5' : '1.5'}
                />
                <text
                  x="320"
                  y="320"
                  textAnchor="middle"
                  fill="var(--cf-emerald-text)"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  FIREWALL // &lt;5MS
                </text>
                <text
                  x="320"
                  y="344"
                  textAnchor="middle"
                  fill="var(--cf-text)"
                  fontSize="14.5"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  2. Hide Locally
                </text>
              </g>

              {/* Station 3: Right Loop (3. Cloud Solves) */}
              <g onClick={() => setSelectedStepId(3)} className="cursor-pointer">
                <rect
                  x="815"
                  y="168"
                  width="196"
                  height="74"
                  rx="8"
                  fill="var(--cf-surface-solid)"
                  stroke={
                    selectedStepId === 3 ? '#F59E0B' : 'var(--cf-amber-border)'
                  }
                  strokeWidth={selectedStepId === 3 ? '2.5' : '1.5'}
                />
                <text
                  x="913"
                  y="196"
                  textAnchor="middle"
                  fill="var(--cf-amber-text)"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  GOOGLE CLOUD
                </text>
                <text
                  x="913"
                  y="220"
                  textAnchor="middle"
                  fill="var(--cf-text)"
                  fontSize="14.5"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  3. Cloud Solves
                </text>
              </g>

              {/* Station 4: Top-Left (4. Restore Here) */}
              <g onClick={() => setSelectedStepId(4)} className="cursor-pointer">
                <rect
                  x="228"
                  y="44"
                  width="184"
                  height="74"
                  rx="8"
                  fill="var(--cf-surface-solid)"
                  stroke={
                    selectedStepId === 4
                      ? '#10B981'
                      : 'var(--cf-emerald-border)'
                  }
                  strokeWidth={selectedStepId === 4 ? '2.5' : '1.5'}
                />
                <text
                  x="320"
                  y="72"
                  textAnchor="middle"
                  fill="var(--cf-emerald-text)"
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  ON DEVICE
                </text>
                <text
                  x="320"
                  y="96"
                  textAnchor="middle"
                  fill="var(--cf-text)"
                  fontSize="14.5"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                >
                  4. Restore Here
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Interactive Station Readout Strip */}
        <div
          style={{
            borderColor: 'var(--cf-border)',
            backgroundColor: 'var(--cf-input-bg)',
          }}
          className="mt-5 border rounded-md p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                style={{
                  color:
                    selectedNode.zone === 'cloud'
                      ? 'var(--cf-amber-text)'
                      : 'var(--cf-emerald-text)',
                }}
                className="font-mono text-xs font-bold uppercase tracking-wider"
              >
                {selectedNode.zone === 'cloud'
                  ? 'CLOUD ZONE'
                  : selectedNode.zone === 'gate'
                    ? 'SECURITY GATE'
                    : 'LAPTOP RAM'}
              </span>
              <span style={{ color: 'var(--cf-text-muted)' }}>·</span>
              <span
                style={{ color: 'var(--cf-text)' }}
                className="font-display text-sm font-semibold"
              >
                {selectedNode.title}
              </span>
            </div>
            <p
              style={{ color: 'var(--cf-text-muted)' }}
              className="text-xs sm:text-sm"
            >
              {selectedNode.subtitle}
            </p>
          </div>

          <code
            style={{
              backgroundColor: 'var(--cf-surface-raised)',
              borderColor: 'var(--cf-border)',
              color:
                selectedNode.zone === 'cloud'
                  ? 'var(--cf-amber-text)'
                  : 'var(--cf-emerald-text)',
            }}
            className="border rounded px-3 py-2 font-mono text-xs break-all md:max-w-lg"
          >
            {selectedNode.payloadSample}
          </code>
        </div>
      </div>
    </>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <section
      aria-labelledby="infinity-loop-heading"
      className="py-10 lg:py-14 max-w-[1440px] w-[92%] mx-auto"
    >
      {innerContent}
    </section>
  );
}
