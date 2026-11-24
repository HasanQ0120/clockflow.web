import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cloud,
  Cpu,
  Laptop,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';
import {
  DEFAULT_SETTINGS,
  type CloakFlowSettings,
  type CustomPrivacyRule,
  type PrivacyMode,
  type ThemeMode,
} from '../utils/settingsStore';
import { parseWhitelistInput } from '../utils/privacyEngine';
import {
  detectOnDeviceAI,
  runLocalPrivacyScrub,
} from '../services/aiService.js';

type SettingsTab = 'privacy' | 'cloud' | 'workspace' | 'device';

interface SettingsPageProps {
  settings: CloakFlowSettings;
  airGapEffective?: boolean;
  onSaveSettings: (next: CloakFlowSettings) => void;
  onPreviewTheme: (theme: ThemeMode) => void;
  onClearSession?: () => void;
}

const SIDEBAR_TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Shield;
}> = [
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'cloud', label: 'Cloud AI', icon: Cloud },
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid },
  { id: 'device', label: 'Device', icon: Laptop },
];

const THEME_OPTIONS: Array<{
  id: ThemeMode;
  name: string;
  subtitle: string;
  bgSwatch: string;
  surfaceSwatch: string;
  accentSwatch: string;
  textSwatch: string;
}> = [
  {
    id: 'obsidian',
    name: 'Obsidian Dark',
    subtitle: 'Default Dark',
    bgSwatch: '#09090B',
    surfaceSwatch: '#121215',
    accentSwatch: '#10B981',
    textSwatch: '#FAFAFA',
  },
  {
    id: 'midnight',
    name: 'Midnight Slate',
    subtitle: 'Deep Slate',
    bgSwatch: '#070D19',
    surfaceSwatch: '#0F172A',
    accentSwatch: '#38BDF8',
    textSwatch: '#F8FAFC',
  },
  {
    id: 'daylight',
    name: 'Clean Light',
    subtitle: 'Swiss Light',
    bgSwatch: '#F8FAFC',
    surfaceSwatch: '#FFFFFF',
    accentSwatch: '#059669',
    textSwatch: '#09090B',
  },
];

interface ToggleSwitchProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  testId?: string;
}

