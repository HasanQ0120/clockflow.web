import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3001);
const MODEL_NAME = 'gemini-2.5-flash';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractReadableErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : String(err || 'Upstream Gemini reasoning error.');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return String(parsed.error.message);
    }
  } catch {
    // Not raw JSON; return cleaned string
  }
  return raw;
}

function buildHybridSystemPrompt(
  syntheticContextMode: boolean,
  placeholders: unknown
): string {
  const tokenList = Array.isArray(placeholders)
    ? placeholders.slice(0, 40).join(', ')
    : '';

  return [
    'You are the cloud reasoning stage of CloakFlow, a Zero-Leak Hybrid Privacy Architecture.',
    'The input you receive has ALREADY been scrubbed locally on the user device.',
    syntheticContextMode
      ? 'Synthetic dummy personas and dummy credentials are embedded for natural reasoning. Preserve those exact synthetic names, companies, emails, phone numbers, amounts, and keys verbatim wherever you reference them so the client device can swap the real secrets back in.'
      : 'Bracketed placeholder tokens like [PERSON_1], [COMPANY_1], [API_KEY_1], [EMAIL_1], [AMOUNT_1] represent redacted secrets. You MUST preserve every placeholder token verbatim with exact brackets and capitalization wherever you reference that entity so local restoration succeeds.',
    tokenList ? `Active tokens to preserve verbatim: ${tokenList}` : '',
    'Deliver ONLY your direct, well-structured expert response, analysis, or recommendations addressing the Task Instruction.',
    'Do NOT repeat or echo back the input document verbatim, and do NOT output an inventory or list of protected entities/tokens.',
  ]
    .filter(Boolean)
    .join('\n');
}

async function generateWithRetry(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string
) {
  const maxAttempts = 2;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } catch (err: unknown) {
      lastError = err;
      const msg = extractReadableErrorMessage(err);
      const isTransient =
        /503|UNAVAILABLE|high demand|429|RESOURCE_EXHAUSTED/i.test(msg);
      if (attempt < maxAttempts && isTransient) {
        await new Promise((r) => setTimeout(r, 650 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({
      status: 'ok',
      geminiConfigured: hasKey,
      model: MODEL_NAME,
      streaming: true,
    });
  });

  app.post('/api/hybrid-reason-stream', async (req, res) => {
    const startMs = Date.now();
    let closed = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        closed = true;
      }
    });

    try {
      const {
        sanitizedInput,
        taskInstruction,
        syntheticContextMode,
        placeholders,
      } = req.body ?? {};

      if (typeof sanitizedInput !== 'string' || !sanitizedInput.trim()) {
        res.status(400).json({
          error: 'Sanitized input is required for hybrid cloud reasoning.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in Settings > Secrets. Switch to Offline Mode for 100% on-device execution or configure your API key.',
          code: 'MISSING_API_KEY',
        });
        return;
      }

      const systemInstruction = buildHybridSystemPrompt(
        Boolean(syntheticContextMode),
        placeholders
      );

      const prompt = [
        `Task Instruction: ${String(taskInstruction || 'Analyze and solve.')}`,
        '',
        'Sanitized Payload:',
        sanitizedInput,
      ].join('\n');

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const streamResponse = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      let emittedChars = 0;
      for await (const chunk of streamResponse) {
        if (closed) break;
        const delta = chunk.text ?? '';
        if (delta) {
          emittedChars += delta.length;
          res.write(
            `data: ${JSON.stringify({ type: 'chunk', text: delta })}\n\n`
          );
        }
      }

      if (!closed && !res.writableEnded) {
        if (emittedChars === 0) {
          res.write(
            `data: ${JSON.stringify({
              type: 'error',
              error:
                'Gemini returned an empty stream for the sanitized payload.',
            })}\n\n`
          );
        } else {
          const cloudLatencyMs = Math.max(1, Date.now() - startMs);
          res.write(
            `data: ${JSON.stringify({
              type: 'done',
              model: MODEL_NAME,
              cloudLatencyMs,
            })}\n\n`
          );
        }
        res.end();
      }
    } catch (err: unknown) {
      const message = extractReadableErrorMessage(err);
      if (!res.headersSent) {
        res.status(502).json({ error: message });
      } else if (!closed && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', error: message })}\n\n`
        );
        res.end();
      }
    }
  });

  app.post('/api/hybrid-reason', async (req, res) => {
    const startMs = Date.now();
    try {
      const {
        sanitizedInput,
        taskInstruction,
        syntheticContextMode,
        placeholders,
      } = req.body ?? {};

      if (typeof sanitizedInput !== 'string' || !sanitizedInput.trim()) {
        res.status(400).json({
          error: 'Sanitized input is required for hybrid cloud reasoning.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in Settings > Secrets. Switch to Offline Mode for 100% on-device execution or configure your API key.',
          code: 'MISSING_API_KEY',
        });
        return;
      }

      const systemInstruction = buildHybridSystemPrompt(
        Boolean(syntheticContextMode),
        placeholders
      );

      const prompt = [
        `Task Instruction: ${String(taskInstruction || 'Analyze and solve.')}`,
        '',
        'Sanitized Payload:',
        sanitizedInput,
      ].join('\n');

      const response = await generateWithRetry(ai, prompt, systemInstruction);

      const text = response.text ?? '';
      if (!text.trim()) {
        res.status(502).json({
          error: 'Gemini returned an empty response for the sanitized payload.',
        });
        return;
      }

      const cloudLatencyMs = Math.max(1, Date.now() - startMs);
      res.json({
        text,
        model: MODEL_NAME,
        cloudLatencyMs,
      });
    } catch (err: unknown) {
      const message = extractReadableErrorMessage(err);
      res.status(502).json({
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CloakFlow server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
