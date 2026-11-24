import { ArrowRight, Check } from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';
import type { PageId } from './TopNavBar';

interface AboutPageProps {
  onNavigate: (page: PageId) => void;
}

const PROCESS_CARDS = [
  {
    num: '01',
    tag: 'LOCAL FIRST',
    title: 'Hide here.',
    description: 'Names and private details stay on your laptop.',
    tone: 'emerald' as const,
  },
  {
    num: '02',
    tag: 'CLOUD ASSISTED',
    title: 'Ask freely.',
    description: 'Cloud AI works with only the context it needs.',
    tone: 'amber' as const,
  },
  {
    num: '03',
    tag: 'YOURS AGAIN',
    title: 'Restore here.',
    description: 'Your original details return only on your device.',
    tone: 'emerald' as const,
  },
];

const GUARANTEES = [
  'See what leaves before you send.',
  'Choose what stays private.',
  'Clear your local session at any time.',
];

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <section className="py-12 lg:py-16 max-w-[1440px] w-[92%] mx-auto space-y-10">
      {/* TOP ROW (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column */}
        <div className="lg:col-span-6 space-y-5">
          <p
            style={{ color: 'var(--cf-emerald-text)' }}
            className="font-mono text-xs uppercase tracking-widest"
          >
            ABOUT CLOAKFLOW
          </p>

          <h1
            style={{ color: 'var(--cf-text)' }}
            className="font-display text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight leading-[1.05]"
          >
            Privacy isn&apos;t a mode. It&apos;s the starting point.
          </h1>

          <p
            style={{ color: 'var(--cf-text-secondary)' }}
            className="text-base sm:text-lg leading-relaxed max-w-xl"
          >
            Big ideas should never mean giving everything away.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('production')}
              data-testid="about-open-production-btn"
              style={{
                backgroundColor: 'var(--cf-text)',
                color: 'var(--cf-bg)',
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-md transition-all duration-100 active:scale-[0.99] whitespace-nowrap cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <span>Open Production</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right Column: THE LOCAL BOUNDARY Card */}
        <div className="lg:col-span-6">
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-md p-6 sm:p-7 space-y-5"
          >
            <CornerCrosshairs tone="emerald" />

            {/* Card Header */}
            <div
              style={{ borderColor: 'var(--cf-border)' }}
              className="flex items-center justify-between gap-3 pb-3.5 border-b"
            >
              <span
                style={{ color: 'var(--cf-text-muted)' }}
                className="font-mono text-xs uppercase tracking-widest font-semibold"
              >
                THE LOCAL BOUNDARY
              </span>
              <span
                style={{
                  borderColor: 'var(--cf-emerald-border)',
                  backgroundColor: 'var(--cf-emerald-soft)',
                  color: 'var(--cf-emerald-text)',
                }}
                className="inline-flex items-center gap-1.5 border rounded px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span>ON</span>
              </span>
            </div>

            {/* 3-Part Visual Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              {/* Left Box: YOUR ORIGINAL */}
              <div
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                }}
                className="border rounded-md p-4 space-y-2.5"
              >
                <p
                  style={{ color: 'var(--cf-text-muted)' }}
                  className="font-mono text-[10px] uppercase tracking-widest"
                >
                  YOUR ORIGINAL
                </p>
                <div
                  style={{ color: 'var(--cf-text)' }}
                  className="font-mono text-xs sm:text-[13px] leading-relaxed space-y-1"
                >
                  <p>
                    Client:{' '}
                    <span style={{ color: 'var(--cf-rose-text)' }}>
                      Avery Chen
                    </span>
                  </p>
                  <p>
                    Fee:{' '}
                    <span style={{ color: 'var(--cf-rose-text)' }}>
                      $24,000
                    </span>
                  </p>
                  <p style={{ color: 'var(--cf-text-secondary)' }}>
                    Summarize the contract.
                  </p>
                </div>
              </div>

              {/* Center Green Badge: 0 SECRETS */}
              <div className="flex items-center justify-center py-1">
                <span
                  style={{
                    borderColor: 'var(--cf-emerald-border)',
                    backgroundColor: 'var(--cf-emerald-soft)',
                    color: 'var(--cf-emerald-text)',
                  }}
                  className="border rounded px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  0 SECRETS
                </span>
              </div>

              {/* Right Box: WHAT CLOUD AI SEES */}
              <div
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                }}
                className="border rounded-md p-4 space-y-2.5"
              >
                <p
                  style={{ color: 'var(--cf-text-muted)' }}
                  className="font-mono text-[10px] uppercase tracking-widest"
                >
                  WHAT CLOUD AI SEES
                </p>
                <div
                  style={{ color: 'var(--cf-text)' }}
                  className="font-mono text-xs sm:text-[13px] leading-relaxed space-y-1"
                >
                  <p>
                    Client:{' '}
                    <span style={{ color: 'var(--cf-emerald-text)' }}>
                      [PERSON_1]
                    </span>
                  </p>
                  <p>
                    Fee:{' '}
                    <span style={{ color: 'var(--cf-emerald-text)' }}>
                      [AMOUNT_1]
                    </span>
                  </p>
                  <p style={{ color: 'var(--cf-text-secondary)' }}>
                    Summarize the contract.
                  </p>
                </div>
              </div>
            </div>

            {/* Card Footer Notes */}
            <div
              style={{ borderColor: 'var(--cf-border)' }}
              className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs"
            >
              <span style={{ color: 'var(--cf-text-muted)' }}>
                Private details stop here.
              </span>
              <span
                style={{ color: 'var(--cf-emerald-text)' }}
                className="font-medium"
              >
                Useful context goes on. →
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW (3 Equal Hairline Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
        {PROCESS_CARDS.map((card) => (
          <div
            key={card.num}
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-md p-7 space-y-3"
          >
            <CornerCrosshairs tone={card.tone} />
            <p
              style={{
                color:
                  card.tone === 'amber'
                    ? 'var(--cf-amber-text)'
                    : 'var(--cf-emerald-text)',
              }}
              className="font-mono text-xs uppercase tracking-widest font-semibold"
            >
              {card.num} // {card.tag}
            </p>
            <h2
              style={{ color: 'var(--cf-text)' }}
              className="font-display text-2xl font-bold tracking-tight"
            >
              {card.title}
            </h2>
            <p
              style={{ color: 'var(--cf-text-secondary)' }}
              className="text-sm sm:text-base leading-relaxed"
            >
              {card.description}
            </p>
          </div>
        ))}
      </div>

      {/* BOTTOM ROW (Full-Width 2-Column Banner Card) */}
      <div
        style={{
          backgroundColor: 'var(--cf-surface)',
          borderColor: 'var(--cf-border)',
        }}
        className="relative border rounded-md p-7 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
      >
        <CornerCrosshairs />

        <div className="lg:col-span-7 space-y-2">
          <p
            style={{ color: 'var(--cf-text-muted)' }}
            className="font-mono text-xs uppercase tracking-widest"
          >
            A SMALLER WINDOW, NOT A SMALLER TOOL
          </p>
          <h2
            style={{ color: 'var(--cf-text)' }}
            className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
          >
            Keep the power. Close the privacy gap.
          </h2>
        </div>

        <ul className="lg:col-span-5 space-y-3">
          {GUARANTEES.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 text-sm sm:text-base"
            >
              <Check
                style={{ color: 'var(--cf-emerald-text)' }}
                className="w-4 h-4 shrink-0"
                aria-hidden="true"
              />
              <span style={{ color: 'var(--cf-text)' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
