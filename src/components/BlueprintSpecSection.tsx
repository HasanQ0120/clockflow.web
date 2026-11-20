import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';

interface StoryStep {
  id: string;
  indexCode: string;
  telemetryTag: string;
  title: string;
  description: string;
  badge: string;
}

const STORY_STEPS: StoryStep[] = [
  {
    id: 'paste',
    indexCode: '01',
    telemetryTag: 'STAGE.01 // LOCAL RAM',
    title: '1. You Paste Your Text',
    description:
      'Your real names, phone numbers, and passwords stay right here on your laptop.',
    badge: 'Stays on your device',
  },
  {
    id: 'hide',
    indexCode: '02',
    telemetryTag: 'STAGE.02 // MASK ACTIVE',
    title: '2. Hidden Automatically',
    description:
      'Built-in laptop AI swaps your private details for safe blank tags.',
    badge: 'Instant protection',
  },
  {
    id: 'solve',
    indexCode: '03',
    telemetryTag: 'STAGE.03 // LEAK 0.00B',
    title: '3. Cloud AI Solves It',
    description:
      "Google's cloud AI reads only the safe version to write your answer.",
    badge: '0 secrets shared',
  },
  {
    id: 'return',
    indexCode: '04',
    telemetryTag: 'STAGE.04 // RESTORED',
    title: '4. Your Details Return',
    description:
      'Your laptop puts your real names and numbers back before showing you the result.',
    badge: 'Ready to copy',
  },
];

export function BlueprintSpecSection() {
  const [activeStepId, setActiveStepId] = useState<string>('hide');

  return (
    <section
      id="sec-how-it-works"
      className="py-20 lg:py-24 max-w-[1440px] w-[92%] mx-auto border-t border-zinc-800/90"
    >
      <div className="max-w-3xl mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">
          03 · HOW IT WORKS
        </p>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#FAFAFA]">
          Your secrets never leave your screen.
        </h2>
        <p className="mt-4 text-lg text-zinc-300 leading-relaxed">
          Four simple steps keep your private information locked on your laptop
          while still giving you smart, complete answers.
        </p>
      </div>

      {/* 4-Step Hardware Spec Flow Diagram */}
      <div className="relative border border-zinc-800/90 bg-[#121215]/95 rounded-md p-6 sm:p-8">
        <CornerCrosshairs />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STORY_STEPS.map((step, idx) => {
            const isSelected = activeStepId === step.id;
            return (
              <div key={step.id} className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={`relative w-full text-left rounded-md border p-5 flex flex-col justify-between gap-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isSelected
                      ? 'border-emerald-400/80 bg-[#09090B]'
                      : 'border-zinc-800/90 bg-[#09090B]/80 hover:border-zinc-600'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums tracking-wider whitespace-nowrap ${
                          isSelected ? 'text-emerald-400' : 'text-zinc-300'
                        }`}
                      >
                        {step.telemetryTag}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 tabular-nums whitespace-nowrap shrink-0">
                        0{idx + 1}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-semibold text-zinc-50">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                        {step.description}
                      </p>
                      <p className="mt-3 font-mono text-[11px] text-emerald-400/90">
                        {step.badge}
                      </p>
                    </div>
                  </div>
                </button>

                {idx < STORY_STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:flex items-center justify-center w-6 -mr-6 z-10 text-emerald-400 shrink-0"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
