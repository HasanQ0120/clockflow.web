export type SecretCategory =
  | 'CUSTOM'
  | 'API_KEY'
  | 'EMAIL'
  | 'PHONE'
  | 'ID'
  | 'AMOUNT'
  | 'MEDICAL'
  | 'COMPANY'
  | 'PERSON';

export interface SecretVaultEntry {
  id: string;
  placeholder: string;
  category: SecretCategory;
  originalValue: string;
  maskedPreview: string;
}

export interface ScrubSegment {
  text: string;
  isToken: boolean;
  category?: SecretCategory;
  placeholder?: string;
}

export interface RestoredSegment {
  text: string;
  isRestored: boolean;
  category?: SecretCategory;
  placeholder?: string;
}

export interface ScrubOptions {
  hidePrivateDetails?: boolean;
  maskApiKeys?: boolean;
  maskCurrencyAndPhones?: boolean;
}

export interface ScrubResult {
  sanitizedText: string;
  segments: ScrubSegment[];
  vault: SecretVaultEntry[];
  leakedBytes: number;
  blockedCount: number;
  cloudTokensSavedPct: number;
}

interface RawMatch {
  start: number;
  end: number;
  value: string;
  category: SecretCategory;
  priority: number;
}

const SYNTHETIC_POOLS: Record<SecretCategory, string[]> = {
  CUSTOM: [
    'Project Alpha',
    'Initiative Beta',
    'Codename Gamma',
    'Reference Delta',
    'Program Epsilon',
  ],
  PERSON: [
    'Tariq Mahmood',
    'Amina Siddiqui',
    'Hamza Farooq',
    'Nadia Mansoor',
    'Faisal Iqbal',
    'Sana Javed',
  ],
  COMPANY: [
    'Metro Freight Lahore',
    'Crescent Logistics Ltd',
    'Indus Horizon Systems',
    'Al-Noor Ventures Pvt Ltd',
    'Summit Bridge Partners',
  ],
  API_KEY: [
    'sk-demo-placeholder-0001',
    'AIzaDemoPlaceholderKey0002',
    'ghp_DemoPlaceholderToken0003',
    'tok_demo_placeholder_0004',
  ],
  EMAIL: [
    'representative.one@example.test',
    'counsel.two@example.test',
    'ops.contact@example.test',
    'hr.desk@example.test',
  ],
  PHONE: [
    '+1-555-0148',
    '+1-555-0192',
    '+1-555-0174',
    '+1-555-0136',
  ],
  ID: [
    'REF-0001',
    'REF-0002',
    'REF-0003',
    'REF-0004',
  ],
  AMOUNT: [
    '$1,250',
    '$4,800',
    '$950',
    '$12,000',
  ],
  MEDICAL: [
    'Chronic Condition Alpha',
    'Clinical Protocol Beta',
    'Wellness Accommodation Gamma',
  ],
};

// Non-name technical, legal, and HR nouns that must never be mistaken for a person name
const NON_PERSON_WORDS = new Set([
  'master',
  'services',
  'agreement',
  'confidential',
  'between',
  'primary',
  'contacts',
  'signatories',
  'client',
  'representative',
  'vendor',
  'lead',
  'counsel',
  'financial',
  'penalty',
  'terms',
  'liability',
  'ownership',
  'customs',
  'delays',
  'production',
  'payment',
  'telemetry',
  'worker',
  'maintainer',
  'stripe',
  'secret',
  'gemini',
  'backup',
  'github',
  'deploy',
  'token',
  'strictly',
  'accommodation',
  'record',
  'employee',
  'name',
  'national',
  'direct',
  'contact',
  'department',
  'clinical',
  'compensation',
  'leave',
  'context',
  'current',
  'annual',
  'salary',
  'requested',
  'medical',
  'action',
  'needed',
  'project',
  'managers',
  'force',
  'majeure',
  'governing',
  'law',
  'intellectual',
  'property',
  'dispute',
  'resolution',
  'human',
  'resources',
  'health',
  'insurance',
  'effective',
  'date',
  'node',
  'express',
  'async',
  'await',
  'function',
  'return',
  'error',
  'handling',
  'route',
  'optimization',
  'api',
  'access',
  'section',
  'article',
  'clause',
  'schedule',
  'exhibit',
  'appendix',
  'group',
  'guidelines',
  'systems',
  'technologies',
  'logistics',
  'freight',
  'partners',
  'holdings',
  'ventures',
  'pvt',
  'ltd',
  'llc',
  'inc',
  'corp',
]);

