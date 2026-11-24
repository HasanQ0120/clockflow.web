/**
 * Cloud step of the hybrid pipeline: Gemini through Firebase AI Logic.
 * It only ever receives text that has already been sanitized on this device.
 */
import { CLOUD_MODEL, getCloudModel, isFirebaseConfigured } from '../firebase';

export interface CloudResult { text: string; model: string; cloudMs: number; sentBytes: number }

const bytes = (s: string) => new TextEncoder().encode(s).length;

function systemInstruction(placeholders: string[]) {
  return [
    'You are the cloud reasoning stage of CloakFlow, a privacy firewall.',
    'The input has ALREADY been sanitized on the user\'s device.',
    'Bracketed placeholders such as [PERSON_1], [EMAIL_1] or [API_KEY_1] stand for redacted private values.',
    'Keep every placeholder verbatim, with its exact brackets and capitalisation, wherever you refer to that value, so it can be restored locally.',
    'Never guess or invent what a placeholder stands for.',
    placeholders.length ? `Placeholders present: ${placeholders.slice(0, 60).join(', ')}.` : '',
    'Reply with your direct, well-structured answer to the task and nothing else.',
  ].filter(Boolean).join('\n');
}

function friendly(e: unknown): Error {
  const err = e as { name?: string; code?: string; message?: string; customErrorData?: { status?: number } };
  if (err?.name === 'AbortError') return err as Error;
  const status = err?.customErrorData?.status;
  const msg = err?.message ?? 'Unknown error';
  if (status === 403 || /api key not valid|permission|api-not-enabled|has not been used|blocked/i.test(msg)) {
    return new Error('Firebase rejected the request. Check the web API key, that the Firebase AI Logic API is enabled for this project, and any App Check enforcement.');
  }
  if (/genai config not found|failed_precondition/i.test(msg)) {
    return new Error('Firebase AI Logic is not set up for this project yet. In the Firebase console open AI Logic, click Get started, and choose the Gemini Developer API.');
  }
  if (status === 429 || /quota|\brate limit|too many requests|resource.exhausted/i.test(msg)) return new Error('The Gemini quota for this Firebase project is exhausted. Try again shortly.');
  if (status === 404 || /not found|model/i.test(msg) && /404/.test(msg)) return new Error(`Firebase AI Logic could not find the model "${CLOUD_MODEL}" for this project.`);
  if (/fetch|network|failed to fetch/i.test(msg)) return new Error('Could not reach Firebase AI Logic. Check your connection.');
  return new Error(`Cloud request failed: ${msg}`);
}

/** Streams a Gemini answer for SANITIZED text via the Firebase AI Logic SDK. */
export async function streamCloud(p: {
  sanitizedInput: string; taskInstruction?: string; placeholders?: string[]; signal?: AbortSignal; onChunk?: (accumulated: string) => void;
}): Promise<CloudResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured yet. Add your project\'s web config to .env (see .env.example) so Firebase AI Logic can reach Gemini. The offline modes still work.');
  }
  const system = systemInstruction(p.placeholders ?? []);
  const prompt = `Task:\n${p.taskInstruction?.trim() || 'Analyse the content and give actionable recommendations.'}\n\nSanitized content:\n${p.sanitizedInput}`;
  const t0 = performance.now();
  let text = '';
  try {
    const model = await getCloudModel(system);
    const result = await model.generateContentStream(prompt, { signal: p.signal });
    for await (const chunk of result.stream) {
      text += chunk.text();
      p.onChunk?.(text);
    }
  } catch (e) {
    throw friendly(e);
  }
  if (!text.trim()) throw new Error('The cloud model returned an empty response.');
  return { text, model: CLOUD_MODEL, cloudMs: Math.max(1, Math.round(performance.now() - t0)), sentBytes: bytes(system) + bytes(prompt) };
}
