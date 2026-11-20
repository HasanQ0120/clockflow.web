import { ArrowDown } from 'lucide-react';

export type SectionId =
  | 'sec-overview'
  | 'try-it-live'
  | 'sec-how-it-works'
  | 'sec-why-safe';

export interface MilestoneItem {
  id: SectionId;
  code: string;
  label: string;
}

export const PIPELINE_MILESTONES: MilestoneItem[] = [
  { id: 'sec-overview', code: '01', label: 'Overview' },
  { id: 'try-it-live', code: '02', label: 'Try It Live' },
  { id: 'sec-how-it-works', code: '03', label: 'How It Works' },
  { id: 'sec-why-safe', code: '04', label: 'Why CloakFlow Wins' },
];

interface StickyProgressHeaderProps {
  activeSection: SectionId;
  scrollProgress: number;
  airGapMode: boolean;
  onJumpToSection: (id: SectionId) => void;
}

export function StickyProgressHeader({
  activeSection,
  scrollProgress,
  airGapMode,
  onJumpToSection,
}: StickyProgressHeaderProps) {
  const activeIdx = Math.max(
    0,
    PIPELINE_MILESTONES.findIndex((m) => m.id === activeSection)
  );
  const milestonePct =
    PIPELINE_MILESTONES.length > 1
      ? Math.max(
          scrollProgress * 100,
          (activeIdx / (PIPELINE_MILESTONES.length - 1)) * 100
        )
      : 0;

  return (
    <header className="sticky top-0 z-30 w-full bg-[#09090B]/95 border-b border-zinc-800/90">
      <div className="max-w-[1440px] w-[92%] mx-auto h-16 flex items-center justify-between gap-4">
        {/* Left: Precision Hardware Brand Mark + Telemetry Tag */}
        <button
          type="button"
          onClick={() => onJumpToSection('sec-overview')}
          className="flex items-center gap-3 text-left shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm"
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex items-center justify-center w-7 h-7 border bg-[#111114] font-mono text-xs font-bold tracking-tight ${
              airGapMode
                ? 'border-amber-500/60 text-amber-400'
                : 'border-emerald-500/60 text-emerald-400'
            }`}
          >
            CF
          </span>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-tight text-zinc-50 leading-none">
              CloakFlow
            </span>
            <span
              className={`mt-1 font-mono text-[10px] tracking-wider uppercase leading-none ${
                airGapMode ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {airGapMode ? 'SYS.AIRGAP // OFFLINE' : 'SYS.LOCAL // ACTIVE'}
            </span>
          </div>
        </button>

        {/* Center: 4 Plain-English Progress Markers */}
        <nav
          aria-label="Page sections"
          className="hidden lg:flex flex-col items-stretch flex-1 max-w-2xl mx-6"
        >
          <div className="relative flex items-center justify-between gap-2">
            {PIPELINE_MILESTONES.map((item, index) => {
              const isActive = item.id === activeSection;
              const isPassed = index <= activeIdx;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToSection(item.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`group relative z-10 inline-flex items-center gap-1.5 px-2 py-1 font-mono text-xs tracking-tight transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm ${
                    isActive
                      ? 'text-zinc-50 font-semibold'
                      : isPassed
                        ? 'text-zinc-300 hover:text-zinc-50'
                        : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? airGapMode
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                        : 'text-zinc-400 group-hover:text-zinc-300'
                    }
                  >
                    {item.code}
                  </span>
                  <span className="text-zinc-500" aria-hidden="true">
                    ·
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="relative mt-1 h-px w-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                airGapMode ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(10, milestonePct))}%` }}
            />
          </div>
        </nav>

        {/* Right: Matte Hardware Switch CTA */}
        <button
          type="button"
          onClick={() => onJumpToSection('try-it-live')}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 hover:bg-white text-zinc-950 border border-zinc-200/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] active:scale-[0.99] px-4 py-2 text-xs font-semibold tracking-tight transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <span>Try Live</span>
          <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