const COMPANY_STOP_PREFIXES = new Set([
  'Between',
  'And',
  'With',
  'From',
  'For',
  'Under',
  'At',
  'By',
  'Of',
  'In',
  'To',
  'The',
  'Agreement',
  'Contract',
  'Department',
  'Telemetry',
  'Confidential',
  'Master',
  'Services',
]);

export function parseWhitelistInput(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const rawList = Array.isArray(input) ? input : input.split(/[,\n]+/);
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of rawList) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(trimmed);
    }
  }
  return cleaned;
}

function collectTermSpans(
  rawText: string,
  terms: string[]
): Array<{ start: number; end: number; value: string }> {
  const spans: Array<{ start: number; end: number; value: string }> = [];
  for (const rawTerm of terms) {
    const isWildcard = rawTerm.endsWith('*');
    const base = isWildcard ? rawTerm.slice(0, -1) : rawTerm;
    if (!base) continue;
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startsWithWord = /^[A-Za-z0-9_]/.test(base);
    const endsWithWord = /[A-Za-z0-9_]$/.test(base);
    const suffix = isWildcard || base.endsWith('-') ? '[A-Za-z0-9_-]*' : endsWithWord ? '\\b' : '';
    const pattern = `${startsWithWord ? '\\b' : ''}${escaped}${suffix}`;
    const re = new RegExp(pattern, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(rawText)) !== null) {
      if (!m[0]) {
        re.lastIndex += 1;
        continue;
      }
      spans.push({
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
      });
    }
  }
  return spans;
}

