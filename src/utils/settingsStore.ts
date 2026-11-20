export type ThemeMode = 'obsidian' | 'midnight' | 'daylight';
export type PrivacyMode = 'everyday' | 'strict';

export interface CustomPrivacyRule {
  id: string;
  label: string;
  pattern: string;
  description: string;
  enabled: boolean;
}

export interface CloakFlowSettings {
  userName: string;
  defaultInstruction: string;
  defaultWhitelist: string[];
  defaultBlacklist: string[];
  defaultFakeNames: boolean;
  defaultAirGapMode: boolean;
  autoCloakOnUpload: boolean;
  maskCurrencyAndPhones: boolean;
  highlightRestoredDefault: boolean;
  theme: ThemeMode;
  privacyMode: PrivacyMode;
  hidePrivateDetails: boolean;
  reviewBeforeSending: boolean;
  restoreDetailsInAnswers: boolean;
  customRules: CustomPrivacyRule[];
}

export const SETTINGS_STORAGE_KEY = 'cloakflow.settings.v1';

export const DEFAULT_CUSTOM_RULES: CustomPrivacyRule[] = [
  {
    id: 'rule-meridian-labs',
    label: 'Meridian Labs',
    pattern: 'Meridian Labs',
    description: 'Hide this company name',
    enabled: true,
  },
  {
    id: 'rule-cf-prefix',
    label: 'Words starting with CF-',
    pattern: 'CF-*',
    description: 'Hide internal project names',
    enabled: true,
  },
];

export const DEFAULT_SETTINGS: CloakFlowSettings = {
  userName: '',
  defaultInstruction: '',
  defaultWhitelist: ['Karachi', 'React'],
  defaultBlacklist: [],
  defaultFakeNames: false,
  defaultAirGapMode: false,
  autoCloakOnUpload: true,
  maskCurrencyAndPhones: true,
  highlightRestoredDefault: true,
  theme: 'obsidian',
  privacyMode: 'everyday',
  hidePrivateDetails: true,
  reviewBeforeSending: true,
  restoreDetailsInAnswers: true,
  customRules: DEFAULT_CUSTOM_RULES.map((r) => ({ ...r })),
};

function isValidTheme(val: unknown): val is ThemeMode {
  return val === 'obsidian' || val === 'midnight' || val === 'daylight';
}

function isValidPrivacyMode(val: unknown): val is PrivacyMode {
  return val === 'everyday' || val === 'strict';
}

function normalizeStringArray(val: unknown, fallback: string[]): string[] {
  if (!Array.isArray(val)) return [...fallback];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of val) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      cleaned.push(trimmed);
    }
  }
  return cleaned;
}

function normalizeCustomRules(val: unknown): CustomPrivacyRule[] {
  if (!Array.isArray(val)) {
    return DEFAULT_CUSTOM_RULES.map((r) => ({ ...r }));
  }
  const seen = new Set<string>();
  const cleaned: CustomPrivacyRule[] = [];
  for (const item of val) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const pattern = typeof r.pattern === 'string' ? r.pattern.trim() : '';
    const label =
      typeof r.label === 'string' && r.label.trim() ? r.label.trim() : pattern;
    if (!pattern) continue;
    const lower = pattern.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    cleaned.push({
      id:
        typeof r.id === 'string' && r.id.trim()
          ? r.id.trim()
          : `rule-${lower.replace(/[^a-z0-9]+/g, '-')}`,
      label,
      pattern,
      description:
        typeof r.description === 'string' && r.description.trim()
          ? r.description.trim()
          : 'Hide custom term',
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
    });
  }
  return cleaned;
}

export function sanitizeSettings(raw: unknown): CloakFlowSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SETTINGS,
      defaultWhitelist: [...DEFAULT_SETTINGS.defaultWhitelist],
      defaultBlacklist: [...DEFAULT_SETTINGS.defaultBlacklist],
      customRules: DEFAULT_CUSTOM_RULES.map((r) => ({ ...r })),
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    userName:
      typeof obj.userName === 'string' ? obj.userName.trim().slice(0, 48) : '',
    defaultInstruction:
      typeof obj.defaultInstruction === 'string'
        ? obj.defaultInstruction.slice(0, 600)
        : '',
    defaultWhitelist: normalizeStringArray(
      obj.defaultWhitelist,
      DEFAULT_SETTINGS.defaultWhitelist
    ),
    defaultBlacklist: normalizeStringArray(
      obj.defaultBlacklist,
      DEFAULT_SETTINGS.defaultBlacklist
    ),
    defaultFakeNames:
      typeof obj.defaultFakeNames === 'boolean'
        ? obj.defaultFakeNames
        : DEFAULT_SETTINGS.defaultFakeNames,
    defaultAirGapMode:
      typeof obj.defaultAirGapMode === 'boolean'
        ? obj.defaultAirGapMode
        : DEFAULT_SETTINGS.defaultAirGapMode,
    autoCloakOnUpload:
      typeof obj.autoCloakOnUpload === 'boolean'
        ? obj.autoCloakOnUpload
        : DEFAULT_SETTINGS.autoCloakOnUpload,
    maskCurrencyAndPhones:
      typeof obj.maskCurrencyAndPhones === 'boolean'
        ? obj.maskCurrencyAndPhones
        : DEFAULT_SETTINGS.maskCurrencyAndPhones,
    highlightRestoredDefault:
      typeof obj.highlightRestoredDefault === 'boolean'
        ? obj.highlightRestoredDefault
        : DEFAULT_SETTINGS.highlightRestoredDefault,
    theme: isValidTheme(obj.theme) ? obj.theme : DEFAULT_SETTINGS.theme,
    privacyMode: isValidPrivacyMode(obj.privacyMode)
      ? obj.privacyMode
      : DEFAULT_SETTINGS.privacyMode,
    hidePrivateDetails:
      typeof obj.hidePrivateDetails === 'boolean'
        ? obj.hidePrivateDetails
        : DEFAULT_SETTINGS.hidePrivateDetails,
    reviewBeforeSending:
      typeof obj.reviewBeforeSending === 'boolean'
        ? obj.reviewBeforeSending
        : DEFAULT_SETTINGS.reviewBeforeSending,
    restoreDetailsInAnswers:
      typeof obj.restoreDetailsInAnswers === 'boolean'
        ? obj.restoreDetailsInAnswers
        : DEFAULT_SETTINGS.restoreDetailsInAnswers,
    customRules: normalizeCustomRules(obj.customRules),
  };
}

export function extractActiveBlacklistTerms(settings: CloakFlowSettings): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  if (settings.privacyMode === 'strict') {
    for (const rule of settings.customRules) {
      if (!rule.enabled) continue;
      const key = rule.pattern.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        terms.push(rule.pattern);
      }
    }
  }
  for (const term of settings.defaultBlacklist) {
    const key = term.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      terms.push(term);
    }
  }
  return terms;
}

export function loadSettings(): CloakFlowSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return sanitizeSettings(null);
    }
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return sanitizeSettings(null);
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return sanitizeSettings(null);
  }
}

export function saveSettings(settings: CloakFlowSettings): CloakFlowSettings {
  const clean = sanitizeSettings(settings);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
    }
  } catch {
    // Ignore storage quota or private mode restrictions
  }
  return clean;
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}