function ToggleSwitch({ checked, onToggle, label, testId }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={onToggle}
      style={{
        backgroundColor: checked ? '#10B981' : 'var(--cf-surface-raised)',
        borderColor: checked ? '#10B981' : 'var(--cf-border-strong)',
      }}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <span
        style={{
          backgroundColor: checked ? '#09090B' : 'var(--cf-text-muted)',
        }}
        className={`inline-block h-4 w-4 rounded-full transition-transform duration-150 ${
          checked ? 'translate-x-5.5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function SettingsPage({
  settings,
  airGapEffective = false,
  onSaveSettings,
  onPreviewTheme,
  onClearSession,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('privacy');
  const [addingRule, setAddingRule] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const newRuleInputRef = useRef<HTMLInputElement | null>(null);

  const [whitelistDraft, setWhitelistDraft] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [sessionCleared, setSessionCleared] = useState(false);

  const [deviceAiStatus, setDeviceAiStatus] = useState<{
    available: boolean;
    engine: string;
  }>({ available: false, engine: 'Local Guard' });
  const [testingLocalAi, setTestingLocalAi] = useState(false);
  const [localTestResult, setLocalTestResult] = useState<{
    passed: boolean;
    speedMs: number;
    blockedCount: number;
    engine: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    detectOnDeviceAI().then((res) => {
      if (mounted) setDeviceAiStatus(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (addingRule) {
      newRuleInputRef.current?.focus();
    }
  }, [addingRule]);

  useEffect(() => {
    if (!showClearModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowClearModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showClearModal]);

  const commit = (patch: Partial<CloakFlowSettings>) => {
    const next: CloakFlowSettings = {
      ...settings,
      ...patch,
    };
    onSaveSettings(next);
  };

  const handleSetPrivacyMode = (mode: PrivacyMode) => {
    if (mode === 'strict') {
      commit({
        privacyMode: 'strict',
        hidePrivateDetails: true,
        autoCloakOnUpload: true,
        maskCurrencyAndPhones: true,
      });
    } else {
      setAddingRule(false);
      commit({ privacyMode: 'everyday' });
    }
  };

  const handleToggleRule = (ruleId: string) => {
    const nextRules = settings.customRules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    commit({ customRules: nextRules });
  };

  const handleDeleteRule = (ruleId: string) => {
    const nextRules = settings.customRules.filter((r) => r.id !== ruleId);
    commit({ customRules: nextRules });
  };

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newRulePattern.trim();
    if (!cleaned) return;
    const isPrefix =
      cleaned.toLowerCase().startsWith('words starting with ') ||
      cleaned.endsWith('-') ||
      cleaned.endsWith('*');
    const rawPrefix = cleaned.replace(/^words starting with\s+/i, '').trim();
    const pattern =
      isPrefix && !rawPrefix.endsWith('*') ? `${rawPrefix}*` : rawPrefix;
    const label = cleaned.toLowerCase().startsWith('words starting with ')
      ? cleaned
      : rawPrefix.endsWith('*')
        ? `Words starting with ${rawPrefix.slice(0, -1)}`
        : cleaned;

    if (
      settings.customRules.some(
        (r) => r.pattern.toLowerCase() === pattern.toLowerCase()
      )
    ) {
      setNewRulePattern('');
      setNewRuleDesc('');
      setAddingRule(false);
      return;
    }

    const newRule: CustomPrivacyRule = {
      id: `rule-${Date.now()}`,
      label,
      pattern,
      description: newRuleDesc.trim() || 'Hide this term locally',
      enabled: true,
    };

    commit({ customRules: [...settings.customRules, newRule] });
    setNewRulePattern('');
    setNewRuleDesc('');
    setAddingRule(false);
  };

  const handleAddWhitelist = () => {
    const incoming = parseWhitelistInput(whitelistDraft);
    if (incoming.length === 0) return;
    const next = [...settings.defaultWhitelist];
    for (const term of incoming) {
      if (!next.some((t) => t.toLowerCase() === term.toLowerCase())) {
        next.push(term);
      }
    }
    commit({ defaultWhitelist: next });
    setWhitelistDraft('');
  };

  const handleRemoveWhitelist = (term: string) => {
    commit({
      defaultWhitelist: settings.defaultWhitelist.filter(
        (t) => t.toLowerCase() !== term.toLowerCase()
      ),
    });
  };

  const handleResetDefaults = () => {
    const reset: CloakFlowSettings = {
      ...DEFAULT_SETTINGS,
      defaultWhitelist: [...DEFAULT_SETTINGS.defaultWhitelist],
      defaultBlacklist: [...DEFAULT_SETTINGS.defaultBlacklist],
      customRules: DEFAULT_SETTINGS.customRules.map((r) => ({ ...r })),
    };
    setAddingRule(false);
    onPreviewTheme(reset.theme);
    onSaveSettings(reset);
  };

  const handleConfirmClearSession = () => {
    onClearSession?.();
    setShowClearModal(false);
    setSessionCleared(true);
    window.setTimeout(() => setSessionCleared(false), 2600);
  };

  const handleTestLocalAi = async () => {
    setTestingLocalAi(true);
    try {
      const detected = await detectOnDeviceAI();
      setDeviceAiStatus(detected);
      const probe = runLocalPrivacyScrub(
        'Test contact: Avery Chen, avery.chen@example.com, key sk-live-99887766554433221100aabb.',
        false,
        [],
        [],
        { hidePrivateDetails: true, maskApiKeys: true, maskCurrencyAndPhones: true }
      );
      setLocalTestResult({
        passed: probe.leakedBytes === 0 && probe.vault.length >= 3,
        speedMs: probe.localSpeedMs,
        blockedCount: probe.vault.length,
        engine: detected.engine,
      });
    } finally {
      setTestingLocalAi(false);
    }
  };

  const activeCustomRulesCount = settings.customRules.filter(
    (r) => r.enabled
  ).length;

  return (
    <section className="py-10 lg:py-14 max-w-[1440px] w-[92%] mx-auto">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1
            style={{ color: 'var(--cf-text)' }}
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight"
          >
            Settings
          </h1>
          <p
            style={{ color: 'var(--cf-text-muted)' }}
            className="mt-1.5 text-sm sm:text-base"
          >
            A little control. A lot of peace of mind.
          </p>
        </div>

        <span
          data-testid="settings-autosave-status"
          style={{ color: 'var(--cf-emerald-text)' }}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium whitespace-nowrap"
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>All changes saved locally</span>
        </span>
      </div>

      {/* 2-Column Layout: Left Sidebar (240px) + Main Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-7">
        {/* LEFT SIDEBAR (240px wide on desktop) */}
        <aside className="w-full lg:w-[240px] shrink-0 space-y-5">
          <nav
            aria-label="Settings sections"
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="border rounded-md p-2 flex lg:flex-col gap-1 overflow-x-auto"
          >
            {SIDEBAR_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`settings-tab-${tab.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    backgroundColor: isActive
                      ? 'var(--cf-surface-raised)'
                      : 'transparent',
                    borderColor: isActive
                      ? 'var(--cf-border-strong)'
                      : 'transparent',
                    color: isActive ? 'var(--cf-text)' : 'var(--cf-text-muted)',
                  }}
                  className="flex items-center gap-2.5 border rounded px-3 py-2 text-sm font-medium text-left transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <Icon
                    style={{
                      color: isActive
                        ? 'var(--cf-emerald-text)'
                        : 'var(--cf-text-muted)',
                    }}
                    className="w-4 h-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* THIS DEVICE Status Card */}
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-md p-4 space-y-2"
          >
            <p
              style={{ color: 'var(--cf-text-muted)' }}
              className="font-mono text-[10px] uppercase tracking-widest"
            >
              THIS DEVICE
            </p>
            <p
              style={{ color: 'var(--cf-text)' }}
              className="text-sm font-semibold"
            >
              Personal workspace
            </p>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  airGapEffective ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                aria-hidden="true"
              />
              <span
                style={{
                  color: airGapEffective
                    ? 'var(--cf-amber-text)'
                    : 'var(--cf-emerald-text)',
                }}
              >
                {airGapEffective
                  ? 'Offline on your device'
                  : 'Ready on your device'}
              </span>
            </div>
            <p
              style={{ color: 'var(--cf-text-muted)' }}
              className="text-xs pt-1"
            >
              Your settings stay here.
            </p>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* TAB 1: PRIVACY */}
          {activeTab === 'privacy' && (
            <>
              <div
                style={{
                  backgroundColor: 'var(--cf-surface)',
                  borderColor: 'var(--cf-border)',
                }}
                className="relative border rounded-md p-6 sm:p-7 space-y-6"
              >
                <CornerCrosshairs />

                {/* Card Header */}
                <div
                  style={{ borderColor: 'var(--cf-border)' }}
                  className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b"
                >
                  <div>
                    <h2
                      style={{ color: 'var(--cf-text)' }}
                      className="font-display text-xl font-bold"
                    >
                      Privacy
                    </h2>
                    <p
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="mt-1 text-sm"
                    >
                      Decide what stays on your device.
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: 'var(--cf-surface-raised)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text-muted)',
                    }}
                    className="border rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                  >
                    DEVICE ONLY
                  </span>
                </div>

                {/* Privacy Mode Selector */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      data-testid="privacy-mode-everyday"
                      aria-pressed={settings.privacyMode === 'everyday'}
                      onClick={() => handleSetPrivacyMode('everyday')}
                      style={{
                        borderColor:
                          settings.privacyMode === 'everyday'
                            ? 'var(--cf-emerald)'
                            : 'var(--cf-border-strong)',
                        backgroundColor:
                          settings.privacyMode === 'everyday'
                            ? 'var(--cf-emerald-soft)'
                            : 'var(--cf-input-bg)',
                        color:
                          settings.privacyMode === 'everyday'
                            ? 'var(--cf-emerald-text)'
                            : 'var(--cf-text-secondary)',
                      }}
                      className="inline-flex items-center gap-2 border rounded-md px-4 py-2 text-xs sm:text-sm font-medium cursor-pointer transition-colors"
                    >
                      {settings.privacyMode === 'everyday' && (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Everyday</span>
                    </button>

                    <button
                      type="button"
                      data-testid="privacy-mode-strict"
                      aria-pressed={settings.privacyMode === 'strict'}
                      onClick={() => handleSetPrivacyMode('strict')}
                      style={{
                        borderColor:
                          settings.privacyMode === 'strict'
                            ? 'var(--cf-emerald)'
                            : 'var(--cf-border-strong)',
                        backgroundColor:
                          settings.privacyMode === 'strict'
                            ? 'var(--cf-emerald-soft)'
                            : 'var(--cf-input-bg)',
                        color:
                          settings.privacyMode === 'strict'
                            ? 'var(--cf-emerald-text)'
                            : 'var(--cf-text-secondary)',
                      }}
                      className="inline-flex items-center gap-2 border rounded-md px-4 py-2 text-xs sm:text-sm font-medium cursor-pointer transition-colors"
                    >
                      {settings.privacyMode === 'strict' && (
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Extra careful</span>
                    </button>
                  </div>
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="text-xs"
                  >
                    {settings.privacyMode === 'strict'
                      ? 'Adds your Custom Privacy Rules on top of automatic protection.'
                      : 'Hides standard private details automatically.'}
                  </p>
                </div>

                {/* Extra Careful Mode: Reveal Custom Privacy Rules Section Directly Below Mode Buttons */}
                {settings.privacyMode === 'strict' && (
                  <div
                    data-testid="custom-privacy-rules-section"
                    style={{
                      backgroundColor: 'var(--cf-input-bg)',
                      borderColor: 'var(--cf-border-strong)',
                    }}
                    className="border rounded-md p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <h3
                          style={{ color: 'var(--cf-text)' }}
                          className="text-sm font-semibold"
                        >
                          Custom Privacy Rules
                        </h3>
                        <span
                          data-testid="settings-custom-rules-count"
                          style={{
                            backgroundColor: 'var(--cf-surface-raised)',
                            borderColor: 'var(--cf-border-strong)',
                            color: 'var(--cf-text-muted)',
                          }}
                          className="border rounded px-2 py-0.5 font-mono text-[11px] tabular-nums"
                        >
                          {activeCustomRulesCount} active
                        </span>
                      </div>

                      <button
                        type="button"
                        data-testid="settings-add-rule-btn"
                        onClick={() => setAddingRule((prev) => !prev)}
                        style={{
                          backgroundColor: 'var(--cf-surface-raised)',
                          borderColor: 'var(--cf-border-strong)',
                          color: 'var(--cf-text)',
                        }}
                        className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-emerald-500/70"
                      >
                        <span
                          style={{ color: 'var(--cf-emerald-text)' }}
                          aria-hidden="true"
                          className="font-bold leading-none"
                        >
                          +
                        </span>
                        <span>Add rule</span>
                      </button>
                    </div>

                    {addingRule && (
                      <form
                        onSubmit={handleAddRuleSubmit}
                        style={{
                          backgroundColor: 'var(--cf-surface)',
                          borderColor: 'var(--cf-emerald-border)',
                        }}
                        className="border rounded-md p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                      >
                        <input
                          ref={newRuleInputRef}
                          type="text"
                          data-testid="new-rule-pattern-input"
                          value={newRulePattern}
                          onChange={(e) => setNewRulePattern(e.target.value)}
                          placeholder="Word or prefix (e.g. Project Falcon or CF-*)"
                          style={{
                            backgroundColor: 'var(--cf-input-bg)',
                            borderColor: 'var(--cf-border-strong)',
                            color: 'var(--cf-text)',
                          }}
                          className="flex-1 rounded border px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          value={newRuleDesc}
                          onChange={(e) => setNewRuleDesc(e.target.value)}
                          placeholder="Note (optional)"
                          style={{
                            backgroundColor: 'var(--cf-input-bg)',
                            borderColor: 'var(--cf-border-strong)',
                            color: 'var(--cf-text)',
                          }}
                          className="sm:w-44 rounded border px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            data-testid="confirm-add-rule-btn"
                            style={{
                              backgroundColor: 'var(--cf-primary-bg)',
                              color: 'var(--cf-primary-text)',
                            }}
                            className="rounded px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Save Rule
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddingRule(false)}
                            style={{ color: 'var(--cf-text-muted)' }}
                            className="p-1.5 cursor-pointer hover:opacity-80"
                            aria-label="Cancel adding rule"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    )}

                    {settings.customRules.length === 0 ? (
                      <p
                        style={{
                          backgroundColor: 'var(--cf-surface)',
                          borderColor: 'var(--cf-border)',
                          color: 'var(--cf-text-muted)',
                        }}
                        className="border rounded-md px-4 py-3 text-xs"
                      >
                        No custom rules yet. Click + Add rule to hide specific
                        words or prefixes.
                      </p>
                    ) : (
                      <div
                        style={{ borderColor: 'var(--cf-border)' }}
                        className="border rounded-md divide-y"
                      >
                        {settings.customRules.map((rule) => (
                          <div
                            key={rule.id}
                            data-testid={`custom-rule-row-${rule.id}`}
                            style={{
                              backgroundColor: 'var(--cf-surface)',
                              borderColor: 'var(--cf-border)',
                            }}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p
                                style={{ color: 'var(--cf-text)' }}
                                className="text-sm font-medium truncate"
                              >
                                {rule.label}
                              </p>
                              <p
                                style={{ color: 'var(--cf-text-muted)' }}
                                className="text-xs mt-0.5"
                              >
                                {rule.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <ToggleSwitch
                                checked={rule.enabled}
                                onToggle={() => handleToggleRule(rule.id)}
                                label={`Toggle ${rule.label}`}
                              />
                              <button
                                type="button"
                                data-testid={`delete-rule-${rule.id}`}
                                onClick={() => handleDeleteRule(rule.id)}
                                aria-label={`Delete rule ${rule.label}`}
                                title="Delete rule"
                                style={{
                                  borderColor: 'var(--cf-border-strong)',
                                  color: 'var(--cf-text-muted)',
                                  backgroundColor: 'var(--cf-input-bg)',
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded border hover:border-rose-500/60 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3 Main Privacy Toggles */}
                <div
                  style={{ borderColor: 'var(--cf-border)' }}
                  className="divide-y border rounded-md"
                >
                  <div
                    style={{
                      backgroundColor: 'var(--cf-input-bg)',
                      borderColor: 'var(--cf-border)',
                    }}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p
                        style={{ color: 'var(--cf-text)' }}
                        className="text-sm font-medium"
                      >
                        Hide private details
                      </p>
                      <p
                        style={{ color: 'var(--cf-text-muted)' }}
                        className="text-xs mt-0.5"
                      >
                        Names, emails, passwords, and payment details.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={settings.hidePrivateDetails}
                      onToggle={() =>
                        commit({
                          hidePrivateDetails: !settings.hidePrivateDetails,
                        })
                      }
                      label="Hide private details"
                      testId="toggle-hide-private-details"
                    />
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--cf-input-bg)',
                      borderColor: 'var(--cf-border)',
                    }}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p
                        style={{ color: 'var(--cf-text)' }}
                        className="text-sm font-medium"
                      >
                        Review before sending
                      </p>
                      <p
                        style={{ color: 'var(--cf-text-muted)' }}
                        className="text-xs mt-0.5"
                      >
                        Check exactly what Cloud AI will see.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={settings.reviewBeforeSending}
                      onToggle={() =>
                        commit({
                          reviewBeforeSending: !settings.reviewBeforeSending,
                        })
                      }
                      label="Review before sending"
                      testId="toggle-review-before-sending"
                    />
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--cf-input-bg)',
                      borderColor: 'var(--cf-border)',
                    }}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div>
                      <p
                        style={{ color: 'var(--cf-text)' }}
                        className="text-sm font-medium"
                      >
                        Restore details in answers
                      </p>
                      <p
                        style={{ color: 'var(--cf-text-muted)' }}
                        className="text-xs mt-0.5"
                      >
                        Bring your original details back on this device.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={settings.restoreDetailsInAnswers}
                      onToggle={() =>
                        commit({
                          restoreDetailsInAnswers:
                            !settings.restoreDetailsInAnswers,
                        })
                      }
                      label="Restore details in answers"
                      testId="toggle-restore-details"
                    />
                  </div>
                </div>

                {/* Bottom Bar inside Privacy Panel */}
                <div
                  style={{ borderColor: 'var(--cf-border)' }}
                  className="pt-4 border-t flex flex-wrap items-center justify-between gap-3"
                >
                  <span
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Saved automatically on this device.</span>
                  </span>

                  <button
                    type="button"
                    data-testid="reset-defaults-btn"
                    onClick={handleResetDefaults}
                    style={{
                      backgroundColor: 'var(--cf-surface-raised)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text)',
                    }}
                    className="inline-flex items-center gap-1.5 border rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer hover:border-emerald-500/70"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset to defaults</span>
                  </button>
                </div>
              </div>

              {/* Separate Bottom Card: Clear this session */}
              <div
                style={{
                  backgroundColor: 'var(--cf-surface)',
                  borderColor: 'var(--cf-border)',
                }}
                className="relative border rounded-md p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4"
              >
                <CornerCrosshairs />
                <div>
                  <h3
                    style={{ color: 'var(--cf-text)' }}
                    className="text-sm font-semibold"
                  >
                    Clear this session
                  </h3>
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="text-xs mt-0.5"
                  >
                    Remove the text and hidden details saved for this session.
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="clear-session-btn"
                  onClick={() => setShowClearModal(true)}
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: sessionCleared
                      ? 'var(--cf-emerald-border)'
                      : 'var(--cf-border-strong)',
                    color: sessionCleared
                      ? 'var(--cf-emerald-text)'
                      : 'var(--cf-text)',
                  }}
                  className="inline-flex items-center gap-1.5 border rounded-md px-4 py-2 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 hover:border-rose-500/60"
                >
                  {sessionCleared ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Session cleared</span>
                    </>
                  ) : (
                    <span>Clear session</span>
                  )}
                </button>
              </div>
            </>
          )}

          {/* TAB 2: CLOUD AI */}
          {activeTab === 'cloud' && (
            <div
              style={{
                backgroundColor: 'var(--cf-surface)',
                borderColor: 'var(--cf-border)',
              }}
              className="relative border rounded-md p-6 sm:p-7 space-y-6"
            >
              <CornerCrosshairs />
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b"
              >
                <div>
                  <h2
                    style={{ color: 'var(--cf-text)' }}
                    className="font-display text-xl font-bold"
                  >
                    Cloud AI
                  </h2>
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="mt-1 text-sm"
                  >
                    Control how Cloud AI helps you.
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-emerald-text)',
                  }}
                  className="border rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                >
                  0 SECRETS SENT
                </span>
              </div>

              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="border rounded-md divide-y"
              >
                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p
                      style={{ color: 'var(--cf-text)' }}
                      className="text-sm font-medium"
                    >
                      Offline Mode
                    </p>
                    <p
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="text-xs mt-0.5"
                    >
                      Pauses Cloud AI and runs 100% on your laptop
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.defaultAirGapMode}
                    onToggle={() =>
                      commit({ defaultAirGapMode: !settings.defaultAirGapMode })
                    }
                    label="Offline Mode"
                    testId="toggle-offline-mode"
                  />
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p
                      style={{ color: 'var(--cf-text)' }}
                      className="text-sm font-medium"
                    >
                      Use Fake Names
                    </p>
                    <p
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="text-xs mt-0.5"
                    >
                      Replaces real names with realistic stand-in names for
                      natural replies.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.defaultFakeNames}
                    onToggle={() =>
                      commit({ defaultFakeNames: !settings.defaultFakeNames })
                    }
                    label="Use Fake Names"
                    testId="toggle-fake-names"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="settings-default-instruction"
                  style={{ color: 'var(--cf-text)' }}
                  className="block text-sm font-medium"
                >
                  Default AI Rule
                </label>
                <textarea
                  id="settings-default-instruction"
                  data-testid="settings-default-instruction-input"
                  rows={3}
                  value={settings.defaultInstruction}
                  onChange={(e) =>
                    commit({ defaultInstruction: e.target.value })
                  }
                  placeholder="e.g. Keep replies concise, bulleted, and easy to skim"
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text)',
                  }}
                  className="w-full rounded-md border px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 resize-y"
                />
                <p
                  style={{ color: 'var(--cf-text-muted)' }}
                  className="text-xs"
                >
                  Automatically appended to your prompts in Production.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div
              style={{
                backgroundColor: 'var(--cf-surface)',
                borderColor: 'var(--cf-border)',
              }}
              className="relative border rounded-md p-6 sm:p-7 space-y-6"
            >
              <CornerCrosshairs />
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b"
              >
                <div>
                  <h2
                    style={{ color: 'var(--cf-text)' }}
                    className="font-display text-xl font-bold"
                  >
                    Workspace
                  </h2>
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="mt-1 text-sm"
                  >
                    Manage visible words, uploads, and answer display.
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text-muted)',
                  }}
                  className="border rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                >
                  LOCAL RULES
                </span>
              </div>

              {/* Words to Keep Visible (Whitelist) */}
              <div
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                }}
                className="border rounded-md p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="settings-whitelist-input"
                    style={{ color: 'var(--cf-text)' }}
                    className="text-sm font-medium"
                  >
                    Words to Keep Visible
                  </label>
                  <span
                    style={{ color: 'var(--cf-sky-text)' }}
                    className="font-mono text-[11px] uppercase"
                  >
                    Always public
                  </span>
                </div>

                {settings.defaultWhitelist.length > 0 && (
                  <div
                    data-testid="settings-whitelist-tags"
                    className="flex flex-wrap gap-1.5"
                  >
                    {settings.defaultWhitelist.map((term) => (
                      <span
                        key={term}
                        style={{
                          borderColor: 'var(--cf-sky-border)',
                          backgroundColor: 'var(--cf-sky-soft)',
                          color: 'var(--cf-sky-text)',
                        }}
                        className="inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium"
                      >
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWhitelist(term)}
                          aria-label={`Remove ${term} from keep visible`}
                          className="cursor-pointer hover:opacity-80"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddWhitelist();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    id="settings-whitelist-input"
                    data-testid="settings-whitelist-input"
                    type="text"
                    value={whitelistDraft}
                    onChange={(e) => setWhitelistDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === ',') {
                        e.preventDefault();
                        handleAddWhitelist();
                      }
                    }}
                    placeholder="e.g. USD, Stripe"
                    style={{
                      backgroundColor: 'var(--cf-surface-solid)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text)',
                    }}
                    className="flex-1 min-w-0 rounded-md border px-3 py-2 text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    data-testid="settings-whitelist-add-btn"
                    style={{
                      backgroundColor: 'var(--cf-surface-raised)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text)',
                    }}
                    className="inline-flex items-center gap-1 border rounded-md px-3.5 py-2 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 hover:border-sky-500/70"
                  >
                    <span
                      style={{ color: 'var(--cf-sky-text)' }}
                      aria-hidden="true"
                      className="font-bold leading-none"
                    >
                      +
                    </span>
                    <span>Add</span>
                  </button>
                </form>
              </div>

              {/* 2 File & Display Toggles */}
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="border rounded-md divide-y"
              >
                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p
                      style={{ color: 'var(--cf-text)' }}
                      className="text-sm font-medium"
                    >
                      Auto-cloak uploaded files
                    </p>
                    <p
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="text-xs mt-0.5"
                    >
                      Automatically scan and hide secrets when loading .txt,
                      .csv, .json, or .env files.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.autoCloakOnUpload}
                    onToggle={() =>
                      commit({ autoCloakOnUpload: !settings.autoCloakOnUpload })
                    }
                    label="Auto-cloak uploaded files"
                    testId="toggle-auto-cloak-files"
                  />
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                  }}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p
                      style={{ color: 'var(--cf-text)' }}
                      className="text-sm font-medium"
                    >
                      Highlight restored details by default
                    </p>
                    <p
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="text-xs mt-0.5"
                    >
                      Underline restored private details inside Production
                      answers.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.highlightRestoredDefault}
                    onToggle={() =>
                      commit({
                        highlightRestoredDefault:
                          !settings.highlightRestoredDefault,
                      })
                    }
                    label="Highlight restored details by default"
                    testId="toggle-highlight-restored-default"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEVICE */}
          {activeTab === 'device' && (
            <div
              style={{
                backgroundColor: 'var(--cf-surface)',
                borderColor: 'var(--cf-border)',
              }}
              className="relative border rounded-md p-6 sm:p-7 space-y-6"
            >
              <CornerCrosshairs />
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="flex flex-wrap items-start justify-between gap-3 pb-5 border-b"
              >
                <div>
                  <h2
                    style={{ color: 'var(--cf-text)' }}
                    className="font-display text-xl font-bold"
                  >
                    Device
                  </h2>
                  <p
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="mt-1 text-sm"
                  >
                    Greeting, local laptop AI engine, and appearance theme.
                  </p>
                </div>
                <span
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text-muted)',
                  }}
                  className="border rounded px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider"
                >
                  BROWSER RAM
                </span>
              </div>

              {/* What should we call you? */}
              <div className="space-y-2">
                <label
                  htmlFor="settings-user-name"
                  style={{ color: 'var(--cf-text)' }}
                  className="block text-sm font-medium"
                >
                  What should we call you?
                </label>
                <input
                  id="settings-user-name"
                  data-testid="settings-name-input"
                  type="text"
                  value={settings.userName}
                  onChange={(e) => commit({ userName: e.target.value })}
                  placeholder="e.g. Hasan"
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text)',
                  }}
                  className="w-full rounded-md border px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p
                  style={{ color: 'var(--cf-text-muted)' }}
                  className="text-xs"
                >
                  Updates your live greeting in the top bar and Production.
                </p>
              </div>

              {/* Local Laptop AI Status + Working Test Local AI Button */}
              <div
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                }}
                className="border rounded-md p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Cpu
                      style={{ color: 'var(--cf-emerald-text)' }}
                      className="w-4 h-4 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p
                        style={{ color: 'var(--cf-text)' }}
                        className="text-sm font-medium"
                      >
                        Local Laptop AI Status
                      </p>
                      <p
                        style={{ color: 'var(--cf-text-muted)' }}
                        className="text-xs mt-0.5"
                      >
                        {deviceAiStatus.available
                          ? 'Chrome Gemini Nano is ready locally on your laptop.'
                          : `${deviceAiStatus.engine} active for instant local protection (<5ms).`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="test-local-ai-btn"
                    onClick={handleTestLocalAi}
                    disabled={testingLocalAi}
                    style={{
                      backgroundColor: 'var(--cf-surface-raised)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text)',
                    }}
                    className="inline-flex items-center gap-1.5 border rounded-md px-3.5 py-1.5 text-xs font-medium cursor-pointer hover:border-emerald-500/70 disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    {testingLocalAi && (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    <span>Test Local AI</span>
                  </button>
                </div>

                {localTestResult && (
                  <div
                    role="status"
                    data-testid="local-ai-test-result"
                    style={{
                      backgroundColor: 'var(--cf-emerald-soft)',
                      borderColor: 'var(--cf-emerald-border)',
                      color: 'var(--cf-emerald-text)',
                    }}
                    className="border rounded px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-medium"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        {localTestResult.passed
                          ? `${localTestResult.engine} verified — ${localTestResult.blockedCount} test secrets blocked in ${localTestResult.speedMs}ms`
                          : 'Local check completed with warnings.'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] uppercase">
                      0B LEAKED
                    </span>
                  </div>
                )}
              </div>

              {/* Appearance Theme Selector */}
              <div className="space-y-2.5">
                <p
                  style={{ color: 'var(--cf-text)' }}
                  className="text-sm font-medium"
                >
                  Appearance Theme
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {THEME_OPTIONS.map((option) => {
                    const isSelected = settings.theme === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        data-testid={`theme-option-${option.id}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          onPreviewTheme(option.id);
                          commit({ theme: option.id });
                        }}
                        style={{
                          backgroundColor: 'var(--cf-input-bg)',
                          borderColor: isSelected
                            ? 'var(--cf-emerald)'
                            : 'var(--cf-border-strong)',
                        }}
                        className="text-left border-2 rounded-md p-3.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <div
                          style={{
                            backgroundColor: option.bgSwatch,
                            borderColor: option.accentSwatch,
                          }}
                          className="h-10 rounded border p-2 flex flex-col justify-between mb-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              style={{ backgroundColor: option.accentSwatch }}
                              className="w-2.5 h-2.5 rounded-full"
                            />
                            <span
                              style={{ backgroundColor: option.surfaceSwatch }}
                              className="w-8 h-2 rounded-sm opacity-90"
                            />
                          </div>
                          <div
                            style={{ backgroundColor: option.textSwatch }}
                            className="w-3/4 h-1.5 rounded-sm opacity-80"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <span
                            style={{ color: 'var(--cf-text)' }}
                            className="text-xs font-semibold"
                          >
                            {option.name}
                          </span>
                          {isSelected && (
                            <Check
                              style={{ color: 'var(--cf-emerald-text)' }}
                              className="w-3.5 h-3.5 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p
                          style={{ color: 'var(--cf-text-muted)' }}
                          className="text-[11px] mt-0.5"
                        >
                          {option.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear Session Confirmation Modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setShowClearModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-session-modal-title"
            data-testid="clear-session-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--cf-surface-solid)',
              borderColor: 'var(--cf-border-strong)',
            }}
            className="relative w-full max-w-md border rounded-md p-6 space-y-4 shadow-2xl"
          >
            <CornerCrosshairs />
            <div className="flex items-start gap-3">
              <div
                style={{
                  backgroundColor: 'var(--cf-rose-soft)',
                  borderColor: 'var(--cf-rose-border)',
                  color: 'var(--cf-rose-text)',
                }}
                className="p-2 rounded-md border shrink-0"
              >
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3
                  id="clear-session-modal-title"
                  style={{ color: 'var(--cf-text)' }}
                  className="font-display text-base font-bold"
                >
                  Clear this session?
                </h3>
                <p
                  style={{ color: 'var(--cf-text-secondary)' }}
                  className="text-sm leading-relaxed"
                >
                  Are you sure? All saved text and hidden items from this
                  session will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="clear-session-cancel-btn"
                onClick={() => setShowClearModal(false)}
                style={{
                  backgroundColor: 'var(--cf-surface-raised)',
                  borderColor: 'var(--cf-border-strong)',
                  color: 'var(--cf-text)',
                }}
                className="border rounded-md px-4 py-2 text-xs font-medium cursor-pointer hover:opacity-90"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="clear-session-confirm-btn"
                onClick={handleConfirmClearSession}
                className="rounded-md bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-semibold cursor-pointer transition-colors"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
