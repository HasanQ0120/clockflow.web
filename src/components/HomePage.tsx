import { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Minus,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';
import { InfinityArchitectureDiagram } from './InfinityArchitectureDiagram';
import type { PageId } from './TopNavBar';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

type ItemStage = 'Caught' | 'Cloaked' | 'Restored';

interface PreviewSecretItem {
  id: string;
  rawValue: string;
  maskedToken: string;
  category: string;
  defaultStage: ItemStage;
}

const PREVIEW_ITEMS: PreviewSecretItem[] = [
  {
    id: 'stripe-key',
    rawValue: 'sk-live-9988...',
    maskedToken: '[API_KEY_1]',
    category: 'Stripe Key',
    defaultStage: 'Cloaked',
  },
  {
    id: 'client-name',
    rawValue: 'Usman Tariq',
    maskedToken: '[PERSON_1]',
    category: 'Client Name',
    defaultStage: 'Restored',
  },
  {
    id: 'contract-fee',
    rawValue: 'PKR 850,000',
    maskedToken: '[AMOUNT_1]',
    category: 'Contract Fee',
    defaultStage: 'Restored',
  },
  {
    id: 'phone-num',
    rawValue: '0300-1234567',
    maskedToken: '[PHONE_1]',
    category: 'Phone Number',
    defaultStage: 'Cloaked',
  },
];

const STAGE_ORDER: ItemStage[] = ['Caught', 'Cloaked', 'Restored'];

const PROBLEM_BULLETS = [
  'Live API keys and passwords travel unmasked to external servers.',
  'Client names and contracts get stored in cloud logs.',
  'Without local protection, you have zero proof of what left your laptop.',
];

const COMPARISON_ROWS = [
  {
    feature: 'Private names & keys',
    regular: 'Sent to servers',
    cloakflow: 'Locked on laptop',
  },
  {
    feature: 'API tokens & secrets',
    regular: 'Logged in history',
    cloakflow: 'Masked to [API_KEY_1]',
  },
  {
    feature: 'Final answer',
    regular: 'No protection',
    cloakflow: 'Real details restored',
  },
  {
    feature: 'Offline usage',
    regular: 'Requires internet',
    cloakflow: '100% local quick fix',
  },
  {
    feature: 'Cloud storage',
    regular: 'Saved on server',
    cloakflow: 'Zero database logs',
  },
];

function getStagePillStyle(stage: ItemStage): React.CSSProperties {
  if (stage === 'Caught') {
    return {
      backgroundColor: 'var(--cf-amber-soft)',
      borderColor: 'var(--cf-amber-border)',
      color: 'var(--cf-amber-text)',
    };
  }
  if (stage === 'Cloaked') {
    return {
      backgroundColor: 'var(--cf-emerald-soft)',
      borderColor: 'var(--cf-emerald-border)',
      color: 'var(--cf-emerald-text)',
    };
  }
  return {
    backgroundColor: '#FAFAFA',
    borderColor: '#E4E4E7',
    color: '#09090B',
  };
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [itemStages, setItemStages] = useState<Record<string, ItemStage>>(() =>
    Object.fromEntries(PREVIEW_ITEMS.map((item) => [item.id, item.defaultStage]))
  );
  const [activeStagePreset, setActiveStagePreset] = useState<
    'mixed' | ItemStage
  >('mixed');

  const handleCycleItemStage = (id: string) => {
    setActiveStagePreset('mixed');
    setItemStages((prev) => {
      const current = prev[id] ?? 'Caught';
      const next =
        STAGE_ORDER[(STAGE_ORDER.indexOf(current) + 1) % STAGE_ORDER.length];
      return { ...prev, [id]: next };
    });
  };

  const handleSetAllStage = (mode: 'mixed' | ItemStage) => {
    setActiveStagePreset(mode);
    if (mode === 'mixed') {
      setItemStages(
        Object.fromEntries(
          PREVIEW_ITEMS.map((item) => [item.id, item.defaultStage])
        )
      );
      return;
    }
    setItemStages(
      Object.fromEntries(PREVIEW_ITEMS.map((item) => [item.id, mode]))
    );
  };

  const handleScrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div>
      {/* 1. HERO SECTION (SHARP & DIRECT) */}
      <section className="pt-10 pb-10 lg:pt-14 lg:pb-12 max-w-[1440px] w-[92%] mx-auto">
        <div className="max-w-4xl mx-auto text-center">
          <p
            style={{ color: 'var(--cf-emerald-text)' }}
            className="text-xs font-semibold uppercase tracking-widest"
          >
            Local-First Privacy Shield for Cloud AI
          </p>

          <h1
            style={{ color: 'var(--cf-text)', textWrap: 'balance' }}
            className="mt-3.5 font-display text-4xl sm:text-5xl lg:text-[60px] font-bold tracking-tight leading-[1.06]"
          >
            Stop leaking secrets to Cloud AI.
          </h1>

          <p
            style={{ color: 'var(--cf-text-secondary)', textWrap: 'balance' }}
            className="mt-4 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto"
          >
            CloakFlow automatically hides your names, passwords, and payment
            details on your laptop before sending prompts to Cloud AI—then
            restores them in your answer.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => onNavigate('production')}
              data-testid="hero-launch-production-btn"
              style={{
                backgroundColor: 'var(--cf-primary-bg)',
                color: 'var(--cf-primary-text)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold px-7 py-3.5 rounded-md border border-emerald-400/60 transition-all duration-150 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 hover:brightness-110"
            >
              <span>Open Production</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={handleScrollToHowItWorks}
              data-testid="hero-see-how-btn"
              style={{
                backgroundColor: 'var(--cf-surface-raised)',
                borderColor: 'var(--cf-border-strong)',
                color: 'var(--cf-text)',
                boxShadow: 'var(--cf-specular)',
              }}
              className="inline-flex items-center gap-2 text-sm sm:text-base font-medium border px-6 py-3.5 rounded-md transition-all duration-150 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:border-emerald-500/70"
            >
              <span>See How It Works</span>
              <ArrowDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM + LIVE PRIVACY PREVIEW CARD (2-COLUMN SPLIT) */}
      <section
        style={{ borderColor: 'var(--cf-border)' }}
        className="py-12 lg:py-16 max-w-[1440px] w-[92%] mx-auto border-t"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Problem Statement */}
          <div className="lg:col-span-5 space-y-5">
            <div className="space-y-3">
              <p
                style={{ color: 'var(--cf-amber-text)' }}
                className="text-xs font-semibold uppercase tracking-widest"
              >
                Why raw prompts are risky
              </p>
              <h2
                style={{ color: 'var(--cf-text)', textWrap: 'balance' }}
                className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-[1.12]"
              >
                Every pasted prompt is a secret at risk.
              </h2>
              <p
                style={{ color: 'var(--cf-text-secondary)' }}
                className="text-sm sm:text-base leading-relaxed"
              >
                One copied paragraph can expose credentials, clients, and
                financial records in seconds.
              </p>
            </div>

            <ul className="space-y-3.5 pt-1">
              {PROBLEM_BULLETS.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 text-sm sm:text-base leading-relaxed"
                >
                  <ShieldAlert
                    style={{ color: 'var(--cf-amber-text)' }}
                    className="w-4 h-4 mt-1 shrink-0"
                    aria-hidden="true"
                  />
                  <span style={{ color: 'var(--cf-text-secondary)' }}>
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column: Interactive "Privacy Overview" Live UI Card */}
          <div className="lg:col-span-7">
            <div
              data-testid="privacy-overview-card"
              style={{
                backgroundColor: 'var(--cf-surface)',
                borderColor: 'var(--cf-border)',
              }}
              className="relative border rounded-lg p-5 sm:p-6 space-y-5"
            >
              <CornerCrosshairs tone="emerald" />

              {/* Widget Header */}
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3
                    style={{ color: 'var(--cf-text)' }}
                    className="font-display text-base font-semibold"
                  >
                    Privacy Overview
                  </h3>
                  <span style={{ color: 'var(--cf-text-muted)' }} aria-hidden="true">
                    ·
                  </span>
                  <span
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="text-xs"
                  >
                    Illustrative live preview
                  </span>
                </div>

                {/* Interactive Stage Preview Controls */}
                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="inline-flex items-center gap-1 rounded-md border p-1"
                  role="group"
                  aria-label="Preview secret lifecycle stage"
                >
                  {(['Caught', 'Cloaked', 'Restored'] as ItemStage[]).map(
                    (stage) => {
                      const active = activeStagePreset === stage;
                      return (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => handleSetAllStage(stage)}
                          style={
                            active
                              ? getStagePillStyle(stage)
                              : { color: 'var(--cf-text-muted)' }
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active ? 'border' : 'hover:text-white'
                          }`}
                        >
                          {stage}
                        </button>
                      );
                    }
                  )}
                  <button
                    type="button"
                    onClick={() => handleSetAllStage('mixed')}
                    aria-label="Reset live preview stages"
                    title="Reset to live mixed flow"
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="p-1 rounded hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* 3 Metric Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="border rounded-md px-4 py-3"
                >
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="text-xs font-medium"
                  >
                    Secrets Caught
                  </p>
                  <p
                    style={{ color: 'var(--cf-text)' }}
                    className="mt-1 font-mono text-2xl font-bold tabular-nums"
                  >
                    14
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="border rounded-md px-4 py-3"
                >
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="text-xs font-medium"
                  >
                    Leaked to Cloud
                  </p>
                  <p
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="mt-1 font-mono text-2xl font-bold tabular-nums"
                  >
                    0 Bytes
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="border rounded-md px-4 py-3"
                >
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="text-xs font-medium"
                  >
                    Local Speed
                  </p>
                  <p
                    style={{ color: 'var(--cf-text)' }}
                    className="mt-1 font-mono text-2xl font-bold tabular-nums"
                  >
                    12ms
                  </p>
                </div>
              </div>

              {/* Live Item Status Feed */}
              <div
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                }}
                className="border rounded-md divide-y"
              >
                {PREVIEW_ITEMS.map((item) => {
                  const stage = itemStages[item.id] ?? item.defaultStage;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`preview-feed-row-${item.id}`}
                      onClick={() => handleCycleItemStage(item.id)}
                      style={{ borderColor: 'var(--cf-border)' }}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <code
                          style={{ color: 'var(--cf-text)' }}
                          className="font-mono text-xs sm:text-sm font-medium truncate"
                        >
                          {item.rawValue}
                        </code>
                        <span
                          style={{ color: 'var(--cf-text-muted)' }}
                          aria-hidden="true"
                        >
                          •
                        </span>
                        <span
                          style={{ color: 'var(--cf-text-muted)' }}
                          className="text-xs sm:text-sm whitespace-nowrap"
                        >
                          {item.category}
                        </span>
                        {stage === 'Cloaked' && (
                          <span
                            style={{ color: 'var(--cf-emerald-text)' }}
                            className="hidden sm:inline font-mono text-[11px] opacity-85"
                          >
                            → {item.maskedToken}
                          </span>
                        )}
                      </div>

                      <span
                        data-testid={`preview-feed-status-${item.id}`}
                        style={getStagePillStyle(stage)}
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0"
                      >
                        {stage}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Footer Hint */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    style={getStagePillStyle('Caught')}
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  >
                    Caught
                  </span>
                  <span style={{ color: 'var(--cf-text-muted)' }} aria-hidden="true">
                    →
                  </span>
                  <span
                    style={getStagePillStyle('Cloaked')}
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  >
                    Cloaked
                  </span>
                  <span style={{ color: 'var(--cf-text-muted)' }} aria-hidden="true">
                    →
                  </span>
                  <span
                    style={getStagePillStyle('Restored')}
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  >
                    Restored
                  </span>
                </div>
                <span style={{ color: 'var(--cf-text-muted)' }}>
                  Click any row to cycle stage
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HORIZONTAL INFINITY LOOP + 3 NUMBERED MINI-UI STEP CARDS */}
      <section
        id="how-it-works"
        style={{ borderColor: 'var(--cf-border)' }}
        className="scroll-mt-20 py-12 lg:py-16 max-w-[1440px] w-[92%] mx-auto border-t space-y-10"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p
              style={{ color: 'var(--cf-emerald-text)' }}
              className="text-xs font-semibold uppercase tracking-widest"
            >
              How it works
            </p>
            <h2
              style={{ color: 'var(--cf-text)', textWrap: 'balance' }}
              className="mt-1.5 font-display text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Private on your laptop. Smart in the cloud.
            </h2>
          </div>
          <p style={{ color: 'var(--cf-text-muted)' }} className="text-sm">
            Click any station on the loop to inspect data.
          </p>
        </div>

        {/* Compact Horizontal Figure-8 Infinity Loop */}
        <InfinityArchitectureDiagram embedded />

        {/* 3 Numbered Mini-UI Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Step 1 */}
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-lg p-6 flex flex-col justify-between gap-5"
          >
            <CornerCrosshairs />
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text)',
                  }}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md border font-mono text-xs font-bold tabular-nums shrink-0"
                >
                  1
                </span>
                <h3
                  style={{ color: 'var(--cf-text)' }}
                  className="font-display text-lg font-semibold tracking-tight"
                >
                  You paste your text
                </h3>
              </div>
              <p
                style={{ color: 'var(--cf-text-muted)' }}
                className="text-sm leading-relaxed"
              >
                Drop in contracts, messages, or code snippets directly on your
                device.
              </p>
            </div>

            {/* Mini UI Preview Box */}
            <div
              style={{
                backgroundColor: 'var(--cf-input-bg)',
                borderColor: 'var(--cf-border)',
              }}
              className="border rounded-md p-3.5 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: 'var(--cf-text-muted)' }}>
                  Your Private Input
                </span>
                <span
                  style={{ color: 'var(--cf-amber-text)' }}
                  className="font-mono font-medium"
                >
                  Unmasked
                </span>
              </div>
              <p
                style={{ color: 'var(--cf-text-secondary)' }}
                className="font-mono text-xs sm:text-[13px] leading-relaxed"
              >
                Contract for{' '}
                <span
                  style={{
                    backgroundColor: 'var(--cf-amber-soft)',
                    borderColor: 'var(--cf-amber-border)',
                    color: 'var(--cf-amber-text)',
                  }}
                  className="border-b px-1.5 py-0.5 rounded-t"
                >
                  PKR 850,000
                </span>
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-lg p-6 flex flex-col justify-between gap-5"
          >
            <CornerCrosshairs tone="emerald" />
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span
                  style={{
                    backgroundColor: 'var(--cf-emerald-soft)',
                    borderColor: 'var(--cf-emerald-border)',
                    color: 'var(--cf-emerald-text)',
                  }}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md border font-mono text-xs font-bold tabular-nums shrink-0"
                >
                  2
                </span>
                <h3
                  style={{ color: 'var(--cf-text)' }}
                  className="font-display text-lg font-semibold tracking-tight"
                >
                  CloakFlow hides secrets locally
                </h3>
              </div>
              <p
                style={{ color: 'var(--cf-text-muted)' }}
                className="text-sm leading-relaxed"
              >
                Real names, numbers, and API keys swap to safe placeholders in
                memory.
              </p>
            </div>

            {/* Mini UI Preview Box */}
            <div
              style={{
                backgroundColor: 'var(--cf-input-bg)',
                borderColor: 'var(--cf-border)',
              }}
              className="border rounded-md p-3.5 space-y-2.5"
            >
              <p
                style={{ color: 'var(--cf-text-secondary)' }}
                className="font-mono text-xs sm:text-[13px] leading-relaxed"
              >
                Contract for{' '}
                <span
                  style={{
                    backgroundColor: 'var(--cf-emerald-soft)',
                    borderColor: 'var(--cf-emerald-border)',
                    color: 'var(--cf-emerald-text)',
                  }}
                  className="border px-1.5 py-0.5 rounded"
                >
                  [AMOUNT_1]
                </span>
              </p>
              <div className="flex items-center">
                <span
                  style={{
                    backgroundColor: 'var(--cf-emerald-soft)',
                    borderColor: 'var(--cf-emerald-border)',
                    color: 'var(--cf-emerald-text)',
                  }}
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
                >
                  11 secrets caught • 0 bytes sent
                </span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-lg p-6 flex flex-col justify-between gap-5"
          >
            <CornerCrosshairs tone="emerald" />
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span
                  style={{
                    backgroundColor: '#FAFAFA',
                    borderColor: '#E4E4E7',
                    color: '#09090B',
                  }}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md border font-mono text-xs font-bold tabular-nums shrink-0"
                >
                  3
                </span>
                <h3
                  style={{ color: 'var(--cf-text)' }}
                  className="font-display text-lg font-semibold tracking-tight"
                >
                  You get a complete answer
                </h3>
              </div>
              <p
                style={{ color: 'var(--cf-text-muted)' }}
                className="text-sm leading-relaxed"
              >
                Cloud AI analyzes the safe prompt and your browser restores
                every detail.
              </p>
            </div>

            {/* Mini UI Preview Box */}
            <div
              style={{
                backgroundColor: 'var(--cf-input-bg)',
                borderColor: 'var(--cf-border)',
              }}
              className="border rounded-md p-3.5 space-y-2.5"
            >
              <p
                style={{ color: 'var(--cf-text-secondary)' }}
                className="text-xs sm:text-[13px] leading-relaxed"
              >
                Review ready for{' '}
                <span
                  style={{ color: 'var(--cf-emerald-text)' }}
                  className="font-semibold underline decoration-emerald-500/50 underline-offset-4"
                >
                  PKR 850,000
                </span>{' '}
                retainer terms.
              </p>
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Check
                  style={{ color: 'var(--cf-emerald-text)' }}
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                />
                <span style={{ color: 'var(--cf-emerald-text)' }}>
                  Details restored on your device
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CLEAN COMPARISON & FINAL CTA BANNER */}
      <section
        style={{ borderColor: 'var(--cf-border)' }}
        className="py-12 lg:py-16 max-w-[1440px] w-[92%] mx-auto border-t space-y-12"
      >
        {/* Regular AI vs. CloakFlow Comparison Table */}
        <div
          style={{
            backgroundColor: 'var(--cf-surface)',
            borderColor: 'var(--cf-border)',
          }}
          className="relative border rounded-lg overflow-hidden"
        >
          <CornerCrosshairs />

          <div
            style={{ borderColor: 'var(--cf-border)' }}
            className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p
                style={{ color: 'var(--cf-emerald-text)' }}
                className="text-xs font-semibold uppercase tracking-wider"
              >
                Side-by-side comparison
              </p>
              <h2
                style={{ color: 'var(--cf-text)' }}
                className="font-display text-xl sm:text-2xl font-bold mt-0.5"
              >
                Regular AI vs. CloakFlow
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('production')}
              style={{
                backgroundColor: 'var(--cf-surface-raised)',
                borderColor: 'var(--cf-border-strong)',
                color: 'var(--cf-text)',
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold border rounded-md px-3.5 py-2 cursor-pointer hover:border-emerald-500/70 whitespace-nowrap shrink-0"
            >
              <span>Try Live</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  style={{
                    borderColor: 'var(--cf-border)',
                    backgroundColor: 'var(--cf-surface-raised)',
                  }}
                  className="border-b font-mono text-xs uppercase tracking-wider"
                >
                  <th
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="py-3.5 px-6 font-medium"
                  >
                    Feature
                  </th>
                  <th
                    style={{ color: 'var(--cf-rose-text)' }}
                    className="py-3.5 px-6 font-medium"
                  >
                    Regular AI
                  </th>
                  <th
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="py-3.5 px-6 font-semibold"
                  >
                    CloakFlow
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: 'var(--cf-border)' }}
              >
                {COMPARISON_ROWS.map((row) => (
                  <tr
                    key={row.feature}
                    style={{ borderColor: 'var(--cf-border)' }}
                    className="border-b last:border-b-0"
                  >
                    <td
                      style={{ color: 'var(--cf-text)' }}
                      className="py-4 px-6 text-sm font-medium"
                    >
                      {row.feature}
                    </td>
                    <td
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="py-4 px-6 text-sm"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Minus
                          style={{ color: 'var(--cf-rose-text)' }}
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{row.regular}</span>
                      </span>
                    </td>
                    <td
                      style={{ color: 'var(--cf-text)' }}
                      className="py-4 px-6 text-sm font-medium"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Check
                          style={{ color: 'var(--cf-emerald-text)' }}
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{row.cloakflow}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Final CTA Banner */}
        <div
          style={{
            backgroundColor: 'var(--cf-surface)',
            borderColor: 'var(--cf-border)',
          }}
          className="relative border rounded-lg px-6 py-10 sm:px-10 sm:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <CornerCrosshairs tone="emerald" />
          <div className="space-y-2 max-w-2xl">
            <h2
              style={{ color: 'var(--cf-text)', textWrap: 'balance' }}
              className="font-display text-2xl sm:text-4xl font-bold tracking-tight"
            >
              Your private data deserves a local shield.
            </h2>
            <p
              style={{ color: 'var(--cf-text-secondary)' }}
              className="text-sm sm:text-base"
            >
              Mask secrets on your laptop in milliseconds and keep full control of
              every prompt.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('production')}
            data-testid="footer-launch-production-btn"
            style={{
              backgroundColor: 'var(--cf-primary-bg)',
              color: 'var(--cf-primary-text)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
            className="inline-flex items-center justify-center gap-2 text-sm sm:text-base font-semibold px-7 py-3.5 rounded-md border border-emerald-400/60 transition-all duration-150 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 hover:brightness-110"
          >
            <span>Launch Production</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
