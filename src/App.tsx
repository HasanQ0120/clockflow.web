import { useCallback, useEffect, useMemo, useState } from 'react';
import { CyberGridCanvas, type SceneMode } from './components/CyberGridCanvas';
import { TopNavBar, type PageId } from './components/TopNavBar';
import { HomePage } from './components/HomePage';
import { EditorialWorkspace } from './components/EditorialWorkspace';
import { AboutPage } from './components/AboutPage';
import { SettingsPage } from './components/SettingsPage';
import { SecurityAuditFooter } from './components/SecurityAuditFooter';
import { DEMO_PRESETS, type DemoPreset } from './utils/presets';
import {
  parseWhitelistInput,
  type RestoredSegment,
} from './utils/privacyEngine';
import {
  applyThemeToDocument,
  extractActiveBlacklistTerms,
  loadSettings,
  saveSettings,
  type CloakFlowSettings,
  type ThemeMode,
} from './utils/settingsStore';
import {
  runLocalPrivacyScrub,
  runHybridZeroLeakAIStream,
  runOnDeviceQuickAction,
} from './services/aiService.js';

function getInitialPageFromHash(): PageId {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (
    hash === 'home' ||
    hash === 'production' ||
    hash === 'about' ||
    hash === 'settings'
  ) {
    return hash;
  }
  return 'home';
}

