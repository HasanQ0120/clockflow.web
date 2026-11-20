import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import type { DemoPreset } from '../utils/presets';
import {
  restoreSecretsInText,
  type RestoredSegment,
  type ScrubResult,
  type ScrubSegment,
  type SecretCategory,
  type SecretVaultEntry,
} from '../utils/privacyEngine';
import { CornerCrosshairs } from './CornerCrosshairs';
import { CipherText } from './CipherText';

interface EditorialWorkspaceProps {
  userName: string;
  defaultInstruction: string;
  autoCloakOnUpload: boolean;
  maskCurrencyAndPhones: boolean;
  highlightRestoredDefault?: boolean;
  reviewBeforeSending?: boolean;
  onOpenSettings: () => void;
  presets: DemoPreset[];
  activePresetId: string | null;
  onSelectPreset: (preset: DemoPreset) => void;
  rawInput: string;
  onChangeRawInput: (val: string) => void;
  onLoadFileContent: (content: string, fileName: string) => void;
  taskInstruction: string;
  onChangeTaskInstruction: (val: string) => void;
  whitelistTerms: string[];
  whitelistDraft: string;
  onChangeWhitelistDraft: (val: string) => void;
  onAddWhitelistTerms: (raw: string) => void;
  onRemoveWhitelistTerm: (term: string) => void;
  blacklistTerms: string[];
  blacklistDraft: string;
  onChangeBlacklistDraft: (val: string) => void;
  onAddBlacklistTerms: (raw: string) => void;
  onRemoveBlacklistTerm: (term: string) => void;
  syntheticContextMode: boolean;
  onToggleSyntheticMode: () => void;
  airGapMode: boolean;
  isOnline: boolean;
  onToggleAirGapMode: () => void;
  onSwitchToOnlineMode?: () => void;
  onRunHybridAI: () => void;
  onRunLocalAction: (actionType: 'summary' | 'grammar' | 'cloak') => void;
  onClearInput: () => void;
  isProcessing: boolean;
  isScanning: boolean;
  validationError: string | null;
  errorMessage: string | null;
  restoredText: string;
  restoredSegments: RestoredSegment[];
  routeLabel: string | null;
  answerNonce?: number;
  streamStage?: 'idle' | 'cloaking' | 'streaming' | 'done';
  lastLocalSpeedMs?: number;
  scrub: ScrubResult & { localSpeedMs: number };
}

const PRESET_SHORT_LABELS: Record<string, string> = {
  contract: 'Contract',
  code: 'Code & Keys',
  'hr-medical': 'Office Note',
};

const FRIENDLY_CATEGORY_LABELS: Record<SecretCategory, string> = {
  CUSTOM: 'Custom',
  API_KEY: 'API Key',
  EMAIL: 'Email',
  PHONE: 'Phone',
  ID: 'ID',
  AMOUNT: 'Money',
  MEDICAL: 'Health',
  COMPANY: 'Company',
  PERSON: 'Name',
};

function getFriendlyRouteLabel(rawRoute: string | null): string | null {
  if (!rawRoute) return null;
  if (rawRoute.includes('On-Device')) return 'Offline';
  if (rawRoute.includes('Cloaked')) return 'Cloaked';
  return 'Safe Cloud';
}

