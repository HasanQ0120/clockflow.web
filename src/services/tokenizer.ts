/**
 * CloakFlow tokenization service.
 *
 * Everything here runs in the browser. The TokenVault is the only place the
 * original values live; text sent to the cloud contains placeholders only.
 */

export type Kind =
  | 'PERSON' | 'EMAIL' | 'PHONE' | 'API_KEY' | 'ACCESS_TOKEN' | 'PASSWORD'
  | 'SECRET' | 'CARD' | 'SSN' | 'ID' | 'AMOUNT' | 'ORG' | 'CUSTOM';

export const KIND_LABEL: Record<Kind, string> = {
  PERSON: 'Person', EMAIL: 'Email', PHONE: 'Phone', API_KEY: 'API key', ACCESS_TOKEN: 'Access token',
  PASSWORD: 'Password', SECRET: 'Secret', CARD: 'Card number', SSN: 'National ID', ID: 'Identifier', AMOUNT: 'Amount',
  ORG: 'Organisation', CUSTOM: 'Protected by you',
};

export interface Hit { start: number; end: number; kind: Kind; value: string; priority: number }
export interface Segment { text: string; token?: string; kind?: Kind }
export interface VaultEntry { token: string; kind: Kind; value: string }
export interface DetectOptions {
  /** Text the user explicitly chose to protect. */
  manual?: string[];
  /** Configured confidential identifiers (project names, customer ids …). */
  configured?: string[];
  /** Person names found by an on-device model. */
  extraNames?: string[];
  /** Entities found by an on-device model, each with the category it was found as. */
  extra?: { value: string; kind: Kind }[];
}
export interface SanitizeResult { segments: Segment[]; sanitized: string; entries: VaultEntry[] }

const TOKEN_RE = /\[([A-Z][A-Z_]*_\d+)\]/g;

/** In-memory vault: stable value → token mapping for the session. */
export class TokenVault {
  private byValue = new Map<string, string>();
  private byToken = new Map<string, VaultEntry>();
  private counts: Partial<Record<Kind, number>> = {};

  tokenFor(kind: Kind, value: string): string {
    const known = this.byValue.get(value);
    if (known) return known;
    const n = (this.counts[kind] ?? 0) + 1;
    this.counts[kind] = n;
    const token = `[${kind}_${n}]`;
    this.byValue.set(value, token);
    this.byToken.set(token, { token, kind, value });
    return token;
  }

  get(token: string): VaultEntry | undefined { return this.byToken.get(token); }
  get size() { return this.byToken.size; }

  clone(): TokenVault {
    const v = new TokenVault();
    this.byValue.forEach((t, k) => v.byValue.set(k, t));
    this.byToken.forEach((e, t) => v.byToken.set(t, { ...e }));
    v.counts = { ...this.counts };
    return v;
  }
  clear() { this.byValue.clear(); this.byToken.clear(); this.counts = {}; }
}

/* ───────────── detection ───────────── */
const luhn = (digits: string) => {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = +digits[i];
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
};
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const KEY_NAME = String.raw`(?:api[_ -]?key|apikey|x-api-key|client[_-]?id)`;
const TOK_NAME = String.raw`(?:access[_ -]?token|auth[_ -]?token|refresh[_ -]?token|bearer|token)`;
const SECRET_NAME = String.raw`(?:secret(?:[_ -]?key)?|client[_-]?secret|private[_ -]?key|signing[_ -]?key)`;
const ASSIGN = String.raw`\s*(?:is\s+|[:=]\s*)["']?`;

interface Rule { kind: Kind; re: RegExp; valid?: (v: string) => boolean }

