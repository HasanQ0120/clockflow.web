import {
  scrubTextLocally,
  restoreSecretsInText,
  runDeterministicLocalAction,
} from '../utils/privacyEngine';

/**
 * ============================================================================
 * CloakFlow Hybrid AI Service (src/services/aiService.js)
 * ============================================================================
 */

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
 * Never blocks on model downloads; caps total wait at 1200ms before falling back.
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
      new Promise((resolve) => window.setTimeout(() => resolve(null), 1200)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Runs synchronous deterministic local redaction + verification in browser RAM (<15ms).
 * @param {string} rawText
 * @param {boolean} [syntheticContextMode]
 * @param {string[]} [whitelist]
 * @param {string[]} [blacklist]
 * @param {{ hidePrivateDetails?: boolean, maskApiKeys?: boolean, maskCurrencyAndPhones?: boolean }} [scrubOptions]
 */
export function runLocalPrivacyScrub(
  rawText,
  syntheticContextMode = false,
  whitelist = [],
  blacklist = [],
  scrubOptions = {}
) {
  const t0 = performance.now();
  const result = scrubTextLocally(
    rawText,
    syntheticContextMode,
    whitelist,
    blacklist,
    scrubOptions
  );
  const localSpeedMs = Math.max(1, Math.round(performance.now() - t0));

  return {
    ...result,
    localSpeedMs,
  };
}

/**
 * Streaming Hybrid Zero-Leak Flow:
 * 1. Scrub raw input synchronously in RAM (<15ms, 0 bytes leaked), notifying `onLocalCloak`.
 * 2. If Offline Mode is active, solve locally with zero internet requests.
 * 3. Otherwise stream SSE chunks from `/api/hybrid-reason-stream` (`gemini-2.5-flash`)
 *    and immediately restore real secrets as each chunk streams in via `onStreamUpdate`.
 * @param {{
 *   rawText: string,
 *   taskInstruction?: string,
 *   syntheticContextMode?: boolean,
 *   airGapMode?: boolean,
 *   whitelist?: string[],
 *   blacklist?: string[],
 *   scrubOptions?: { hidePrivateDetails?: boolean, maskApiKeys?: boolean, maskCurrencyAndPhones?: boolean },
 *   onLocalCloak?: (info: { scrub: ReturnType<typeof runLocalPrivacyScrub>, localSpeedMs: number }) => void,
 *   onStreamUpdate?: (update: { sanitizedResponse: string, restoredText: string, restoredSegments: any[] }) => void,
 *   signal?: AbortSignal
 * }} params
 */
export async function runHybridZeroLeakAIStream({
  rawText,
  taskInstruction = '',
  syntheticContextMode = false,
  airGapMode = false,
  whitelist = [],
  blacklist = [],
  scrubOptions = {},
  onLocalCloak,
  onStreamUpdate,
  signal,
}) {
  // Step 1: Synchronous in-memory scrub (<15ms)
  const scrub = runLocalPrivacyScrub(
    rawText,
    syntheticContextMode,
    whitelist,
    blacklist,
    scrubOptions
  );
  onLocalCloak?.({ scrub, localSpeedMs: scrub.localSpeedMs });

  const isOffline =
    airGapMode || (typeof navigator !== 'undefined' && navigator.onLine === false);

  if (isOffline) {
    const tLocalStart = performance.now();
    const nanoSystem =
      'You are CloakFlow Air-Gap On-Device AI. Analyze the sanitized input and preserve every bracketed placeholder or persona name verbatim.';
    const nanoPrompt = `Task: ${taskInstruction || 'Analyze and summarize risks.'}\n\nSanitized Input:\n${scrub.sanitizedText}`;
    const nanoOutput = await tryChromeBuiltInPrompt(nanoSystem, nanoPrompt);

    const rawLocalAnswer =
      nanoOutput ||
      runDeterministicLocalAction(
        scrub.sanitizedText,
        'airgap-reason',
        taskInstruction
      );

    const restored = restoreSecretsInText(rawLocalAnswer, scrub.vault);
    onStreamUpdate?.({
      sanitizedResponse: rawLocalAnswer,
      restoredText: restored.restoredText,
      restoredSegments: restored.segments,
    });

    const totalLocalMs = Math.max(
      scrub.localSpeedMs,
      Math.round(performance.now() - tLocalStart) + scrub.localSpeedMs
    );

    return {
      scrub,
      sanitizedResponse: rawLocalAnswer,
      restoredText: restored.restoredText,
      restoredSegments: restored.segments,
      routeLabel: '100% On-Device Local',
      engineDetail: nanoOutput ? 'Chrome Gemini Nano' : 'Air-Gap Local Engine',
      localSpeedMs: totalLocalMs,
      cloudSpeedMs: 0,
      cloudCalls: 0,
    };
  }

  // Step 2: Stream Cloud AI response via SSE
  const tCloudStart = performance.now();
  const response = await fetch('/api/hybrid-reason-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      sanitizedInput: scrub.sanitizedText,
      taskInstruction:
        taskInstruction?.trim() ||
        'Analyze the provided content thoroughly and provide actionable recommendations.',
      syntheticContextMode,
      placeholders: scrub.vault.map((v) => v.placeholder),
    }),
  });

  if (!response.ok) {
    const errPayload = await response.json().catch(() => ({}));
    throw new Error(
      errPayload?.error ||
        `Cloud reasoning request failed with status ${response.status}.`
    );
  }

  if (!response.body) {
    throw new Error('Streaming response body is unavailable in this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulatedCloud = '';
  let modelUsed = 'gemini-2.5-flash';
  let cloudLatencyMs = 0;

  const processEventBlock = (block) => {
    const lines = block.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      let evt;
      try {
        evt = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      if (evt.type === 'error') {
        throw new Error(evt.error || 'Upstream streaming error.');
      }
      if (evt.type === 'chunk' && typeof evt.text === 'string') {
        accumulatedCloud += evt.text;
        const restored = restoreSecretsInText(accumulatedCloud, scrub.vault);
        onStreamUpdate?.({
          sanitizedResponse: accumulatedCloud,
          restoredText: restored.restoredText,
          restoredSegments: restored.segments,
        });
      }
      if (evt.type === 'done') {
        if (evt.model) modelUsed = evt.model;
        if (evt.cloudLatencyMs) cloudLatencyMs = evt.cloudLatencyMs;
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    for (const part of parts) {
      processEventBlock(part);
    }
  }

  if (buffer.trim()) {
    processEventBlock(buffer);
  }

  const finalRestored = restoreSecretsInText(accumulatedCloud, scrub.vault);
  const measuredCloudMs = Math.max(
    1,
    cloudLatencyMs || Math.round(performance.now() - tCloudStart)
  );

  return {
    scrub,
    sanitizedResponse: accumulatedCloud,
    restoredText: finalRestored.restoredText,
    restoredSegments: finalRestored.segments,
    routeLabel: 'Hybrid Cloud',
    engineDetail: `Local Guard + ${modelUsed}`,
    localSpeedMs: scrub.localSpeedMs,
    cloudSpeedMs: measuredCloudMs,
    cloudCalls: 1,
  };
}

/**
 * Standard non-streaming Hybrid Zero-Leak call (kept for compatibility).
 * @param {{ rawText: string, taskInstruction?: string, syntheticContextMode?: boolean, airGapMode?: boolean, whitelist?: string[], blacklist?: string[], scrubOptions?: { hidePrivateDetails?: boolean, maskApiKeys?: boolean, maskCurrencyAndPhones?: boolean } }} params
 */
export async function runHybridZeroLeakAI(params) {
  return runHybridZeroLeakAIStream(params);
}

/**
 * Purely On-Device Quick Actions ("Fix Grammar", "Summarize", "Cloak Only").
 * Executes instantaneously in browser RAM with 0 Cloud Calls.
 * @param {{ rawText: string, actionType: 'grammar' | 'summary' | 'cloak', syntheticContextMode?: boolean, whitelist?: string[], blacklist?: string[], scrubOptions?: { hidePrivateDetails?: boolean, maskApiKeys?: boolean, maskCurrencyAndPhones?: boolean } }} params
 */
export async function runOnDeviceQuickAction({
  rawText,
  actionType,
  syntheticContextMode = false,
  whitelist = [],
  blacklist = [],
  scrubOptions = {},
}) {
  const t0 = performance.now();
  const scrub = runLocalPrivacyScrub(
    rawText,
    syntheticContextMode,
    whitelist,
    blacklist,
    scrubOptions
  );

  if (actionType === 'cloak') {
    const elapsedMs = Math.max(1, Math.round(performance.now() - t0));
    return {
      scrub,
      sanitizedResponse: scrub.sanitizedText,
      restoredText: scrub.sanitizedText,
      restoredSegments: scrub.segments.map((s) => ({
        text: s.text,
        isRestored: s.isToken,
        category: s.category,
        placeholder: s.placeholder,
      })),
      routeLabel: 'Cloaked Locally',
      engineDetail: '0 Cloud Calls',
      localSpeedMs: elapsedMs,
      cloudSpeedMs: 0,
      cloudCalls: 0,
    };
  }

  const instruction =
    actionType === 'grammar'
      ? 'Fix grammar, punctuation, and clarity while preserving every placeholder token exactly.'
      : 'Produce a concise, structured executive summary preserving every placeholder token exactly.';

  const nanoOutput = await tryChromeBuiltInPrompt(
    'You are an on-device privacy-preserving assistant. Never alter bracketed tokens.',
    `${instruction}\n\nText:\n${scrub.sanitizedText}`
  );

  const localText =
    nanoOutput || runDeterministicLocalAction(scrub.sanitizedText, actionType);

  const restored = restoreSecretsInText(localText, scrub.vault);
  const elapsedMs = Math.max(1, Math.round(performance.now() - t0));

  return {
    scrub,
    sanitizedResponse: localText,
    restoredText: restored.restoredText,
    restoredSegments: restored.segments,
    routeLabel: '100% On-Device Local',
    engineDetail: nanoOutput ? 'Chrome Gemini Nano' : '0 Cloud Calls',
    localSpeedMs: elapsedMs,
    cloudSpeedMs: 0,
    cloudCalls: 0,
  };
}
