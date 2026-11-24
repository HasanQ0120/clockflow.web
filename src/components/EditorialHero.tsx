import { ArrowDown, PlayCircle } from 'lucide-react';
import type { SectionId } from './StickyProgressHeader';
import { CornerCrosshairs } from './CornerCrosshairs';
import { DragToCloakLens } from './DragToCloakLens';

interface EditorialHeroProps {
  onJumpToSection: (id: SectionId) => void;
}

export function EditorialHero({ onJumpToSection }: EditorialHeroProps) {
  return (
    <section
      id="sec-overview"
      className="py-12 lg:py-16 max-w-[1440px] w-[92%] mx-auto"
    >
      <div className="max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-wider uppercase text-zinc-300">
          <span className="text-emerald-400">SYS.LOCAL // ACTIVE</span>
          <span className="text-zinc-600" aria-hidden="true">
            /
          </span>
          <span>LEAK // 0.00B</span>
          <span className="text-zinc-600" aria-hidden="true">
            /
          </span>
          <span>WORKS OFFLINE &amp; ONLINE</span>
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#FAFAFA] leading-[1.03]">
          Use Smart AI.
          <br />
          <span className="text-zinc-300">Keep Your Secrets Safe.</span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-300 max-w-2xl leading-relaxed">
          CloakFlow hides your private names, passwords, and numbers on your own
          laptop before asking cloud AI for help—then puts your real details back
          in the final answer.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onJumpToSection('try-it-live')}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border border-emerald-400/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] active:scale-[0.99] px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span>Open Workspace</span>
            <ArrowDown className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onJumpToSection('sec-how-it-works')}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700/90 bg-[#16161A] hover:bg-[#1E1E24] hover:border-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.99] text-zinc-100 px-6 py-3 text-sm font-medium tracking-tight transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <PlayCircle className="w-4 h-4 text-zinc-300" aria-hidden="true" />
            <span>See How It Works</span>
          </button>
        </div>
      </div>

      {/* Interactive Drag-to-Cloak Split Lens directly below Hero headline */}
      <div className="mt-8 lg:mt-10">
        <DragToCloakLens />
      </div>

      {/* 4 Hardware Spec Cells separated by 1px hairlines + corner crosshairs */}
      <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-4 border border-zinc-800/90 bg-[#121215]/95 rounded-md divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/90">
        <CornerCrosshairs />

        <div className="p-5 lg:p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            OUTBOUND // 0.00B
          </p>
          <p className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-emerald-400">
            0 Secrets
          </p>
          <p className="mt-1.5 text-sm text-zinc-300">
            Ever sent to the internet
          </p>
        </div>

        <div className="p-5 lg:p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            SCRUB // &lt;150MS
          </p>
          <p className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
            Instant
          </p>
          <p className="mt-1.5 text-sm text-zinc-300">
            Hides private info on your laptop
          </p>
        </div>

        <div className="p-5 lg:p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            AIR-GAP // READY
          </p>
          <p className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
            Works Offline
          </p>
          <p className="mt-1.5 text-sm text-zinc-300">
            Even when Wi-Fi is off
          </p>
        </div>

        <div className="p-5 lg:p-6">
          <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
            RESTORE // EXACT
          </p>
          <p className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-amber-400">
            Smart Replies
          </p>
          <p className="mt-1.5 text-sm text-zinc-300">
            Full answers with your details restored
          </p>
        </div>
      </div>
    </section>
  );
}
