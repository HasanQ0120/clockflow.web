/**
 * On-device step of the hybrid pipeline: Chrome's Prompt API (Gemini Nano).
 *
 * Chrome exposes the Prompt API as the global `LanguageModel`. Earlier previews exposed it as
 * `window.ai.languageModel`, so both are supported. Nothing here ever touches the network:
 * the model runs inside the browser, and the text never leaves the tab.
 */
import type { Kind } from './tokenizer';

export type NanoState = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';
export interface NanoStatus { state: NanoState; api: 'LanguageModel' | 'window.ai.languageModel' | null }
export interface DeviceEntity { value: string; kind: Kind }

interface Session { prompt(input: string, opts?: unknown): Promise<string>; destroy?: () => void }
interface Api {
  name: NonNullable<NanoStatus['api']>;
  availability(): Promise<NanoState>;
  create(opts: Record<string, unknown>): Promise<Session>;
}

const LANG = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

function normalise(a: unknown): NanoState {
  if (a === 'available' || a === 'readily') return 'available';
  if (a === 'downloadable' || a === 'after-download') return 'downloadable';
  if (a === 'downloading') return 'downloading';
  return 'unavailable';
}

function getApi(): Api | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, any>;
  if (w.LanguageModel?.create) {
    const lm = w.LanguageModel;
    return {
      name: 'LanguageModel',
      availability: async () => normalise(await lm.availability(LANG).catch(() => lm.availability())),
      create: async (o) => lm.create({ ...LANG, ...o }).catch(() => lm.create(o)),
    };
  }
  const legacy = w.ai?.languageModel;
  if (legacy?.create) {
    return {
      name: 'window.ai.languageModel',
      availability: async () => normalise((await legacy.capabilities?.())?.available),
      create: async (o) => {
        const sys = (o.initialPrompts as { content: string }[] | undefined)?.[0]?.content;
        return legacy.create({ systemPrompt: sys, monitor: o.monitor, signal: o.signal });
      },
    };
  }
  return null;
}

export async function getOnDeviceStatus(): Promise<NanoStatus> {
  const api = getApi();
  if (!api) return { state: 'unsupported', api: null };
  try { return { state: await api.availability(), api: api.name }; } catch { return { state: 'unavailable', api: api.name }; }
}

/** Starts the one-time model download. Chrome requires this to follow a user gesture. */
export async function downloadOnDeviceModel(onProgress: (fraction: number) => void): Promise<NanoStatus> {
  const api = getApi();
  if (!api) return { state: 'unsupported', api: null };
  const session = await api.create({
    monitor(m: EventTarget) { m.addEventListener('downloadprogress', (e) => onProgress((e as unknown as { loaded: number }).loaded)); },
  });
  session.destroy?.();
  return getOnDeviceStatus();
}

const CATEGORIES: { key: string; kind: Kind }[] = [
  { key: 'people', kind: 'PERSON' }, { key: 'organizations', kind: 'ORG' }, { key: 'emails', kind: 'EMAIL' },
  { key: 'phones', kind: 'PHONE' }, { key: 'secrets', kind: 'API_KEY' }, { key: 'amounts', kind: 'AMOUNT' },
  { key: 'identifiers', kind: 'ID' },
];

const SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(CATEGORIES.map((c) => [c.key, { type: 'array', items: { type: 'string' } }])),
  required: CATEGORIES.map((c) => c.key),
};

const SYSTEM = [
  'You are a privacy scanner running on the user\'s own device.',
  'Find sensitive values that appear VERBATIM in the text the user sends.',
  'Return JSON with these arrays: people (full names), organizations (company names), emails, phones,',
  'secrets (API keys, tokens, passwords), amounts (money), identifiers (account, invoice, employee or similar ids).',
  'Copy each value exactly as written. Do not invent or normalise values. Use an empty array when there is none.',
].join(' ');

/** Keeps only what the model found verbatim in the text, mapped to token categories. */
export function parseEntities(text: string, raw: string): DeviceEntity[] {
  let obj: Record<string, unknown>;
  try { obj = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { return []; }
  const out: DeviceEntity[] = [];
  const seen = new Set<string>();
  for (const { key, kind } of CATEGORIES) {
    const list = obj[key];
    if (!Array.isArray(list)) continue;
    for (const v of list) {
      if (typeof v !== 'string') continue;
      const value = v.trim();
      if (value.length < 2 || !text.includes(value) || /^\[[A-Z_]+_\d+\]$/.test(value) || seen.has(value)) continue;
      seen.add(value);
      out.push({ value, kind });
    }
  }
  return out;
}

/**
 * Asks Gemini Nano (via the Prompt API) which values in `text` are sensitive.
 * Resolves to null when the model is not ready, so callers can say so instead of pretending it ran.
 */
export async function detectEntitiesOnDevice(text: string, timeoutMs = 15000): Promise<{ entities: DeviceEntity[]; api: string } | null> {
  const api = getApi();
  if (!api || !text.trim()) return null;
  if ((await api.availability().catch(() => 'unavailable')) !== 'available') return null;
  const ctl = new AbortController();
  let session: Session | null = null;
  const work = (async () => {
    session = await api.create({ initialPrompts: [{ role: 'system', content: SYSTEM }], signal: ctl.signal });
    let out: string;
    try { out = await session.prompt(text, { responseConstraint: SCHEMA, signal: ctl.signal }); }
    catch { out = await session.prompt(text); } // older builds without responseConstraint
    return { entities: parseEntities(text, out), api: api.name };
  })();
  try {
    return await Promise.race([work, new Promise<null>((r) => setTimeout(() => { ctl.abort(); r(null); }, timeoutMs))]);
  } catch {
    return null;
  } finally {
    (session as Session | null)?.destroy?.();
  }
}