export default function App() {
  const initialPreset = DEMO_PRESETS[0];
  const [settings, setSettings] = useState<CloakFlowSettings>(() => {
    const loaded = loadSettings();
    applyThemeToDocument(loaded.theme);
    return loaded;
  });
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(() => settings.theme);

  const [activePage, setActivePage] = useState<PageId>(getInitialPageFromHash);

  const [rawInput, setRawInput] = useState<string>(initialPreset.rawInput);
  const [taskInstruction, setTaskInstruction] = useState<string>(
    initialPreset.taskInstruction
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(
    initialPreset.id
  );

  const [whitelistTerms, setWhitelistTerms] = useState<string[]>(
    () => settings.defaultWhitelist
  );
  const [whitelistDraft, setWhitelistDraft] = useState<string>('');

  const [blacklistTerms, setBlacklistTerms] = useState<string[]>(() =>
    extractActiveBlacklistTerms(settings)
  );
  const [blacklistDraft, setBlacklistDraft] = useState<string>('');

  const [syntheticContextMode, setSyntheticContextMode] = useState<boolean>(
    () => settings.defaultFakeNames
  );
  const [airGapMode, setAirGapMode] = useState<boolean>(
    () => settings.defaultAirGapMode
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [restoredText, setRestoredText] = useState<string>('');
  const [restoredSegments, setRestoredSegments] = useState<RestoredSegment[]>(
    []
  );
  const [routeLabel, setRouteLabel] = useState<string | null>(null);
  const [answerNonce, setAnswerNonce] = useState<number>(0);
  const [streamStage, setStreamStage] = useState<
    'idle' | 'cloaking' | 'streaming' | 'done'
  >('idle');
  const [lastLocalSpeedMs, setLastLocalSpeedMs] = useState<number>(0);

  const navigateTo = useCallback((page: PageId) => {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      if (window.location.hash !== `#${page}`) {
        window.history.pushState(null, '', `#${page}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    applyThemeToDocument(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleHashChange = () => {
      setActivePage(getInitialPageFromHash());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleSaveSettings = useCallback((nextRaw: CloakFlowSettings) => {
    const saved = saveSettings(nextRaw);
    setSettings(saved);
    setActiveTheme(saved.theme);
    applyThemeToDocument(saved.theme);

    // Sync saved defaults immediately to Production workspace state
    setWhitelistTerms(saved.defaultWhitelist);
    setBlacklistTerms(extractActiveBlacklistTerms(saved));
    setSyntheticContextMode(saved.defaultFakeNames);
    setAirGapMode(saved.defaultAirGapMode);
  }, []);

  const handleClearSession = useCallback(() => {
    setActivePresetId(null);
    setRawInput('');
    setWhitelistDraft('');
    setBlacklistDraft('');
    setWhitelistTerms(settings.defaultWhitelist);
    setBlacklistTerms(extractActiveBlacklistTerms(settings));
    setValidationError(null);
    setErrorMessage(null);
    setRestoredText('');
    setRestoredSegments([]);
    setRouteLabel(null);
    setStreamStage('idle');
  }, [settings]);

  const handleSwitchToOnlineMode = useCallback(() => {
    setAirGapMode(false);
    if (settings.defaultAirGapMode) {
      const saved = saveSettings({
        ...settings,
        defaultAirGapMode: false,
      });
      setSettings(saved);
    }
  }, [settings]);

  const handlePreviewTheme = useCallback((theme: ThemeMode) => {
    setActiveTheme(theme);
    applyThemeToDocument(theme);
  }, []);

  const activeWhitelist = useMemo(() => {
    const draftTerms = parseWhitelistInput(whitelistDraft);
    const merged = [...whitelistTerms];
    for (const d of draftTerms) {
      if (!merged.some((m) => m.toLowerCase() === d.toLowerCase())) {
        merged.push(d);
      }
    }
    return merged;
  }, [whitelistTerms, whitelistDraft]);

  const activeBlacklist = useMemo(() => {
    const draftTerms = parseWhitelistInput(blacklistDraft);
    const merged = [...blacklistTerms];
    for (const d of draftTerms) {
      if (!merged.some((m) => m.toLowerCase() === d.toLowerCase())) {
        merged.push(d);
      }
    }
    return merged;
  }, [blacklistTerms, blacklistDraft]);

  const scrubOptions = useMemo(
    () => ({
      hidePrivateDetails: settings.hidePrivateDetails,
      maskApiKeys: settings.hidePrivateDetails,
      maskCurrencyAndPhones:
        settings.hidePrivateDetails &&
        (settings.maskCurrencyAndPhones || settings.privacyMode === 'strict'),
    }),
    [
      settings.hidePrivateDetails,
      settings.maskCurrencyAndPhones,
      settings.privacyMode,
    ]
  );

  const scrub = useMemo(
    () =>
      runLocalPrivacyScrub(
        rawInput,
        syntheticContextMode,
        activeWhitelist,
        activeBlacklist,
        scrubOptions
      ),
    [rawInput, syntheticContextMode, activeWhitelist, activeBlacklist, scrubOptions]
  );

  const effectiveAirGap = airGapMode || !isOnline;

  const sceneMode: SceneMode = effectiveAirGap
    ? 'airgap'
    : isProcessing || isScanning
      ? 'scanning'
      : scrub.leakedBytes === 0 && scrub.vault.length > 0
        ? 'verified'
        : 'idle';

  const triggerBriefLaserScan = () => {
    setIsScanning(true);
    window.setTimeout(() => {
      setIsScanning(false);
    }, 900);
  };

  const handleSelectPreset = (preset: DemoPreset) => {
    setActivePresetId(preset.id);
    setRawInput(preset.rawInput);
    setTaskInstruction(preset.taskInstruction);
    setValidationError(null);
    setErrorMessage(null);
    setRestoredText('');
    setRestoredSegments([]);
    setRouteLabel(null);
    setStreamStage('idle');
    triggerBriefLaserScan();
  };

  const handleLoadFileContent = (content: string) => {
    setActivePresetId(null);
    setRawInput(content);
    setValidationError(null);
    setErrorMessage(null);
    setRestoredText('');
    setRestoredSegments([]);
    setRouteLabel(null);
    setStreamStage('idle');
    if (settings.autoCloakOnUpload) {
      triggerBriefLaserScan();
    }
  };

  const handleClearInput = () => {
    setActivePresetId(null);
    setRawInput('');
    setValidationError(null);
    setErrorMessage(null);
    setRestoredText('');
    setRestoredSegments([]);
    setRouteLabel(null);
    setStreamStage('idle');
  };

  const handleAddWhitelistTerms = (raw: string) => {
    const incoming = parseWhitelistInput(raw);
    if (incoming.length === 0) return;
    setWhitelistTerms((prev) => {
      const next = [...prev];
      for (const term of incoming) {
        if (!next.some((t) => t.toLowerCase() === term.toLowerCase())) {
          next.push(term);
        }
      }
      return next;
    });
    setWhitelistDraft('');
  };

  const handleRemoveWhitelistTerm = (term: string) => {
    setWhitelistTerms((prev) =>
      prev.filter((t) => t.toLowerCase() !== term.toLowerCase())
    );
  };

  const handleAddBlacklistTerms = (raw: string) => {
    const incoming = parseWhitelistInput(raw);
    if (incoming.length === 0) return;
    setBlacklistTerms((prev) => {
      const next = [...prev];
      for (const term of incoming) {
        if (!next.some((t) => t.toLowerCase() === term.toLowerCase())) {
          next.push(term);
        }
      }
      return next;
    });
    setBlacklistDraft('');
  };

  const handleRemoveBlacklistTerm = (term: string) => {
    setBlacklistTerms((prev) =>
      prev.filter((t) => t.toLowerCase() !== term.toLowerCase())
    );
  };

  const handleRunHybridAI = async () => {
    if (!rawInput.trim()) {
      setValidationError('Paste some text first before getting an answer.');
      return;
    }

    setValidationError(null);
    setErrorMessage(null);
    setRestoredText('');
    setRestoredSegments([]);
    setRouteLabel(null);
    setIsProcessing(true);
    setIsScanning(true);
    setStreamStage('cloaking');

    const trimmedTask = taskInstruction.trim();
    const trimmedDefault = settings.defaultInstruction.trim();
    const combinedInstruction = trimmedDefault
      ? trimmedTask
        ? `${trimmedTask}\n\nDefault Style Preference: ${trimmedDefault}`
        : trimmedDefault
      : trimmedTask;

    try {
      const result = await runHybridZeroLeakAIStream({
        rawText: rawInput,
        taskInstruction: combinedInstruction,
        syntheticContextMode,
        airGapMode: effectiveAirGap,
        whitelist: activeWhitelist,
        blacklist: activeBlacklist,
        scrubOptions,
        onLocalCloak: ({ localSpeedMs }) => {
          setLastLocalSpeedMs(localSpeedMs);
          setStreamStage('streaming');
        },
        onStreamUpdate: ({
          sanitizedResponse,
          restoredText: liveText,
          restoredSegments: liveSegs,
        }) => {
          if (settings.restoreDetailsInAnswers) {
            setRestoredText(liveText);
            setRestoredSegments(liveSegs);
          } else {
            setRestoredText(sanitizedResponse);
            setRestoredSegments([{ text: sanitizedResponse, isRestored: false }]);
          }
          setRouteLabel(
            effectiveAirGap ? '100% On-Device Local' : 'Hybrid Cloud'
          );
        },
      });

      if (settings.restoreDetailsInAnswers) {
        setRestoredText(result.restoredText);
        setRestoredSegments(result.restoredSegments);
      } else {
        setRestoredText(result.sanitizedResponse);
        setRestoredSegments([
          { text: result.sanitizedResponse, isRestored: false },
        ]);
      }
      setRouteLabel(result.routeLabel);
      setLastLocalSpeedMs(result.localSpeedMs);
      setStreamStage('done');
      setAnswerNonce((n) => n + 1);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not reach the cloud AI right now.';
      setErrorMessage(msg);
      setRestoredText('');
      setRestoredSegments([]);
      setRouteLabel(null);
      setStreamStage('idle');
    } finally {
      setIsProcessing(false);
      setIsScanning(false);
    }
  };

  const handleRunLocalAction = async (
    actionType: 'grammar' | 'summary' | 'cloak'
  ) => {
    if (!rawInput.trim()) {
      setValidationError('Paste some text first to fix it offline.');
      return;
    }

    setValidationError(null);
    setErrorMessage(null);
    setIsProcessing(true);
    setIsScanning(true);
    setStreamStage('cloaking');

    try {
      const result = await runOnDeviceQuickAction({
        rawText: rawInput,
        actionType,
        syntheticContextMode,
        whitelist: activeWhitelist,
        blacklist: activeBlacklist,
        scrubOptions,
      });

      setLastLocalSpeedMs(result.localSpeedMs);
      if (settings.restoreDetailsInAnswers) {
        setRestoredText(result.restoredText);
        setRestoredSegments(result.restoredSegments);
      } else {
        setRestoredText(result.sanitizedResponse);
        setRestoredSegments([
          { text: result.sanitizedResponse, isRestored: false },
        ]);
      }
      setRouteLabel(result.routeLabel);
      setStreamStage('done');
      setAnswerNonce((n) => n + 1);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Offline fix could not finish.';
      setErrorMessage(msg);
      setStreamStage('idle');
    } finally {
      setIsProcessing(false);
      setIsScanning(false);
    }
  };

  const isDaylight = activeTheme === 'daylight';

  return (
    <div
      data-app-state={sceneMode}
      data-active-page={activePage}
      style={{
        backgroundColor: 'var(--cf-bg)',
        color: 'var(--cf-text)',
      }}
      className="relative min-h-screen w-full flex flex-col overflow-x-clip"
    >
      {/* 3D WebGL Backdrop in Dark Themes; Architectural Daylight Grid in Swiss Daylight */}
      {isDaylight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 daylight-grid-surface"
        />
      ) : (
        <>
          <CyberGridCanvas mode={sceneMode} zenInspect={false} />
          <div
            aria-hidden="true"
            style={{ backgroundColor: 'var(--cf-scrim)' }}
            className="pointer-events-none fixed inset-0 z-1 anodized-surface"
          />
        </>
      )}

      {/* Main Application Shell */}
      <div className="relative z-10 flex-1 flex flex-col">
        <TopNavBar
          activePage={activePage}
          onNavigate={navigateTo}
          airGapMode={effectiveAirGap}
          userName={settings.userName}
        />

        <main className="flex-1">
          <div
            key={activePage}
            data-testid="page-transition-wrapper"
            className="animate-page-enter"
          >
            {activePage === 'home' && <HomePage onNavigate={navigateTo} />}

            {activePage === 'production' && (
              <EditorialWorkspace
                userName={settings.userName}
                defaultInstruction={settings.defaultInstruction}
                autoCloakOnUpload={settings.autoCloakOnUpload}
                maskCurrencyAndPhones={settings.maskCurrencyAndPhones}
                highlightRestoredDefault={settings.highlightRestoredDefault}
                reviewBeforeSending={settings.reviewBeforeSending}
                onOpenSettings={() => navigateTo('settings')}
                presets={DEMO_PRESETS}
                activePresetId={activePresetId}
                onSelectPreset={handleSelectPreset}
                rawInput={rawInput}
                onChangeRawInput={(val) => {
                  setRawInput(val);
                  setActivePresetId(null);
                  setValidationError(null);
                }}
                onLoadFileContent={handleLoadFileContent}
                taskInstruction={taskInstruction}
                onChangeTaskInstruction={setTaskInstruction}
                whitelistTerms={whitelistTerms}
                whitelistDraft={whitelistDraft}
                onChangeWhitelistDraft={setWhitelistDraft}
                onAddWhitelistTerms={handleAddWhitelistTerms}
                onRemoveWhitelistTerm={handleRemoveWhitelistTerm}
                blacklistTerms={blacklistTerms}
                blacklistDraft={blacklistDraft}
                onChangeBlacklistDraft={setBlacklistDraft}
                onAddBlacklistTerms={handleAddBlacklistTerms}
                onRemoveBlacklistTerm={handleRemoveBlacklistTerm}
                syntheticContextMode={syntheticContextMode}
                onToggleSyntheticMode={() => setSyntheticContextMode((p) => !p)}
                airGapMode={airGapMode}
                isOnline={isOnline}
                onToggleAirGapMode={() => setAirGapMode((p) => !p)}
                onSwitchToOnlineMode={handleSwitchToOnlineMode}
                onRunHybridAI={handleRunHybridAI}
                onRunLocalAction={handleRunLocalAction}
                onClearInput={handleClearInput}
                isProcessing={isProcessing}
                isScanning={isScanning}
                validationError={validationError}
                errorMessage={errorMessage}
                restoredText={restoredText}
                restoredSegments={restoredSegments}
                routeLabel={routeLabel}
                answerNonce={answerNonce}
                streamStage={streamStage}
                lastLocalSpeedMs={lastLocalSpeedMs}
                scrub={scrub}
              />
            )}

            {activePage === 'about' && <AboutPage onNavigate={navigateTo} />}

            {activePage === 'settings' && (
              <SettingsPage
                settings={settings}
                airGapEffective={effectiveAirGap}
                onSaveSettings={handleSaveSettings}
                onPreviewTheme={handlePreviewTheme}
                onClearSession={handleClearSession}
              />
            )}
          </div>
        </main>

        <SecurityAuditFooter onNavigate={navigateTo} />
      </div>
    </div>
  );
}
