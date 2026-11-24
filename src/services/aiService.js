import { runDeterministicLocalAction } from '../utils/privacyEngine';

/**
 * Checks if Chrome Built-in On-Device AI (`LanguageModel` or `window.ai`)
 * is ALREADY warm and ready (never waits on slow model downloads).
 * @returns {Promise<{ available: boolean, engine: string }>}
 */
export async function detectOnDeviceAI() {
  if (typeof window === 'undefined') {
    return { available: false, engine: 'Local Guard' };
  }

  try {
    if (window.LanguageModel && typeof window.LanguageModel.availability === 'function') {
      const status = await window.LanguageModel.availability();
      if (status === 'available' || status === 'readily') {
        return { available: true, engine: 'Chrome Gemini Nano' };
      }
    }

    if (window.ai?.languageModel && typeof window.ai.languageModel.capabilities === 'function') {
      const caps = await window.ai.languageModel.capabilities();
      if (caps?.available === 'readily') {
        return { available: true, engine: 'Chrome Gemini Nano' };
      }
    }
  } catch {
    // Graceful fallback to deterministic local guard
  }

  return { available: false, engine: 'Local Guard' };
}

/**
 * Attempts an instant on-device prompt ONLY if Chrome Gemini Nano is already warm.
 * Never blocks on model downloads; caps total wait at 20s before falling back.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 */
async function tryChromeBuiltInPrompt(systemPrompt, userPrompt) {
  if (typeof window === 'undefined') return null;

  const runPrompt = async () => {
    if (window.LanguageModel && typeof window.LanguageModel.create === 'function') {
      const availability = await window.LanguageModel.availability();
      if (availability === 'available' || availability === 'readily') {
        const session = await window.LanguageModel.create({
          initialPrompts: [{ role: 'system', content: systemPrompt }],
        });
        const output = await session.prompt(userPrompt);
        session.destroy?.();
        return typeof output === 'string' && output.trim() ? output.trim() : null;
      }
    }

    if (window.ai?.languageModel && typeof window.ai.languageModel.create === 'function') {
      const caps = await window.ai.languageModel.capabilities();
      if (caps?.available === 'readily') {
        const session = await window.ai.languageModel.create({
          systemPrompt,
        });
        const output = await session.prompt(userPrompt);
        session.destroy?.();
        return typeof output === 'string' && output.trim() ? output.trim() : null;
      }
    }
    return null;
  };

  try {
    return await Promise.race([
      runPrompt(),
      new Promise((resolve) => window.setTimeout(() => resolve(null), 20000)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Offline grammar / summary on SANITIZED text. Uses Chrome Gemini Nano when it is ready,
 * otherwise the deterministic local engine, and reports which one actually ran.
 * @param {{ sanitizedInput: string, actionType: 'grammar' | 'summary' }} p
 * @returns {Promise<{ text: string, engine: 'nano' | 'deterministic', engineLabel: string, localMs: number }>}
 */
export async function runLocalOnSanitized({ sanitizedInput, actionType }) {
  const t0 = performance.now();
  const instruction =
    actionType === 'grammar'
      ? 'Fix grammar, punctuation, and clarity while preserving every bracketed placeholder exactly.'
      : 'Produce a concise summary preserving every bracketed placeholder exactly.';
  const nano = await tryChromeBuiltInPrompt(
    'You are an on-device assistant. Never alter bracketed tokens such as [PERSON_1].',
    `${instruction}\n\nText:\n${sanitizedInput}`
  );
  const localMs = () => Math.max(1, Math.round(performance.now() - t0));
  if (nano) return { text: nano, engine: 'nano', engineLabel: 'Chrome Gemini Nano', localMs: localMs() };
  return {
    text: runDeterministicLocalAction(sanitizedInput, actionType),
    engine: 'deterministic',
    engineLabel: 'Built-in local engine (Gemini Nano is not available in this browser)',
    localMs: localMs(),
  };
}

/**
 * Cloud step: streams Gemini's answer for SANITIZED text from the Express server
 * (POST /api/hybrid-reason-stream). The server holds GEMINI_API_KEY; the browser never sees it.
 * @param {{ sanitizedInput: string, taskInstruction?: string, placeholders?: string[], signal?: AbortSignal, onChunk?: (accumulated: string) => void }} p
 * @returns {Promise<{ text: string, model: string, cloudMs: number, sentBytes: number }>}
 */
export async function streamCloud({ sanitizedInput, taskInstruction = '', placeholders = [], signal, onChunk }) {
  const t0 = performance.now();
  const payload = JSON.stringify({
    sanitizedInput,
    taskInstruction: taskInstruction.trim() || 'Analyze the content and give actionable recommendations.',
    placeholders,
  });

  let response;
  try {
    response = await fetch('/api/hybrid-reason-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: payload,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new Error('Could not reach the CloakFlow server. Is `npm run dev` running?');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || `Cloud request failed with status ${response.status}.`);
  }
  if (!response.body) throw new Error('Streaming is not available in this browser.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let model = 'gemini';

  const handle = (block) => {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data:')) continue;
      let evt;
      try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
      if (evt.type === 'error') throw new Error(evt.error || 'The cloud model returned an error.');
      if (evt.type === 'chunk' && typeof evt.text === 'string') { text += evt.text; onChunk?.(text); }
      if (evt.type === 'done' && evt.model) model = evt.model;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    parts.forEach(handle);
  }
  if (buffer.trim()) handle(buffer);

  if (!text.trim()) throw new Error('The cloud model returned an empty response.');
  return { text, model, cloudMs: Math.max(1, Math.round(performance.now() - t0)), sentBytes: new TextEncoder().encode(payload).length };
}
