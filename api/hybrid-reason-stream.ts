/**
 * Vercel serverless function: POST /api/hybrid-reason-stream
 * Streams Gemini's answer for SANITIZED text as Server-Sent Events.
 * Same wire format as the Express route in server.ts (events: chunk, done, error).
 * Needs the GEMINI_API_KEY environment variable.
 */
import { GoogleGenAI } from '@google/genai';

export const config = { maxDuration: 60 };

const MODEL_NAME = 'gemini-2.5-flash';

function readableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Upstream Gemini reasoning error.');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return String(parsed.error.message);
  } catch {
    // not JSON
  }
  return raw;
}

function systemPrompt(synthetic: boolean, placeholders: unknown): string {
  const tokenList = Array.isArray(placeholders) ? placeholders.slice(0, 40).join(', ') : '';
  return [
    'You are the cloud reasoning stage of CloakFlow, a Zero-Leak Hybrid Privacy Architecture.',
    'The input you receive has ALREADY been scrubbed locally on the user device.',
    synthetic
      ? 'Synthetic dummy personas and dummy credentials are embedded for natural reasoning. Preserve those exact synthetic names, companies, emails, phone numbers, amounts, and keys verbatim wherever you reference them so the client device can swap the real secrets back in.'
      : 'Bracketed placeholder tokens like [PERSON_1], [COMPANY_1], [API_KEY_1], [EMAIL_1], [AMOUNT_1] represent redacted secrets. You MUST preserve every placeholder token verbatim with exact brackets and capitalization wherever you reference that entity so local restoration succeeds.',
    tokenList ? `Active tokens to preserve verbatim: ${tokenList}` : '',
    'Deliver ONLY your direct, well-structured expert response, analysis, or recommendations addressing the Task Instruction.',
    'Do NOT repeat or echo back the input document verbatim, and do NOT output an inventory or list of protected entities/tokens.',
  ].filter(Boolean).join('\n');
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  const startMs = Date.now();

  let body: { sanitizedInput?: unknown; taskInstruction?: unknown; syntheticContextMode?: unknown; placeholders?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Request body must be JSON.' });
  }
  const { sanitizedInput, taskInstruction, syntheticContextMode, placeholders } = body;

  if (typeof sanitizedInput !== 'string' || !sanitizedInput.trim()) {
    return json(400, { error: 'Sanitized input is required for hybrid cloud reasoning.' });
  }
  if (sanitizedInput.length > 1_000_000) {
    return json(413, { error: 'Input is too large.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return json(503, {
      error: 'GEMINI_API_KEY is not configured on the server. Add it in your Vercel project settings (Environment Variables), or use an offline mode.',
      code: 'MISSING_API_KEY',
    });
  }

  const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
  const prompt = [`Task Instruction: ${String(taskInstruction || 'Analyze and solve.')}`, '', 'Sanitized Payload:', sanitizedInput].join('\n');

  const encoder = new TextEncoder();
  const send = (c: ReadableStreamDefaultController<Uint8Array>, payload: unknown) =>
    c.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstream = await ai.models.generateContentStream({
          model: MODEL_NAME,
          contents: prompt,
          config: { systemInstruction: systemPrompt(Boolean(syntheticContextMode), placeholders), thinkingConfig: { thinkingBudget: 0 } },
        });
        let emitted = 0;
        for await (const chunk of upstream) {
          if (request.signal.aborted) break;
          const delta = chunk.text ?? '';
          if (delta) {
            emitted += delta.length;
            send(controller, { type: 'chunk', text: delta });
          }
        }
        if (emitted === 0) send(controller, { type: 'error', error: 'Gemini returned an empty stream for the sanitized payload.' });
        else send(controller, { type: 'done', model: MODEL_NAME, cloudLatencyMs: Math.max(1, Date.now() - startMs) });
      } catch (err) {
        try { send(controller, { type: 'error', error: readableError(err) }); } catch { /* client gone */ }
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