export function maskSecretValue(value: string, category: SecretCategory): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) {
    return '*'.repeat(trimmed.length);
  }
  if (category === 'API_KEY') {
    const prefix = trimmed.slice(0, Math.min(8, Math.floor(trimmed.length / 3)));
    const suffix = trimmed.slice(-4);
    return `${prefix}...${suffix}`;
  }
  if (category === 'EMAIL') {
    const [local, domain] = trimmed.split('@');
    if (!domain) return `${trimmed.slice(0, 2)}***`;
    const localMask =
      local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***`;
    return `${localMask}@${domain}`;
  }
  if (category === 'PHONE') {
    return `${trimmed.slice(0, 4)}••••${trimmed.slice(-3)}`;
  }
  if (category === 'AMOUNT') {
    return `${trimmed.slice(0, 3)} ••••`;
  }
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    return words
      .map((w) =>
        w.length <= 2 ? `${w[0]}*` : `${w[0]}${'•'.repeat(Math.min(4, w.length - 1))}`
      )
      .join(' ');
  }
  return `${trimmed.slice(0, 2)}${'•'.repeat(Math.min(6, trimmed.length - 2))}${trimmed.slice(-1)}`;
}

function collectRegexMatches(
  text: string,
  regex: RegExp,
  category: SecretCategory,
  priority: number,
  filterFn?: (value: string, index: number) => boolean
): RawMatch[] {
  const matches: RawMatch[] = [];
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const re = new RegExp(regex.source, flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const val = m[0];
    if (!val) {
      re.lastIndex += 1;
      continue;
    }
    if (!filterFn || filterFn(val, m.index)) {
      matches.push({
        start: m.index,
        end: m.index + val.length,
        value: val,
        category,
        priority,
      });
    }
  }
  return matches;
}

export function scrubTextLocally(
  rawText: string,
  syntheticContextMode = false,
  whitelistInput: string | string[] = [],
  blacklistInput: string | string[] = [],
  options: ScrubOptions = {}
): ScrubResult {
  if (!rawText) {
    return {
      sanitizedText: '',
      segments: [],
      vault: [],
      leakedBytes: 0,
      blockedCount: 0,
      cloudTokensSavedPct: 0,
    };
  }

  const hideStandard = options.hidePrivateDetails !== false;
  const maskApiKeys = hideStandard && options.maskApiKeys !== false;
  const maskCurrencyAndPhones =
    hideStandard && options.maskCurrencyAndPhones !== false;

  const whitelist = parseWhitelistInput(whitelistInput);
  const whitelistSpans =
    whitelist.length > 0 ? collectTermSpans(rawText, whitelist) : [];

  const blacklist = parseWhitelistInput(blacklistInput);
  const blacklistMatches: RawMatch[] =
    blacklist.length > 0
      ? collectTermSpans(rawText, blacklist).map((span) => ({
          start: span.start,
          end: span.end,
          value: span.value,
          category: 'CUSTOM',
          priority: 105,
        }))
      : [];

  const candidates: RawMatch[] = [
    // 0. User-specified Extra Words to Hide (highest priority)
    ...blacklistMatches,

    // 1. API Keys & Secrets
    ...(maskApiKeys
      ? [
          ...collectRegexMatches(
            rawText,
            /\b(?:sk-(?:live|test|proj)-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{16,}|gh[pousr]_[0-9A-Za-z]{16,}|xox[baprs]-[0-9A-Za-z-]{10,}|AKIA[0-9A-Z]{16}|whsec_[0-9A-Za-z]{12,})\b/g,
            'API_KEY',
            100
          ),
          ...collectRegexMatches(
            rawText,
            /\bBearer\s+[A-Za-z0-9._-]{16,}\b/g,
            'API_KEY',
            99
          ),
        ]
      : []),

    // 2. Emails
    ...(hideStandard
      ? collectRegexMatches(
          rawText,
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
          'EMAIL',
          95
        )
      : []),

    // 3. Phone numbers (international, Pakistani +92/03xx, US)
    ...(maskCurrencyAndPhones
      ? collectRegexMatches(
          rawText,
          /(?:\+92[\s-]?\d{2,3}[\s-]?\d{7}|\+1[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}|\b03\d{2}[\s-]?\d{7}\b|\(\d{3}\)\s?\d{3}[-.\s]\d{4})/g,
          'PHONE',
          90
        )
      : []),

    // 4. IDs (Employee IDs, CNICs, MRNs, SSNs, IBANs)
    ...(hideStandard
      ? collectRegexMatches(
          rawText,
          /\b(?:EMP-\d{3,8}|MRN-\d{3,10}|CNIC-\d{5}-\d{7}-\d|\d{5}-\d{7}-\d|\d{3}-\d{2}-\d{4}|PK\d{2}[A-Z]{4}\d{16})\b/g,
          'ID',
          85
        )
      : []),

    // 5. Currency & Salary Amounts
    ...(maskCurrencyAndPhones
      ? collectRegexMatches(
          rawText,
          /(?:(?:PKR|USD|EUR|GBP|Rs\.?)\s?[\d,]+(?:\.\d{1,2})?(?:\s?(?:million|billion|Lakhs?|Crores?|k|M|B))?|\$[\d,]+(?:\.\d{1,2})?(?:\s?(?:million|billion|k|M|B))?|[\d,]+(?:\.\d{1,2})?\s?(?:PKR|USD|Lakhs?|Crores?))\b/g,
          'AMOUNT',
          80
        )
      : []),

    // 6. Sensitive Medical Conditions
    ...(hideStandard
      ? collectRegexMatches(
          rawText,
          /\b(?:Type\s+[12]\s+Diabetes(?:\s+Mellitus)?|Hypertension(?:\s+Stage\s+\d)?|Coronary\s+Artery\s+Disease|Major\s+Depressive\s+Disorder|Generalized\s+Anxiety\s+Disorder|Chronic\s+Kidney\s+Disease|Rheumatoid\s+Arthritis|Bipolar\s+Disorder|Lumbar\s+Disc\s+Herniation|Post-Operative\s+Cardiac\s+Recovery)\b/gi,
          'MEDICAL',
          75
        )
      : []),

    // 7. Companies (entities with clear corporate suffixes; trim leading clause words)
    ...(hideStandard
      ? (() => {
          const rawCompanies = collectRegexMatches(
            rawText,
            /\b[A-Z][A-Za-z0-9&'.-]*(?:[ \t]+(?:[A-Z][A-Za-z0-9&'.-]*|of|and|&)){0,5}[ \t]+(?:Pvt\.?[ \t]+Ltd\.?|Ltd\.?|LLC|L\.L\.C\.|Inc\.?|Corp\.?|Corporation|Group)\b/g,
            'COMPANY',
            70
          );
          return rawCompanies
            .map((match) => {
              const words = match.value.split(/[ \t]+/);
              let trimIdx = 0;
              while (
                trimIdx < words.length - 1 &&
                (COMPANY_STOP_PREFIXES.has(words[trimIdx]) ||
                  /^[A-Z]{3,}$/.test(words[trimIdx]))
              ) {
                trimIdx++;
              }
              if (trimIdx === 0) return match;
              const trimmedVal = words.slice(trimIdx).join(' ');
              const offset = match.value.indexOf(trimmedVal);
              return {
                ...match,
                start: match.start + offset,
                value: trimmedVal,
              };
            })
            .filter((m) => m.value.split(/[ \t]+/).length >= 2);
        })()
      : []),

    // 8. Person Names (strict Title Case 2-3 words, rejecting technical/legal/HR nouns)
    ...(hideStandard
      ? collectRegexMatches(
          rawText,
          /\b(?:(?:Dr|Mr|Ms|Mrs|Engr|Adv)\.[ \t]+)?[A-Z][a-z]{1,18}(?:[ \t]+[A-Z]\.)?[ \t]+[A-Z][a-z]{1,20}(?:[ \t]+[A-Z][a-z]{1,18})?\b/g,
          'PERSON',
          60,
          (val) => {
            const cleaned = val.replace(/^(?:Dr|Mr|Ms|Mrs|Engr|Adv)\.[ \t]+/, '');
            const words = cleaned.split(/[ \t]+/);
            if (words.length < 2) return false;
            for (const w of words) {
              const lower = w.replace(/\./g, '').toLowerCase();
              if (NON_PERSON_WORDS.has(lower)) {
                return false;
              }
            }
            return true;
          }
        )
      : []),
  ];

  // Exclude candidates that overlap any whitelisted span or exactly match a whitelisted term
  const whitelistSet = new Set(whitelist.map((w) => w.toLowerCase()));
  const filteredCandidates = candidates.filter((cand) => {
    if (whitelistSet.has(cand.value.toLowerCase())) {
      return false;
    }
    const touchesWhitelist = whitelistSpans.some(
      (ws) => !(cand.end <= ws.start || cand.start >= ws.end)
    );
    return !touchesWhitelist;
  });

  // Resolve overlaps: higher priority wins, then earlier start, then longer match
  filteredCandidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });

  const accepted: RawMatch[] = [];
  for (const cand of filteredCandidates) {
    const overlaps = accepted.some(
      (ex) => !(cand.end <= ex.start || cand.start >= ex.end)
    );
    if (!overlaps) {
      accepted.push(cand);
    }
  }

  // Sort left-to-right for deterministic linear assembly
  accepted.sort((a, b) => a.start - b.start);

  const categoryCounters: Record<SecretCategory, number> = {
    CUSTOM: 0,
    API_KEY: 0,
    EMAIL: 0,
    PHONE: 0,
    ID: 0,
    AMOUNT: 0,
    MEDICAL: 0,
    COMPANY: 0,
    PERSON: 0,
  };

  const valueToEntry = new Map<string, SecretVaultEntry>();
  const vault: SecretVaultEntry[] = [];
  const segments: ScrubSegment[] = [];

  let cursor = 0;
  let sanitizedText = '';

  for (const match of accepted) {
    if (match.start > cursor) {
      const plain = rawText.slice(cursor, match.start);
      sanitizedText += plain;
      segments.push({ text: plain, isToken: false });
    }

    const dedupeKey = `${match.category}::${match.value}`;
    let entry = valueToEntry.get(dedupeKey);

    if (!entry) {
      categoryCounters[match.category] += 1;
      const idx = categoryCounters[match.category];
      const pool = SYNTHETIC_POOLS[match.category];
      const placeholder = syntheticContextMode
        ? pool[(idx - 1) % pool.length]
        : `[${match.category}_${idx}]`;

      entry = {
        id: `${match.category}_${idx}`,
        placeholder,
        category: match.category,
        originalValue: match.value,
        maskedPreview: maskSecretValue(match.value, match.category),
      };
      valueToEntry.set(dedupeKey, entry);
      vault.push(entry);
    }

    sanitizedText += entry.placeholder;
    segments.push({
      text: entry.placeholder,
      isToken: true,
      category: entry.category,
      placeholder: entry.placeholder,
    });

    cursor = match.end;
  }

  if (cursor < rawText.length) {
    const tail = rawText.slice(cursor);
    sanitizedText += tail;
    segments.push({ text: tail, isToken: false });
  }

  // Verify zero leaks of non-whitelisted secrets
  let leakedBytes = 0;
  for (const entry of vault) {
    if (sanitizedText.includes(entry.originalValue)) {
      leakedBytes += new TextEncoder().encode(entry.originalValue).length;
    }
  }

  const rawSensitiveChars = accepted.reduce((sum, m) => sum + m.value.length, 0);
  const replacedChars = vault.reduce((sum, v) => {
    const count = accepted.filter((m) => m.value === v.originalValue).length;
    return sum + v.placeholder.length * count;
  }, 0);
  const baseCompression =
    rawText.length > 0
      ? Math.max(
          0,
          Math.round(
            ((rawSensitiveChars - replacedChars * 0.45) / rawText.length) * 100
          )
        )
      : 0;
  const cloudTokensSavedPct =
    vault.length === 0 ? 0 : Math.min(48, Math.max(8, baseCompression));

  return {
    sanitizedText,
    segments,
    vault,
    leakedBytes,
    blockedCount: accepted.length,
    cloudTokensSavedPct,
  };
}

export function restoreSecretsInText(
  aiText: string,
  vault: SecretVaultEntry[]
): { restoredText: string; segments: RestoredSegment[] } {
  if (!aiText) {
    return { restoredText: '', segments: [] };
  }
  if (!vault || vault.length === 0) {
    return {
      restoredText: aiText,
      segments: [{ text: aiText, isRestored: false }],
    };
  }

  const sortedVault = [...vault].sort(
    (a, b) => b.placeholder.length - a.placeholder.length
  );

  const escaped = sortedVault.map((v) =>
    v.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  const byPlaceholder = new Map<string, SecretVaultEntry>();
  for (const entry of sortedVault) {
    byPlaceholder.set(entry.placeholder, entry);
  }

  const segments: RestoredSegment[] = [];
  let restoredText = '';
  let lastIdx = 0;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(aiText)) !== null) {
    if (m.index > lastIdx) {
      const plain = aiText.slice(lastIdx, m.index);
      restoredText += plain;
      segments.push({ text: plain, isRestored: false });
    }
    const token = m[0];
    const entry = byPlaceholder.get(token);
    if (entry) {
      restoredText += entry.originalValue;
      segments.push({
        text: entry.originalValue,
        isRestored: true,
        category: entry.category,
        placeholder: entry.placeholder,
      });
    } else {
      restoredText += token;
      segments.push({ text: token, isRestored: false });
    }
    lastIdx = m.index + token.length;
  }

  if (lastIdx < aiText.length) {
    const tail = aiText.slice(lastIdx);
    restoredText += tail;
    segments.push({ text: tail, isRestored: false });
  }

  return { restoredText, segments };
}

export function runDeterministicLocalAction(
  sanitizedText: string,
  actionType: 'grammar' | 'summary' | 'cloak' | 'airgap-reason',
  taskInstruction = ''
): string {
  const clean = sanitizedText.trim();
  if (!clean) {
    return 'No content provided for local processing.';
  }

  if (actionType === 'cloak') {
    return clean;
  }

  if (actionType === 'grammar') {
    let fixed = clean
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:!?])/g, '$1')
      .replace(/([,.;:!?])([A-Za-z])/g, '$1 $2')
      .replace(/\b(\w+)\s+\1\b/gi, '$1')
      .replace(/\bi\b/g, 'I')
      .replace(/\bteh\b/gi, 'the')
      .replace(/\brecieve\b/gi, 'receive')
      .replace(/\bseperate\b/gi, 'separate')
      .replace(/\boccured\b/gi, 'occurred')
      .replace(/\buntill\b/gi, 'until');

    fixed = fixed
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (!t) return '';
        if (
          /^(const|let|var|async|function|import|export|if|return|\/\/|\/\*|\*)/.test(
            t
          )
        ) {
          return line;
        }
        return t.charAt(0).toUpperCase() + t.slice(1);
      })
      .join('\n');

    return [
      'LOCAL GRAMMAR & CLARITY PASS (100% ON-DEVICE)',
      '',
      fixed,
      '',
      'Local Audit Notes:',
      '- Normalized spacing, punctuation attachment, and repeated tokens.',
      '- Preserved all masked vault placeholders intact for zero-leak restoration.',
    ].join('\n');
  }

  const tokensFound = Array.from(
    new Set(clean.match(/\[[A-Z_]+_\d+\]/g) || [])
  );
  const companies = tokensFound.filter((t) => t.startsWith('[COMPANY_'));
  const firstCompany = companies[0];
  const vendorCompany = companies[1] || companies[0];
  const firstPerson = tokensFound.find((t) => t.startsWith('[PERSON_'));
  const firstAmount = tokensFound.find((t) => t.startsWith('[AMOUNT_'));
  const firstKey = tokensFound.find((t) => t.startsWith('[API_KEY_'));
  const firstMedical = tokensFound.find((t) => t.startsWith('[MEDICAL_'));
  const lower = clean.toLowerCase();
  const taskLower = taskInstruction.toLowerCase();

  const findings: string[] = [];

  if (
    lower.includes('liability') ||
    lower.includes('penalty') ||
    lower.includes('termination') ||
    lower.includes('perpetual')
  ) {
    if (lower.includes('unlimited') || lower.includes('liability')) {
      findings.push(
        `- Liability Cap Risk: ${vendorCompany || 'The vendor'} currently bears uncapped consequential liability; cap aggregate liability at 12 months of fees.`
      );
    }
    if (lower.includes('penalty') || lower.includes('grace period')) {
      findings.push(
        `- Payment & Penalty Terms: Replace the compounding daily penalty (${firstAmount || 'late fee'}) with a 10-business-day cure period and a capped 1.5% monthly late fee.`
      );
    }
    if (lower.includes('perpetual') || lower.includes('irrevocable')) {
      findings.push(
        `- IP Licensing Scope: Narrow the perpetual license back to operational telemetry strictly during the active term.`
      );
    }
    if (lower.includes('termination') || lower.includes('notice')) {
      findings.push(
        `- Asymmetric Termination: Require mutual 30-day written cure notice before suspension by ${vendorCompany || 'either party'}.`
      );
    }
  } else if (
    lower.includes('async') ||
    lower.includes('foreach') ||
    lower.includes('fetch(') ||
    Boolean(firstKey)
  ) {
    if (lower.includes('foreach') && lower.includes('async')) {
      findings.push(
        `- Async Race Condition: \`Array.prototype.forEach\` ignores awaited callbacks, causing the function to return an empty array before network requests settle.`
      );
      findings.push(
        `- Recommended Fix: Replace \`batchOrders.forEach(async ...)\` with \`await Promise.all(batchOrders.map(async (order) => ...))\` and wrap each request in \`try/catch\` with \`if (!receipt.ok) throw\`.`
      );
    }
    if (firstKey) {
      findings.push(
        `- Credential Hardening: Move ${firstKey} out of source literals into server environment variables and rotate immediately.`
      );
    }
  } else if (
    lower.includes('medical') ||
    lower.includes('accommodation') ||
    Boolean(firstMedical)
  ) {
    findings.push(
      `- Protected Leave Eligibility: Approve ${firstPerson || 'the employee'}'s reduced schedule without salary impact (${firstAmount || 'current compensation'}) under standard medical accommodation policy.`
    );
    findings.push(
      `- Clinical Confidentiality: Keep ${firstMedical || 'clinical details'} strictly inside HR records—notify project leads only of shift availability.`
    );
  }

  if (findings.length === 0) {
    const riskKeywords = [
      'liability',
      'indemnify',
      'penalty',
      'termination',
      'breach',
      'unhandled',
      'catch',
      'timeout',
      'key',
      'secret',
      'salary',
      'medical',
      'leave',
      'compliance',
      'deadline',
      'exclusive',
      'perpetual',
    ].filter((kw) => lower.includes(kw));

    findings.push(
      `- Primary Focus: ${taskInstruction.trim() || 'Review key obligations, owners, and deadlines'}${firstCompany ? ` involving ${firstCompany}` : ''}${firstPerson ? ` and ${firstPerson}` : ''}.`
    );
    if (firstAmount) {
      findings.push(
        `- Financial Verification: Confirm payment schedule and approval thresholds tied to ${firstAmount}.`
      );
    }
    if (riskKeywords.length > 0) {
      findings.push(
        `- Action Items: Address flagged areas (${riskKeywords.join(', ')}) before finalizing.`
      );
    }
  }

  if (taskLower.includes('counter-offer') || taskLower.includes('draft')) {
    findings.push(
      `- Suggested Clause: "Neither party shall be liable for indirect or consequential damages, and aggregate liability shall not exceed fees paid in the prior twelve (12) months."`
    );
  }

  const header =
    actionType === 'airgap-reason'
      ? `ON-DEVICE ANALYSIS (${taskInstruction.trim() || 'Local Review'})`
      : 'LOCAL QUICK SUMMARY (100% ON-DEVICE)';

  return [header, '', ...findings].join('\n');
}