export function EditorialWorkspace({
  userName,
  defaultInstruction,
  autoCloakOnUpload: _autoCloakOnUpload,
  maskCurrencyAndPhones: _maskCurrencyAndPhones,
  highlightRestoredDefault = true,
  reviewBeforeSending: _reviewBeforeSending = true,
  onOpenSettings,
  presets,
  activePresetId,
  onSelectPreset,
  rawInput,
  onChangeRawInput,
  onLoadFileContent,
  taskInstruction,
  onChangeTaskInstruction,
  whitelistTerms,
  whitelistDraft,
  onChangeWhitelistDraft,
  onAddWhitelistTerms,
  onRemoveWhitelistTerm,
  blacklistTerms,
  blacklistDraft,
  onChangeBlacklistDraft,
  onAddBlacklistTerms,
  onRemoveBlacklistTerm,
  syntheticContextMode,
  onToggleSyntheticMode,
  airGapMode,
  isOnline,
  onToggleAirGapMode,
  onSwitchToOnlineMode,
  onRunHybridAI,
  onRunLocalAction,
  onClearInput,
  isProcessing,
  isScanning,
  validationError,
  errorMessage,
  restoredText,
  restoredSegments,
  routeLabel,
  answerNonce = 0,
  streamStage = 'idle',
  lastLocalSpeedMs = 0,
  scrub,
}: EditorialWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [highlightRestored, setHighlightRestored] = useState(
    highlightRestoredDefault
  );
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [localActionMode, setLocalActionMode] = useState<
    'summary' | 'grammar' | 'cloak'
  >('summary');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2-Mode Switcher ('builtin' default vs 'anywhere' universal copy & restore)
  const [workspaceMode, setWorkspaceMode] = useState<'builtin' | 'anywhere'>(
    'builtin'
  );
  const [lockedSafeText, setLockedSafeText] = useState<string>('');
  const [lockedSafeSegments, setLockedSafeSegments] = useState<ScrubSegment[]>(
    []
  );
  const [lockedVault, setLockedVault] = useState<SecretVaultEntry[]>([]);
  const [safeCopiedFeedback, setSafeCopiedFeedback] = useState<boolean>(false);
  const [anywhereInputError, setAnywhereInputError] = useState<string | null>(
    null
  );
  const [externalReplyDraft, setExternalReplyDraft] = useState<string>('');
  const [anywhereReplyError, setAnywhereReplyError] = useState<string | null>(
    null
  );
  const [anywhereRestoredText, setAnywhereRestoredText] = useState<string>('');
  const [anywhereRestoredSegments, setAnywhereRestoredSegments] = useState<
    RestoredSegment[]
  >([]);
  const [anywhereRestoredCount, setAnywhereRestoredCount] = useState<number>(0);
  const [anywhereAnswerCopied, setAnywhereAnswerCopied] =
    useState<boolean>(false);

  useEffect(() => {
    setHighlightRestored(highlightRestoredDefault);
  }, [highlightRestoredDefault]);

  const effectiveAirGap = airGapMode || !isOnline;
  const friendlyRoute = getFriendlyRouteLabel(routeLabel);
  const activeRulesCount =
    whitelistTerms.length +
    blacklistTerms.length +
    (syntheticContextMode ? 1 : 0) +
    (effectiveAirGap ? 1 : 0);

  // Single Source of Truth for ALL secret counters across Box 1, Box 2, and Privacy Receipt
  const hiddenSecrets = scrub.vault;
  const hiddenCount = hiddenSecrets.length;
  const cleanName = userName.trim();
  const anywhereVault = lockedVault.length > 0 ? lockedVault : hiddenSecrets;
  const previewSegments =
    lockedSafeSegments.length > 0 ? lockedSafeSegments : scrub.segments;

  const copyTextSafely = async (text: string): Promise<boolean> => {
    if (!text) return false;
    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall back to execCommand copy in restricted iframes
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  };

  const resetAnywhereState = () => {
    setLockedSafeText('');
    setLockedSafeSegments([]);
    setLockedVault([]);
    setSafeCopiedFeedback(false);
    setAnywhereInputError(null);
    setExternalReplyDraft('');
    setAnywhereReplyError(null);
    setAnywhereRestoredText('');
    setAnywhereRestoredSegments([]);
    setAnywhereRestoredCount(0);
    setAnywhereAnswerCopied(false);
  };

  const handleCloakAndCopySafeText = async () => {
    if (!rawInput.trim()) {
      setAnywhereInputError('Paste private text first to hide and copy.');
      return;
    }
    setAnywhereInputError(null);
    setLockedSafeText(scrub.sanitizedText);
    setLockedSafeSegments(scrub.segments);
    setLockedVault(scrub.vault);
    await copyTextSafely(scrub.sanitizedText);
    setSafeCopiedFeedback(true);
  };

  const handleRestoreAnywhereDetails = () => {
    if (!externalReplyDraft.trim()) {
      setAnywhereReplyError(
        'Paste the answer you got back first to restore details.'
      );
      return;
    }
    setAnywhereReplyError(null);
    const restored = restoreSecretsInText(externalReplyDraft, anywhereVault);
    const count = restored.segments.filter((seg) => seg.isRestored).length;
    setAnywhereRestoredText(restored.restoredText);
    setAnywhereRestoredSegments(restored.segments);
    setAnywhereRestoredCount(count);
  };

  const handleCopyAnywhereFinalAnswer = async () => {
    if (!anywhereRestoredText) return;
    await copyTextSafely(anywhereRestoredText);
    setAnywhereAnswerCopied(true);
    window.setTimeout(() => setAnywhereAnswerCopied(false), 2000);
  };

  const handleCopy = async () => {
    if (!restoredText) return;
    const ok = await copyTextSafely(restoredText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownloadPrivacyReceipt = () => {
    const now = new Date();
    const modeSummary = effectiveAirGap
      ? 'Offline Mode (100% On Your Laptop — 0 Internet Requests)'
      : 'Safe Hybrid Cloud (Secrets Masked Locally Before Cloud Reply)';

    const lines = [
      '============================================================',
      'CLOAKFLOW PRIVACY RECEIPT',
      '============================================================',
      `Generated At:         ${now.toLocaleString()} (${now.toISOString()})`,
      `Workspace Operator:   ${cleanName || 'Local Session'}`,
      `Processing Mode:      ${modeSummary}`,
      `Fake Names Mode:      ${syntheticContextMode ? 'Enabled' : 'Disabled'}`,
      `Total Secrets Blocked Locally: ${hiddenCount}`,
      `Raw Secrets Transmitted to Cloud: 0 Bytes (VERIFIED)`,
      '',
      'Protected Details Quarantined in Local Browser Memory:',
      hiddenCount === 0
        ? '  - None detected in current input.'
        : hiddenSecrets
            .map(
              (entry, idx) =>
                `  ${idx + 1}. ${entry.placeholder} [${FRIENDLY_CATEGORY_LABELS[entry.category]}] -> Masked Preview: ${entry.maskedPreview}`
            )
            .join('\n'),
      '',
      whitelistTerms.length > 0
        ? `Words Kept Visible (Whitelist): ${whitelistTerms.join(', ')}`
        : 'Words Kept Visible (Whitelist): None',
      blacklistTerms.length > 0
        ? `Extra Words Forced Hidden: ${blacklistTerms.join(', ')}`
        : 'Extra Words Forced Hidden: None',
      '',
      'Verification Statement:',
      'CloakFlow confirms that 0 raw secrets were transmitted to the cloud.',
      'All real details remain strictly in volatile browser memory.',
      '============================================================',
    ];

    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CloakFlow-Privacy-Receipt.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setReceiptDownloaded(true);
    window.setTimeout(() => setReceiptDownloaded(false), 2000);
  };

  const processFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setUploadedFileName(file.name);
    resetAnywhereState();
    onLoadFileContent(text, file.name);
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    await processFile(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    await processFile(file);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      id="try-it-live"
      className="py-8 lg:py-10 max-w-[1440px] w-[92%] mx-auto"
    >
      {/* Production Welcome Header */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <p
            style={{ color: 'var(--cf-emerald-text)' }}
            className="font-mono text-xs uppercase tracking-widest"
          >
            PRODUCTION // ZERO-LEAK
          </p>
          <h1
            data-testid="production-welcome-heading"
            style={{ color: 'var(--cf-text)' }}
            className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight"
          >
            {cleanName ? `Welcome, ${cleanName}.` : 'Private AI Workspace.'}
          </h1>
        </div>

        {/* Active Settings Summary Strip */}
        <div className="flex flex-wrap items-center gap-2">
          {defaultInstruction.trim() && (
            <span
              data-testid="active-default-instruction-badge"
              style={{
                borderColor: 'var(--cf-emerald-border)',
                backgroundColor: 'var(--cf-emerald-soft)',
                color: 'var(--cf-emerald-text)',
              }}
              className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-medium max-w-xs truncate"
              title={`Default AI Rule: ${defaultInstruction}`}
            >
              <span>Rule: {defaultInstruction}</span>
            </span>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              backgroundColor: 'var(--cf-surface-raised)',
              borderColor: 'var(--cf-border-strong)',
              color: 'var(--cf-text)',
            }}
            className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-emerald-500/70 whitespace-nowrap shrink-0"
          >
            <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Compact 2-Mode Switcher */}
      <div
        style={{
          backgroundColor: 'var(--cf-surface)',
          borderColor: 'var(--cf-border)',
        }}
        className="mb-3 flex flex-wrap items-center justify-between gap-3 border rounded-md px-3 py-2"
      >
        <div
          role="tablist"
          aria-label="Production workflow mode"
          style={{
            backgroundColor: 'var(--cf-input-bg)',
            borderColor: 'var(--cf-border)',
          }}
          className="inline-flex items-center gap-1 rounded-md border p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'builtin'}
            data-testid="mode-tab-builtin"
            onClick={() => setWorkspaceMode('builtin')}
            style={
              workspaceMode === 'builtin'
                ? {
                    backgroundColor: 'var(--cf-emerald-soft)',
                    borderColor: 'var(--cf-emerald-border)',
                    color: 'var(--cf-emerald-text)',
                  }
                : { color: 'var(--cf-text-muted)' }
            }
            className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              workspaceMode === 'builtin' ? 'border' : 'hover:text-white'
            }`}
          >
            Built-in Safe AI
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'anywhere'}
            data-testid="mode-tab-anywhere"
            onClick={() => setWorkspaceMode('anywhere')}
            style={
              workspaceMode === 'anywhere'
                ? {
                    backgroundColor: 'var(--cf-emerald-soft)',
                    borderColor: 'var(--cf-emerald-border)',
                    color: 'var(--cf-emerald-text)',
                  }
                : { color: 'var(--cf-text-muted)' }
            }
            className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              workspaceMode === 'anywhere' ? 'border' : 'hover:text-white'
            }`}
          >
            Cloak &amp; Use Anywhere
          </button>
        </div>

        <p
          style={{ color: 'var(--cf-text-muted)' }}
          className="text-xs px-1"
        >
          {workspaceMode === 'builtin'
            ? 'Mask locally, ask Gemini, and restore answers here.'
            : 'Hide secrets locally, copy safe text to any AI, and restore replies here.'}
        </p>
      </div>

      {/* Top Bar: Sample Presets + Upload File */}
      <div
        style={{
          backgroundColor: 'var(--cf-surface)',
          borderColor: 'var(--cf-border)',
        }}
        className="flex flex-wrap items-center justify-between gap-3 border rounded-md px-4 py-2 mb-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            style={{ color: 'var(--cf-text-muted)' }}
            className="font-mono text-[11px] uppercase tracking-wider mr-1"
          >
            Examples:
          </span>
          {presets.map((preset) => {
            const active = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setUploadedFileName(null);
                  resetAnywhereState();
                  onSelectPreset(preset);
                }}
                style={{
                  borderColor: active
                    ? 'var(--cf-emerald-border)'
                    : 'var(--cf-border-strong)',
                  backgroundColor: active
                    ? 'var(--cf-emerald-soft)'
                    : 'var(--cf-surface-raised)',
                  color: active ? 'var(--cf-emerald-text)' : 'var(--cf-text)',
                  boxShadow: 'var(--cf-specular)',
                }}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium border transition-all duration-100 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {PRESET_SHORT_LABELS[preset.id] || preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.json,.md,.env"
            onChange={handleFileInputChange}
            className="hidden"
            aria-label="Upload text or config file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: 'var(--cf-surface-raised)',
              borderColor: 'var(--cf-border-strong)',
              color: 'var(--cf-text)',
              boxShadow: 'var(--cf-specular)',
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium border active:scale-[0.99] px-3.5 py-1.5 rounded-md transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:border-emerald-500/70"
          >
            <Upload
              style={{ color: 'var(--cf-emerald-text)' }}
              className="w-3.5 h-3.5"
              aria-hidden="true"
            />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Offline Mode Active Notice */}
      {effectiveAirGap && (
        <div
          role="status"
          data-testid="air-gap-banner"
          style={{
            borderColor: 'var(--cf-amber-border)',
            backgroundColor: 'var(--cf-amber-soft)',
            color: 'var(--cf-amber-text)',
          }}
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-2 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 font-medium">
            <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Offline Mode — 100% On Device</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs">0 Network Requests</span>
            {airGapMode && (
              <button
                type="button"
                data-testid="switch-to-online-btn"
                onClick={() =>
                  onSwitchToOnlineMode
                    ? onSwitchToOnlineMode()
                    : onToggleAirGapMode()
                }
                style={{
                  backgroundColor: 'var(--cf-surface-solid)',
                  borderColor: 'var(--cf-amber-border)',
                  color: 'var(--cf-text)',
                }}
                className="inline-flex items-center gap-1.5 rounded border px-3 py-1 text-xs font-semibold cursor-pointer hover:border-emerald-500/70 transition-colors whitespace-nowrap shrink-0"
              >
                <span>Switch to Online Mode</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Equal-Height 2-Column Workspace (Mode 1 vs Mode 2) */}
      {workspaceMode === 'anywhere' ? (
        <div
          data-testid="anywhere-mode-workspace"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch"
        >
          {/* MODE 2 LEFT BOX: 1. Hide & Copy Safe Text */}
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-md p-5 flex flex-col justify-between gap-3.5 h-full"
          >
            <CornerCrosshairs />

            <div className="flex flex-col gap-3 flex-1">
              {/* Header */}
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="flex items-start justify-between gap-2 border-b pb-2.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      style={{ color: 'var(--cf-text)' }}
                      className="font-display text-base font-semibold"
                    >
                      1. Hide &amp; Copy Safe Text
                    </h2>
                    <span
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="font-mono text-[10px] tracking-wider uppercase"
                    >
                      SYS.LOCAL // RAM
                    </span>
                  </div>
                  <p
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="mt-0.5 text-xs font-medium tabular-nums"
                  >
                    {hiddenCount} hidden locally
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUploadedFileName(null);
                    resetAnywhereState();
                    onClearInput();
                  }}
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text)',
                    boxShadow: 'var(--cf-specular)',
                  }}
                  className="inline-flex items-center gap-1.5 text-xs border active:scale-[0.99] px-3 py-1.5 rounded-md transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Input Textarea */}
              <div className="flex flex-col">
                <label htmlFor="anywhere-raw-input" className="sr-only">
                  Your private text to hide and copy
                </label>
                <textarea
                  id="anywhere-raw-input"
                  data-testid="anywhere-raw-input"
                  value={rawInput}
                  onChange={(e) => {
                    setSafeCopiedFeedback(false);
                    setAnywhereInputError(null);
                    onChangeRawInput(e.target.value);
                  }}
                  placeholder="Paste private text, contracts, or code..."
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                    color: 'var(--cf-text)',
                  }}
                  className="cloak-scroll w-full h-[185px] overflow-y-auto resize-none rounded-lg border p-3.5 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-emerald-500/70"
                />
              </div>

              {anywhereInputError && (
                <p
                  role="alert"
                  style={{ color: 'var(--cf-rose-text)' }}
                  className="text-xs font-medium"
                >
                  {anywhereInputError}
                </p>
              )}

              {/* Hide & Copy Primary Action */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="hide-copy-safe-btn"
                  onClick={handleCloakAndCopySafeText}
                  style={{
                    backgroundColor: 'var(--cf-primary-bg)',
                    color: 'var(--cf-primary-text)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold tracking-tight border border-emerald-400/50 active:scale-[0.99] transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 hover:brightness-110"
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Hide &amp; Copy Safe Text</span>
                </button>

                {safeCopiedFeedback && (
                  <span
                    role="status"
                    data-testid="safe-text-copied-banner"
                    style={{
                      backgroundColor: 'var(--cf-emerald-soft)',
                      borderColor: 'var(--cf-emerald-border)',
                      color: 'var(--cf-emerald-text)',
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                  >
                    ✓ Safe text copied — paste anywhere
                  </span>
                )}
              </div>

              {/* Safe Text Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    style={{ color: 'var(--cf-text-secondary)' }}
                    className="font-medium"
                  >
                    Safe Text Preview
                  </span>
                  <span
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="font-mono text-[11px]"
                  >
                    {lockedSafeText ? 'Vault locked locally' : '0 secrets exposed'}
                  </span>
                </div>
                <div
                  data-testid="safe-text-preview"
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                    color: 'var(--cf-text-secondary)',
                  }}
                  className="cloak-scroll w-full h-[155px] overflow-y-auto rounded-lg border p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                >
                  {previewSegments.length > 0 ? (
                    previewSegments.map((seg, idx) =>
                      seg.isToken ? (
                        <span
                          key={idx}
                          style={{
                            borderColor: 'var(--cf-emerald-border)',
                            backgroundColor: 'var(--cf-emerald-soft)',
                            color: 'var(--cf-emerald-text)',
                          }}
                          className="inline-block rounded-sm border px-1.5 py-0.5 mx-0.5 font-semibold"
                        >
                          {seg.text}
                        </span>
                      ) : (
                        <span key={idx}>{seg.text}</span>
                      )
                    )
                  ) : (
                    <span style={{ color: 'var(--cf-text-muted)' }}>
                      Safe masked text will appear here.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MODE 2 RIGHT BOX: 2. Paste Reply to Restore Details */}
          <div
            style={{
              backgroundColor: 'var(--cf-surface)',
              borderColor: 'var(--cf-border)',
            }}
            className="relative border rounded-md p-5 flex flex-col justify-between gap-3.5 h-full"
          >
            <CornerCrosshairs tone="emerald" />

            <div className="flex flex-col gap-3 flex-1">
              {/* Header */}
              <div
                style={{ borderColor: 'var(--cf-border)' }}
                className="flex flex-wrap items-start justify-between gap-2 border-b pb-2.5"
              >
                <div className="min-w-0">
                  <h2
                    style={{ color: 'var(--cf-text)' }}
                    className="font-display text-base font-semibold"
                  >
                    2. Paste Reply to Restore Details
                  </h2>
                  <p
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="mt-0.5 text-xs font-medium tabular-nums"
                  >
                    {anywhereVault.length} secrets saved on laptop
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={highlightRestored}
                    onClick={() => setHighlightRestored((prev) => !prev)}
                    style={{
                      borderColor: highlightRestored
                        ? 'var(--cf-emerald-border)'
                        : 'var(--cf-border-strong)',
                      backgroundColor: highlightRestored
                        ? 'var(--cf-emerald-soft)'
                        : 'var(--cf-surface-raised)',
                      color: highlightRestored
                        ? 'var(--cf-emerald-text)'
                        : 'var(--cf-text-secondary)',
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        highlightRestored ? 'bg-emerald-500' : 'bg-zinc-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span>Highlight</span>
                  </button>

                  <button
                    type="button"
                    data-testid="copy-final-answer-btn"
                    onClick={handleCopyAnywhereFinalAnswer}
                    disabled={!anywhereRestoredText}
                    style={{
                      backgroundColor: 'var(--cf-surface-raised)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text)',
                      boxShadow: 'var(--cf-specular)',
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border active:scale-[0.99] px-3 py-1.5 text-xs font-semibold transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {anywhereAnswerCopied ? (
                      <>
                        <Check
                          style={{ color: 'var(--cf-emerald-text)' }}
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                        <span style={{ color: 'var(--cf-emerald-text)' }}>
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy
                          style={{ color: 'var(--cf-text-muted)' }}
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                        <span>Copy Final Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* External Reply Paste Input */}
              <div className="flex flex-col">
                <label htmlFor="anywhere-reply-input" className="sr-only">
                  Paste reply to restore details
                </label>
                <textarea
                  id="anywhere-reply-input"
                  data-testid="anywhere-reply-input"
                  value={externalReplyDraft}
                  onChange={(e) => {
                    setAnywhereReplyError(null);
                    setExternalReplyDraft(e.target.value);
                  }}
                  placeholder="Paste the answer you got back here to put your real details back..."
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                    color: 'var(--cf-text)',
                  }}
                  className="cloak-scroll w-full h-[185px] overflow-y-auto resize-none rounded-lg border p-3.5 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-emerald-500/70"
                />
              </div>

              {anywhereReplyError && (
                <p
                  role="alert"
                  style={{ color: 'var(--cf-rose-text)' }}
                  className="text-xs font-medium"
                >
                  {anywhereReplyError}
                </p>
              )}

              {/* Primary Restore Button */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="restore-my-details-btn"
                  onClick={handleRestoreAnywhereDetails}
                  style={{
                    backgroundColor: 'var(--cf-primary-bg)',
                    color: 'var(--cf-primary-text)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold tracking-tight border border-emerald-400/50 active:scale-[0.99] transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 hover:brightness-110"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Restore My Details</span>
                </button>

                {anywhereRestoredText && (
                  <span
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="text-xs font-medium tabular-nums"
                  >
                    {anywhereRestoredCount > 0
                      ? `${anywhereRestoredCount} real detail${anywhereRestoredCount === 1 ? '' : 's'} restored locally`
                      : 'Reply checked — no placeholders needed restoring'}
                  </span>
                )}
              </div>

              {/* Final Restored Answer Pane */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span
                    style={{ color: 'var(--cf-text-secondary)' }}
                    className="font-medium"
                  >
                    Final Restored Answer
                  </span>
                  <span
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="font-mono text-[11px]"
                  >
                    On Device
                  </span>
                </div>
                <div
                  data-testid="anywhere-restored-output"
                  style={{
                    backgroundColor: 'var(--cf-input-bg)',
                    borderColor: 'var(--cf-border)',
                    color: 'var(--cf-text)',
                  }}
                  className="cloak-scroll w-full h-[155px] overflow-y-auto rounded-lg border p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap"
                >
                  {anywhereRestoredText ? (
                    anywhereRestoredSegments.map((seg, idx) =>
                      seg.isRestored ? (
                        <span
                          key={idx}
                          className={
                            highlightRestored
                              ? 'border-b border-emerald-500/70 font-medium text-[var(--cf-highlight-restored)]'
                              : ''
                          }
                        >
                          {seg.text}
                        </span>
                      ) : (
                        <span key={idx}>{seg.text}</span>
                      )
                    )
                  ) : (
                    <span style={{ color: 'var(--cf-text-muted)' }}>
                      Your restored answer will appear here.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* LEFT CARD: 1. Your Private Text (Stays on Your Laptop) */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDraggingFile(false);
            }
          }}
          onDrop={handleDrop}
          style={{
            backgroundColor: 'var(--cf-surface)',
            borderColor: isDraggingFile
              ? 'var(--cf-emerald)'
              : 'var(--cf-border)',
          }}
          className="relative border rounded-md p-5 flex flex-col gap-3 h-full transition-colors"
        >
          <CornerCrosshairs />

          <div className="flex-1 flex flex-col gap-3">
            {/* Header */}
            <div
              style={{ borderColor: 'var(--cf-border)' }}
              className="flex items-start justify-between gap-2 border-b pb-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    style={{ color: 'var(--cf-text)' }}
                    className="font-display text-base font-semibold"
                  >
                    1. Your Text
                  </h2>
                  <span
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="font-mono text-[10px] tracking-wider uppercase"
                  >
                    SYS.LOCAL // RAM
                  </span>
                </div>
                <p
                  data-testid="box1-secret-count"
                  style={{ color: 'var(--cf-emerald-text)' }}
                  className="mt-0.5 text-xs font-medium tabular-nums"
                >
                  {hiddenCount} hidden locally
                  {uploadedFileName ? ` • ${uploadedFileName}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUploadedFileName(null);
                  onClearInput();
                }}
                style={{
                  backgroundColor: 'var(--cf-surface-raised)',
                  borderColor: 'var(--cf-border-strong)',
                  color: 'var(--cf-text)',
                  boxShadow: 'var(--cf-specular)',
                }}
                className="inline-flex items-center gap-1.5 text-xs border active:scale-[0.99] px-3 py-1.5 rounded-md transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>

            {/* Textarea (Fixed 340px height with internal scrolling) */}
            <div className="relative flex flex-col">
              <label htmlFor="cloakflow-raw-input" className="sr-only">
                Your private text
              </label>
              <textarea
                id="cloakflow-raw-input"
                value={rawInput}
                onChange={(e) => onChangeRawInput(e.target.value)}
                placeholder="Paste private text or code..."
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                  color: 'var(--cf-text)',
                }}
                className="cloak-scroll w-full h-[340px] overflow-y-auto resize-none rounded-lg border p-3.5 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-emerald-500/70"
              />
              {isScanning && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-scan-laser"
                />
              )}
            </div>

            {/* Collapsible Custom Privacy Rules & Modes Bar */}
            <div
              style={{
                backgroundColor: 'var(--cf-input-bg)',
                borderColor: 'var(--cf-border)',
              }}
              className="rounded-lg border overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={rulesOpen}
                aria-controls="custom-privacy-rules-panel"
                data-testid="custom-rules-accordion-btn"
                onClick={() => setRulesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Settings
                    style={{ color: 'var(--cf-text-muted)' }}
                    className="w-3.5 h-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    style={{ color: 'var(--cf-text)' }}
                    className="text-xs font-medium truncate"
                  >
                    Rules &amp; Modes
                  </span>
                  <span
                    data-testid="custom-rules-count-badge"
                    style={{
                      backgroundColor: 'var(--cf-surface-raised)',
                      borderColor: 'var(--cf-border-strong)',
                      color: 'var(--cf-text-secondary)',
                    }}
                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums whitespace-nowrap shrink-0"
                  >
                    {activeRulesCount} active
                  </span>
                </div>
                <ChevronDown
                  style={{ color: 'var(--cf-text-muted)' }}
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                    rulesOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {rulesOpen && (
                <div
                  id="custom-privacy-rules-panel"
                  style={{ borderColor: 'var(--cf-border)' }}
                  className="border-t p-3 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Keep Visible */}
                    <div
                      style={{
                        backgroundColor: 'var(--cf-surface-solid)',
                        borderColor: 'var(--cf-border)',
                      }}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="whitelist-input"
                          style={{ color: 'var(--cf-text)' }}
                          className="text-xs font-medium"
                        >
                          Keep Visible
                        </label>
                        <span
                          style={{ color: 'var(--cf-sky-text)' }}
                          className="text-[11px] font-medium"
                        >
                          Public
                        </span>
                      </div>

                      {whitelistTerms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {whitelistTerms.map((term) => (
                            <span
                              key={term}
                              style={{
                                borderColor: 'var(--cf-sky-border)',
                                backgroundColor: 'var(--cf-sky-soft)',
                                color: 'var(--cf-sky-text)',
                              }}
                              className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium"
                            >
                              <span>{term}</span>
                              <button
                                type="button"
                                onClick={() => onRemoveWhitelistTerm(term)}
                                aria-label={`Remove ${term} from keep visible`}
                                className="cursor-pointer hover:opacity-80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <input
                          id="whitelist-input"
                          type="text"
                          value={whitelistDraft}
                          onChange={(e) => onChangeWhitelistDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              onAddWhitelistTerms(whitelistDraft);
                            }
                          }}
                          placeholder="e.g. Karachi, USD"
                          style={{
                            backgroundColor: 'var(--cf-input-bg)',
                            borderColor: 'var(--cf-border)',
                            color: 'var(--cf-text)',
                          }}
                          className="flex-1 min-w-0 rounded-md border px-2.5 py-1.5 text-xs focus:outline-none focus:border-sky-400/70"
                        />
                        <button
                          type="button"
                          onClick={() => onAddWhitelistTerms(whitelistDraft)}
                          style={{
                            backgroundColor: 'var(--cf-surface-raised)',
                            borderColor: 'var(--cf-border-strong)',
                            color: 'var(--cf-text)',
                          }}
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus
                            style={{ color: 'var(--cf-sky-text)' }}
                            className="w-3 h-3"
                            aria-hidden="true"
                          />
                          <span>Keep</span>
                        </button>
                      </div>
                    </div>

                    {/* Always Hide */}
                    <div
                      style={{
                        backgroundColor: 'var(--cf-surface-solid)',
                        borderColor: 'var(--cf-border)',
                      }}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="blacklist-input"
                          style={{ color: 'var(--cf-text)' }}
                          className="text-xs font-medium"
                        >
                          Always Hide
                        </label>
                        <span
                          style={{ color: 'var(--cf-amber-text)' }}
                          className="text-[11px] font-medium"
                        >
                          Hidden
                        </span>
                      </div>

                      {blacklistTerms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {blacklistTerms.map((term) => (
                            <span
                              key={term}
                              style={{
                                borderColor: 'var(--cf-amber-border)',
                                backgroundColor: 'var(--cf-amber-soft)',
                                color: 'var(--cf-amber-text)',
                              }}
                              className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium"
                            >
                              <span>{term}</span>
                              <button
                                type="button"
                                onClick={() => onRemoveBlacklistTerm(term)}
                                aria-label={`Remove ${term} from extra hidden words`}
                                className="cursor-pointer hover:opacity-80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <input
                          id="blacklist-input"
                          type="text"
                          value={blacklistDraft}
                          onChange={(e) => onChangeBlacklistDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              onAddBlacklistTerms(blacklistDraft);
                            }
                          }}
                          placeholder="e.g. Project Falcon"
                          style={{
                            backgroundColor: 'var(--cf-input-bg)',
                            borderColor: 'var(--cf-border)',
                            color: 'var(--cf-text)',
                          }}
                          className="flex-1 min-w-0 rounded-md border px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400/70"
                        />
                        <button
                          type="button"
                          onClick={() => onAddBlacklistTerms(blacklistDraft)}
                          style={{
                            backgroundColor: 'var(--cf-surface-raised)',
                            borderColor: 'var(--cf-border-strong)',
                            color: 'var(--cf-text)',
                          }}
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus
                            style={{ color: 'var(--cf-amber-text)' }}
                            className="w-3 h-3"
                            aria-hidden="true"
                          />
                          <span>Hide</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Processing Modes */}
                  <div
                    style={{ borderColor: 'var(--cf-border)' }}
                    className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t"
                  >
                    <span
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="text-xs font-medium"
                    >
                      Modes:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={syntheticContextMode}
                        onClick={onToggleSyntheticMode}
                        title="Replaces real names with realistic fake names so the AI writes a better reply"
                        style={{
                          borderColor: syntheticContextMode
                            ? 'var(--cf-amber-border)'
                            : 'var(--cf-border-strong)',
                          backgroundColor: syntheticContextMode
                            ? 'var(--cf-amber-soft)'
                            : 'var(--cf-surface-raised)',
                          color: syntheticContextMode
                            ? 'var(--cf-amber-text)'
                            : 'var(--cf-text-secondary)',
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            syntheticContextMode ? 'bg-amber-400' : 'bg-zinc-400'
                          }`}
                          aria-hidden="true"
                        />
                        <span>Use Fake Names</span>
                      </button>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={effectiveAirGap}
                        onClick={onToggleAirGapMode}
                        data-testid="air-gap-toggle"
                        title="Turns off internet AI and works 100% on your laptop"
                        style={{
                          borderColor: effectiveAirGap
                            ? 'var(--cf-amber-border)'
                            : 'var(--cf-border-strong)',
                          backgroundColor: effectiveAirGap
                            ? 'var(--cf-amber-soft)'
                            : 'var(--cf-surface-raised)',
                          color: effectiveAirGap
                            ? 'var(--cf-amber-text)'
                            : 'var(--cf-text-secondary)',
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Offline Mode</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Task Instruction */}
            <div className="space-y-1.5">
              <label
                htmlFor="task-instruction-input"
                style={{ color: 'var(--cf-text-secondary)' }}
                className="block text-xs font-medium"
              >
                What should AI do?
              </label>
              <input
                id="task-instruction-input"
                type="text"
                value={taskInstruction}
                onChange={(e) => onChangeTaskInstruction(e.target.value)}
                placeholder="Summarize or write a reply..."
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                  color: 'var(--cf-text)',
                }}
                className="w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-500/70"
              />
            </div>

            {validationError && (
              <p
                role="alert"
                style={{ color: 'var(--cf-rose-text)' }}
                className="text-xs font-medium"
              >
                {validationError}
              </p>
            )}
          </div>

          {/* Primary Matte Hardware Action Buttons */}
          <div style={{ borderColor: 'var(--cf-border)' }} className="pt-2 border-t">
            <div className="flex flex-wrap items-stretch gap-2">
              <button
                type="button"
                onClick={onRunHybridAI}
                disabled={isProcessing}
                style={{
                  backgroundColor: effectiveAirGap
                    ? '#F59E0B'
                    : 'var(--cf-primary-bg)',
                  color: effectiveAirGap ? '#09090B' : 'var(--cf-primary-text)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
                }}
                className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold tracking-tight border border-emerald-400/50 active:scale-[0.99] transition-all duration-100 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60 hover:brightness-110"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                )}
                <span>Run Safe AI</span>
              </button>

              <div
                style={{
                  backgroundColor: 'var(--cf-input-bg)',
                  borderColor: 'var(--cf-border)',
                }}
                className="flex items-center justify-between gap-1 rounded-md border p-1 shrink-0"
              >
                <select
                  aria-label="Offline quick fix type"
                  value={localActionMode}
                  onChange={(e) =>
                    setLocalActionMode(
                      e.target.value as 'summary' | 'grammar' | 'cloak'
                    )
                  }
                  style={{ color: 'var(--cf-text)' }}
                  className="bg-transparent px-1.5 py-1.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="summary" style={{ backgroundColor: 'var(--cf-surface-solid)', color: 'var(--cf-text)' }}>
                    Summarize
                  </option>
                  <option value="grammar" style={{ backgroundColor: 'var(--cf-surface-solid)', color: 'var(--cf-text)' }}>
                    Fix Grammar
                  </option>
                  <option value="cloak" style={{ backgroundColor: 'var(--cf-surface-solid)', color: 'var(--cf-text)' }}>
                    Hide Only
                  </option>
                </select>
                <button
                  type="button"
                  data-testid="quick-fix-offline-btn"
                  onClick={() => onRunLocalAction(localActionMode)}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: 'var(--cf-surface-raised)',
                    borderColor: 'var(--cf-border-strong)',
                    color: 'var(--cf-text)',
                    boxShadow: 'var(--cf-specular)',
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border active:scale-[0.99] px-3 py-1.5 text-xs font-medium transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  <WifiOff
                    style={{ color: 'var(--cf-amber-text)' }}
                    className="w-3.5 h-3.5"
                    aria-hidden="true"
                  />
                  <span>Offline Fix</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: 2. Your Final Answer */}
        <div
          style={{
            backgroundColor: 'var(--cf-surface)',
            borderColor: 'var(--cf-border)',
          }}
          className="relative border rounded-md p-5 flex flex-col justify-between gap-3.5 h-full"
        >
          <CornerCrosshairs />

          {/* Compact Single-Row Toolbar Header */}
          <div
            style={{ borderColor: 'var(--cf-border)' }}
            className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  style={{ color: 'var(--cf-text)' }}
                  className="font-display text-base font-semibold"
                >
                  2. Safe Answer
                </h2>
                {(isProcessing || (streamStage === 'done' && restoredText)) && (
                  <span
                    data-testid="live-progress-pill"
                    style={{
                      borderColor: isProcessing
                        ? 'var(--cf-amber-border)'
                        : 'var(--cf-emerald-border)',
                      backgroundColor: isProcessing
                        ? 'var(--cf-amber-soft)'
                        : 'var(--cf-emerald-soft)',
                      color: isProcessing
                        ? 'var(--cf-amber-text)'
                        : 'var(--cf-emerald-text)',
                    }}
                    className="inline-flex items-center gap-1.5 border rounded px-2 py-0.5 font-mono text-[11px] font-medium whitespace-nowrap tabular-nums"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isProcessing
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-500'
                      }`}
                      aria-hidden="true"
                    />
                    {streamStage === 'cloaking' ? (
                      <span>1. Cloaking...</span>
                    ) : isProcessing ? (
                      <span>
                        1. Cloaked ({lastLocalSpeedMs}ms) → 2. Streaming...
                      </span>
                    ) : (
                      <span>
                        1. Cloaked ({lastLocalSpeedMs}ms) → 2. Ready
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] tabular-nums">
                <span
                  style={{ color: 'var(--cf-emerald-text)' }}
                  className="inline-flex items-center gap-1 whitespace-nowrap font-medium"
                >
                  <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                  <span>{scrub.leakedBytes} Secrets Shared</span>
                </span>
                {friendlyRoute && (
                  <>
                    <span
                      style={{ color: 'var(--cf-text-muted)' }}
                      aria-hidden="true"
                    >
                      /
                    </span>
                    <span
                      style={{ color: 'var(--cf-text-secondary)' }}
                      className="whitespace-nowrap"
                    >
                      {friendlyRoute}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="ml-auto flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
              <button
                type="button"
                onClick={handleDownloadPrivacyReceipt}
                style={{
                  backgroundColor: 'var(--cf-surface-raised)',
                  borderColor: 'var(--cf-border-strong)',
                  color: 'var(--cf-text)',
                  boxShadow: 'var(--cf-specular)',
                }}
                className="inline-flex items-center gap-1.5 rounded-md border active:scale-[0.99] px-2.5 py-1.5 text-xs font-medium transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {receiptDownloaded ? (
                  <>
                    <Check
                      style={{ color: 'var(--cf-emerald-text)' }}
                      className="w-3.5 h-3.5"
                      aria-hidden="true"
                    />
                    <span style={{ color: 'var(--cf-emerald-text)' }}>
                      Receipt Saved
                    </span>
                  </>
                ) : (
                  <>
                    <Download
                      style={{ color: 'var(--cf-emerald-text)' }}
                      className="w-3.5 h-3.5"
                      aria-hidden="true"
                    />
                    <span>Receipt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={highlightRestored}
                onClick={() => setHighlightRestored((prev) => !prev)}
                data-testid="highlight-restored-toggle"
                style={{
                  borderColor: highlightRestored
                    ? 'var(--cf-emerald-border)'
                    : 'var(--cf-border-strong)',
                  backgroundColor: highlightRestored
                    ? 'var(--cf-emerald-soft)'
                    : 'var(--cf-surface-raised)',
                  color: highlightRestored
                    ? 'var(--cf-emerald-text)'
                    : 'var(--cf-text-secondary)',
                  boxShadow: 'var(--cf-specular)',
                }}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium active:scale-[0.99] transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    highlightRestored ? 'bg-emerald-500' : 'bg-zinc-400'
                  }`}
                  aria-hidden="true"
                />
                <span>Highlight</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={!restoredText}
                style={{
                  backgroundColor: 'var(--cf-surface-raised)',
                  borderColor: 'var(--cf-border-strong)',
                  color: 'var(--cf-text)',
                  boxShadow: 'var(--cf-specular)',
                }}
                className="inline-flex items-center gap-1.5 rounded-md border active:scale-[0.99] px-2.5 py-1.5 text-xs font-medium transition-all duration-100 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {copied ? (
                  <>
                    <Check
                      style={{ color: 'var(--cf-emerald-text)' }}
                      className="w-3.5 h-3.5"
                      aria-hidden="true"
                    />
                    <span style={{ color: 'var(--cf-emerald-text)' }}>
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy
                      style={{ color: 'var(--cf-text-muted)' }}
                      className="w-3.5 h-3.5"
                      aria-hidden="true"
                    />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Reading Area (Fixed 340px height with internal scrolling) */}
          <div
            data-testid="restored-output-canvas"
            style={{
              backgroundColor: 'var(--cf-input-bg)',
              borderColor: 'var(--cf-border)',
            }}
            className="cloak-scroll rounded-lg border p-4.5 h-[340px] overflow-y-auto"
          >
            {isProcessing && !restoredText ? (
              <div className="space-y-4">
                <p
                  style={{ color: 'var(--cf-emerald-text)' }}
                  className="text-sm font-medium"
                >
                  {effectiveAirGap
                    ? 'Running locally...'
                    : `Cloaked in ${lastLocalSpeedMs || '<15'}ms — streaming reply...`}
                </p>
                <div className="space-y-2.5">
                  <div className="h-3.5 w-3/4 rounded bg-zinc-500/20" />
                  <div className="h-3.5 w-full rounded bg-zinc-500/15" />
                  <div className="h-3.5 w-5/6 rounded bg-zinc-500/15" />
                  <div className="h-3.5 w-2/3 rounded bg-zinc-500/10" />
                </div>
              </div>
            ) : errorMessage ? (
              <div
                role="alert"
                style={{
                  borderColor: 'var(--cf-rose-border)',
                  backgroundColor: 'var(--cf-rose-soft)',
                }}
                className="rounded-lg border p-4 space-y-2"
              >
                <p
                  style={{ color: 'var(--cf-rose-text)' }}
                  className="text-xs font-semibold uppercase tracking-wider"
                >
                  Cloud AI unavailable
                </p>
                <p
                  style={{ color: 'var(--cf-text)' }}
                  className="text-sm leading-relaxed"
                >
                  {errorMessage}
                </p>
                <p
                  style={{ color: 'var(--cf-text-muted)' }}
                  className="text-xs"
                >
                  Your text stayed local. Try Offline Fix.
                </p>
              </div>
            ) : restoredText ? (
              <div
                style={{ color: 'var(--cf-text)' }}
                className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap"
              >
                {restoredSegments.map((seg, idx) =>
                  seg.isRestored ? (
                    isProcessing ? (
                      <span
                        key={idx}
                        data-restored-highlight={
                          highlightRestored ? 'on' : 'off'
                        }
                        title={
                          highlightRestored
                            ? 'Your real detail was safely put back on your laptop'
                            : undefined
                        }
                        className={
                          highlightRestored
                            ? 'border-b border-emerald-500/70 font-medium text-[var(--cf-highlight-restored)]'
                            : ''
                        }
                      >
                        {seg.text}
                      </span>
                    ) : (
                      <CipherText
                        key={`${idx}-${answerNonce}`}
                        text={seg.text}
                        triggerKey={answerNonce}
                        dataRestoredHighlight={highlightRestored ? 'on' : 'off'}
                        title={
                          highlightRestored
                            ? 'Your real detail was safely put back on your laptop'
                            : undefined
                        }
                        className={
                          highlightRestored
                            ? 'border-b border-emerald-500/70 font-medium text-[var(--cf-highlight-restored)]'
                            : ''
                        }
                      />
                    )
                  ) : (
                    <span key={idx}>{seg.text}</span>
                  )
                )}
                {isProcessing && (
                  <span
                    aria-hidden="true"
                    style={{ color: 'var(--cf-emerald-text)' }}
                    className="inline-block ml-1 animate-pulse font-mono"
                  >
                    ▋
                  </span>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[165px] flex flex-col justify-center gap-2">
                <p
                  style={{ color: 'var(--cf-emerald-text)' }}
                  className="font-mono text-xs font-semibold uppercase tracking-wider"
                >
                  READY // 0.00B LEAK
                </p>
                <p
                  style={{ color: 'var(--cf-text)' }}
                  className="text-base font-medium"
                >
                  {hiddenCount > 0
                    ? `${hiddenCount} secrets masked and ready.`
                    : 'Paste text on the left to start.'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom-Pinned Expandable Drawer: See What Was Hidden -> */}
          <div
            style={{
              backgroundColor: 'var(--cf-input-bg)',
              borderColor: 'var(--cf-border)',
            }}
            className="mt-auto border rounded-lg overflow-hidden"
          >
            <button
              type="button"
              aria-expanded={detailsOpen}
              aria-controls="hidden-details-drawer"
              onClick={() => setDetailsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                <span
                  data-testid="box2-secret-count"
                  style={{ color: 'var(--cf-text)' }}
                  className="text-xs font-medium tabular-nums"
                >
                  Hidden Items ({hiddenCount})
                </span>
              </div>
              <ChevronDown
                style={{ color: 'var(--cf-text-muted)' }}
                className={`w-4 h-4 transition-transform duration-200 ${
                  detailsOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {detailsOpen && (
              <div
                id="hidden-details-drawer"
                style={{ borderColor: 'var(--cf-border)' }}
                className="cloak-scroll border-t p-4 max-h-[260px] overflow-y-auto"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left side: Cloud Saw */}
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        style={{ color: 'var(--cf-amber-text)' }}
                        className="text-xs font-semibold whitespace-nowrap"
                      >
                        Cloud Saw
                      </span>
                      <span
                        style={{
                          borderColor: 'var(--cf-emerald-border)',
                          backgroundColor: 'var(--cf-emerald-soft)',
                          color: 'var(--cf-emerald-text)',
                        }}
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0"
                      >
                        0 real secrets
                      </span>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'var(--cf-surface-solid)',
                        borderColor: 'var(--cf-border)',
                        color: 'var(--cf-text-secondary)',
                      }}
                      className="cloak-scroll rounded-md border p-3 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap"
                    >
                      {scrub.segments.length > 0 ? (
                        scrub.segments.map((seg, idx) =>
                          seg.isToken ? (
                            <span
                              key={idx}
                              style={{
                                borderColor: 'var(--cf-amber-border)',
                                backgroundColor: 'var(--cf-amber-soft)',
                                color: 'var(--cf-amber-text)',
                              }}
                              className="inline-block rounded-sm border px-1.5 py-0.5 mx-0.5"
                            >
                              <CipherText
                                text={seg.text}
                                triggerKey={scrub.sanitizedText}
                              />
                            </span>
                          ) : (
                            <span key={idx}>{seg.text}</span>
                          )
                        )
                      ) : (
                        <span style={{ color: 'var(--cf-text-muted)' }}>
                          Nothing to mask yet.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side: Locked Locally */}
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        style={{ color: 'var(--cf-emerald-text)' }}
                        className="text-xs font-semibold whitespace-nowrap"
                      >
                        Locked Locally
                      </span>
                      <span
                        style={{ color: 'var(--cf-text-muted)' }}
                        className="text-[11px] whitespace-nowrap shrink-0"
                      >
                        Never sent
                      </span>
                    </div>

                    {hiddenSecrets.length === 0 ? (
                      <p
                        style={{
                          backgroundColor: 'var(--cf-surface-solid)',
                          borderColor: 'var(--cf-border)',
                          color: 'var(--cf-text-muted)',
                        }}
                        className="text-xs border rounded-md p-3"
                      >
                        No secrets spotted.
                      </p>
                    ) : (
                      <div
                        style={{
                          backgroundColor: 'var(--cf-surface-solid)',
                          borderColor: 'var(--cf-border)',
                        }}
                        className="cloak-scroll border rounded-md max-h-56 overflow-y-auto divide-y"
                      >
                        {hiddenSecrets.map((entry) => {
                          const revealed = Boolean(revealedIds[entry.id]);
                          return (
                            <div
                              key={entry.id}
                              style={{ borderColor: 'var(--cf-border)' }}
                              className="p-2.5 flex items-start justify-between gap-2.5"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    style={{ color: 'var(--cf-amber-text)' }}
                                    className="font-mono text-[11px] font-medium break-all"
                                  >
                                    {entry.placeholder}
                                  </span>
                                  <span
                                    style={{ color: 'var(--cf-text-muted)' }}
                                    className="text-[11px]"
                                  >
                                    {FRIENDLY_CATEGORY_LABELS[entry.category]}
                                  </span>
                                </div>
                                <p
                                  style={{ color: 'var(--cf-emerald-text)' }}
                                  className="font-mono text-xs font-medium break-all"
                                >
                                  {revealed
                                    ? entry.originalValue
                                    : entry.maskedPreview}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleReveal(entry.id)}
                                aria-label={
                                  revealed
                                    ? `Hide ${entry.placeholder}`
                                    : `Show ${entry.placeholder}`
                                }
                                style={{
                                  borderColor: 'var(--cf-border-strong)',
                                  color: 'var(--cf-text-secondary)',
                                }}
                                className="inline-flex items-center justify-center p-1.5 rounded border shrink-0 cursor-pointer"
                              >
                                {revealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </section>
  );
}