/** Ordered by priority: earlier rules win overlaps. */
const RULES: Rule[] = [
  { kind: 'EMAIL', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g },
  { kind: 'CARD', re: /\b(?:\d[ -]?){12,18}\d\b/g, valid: (v) => { const d = v.replace(/\D/g, ''); return d.length >= 13 && d.length <= 19 && luhn(d); } },
  { kind: 'SSN', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: 'API_KEY', re: new RegExp(String.raw`\b(?:sk|pk|rk)[-_](?:live_|test_|proj-)?[A-Za-z0-9_-]{4,}|\bAKIA[0-9A-Z]{12,}|\bAIza[0-9A-Za-z_-]{20,}|\bxox[baprs]-[A-Za-z0-9-]{10,}|(?<=\b${KEY_NAME}${ASSIGN})[A-Za-z0-9_\-./+]{6,}`, 'gi') },
  { kind: 'ACCESS_TOKEN', re: new RegExp(String.raw`\bgh[pousr]_[A-Za-z0-9]{20,}|\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]+|(?<=\bBearer\s+)[A-Za-z0-9_\-./+=]{12,}|(?<=\b${TOK_NAME}${ASSIGN})[A-Za-z0-9_\-./+=]{8,}`, 'gi') },
  { kind: 'SECRET', re: new RegExp(String.raw`(?<=\b${SECRET_NAME}${ASSIGN})[A-Za-z0-9_\-./+=]{6,}`, 'gi') },
  { kind: 'PASSWORD', re: /(?<=\b(?:password|passwd|pwd|passcode)\s*(?:is\s+|[:=]\s*)["']?)[^\s"',;]+/gi },
  { kind: 'ID', re: /(?<=\b(?:account|acct|customer|employee|member|invoice|order|case|ticket|policy|patient|user)(?:\s+(?:number|no\.?|id))?\s*[:#]?\s*)\d{4,}(?:[ -]\d{3,})*\b/gi },
  { kind: 'PHONE', re: /\+\d[\d\s().-]{7,}\d|(?<![\d-])\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b0\d{3}[-\s]?\d{7}\b/g },
  { kind: 'AMOUNT', re: /[$£€₹]\s?\d(?:[\d,]*\d)?(?:\.\d+)?(?:\s?(?:k|m|mm|bn|b|thousand|million|billion|lakhs?|lacs?|crores?)\b)?|\b(?:USD|EUR|GBP|PKR|INR|AED|SAR|CAD|AUD|Rs\.?|Rupees?)\s?\d(?:[\d,]*\d)?(?:\.\d+)?(?:\s?(?:k|m|mm|bn|b|thousand|million|billion|lakhs?|lacs?|crores?)\b)?|\b\d(?:[\d,]*\d)?(?:\.\d+)?(?:\s?(?:k|m|mm|bn|b|thousand|million|billion|lakhs?|lacs?|crores?)\b)?\s?(?:rupees?|dollars?|bucks|euros?|pounds?|quid|dirhams?|riyals?|usd|eur|gbp|pkr|inr|aed|sar|cad|aud|rs)\b|\b\d(?:[\d,]*\d)?(?:\.\d+)?\s?(?:lakhs?|lacs?|crores?)\b|(?<=\b(?:salary|salaries|pay|paid|payment|price|priced|cost|costs|budget|fee|fees|bonus|rent|owe|owes|owed|worth|charge|charged|revenue|income|loan|deposit|balance|total|amount|stipend|wage|wages|ctc|package|raise|offer|offered|valuation|funding)\b(?:\s+(?:is|was|are|of|at|about|around|approximately|to|for)|\s*[:=])*\s*)\d(?:[\d,]*\d)?(?:\.\d+)?(?:\s?(?:k|m|mm|bn|b|thousand|million|billion|lakhs?|lacs?|crores?)\b)?(?![\d,.]*\s?(?:%|percent|years?|months?|days?|hours?|am|pm|times|people|items)\b)(?![\d-])/gi },
  { kind: 'ORG', re: /\b[A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)? (?:Inc|LLC|Ltd|Corp|GmbH|Co)\b\.?|\b[A-Z][a-z]+[A-Z][A-Za-z]+\b/g, valid: (v) => !ORG_SKIP.has(v) },
];

const ORG_SKIP = new Set(['JavaScript', 'TypeScript', 'GitHub', 'OpenAI', 'PostgreSQL', 'MongoDB', 'LinkedIn', 'YouTube', 'iPhone', 'WhatsApp', 'CloakFlow', 'DeepMind']);
const NAME_STOP = new Set(['Review', 'Draft', 'Debug', 'Client', 'Please', 'Dear', 'Hello', 'Thanks', 'Regards', 'Summarize', 'Write', 'Fix', 'The', 'This', 'That', 'Hi', 'Mr', 'Mrs', 'Ms', 'Dr', 'Subject', 'Best', 'Kind', 'Contact', 'Call', 'Email', 'Send', 'Reply', 'Customer', 'Employee', 'Manager', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March', 'April', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

const SOFT_STOP = new Set(['Support', 'Sales', 'Team', 'Admin', 'Everyone', 'All', 'Service', 'Finance', 'Legal', 'Marketing', 'Billing', 'Help', 'Info', 'Sir', 'Madam', 'Guys', 'Folks', 'Both', 'Anyone', 'Someone', 'Today', 'Tomorrow', 'Again', 'Them', 'Him', 'Her', 'Once', 'Now']);
/** A single capitalised word right after a strong cue ("Dear Sarah", "Contact Sarah"). */
const CUE_NAME = /\b(?:Dear|Hi|Hello|Hey|Contact|Attn|Mr\.?|Mrs\.?|Ms\.?|Dr\.?|cc|CC|Ask|Tell|Email|Call|Thanks,?)\s+([A-Z][a-z]{2,})\b/g;

/** Heuristic person detection: runs of two or more capitalised words. */
function detectNames(text: string): { start: number; end: number; value: string }[] {
  const out: { start: number; end: number; value: string }[] = [];
  for (const m of text.matchAll(/\b[A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})+\b/g)) {
    const words = m[0].split(' ');
    let skip = 0;
    const stop = (w: string) => NAME_STOP.has(w) || SOFT_STOP.has(w);
    while (skip < words.length && stop(words[skip])) skip++;
    while (words.length > skip + 1 && stop(words[words.length - 1])) words.pop();
    if (words.length - skip < 2) continue;
    const value = words.slice(skip).join(' ');
    const start = m.index! + (skip ? words.slice(0, skip).join(' ').length + 1 : 0);
    out.push({ start, end: start + value.length, value });
  }
  for (const m of text.matchAll(CUE_NAME)) {
    const v = m[1];
    if (NAME_STOP.has(v) || SOFT_STOP.has(v)) continue;
    const start = m.index! + m[0].length - v.length;
    out.push({ start, end: start + v.length, value: v });
  }
  return out;
}

function findAll(text: string, needle: string): { start: number; end: number; value: string }[] {
  const n = needle.trim();
  if (n.length < 2) return [];
  return [...text.matchAll(new RegExp(escapeRe(n), 'g'))].map((m) => ({ start: m.index!, end: m.index! + n.length, value: n }));
}

export function detect(text: string, opts: DetectOptions = {}): Hit[] {
  // Placeholders already in the text must never be re-tokenized.
  const blocked = [...text.matchAll(TOKEN_RE)].map((m) => [m.index!, m.index! + m[0].length] as const);
  const cands: Hit[] = [];
  const push = (kind: Kind, priority: number, h: { start: number; end: number; value: string }) => cands.push({ ...h, kind, priority });

  opts.manual?.forEach((s) => findAll(text, s).forEach((h) => push('CUSTOM', 0, h)));
  opts.configured?.forEach((s) => findAll(text, s).forEach((h) => push('CUSTOM', 1, h)));
  RULES.forEach((r, i) => {
    for (const m of text.matchAll(r.re)) {
      if (r.valid && !r.valid(m[0])) continue;
      push(r.kind, 2 + i, { start: m.index!, end: m.index! + m[0].length, value: m[0] });
    }
  });
  opts.extraNames?.forEach((s) => findAll(text, s).forEach((h) => push('PERSON', 2 + RULES.length, h)));
  opts.extra?.forEach(({ value, kind }) => findAll(text, value).forEach((h) => push(kind, 2 + RULES.length, h)));
  detectNames(text).forEach((h) => push('PERSON', 3 + RULES.length, h));

  cands.sort((a, b) => a.priority - b.priority || (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const accepted: Hit[] = [];
  for (const c of cands) {
    if (blocked.some(([s, e]) => c.start < e && c.end > s)) continue;
    if (accepted.some((a) => c.start < a.end && c.end > a.start)) continue;
    accepted.push(c);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

/** Replace sensitive values with vault tokens. Text between matches is untouched. */
export function sanitize(text: string, vault: TokenVault, opts: DetectOptions = {}): SanitizeResult {
  const hits = detect(text, opts);
  const segments: Segment[] = [];
  const entries: VaultEntry[] = [];
  const seen = new Set<string>();
  let cur = 0;
  for (const h of hits) {
    if (h.start > cur) segments.push({ text: text.slice(cur, h.start) });
    const token = vault.tokenFor(h.kind, h.value);
    segments.push({ text: token, token, kind: h.kind });
    if (!seen.has(token)) { seen.add(token); entries.push(vault.get(token)!); }
    cur = h.end;
  }
  if (cur < text.length) segments.push({ text: text.slice(cur) });
  return { segments, sanitized: segments.map((s) => s.text).join(''), entries };
}

/** Restore only tokens the local vault knows about; unknown placeholders are left alone. */
export function restore(text: string, vault: TokenVault): string {
  return text.replace(TOKEN_RE, (full) => vault.get(full)?.value ?? full);
}

/** Split restored text into plain / restored runs for highlighting. */
export function restoreSegments(text: string, vault: TokenVault): { text: string; restored: boolean }[] {
  const out: { text: string; restored: boolean }[] = [];
  let cur = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const entry = vault.get(m[0]);
    if (!entry) continue;
    if (m.index! > cur) out.push({ text: text.slice(cur, m.index), restored: false });
    out.push({ text: entry.value, restored: true });
    cur = m.index! + m[0].length;
  }
  if (cur < text.length) out.push({ text: text.slice(cur), restored: false });
  return out;
}

export const DETECTED_CATEGORIES: Kind[] = ['PERSON', 'EMAIL', 'PHONE', 'API_KEY', 'ACCESS_TOKEN', 'PASSWORD', 'SECRET', 'CARD', 'SSN', 'ID', 'AMOUNT', 'ORG', 'CUSTOM'];
