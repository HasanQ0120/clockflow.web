import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import {
  KIND_LABEL, TokenVault, restoreSegments, sanitize,
  type DetectOptions, type SanitizeResult,
} from './services/tokenizer';
import { runLocalOnSanitized, streamCloud } from './services/aiService.js';
import { detectEntitiesOnDevice, downloadOnDeviceModel, getOnDeviceStatus, type DeviceEntity, type NanoStatus } from './services/onDevice';

import { extractActiveBlacklistTerms, loadSettings } from './utils/settingsStore';

const PRESETS = [
  { label: 'Client contract', text: 'Review this contract. Client is Usman Tariq from AlphaVentures, phone +92-300-1234567, paying $15,000.' },
  { label: 'Code with API keys', text: "Debug this code. API_KEY=sk-abc123xyz STRIPE_SECRET=sk_live_def456. It's throwing a 401 error." },
  { label: 'HR / salary note', text: "Draft a reply. Sarah Chen's salary is $95,000, her SSN is 123-45-6789, and she's on a PIP." },
];

type Action = 'cloud' | 'grammar' | 'summary';
const ACTIONS: { id: Action; label: string; hint: string; run: string }[] = [
  { id: 'cloud', label: 'Cloud AI', hint: 'Sanitized text goes to Gemini', run: 'Run Cloud AI' },
  { id: 'grammar', label: 'Fix grammar', hint: 'Offline, on your device', run: 'Fix grammar offline' },
  { id: 'summary', label: 'Quick summary', hint: 'Offline, on your device', run: 'Summarize offline' },
];

const STAGES = ['Private input', 'Detection', 'Sanitization', 'Cloud processing', 'Local restoration'];
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bytes = (s: string) => new TextEncoder().encode(s).length;

function Num({ value, dec = 0 }: { value: number; dec?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const o = useRef({ v: 0 });
  useEffect(() => {
    const tw = gsap.to(o.current, {
      v: value, duration: reduceMotion() ? 0 : 0.6, ease: 'power2.out',
      onUpdate: () => { if (ref.current) ref.current.textContent = o.current.v.toFixed(dec); },
    });
    return () => { tw.kill(); };
  }, [value, dec]);
  return <span ref={ref}>{(0).toFixed(dec)}</span>;
}

/**
 * Renders **bold** from the model's markdown as React elements. No HTML injection: model output and
 * restored private values are only ever text nodes.
 */
function renderOutput(segments: { text: string; restored: boolean }[]) {
  const markers = segments.reduce((n, s) => n + (s.restored ? 0 : s.text.split('**').length - 1), 0);
  let left = markers - (markers % 2); // an unpaired ** stays as typed
  let bold = false;
  const out: ReactNode[] = [];
  const push = (node: ReactNode, key: string) => out.push(bold ? <strong key={key}>{node}</strong> : <span key={key}>{node}</span>);
  segments.forEach((s, i) => {
    if (s.restored) { push(<mark>{s.text}</mark>, `${i}`); return; }
    s.text.split('**').forEach((part, j) => {
      if (j > 0) {
        if (left > 0) { bold = !bold; left -= 1; } else push('**', `${i}-${j}m`);
      }
      if (part) push(part, `${i}-${j}`);
    });
  });
  return out;
}

type Mode = 'idle' | 'cloud' | 'offline';
type Frozen = { raw: SanitizeResult; ask: SanitizeResult | null };

export default function Workspace() {
  const abort = useRef<AbortController | null>(null);
  const vaultRef = useRef(new TokenVault()); // session vault: lives in memory only

  const [raw, setRaw] = useState('');
  const [ask, setAsk] = useState('');
  const [action, setAction] = useState<Action>('cloud');
  const [manual, setManual] = useState<string[]>([]);
  const [term, setTerm] = useState('');
  const [selection, setSelection] = useState('');
  const [extra, setExtra] = useState<DeviceEntity[]>([]); // entities Gemini Nano found on this device
  const [scannedText, setScannedText] = useState(''); // input the last detection pass covered
  const [nanoText, setNanoText] = useState(''); // input Gemini Nano actually succeeded on
  const [nano, setNano] = useState<NanoStatus>({ state: 'unavailable', api: null });
  const [dl, setDl] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const cloudReady = true;

  const [mode, setMode] = useState<Mode>('idle');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1); // -1 idle · 0..4 active · 5 done
  const [status, setStatus] = useState('');
  const [frozen, setFrozen] = useState<Frozen | null>(null);
  const [outRaw, setOutRaw] = useState('');
  const [engine, setEngine] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [metrics, setMetrics] = useState({ leaked: 0, sent: 0, local: 0, cloud: 0 });

  const configured = useMemo(() => {
    try { return extractActiveBlacklistTerms(loadSettings()); } catch { return []; }
  }, []);
  const opts: DetectOptions = useMemo(() => ({ manual, configured, extra }), [manual, configured, extra]);

  /* Real-time firewall: recomputed on every keystroke against a copy of the session vault. */
  const live = useMemo(() => {
    const v = vaultRef.current.clone();
    const t0 = performance.now();
    const r = sanitize(raw, v, opts);
    const a = ask && action === 'cloud' ? sanitize(ask, v, opts) : null;
    const ms = performance.now() - t0;
    const entries = [...r.entries, ...(a?.entries.filter((e) => !r.entries.some((x) => x.token === e.token)) ?? [])];
    return { raw: r, ask: a, entries, ms };
  }, [raw, ask, action, opts]);

  const mergeEntries = (f: Frozen) => [...f.raw.entries, ...(f.ask?.entries ?? []).filter((e) => !f.raw.entries.some((x) => x.token === e.token))];
  const view = mode === 'idle' || !frozen ? { raw: live.raw, entries: live.entries } : { raw: frozen.raw, entries: mergeEntries(frozen) };
  const outSegments = useMemo(() => (outRaw ? restoreSegments(outRaw, vaultRef.current) : []), [outRaw, stage]);
  const liveLeak = live.entries.reduce((n, e) => (live.raw.sanitized.includes(e.value) ? n + bytes(e.value) : n), 0);

  useEffect(() => {
    gsap.to('.rail-fill', { scaleX: stage < 0 ? 0 : Math.min(stage, 4) / 4, duration: reduceMotion() ? 0 : 0.5, ease: 'power2.out' });
  }, [stage]);
  useEffect(() => () => abort.current?.abort(), []);

  const reset = () => {
    abort.current?.abort();
    setBusy(false); setStage(-1); setStatus(''); setFrozen(null); setOutRaw(''); setEngine(''); setError('');
    setMetrics({ leaked: 0, sent: 0, local: 0, cloud: 0 });
  };
  const touch = () => { if (mode !== 'idle') { reset(); setMode('idle'); } };

  const pulse = () => {
    if (reduceMotion()) return;
    gsap.fromTo('.pane-in', { boxShadow: '0 0 0 1px rgba(0,255,136,.9), 0 0 60px rgba(0,255,136,.25)' }, { boxShadow: '0 0 0 1px rgba(255,255,255,.09), 0 30px 80px -30px rgba(0,0,0,.8)', duration: 0.9 });
  };
  const flashTokens = () => {
    if (reduceMotion()) return;
    gsap.fromTo('.pane-mid .sanitized .tok', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2)' });
    gsap.from('.pane-mid .vault-row', { x: -16, opacity: 0, duration: 0.35, stagger: 0.08, delay: 0.1 });
  };
  const sweepOutput = () => {
    if (reduceMotion()) return;
    gsap.fromTo('.out-body', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power3.inOut' });
  };

  useEffect(() => { getOnDeviceStatus().then(setNano); }, []);

  const mergeExtra = (a: DeviceEntity[], b: DeviceEntity[]) => {
    const seen = new Set(a.map((e) => e.value));
    return [...a, ...b.filter((e) => !seen.has(e.value))];
  };

  const scanKey = `${raw}\n${action === 'cloud' ? ask : ''}`;

  /** Lets the user see what Gemini Nano finds before anything is run or sent. */
  const scanNano = async () => {
    if (!raw.trim() || scanning || busy) return;
    setScanning(true); setStatus('Gemini Nano is scanning on your device');
    const text = scanKey;
    const det = await detectEntitiesOnDevice(text);
    if (det) { setExtra((cur) => mergeExtra(cur, det.entities)); setNanoText(text); }
    else { setNanoText(''); setNano(await getOnDeviceStatus()); }
    setScannedText(text);
    setStatus(''); setScanning(false);
  };

  /* Automatic scan: once typing pauses, Gemini Nano reads the text on this device and adds what it finds. */
  useEffect(() => {
    if (nano.state !== 'available' || busy || !raw.trim()) return;
    const text = scanKey;
    if (text === scannedText) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      setScanning(true);
      const det = await detectEntitiesOnDevice(text);
      if (cancelled) { setScanning(false); return; }
      if (det) { setExtra((cur) => mergeExtra(cur, det.entities)); setNanoText(text); }
      setScannedText(text);
      setScanning(false);
    }, 900);
    return () => { cancelled = true; clearTimeout(id); };
  }, [scanKey, scannedText, nano.state, busy]);

  const downloadNano = async () => {
    setDl(0);
    try { setNano(await downloadOnDeviceModel((f) => setDl(f))); } catch { setNano(await getOnDeviceStatus()); }
    setDl(null);
  };

  /** Stages 0–2, shared by cloud and offline: detect, sanitize, commit to the session vault. */
  const prepare = async () => {
    setStage(0); setStatus('Reading input'); pulse();
    await new Promise((r) => setTimeout(r, 120));
    setStage(1); setStatus('Detecting sensitive values');
    const t0 = performance.now();
    if (nano.state === 'available') setStatus('Gemini Nano is scanning on your device');
    let found = extra;
    const det = await detectEntitiesOnDevice(scanKey);
    if (det) {
      found = mergeExtra(extra, det.entities);
      setExtra(found); setNanoText(scanKey);
    } else setNanoText('');
    setScannedText(scanKey);
    setStatus('Detecting sensitive values');
    const o: DetectOptions = { manual, configured, extra: found };
    const r = sanitize(raw, vaultRef.current, o);
    const a = action === 'cloud' && ask.trim() ? sanitize(ask, vaultRef.current, o) : null;
    const local = performance.now() - t0;
    const all = [...r.entries, ...(a?.entries ?? [])];
    const outgoing = r.sanitized + (a?.sanitized ?? '');
    const leaked = all.reduce((n, e) => (outgoing.includes(e.value) ? n + bytes(e.value) : n), 0);
    setStage(2); setStatus('Replacing values with placeholders');
    setFrozen({ raw: r, ask: a });
    setMetrics((m) => ({ ...m, local, leaked }));
    requestAnimationFrame(flashTokens);
    await new Promise((res) => setTimeout(res, reduceMotion() ? 0 : 650));
    return { r, a, all };
  };

  const runCloud = async () => {
    reset(); setMode('cloud'); setBusy(true);
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const { r, a, all } = await prepare();
      setStage(3); setStatus('Sanitized text is with Gemini via the CloakFlow server');
      const res = await streamCloud({
        sanitizedInput: r.sanitized, taskInstruction: a?.sanitized ?? '', placeholders: all.map((e) => e.token),
        signal: ctl.signal, onChunk: (acc: string) => setOutRaw(acc),
        onSend: (sent: number) => setMetrics((m) => ({ ...m, sent })),
      });
      setStage(4); setStatus('Restoring values from the local vault');
      setOutRaw(res.text); setEngine(`Gemini · ${res.model} via CloakFlow server`);
      setMetrics((m) => ({ ...m, sent: res.sentBytes, cloud: res.cloudMs }));
      await new Promise((r2) => setTimeout(r2, 250));
      setStage(5); setStatus('Scan complete'); sweepOutput();
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setError((e as Error).message || 'Cloud processing failed.');
      setStatus('Stopped'); setStage(-1);
    } finally { setBusy(false); }
  };

  const runOffline = async (kind: 'grammar' | 'summary') => {
    reset(); setMode('offline'); setBusy(true);
    try {
      const { r } = await prepare();
      setStage(3); setStatus('Processing on your device');
      const res = await runLocalOnSanitized({ sanitizedInput: r.sanitized, actionType: kind });
      setStage(4); setStatus('Restoring values from the local vault');
      setOutRaw(res.text); setEngine(res.engineLabel);
      setMetrics((m) => ({ ...m, local: m.local + res.localMs }));
      await new Promise((r2) => setTimeout(r2, 200));
      setStage(5); setStatus('Scan complete'); sweepOutput();
    } catch (e) {
      setError((e as Error).message || 'On-device processing failed.');
      setStatus('Stopped'); setStage(-1);
    } finally { setBusy(false); }
  };

  const needsInstruction = action === 'cloud' && !ask.trim();
  const run = () => { if (!raw.trim() || busy || needsInstruction) return; if (action === 'cloud') runCloud(); else runOffline(action); };
  const loadPreset = (text: string) => { reset(); setMode('idle'); setRaw(text); setAsk(''); gsap.fromTo('.editor', { borderColor: 'rgba(0,255,136,.9)' }, { borderColor: 'rgba(255,255,255,.09)', duration: 0.8 }); };
  const addTerm = (s: string) => {
    const v = s.trim();
    if (v.length < 2 || manual.includes(v)) return;
    touch(); setManual((m) => [...m, v]);
  };
  const copy = async () => {
    const text = outSegments.map((s) => s.text).join('');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopyFailed(true); setTimeout(() => setCopyFailed(false), 3000); }
  };

  const offline = mode === 'offline';
  const cur = ACTIONS.find((a) => a.id === action)!;
  const stageLabel = (i: number) => (i === 3 && (offline || (mode === 'idle' && action !== 'cloud')) ? 'On-device processing' : STAGES[i]);
  const nodeState = (i: number) => {
    if (offline && i === 3 && stage >= 3) return stage > 3 ? 'done' : 'active';
    return stage > i ? 'done' : stage === i ? 'active' : '';
  };

  /* One sentence that always says what has left, or will leave, this browser. */
  const n = view.entries.length;
  // counts are provisional until both the pattern pass and the Gemini Nano pass have finished
  const nanoPending = nano.state === 'available' && !!raw.trim() && mode === 'idle' && scannedText !== scanKey;
  const detecting = scanning || nanoPending || (busy && stage >= 0 && stage < 2);
  let privacy: { tone: 'ok' | 'info' | 'warn'; text: string };
  if (error) privacy = { tone: 'warn', text: 'The request did not complete. No original value was in it.' };
  else if (stage === 5 && mode === 'cloud') privacy = { tone: 'ok', text: `Sent ${metrics.sent.toLocaleString()} bytes of sanitized text. Original sensitive values sent: ${metrics.leaked} bytes.` };
  else if (stage === 5 && offline) privacy = { tone: 'ok', text: 'Processed on your device. Nothing was transmitted.' };
  else if (busy) privacy = { tone: 'info', text: status || 'Working' };
  else if (!raw.trim()) privacy = { tone: 'info', text: 'Nothing is sent until you press run. Detection happens in this tab as you type.' };
  else if (detecting) privacy = { tone: 'info', text: 'Scanning on your device…' };
  else if (action === 'cloud') privacy = { tone: 'info', text: `${n} sensitive ${n === 1 ? 'value' : 'values'} protected. Cloud AI will receive only the sanitized preview.` };
  else privacy = { tone: 'ok', text: `${n} sensitive ${n === 1 ? 'value' : 'values'} protected. This mode makes no network request.` };

  return (
    <div className="ws">
      <div className={`privacy-bar ${privacy.tone}`} role="status" aria-live="polite">
        <span className="privacy-ico" aria-hidden="true" />
        <span>{privacy.text}</span>
      </div>

      <div className="hybrid" aria-label="Hybrid AI status">
        <div className={`hy-pill ${nano.state === 'available' ? 'ok' : ''}`}>
          <b>On-device</b>
          <span>
            {nano.state === 'available' ? `Gemini Nano ready · Prompt API (${nano.api})`
              : nano.state === 'downloadable' || nano.state === 'downloading' ? 'Gemini Nano needs a one-time download'
              : nano.state === 'unsupported' ? 'Prompt API not in this browser · using built-in patterns'
              : 'Gemini Nano unavailable · using built-in patterns'}
          </span>
          {(nano.state === 'downloadable' || nano.state === 'downloading') && (
            <button className="link" onClick={downloadNano} disabled={dl !== null}>{dl !== null ? `Downloading ${Math.round(dl * 100)}%` : 'Download model'}</button>
          )}
        </div>
        <div className={`hy-pill ${cloudReady ? 'ok' : ''}`}>
          <b>Cloud</b>
          <span>Gemini via CloakFlow server · sanitized text only</span>
        </div>
      </div>

      <ol className="rail" aria-label="Pipeline">
        <div className="rail-line"><div className="rail-fill" /></div>
        {STAGES.map((_, i) => (
          <li key={i} className={`rail-node ${nodeState(i)}`}>
            <span className="rail-dot" />
            <span className="rail-name">{stageLabel(i)}</span>
          </li>
        ))}
      </ol>

      <div className="telemetry">
        <div><span>Sensitive items found</span><b>{detecting ? <span className="scan-wait"><i aria-hidden="true" />scanning…</span> : <Num value={n} />}</b></div>
        <div><span>Raw data leaked</span><b className={(mode === 'idle' ? liveLeak : metrics.leaked) === 0 ? 'good' : ''}><Num value={mode === 'idle' ? liveLeak : metrics.leaked} /> B</b></div>
        <div><span>Sent to cloud</span><b><Num value={metrics.sent} /> B</b></div>
        <div><span>Local detection</span><b><Num value={mode === 'idle' ? (raw.trim() ? live.ms : 0) : metrics.local} dec={1} /> ms</b></div>
        <div><span>Cloud round trip</span><b><Num value={metrics.cloud} /> ms</b></div>
      </div>

      <div className="chamber">
        {/* A — private input */}
        <section className="pane pane-in" aria-labelledby="ws-a">
          <header><h3 id="ws-a">Private input</h3><p>Stays in this browser tab</p></header>
          <div className="presets">
            {PRESETS.map((p) => (<button key={p.label} className="chip" onClick={() => loadPreset(p.text)}>{p.label}</button>))}
          </div>
          <label className="sr" htmlFor="ws-text">Confidential text</label>
          <textarea
            id="ws-text" className="editor" value={raw} spellCheck={false}
            onChange={(e) => { touch(); setRaw(e.target.value); }}
            onSelect={(e) => { const t = e.currentTarget; setSelection(t.value.slice(t.selectionStart, t.selectionEnd)); }}
            placeholder="Paste confidential text here..."
          />
          <div className="editor-foot">
            <span>{raw.length.toLocaleString()} characters</span>
            <span className="foot-actions">
              {nano.state === 'available' && <button className="link" onClick={scanNano} title="Runs before cloud processing" disabled={!raw.trim() || scanning || busy}>{scanning ? 'Scanning…' : 'Pre-scan locally'}</button>}
              <button className="link" onClick={() => { addTerm(selection); setSelection(''); }} disabled={selection.trim().length < 2}>Add to mask list</button>
            </span>
          </div>

          <details className="terms">
            <summary>Always mask these{manual.length ? ` (${manual.length})` : ''}</summary>
            <form className="terms-form" onSubmit={(e) => { e.preventDefault(); addTerm(term); setTerm(''); }}>
              <label className="sr" htmlFor="ws-term">Add a term to always protect</label>
              <input id="ws-term" className="ask" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="A name, project or id to always protect" />
              <button className="btn btn-quiet" type="submit" disabled={term.trim().length < 2}>Add</button>
            </form>
            <p className="fine">These words are always replaced with placeholders, wherever they appear.{configured.length ? ` ${configured.length} more are configured in Settings.` : ''}</p>
            {manual.length > 0 && (
              <div className="manual">
                {manual.map((m) => (<button key={m} className="chip chip-x" onClick={() => { touch(); setManual((x) => x.filter((y) => y !== m)); }} aria-label={`Stop protecting ${m}`}>{m}<span aria-hidden="true">×</span></button>))}
              </div>
            )}
          </details>

          <div className="mode" role="radiogroup" aria-label="Processing mode">
            {ACTIONS.map((a) => (
              <button key={a.id} role="radio" aria-checked={action === a.id} className={`mode-opt ${action === a.id ? 'on' : ''}`} onClick={() => { touch(); setAction(a.id); }} disabled={busy}>
                <b>{a.label}</b><span>{a.hint}</span>
              </button>
            ))}
          </div>
          {action === 'cloud' && (
            <>
              <label className="sr" htmlFor="ws-ask">Instruction</label>
              <input id="ws-ask" className="ask" value={ask} onChange={(e) => { touch(); setAsk(e.target.value); }} placeholder="What do you want done?" />
            </>
          )}
          {needsInstruction && !!raw.trim() && <p className="need" id="ws-need" role="status">Type what you want done to run Cloud AI.</p>}
          <button className="btn btn-run" onClick={run} disabled={busy || !raw.trim() || needsInstruction} aria-describedby={needsInstruction ? 'ws-need' : undefined}>{busy ? 'Working…' : cur.run}</button>
        </section>

        <div className="conduit" aria-hidden="true"><i /></div>

        {/* B — privacy firewall */}
        <section className="pane pane-mid" aria-labelledby="ws-b">
          <header>
            <h3 id="ws-b">Privacy firewall</h3>
            <p>{offline || (mode === 'idle' && action !== 'cloud') ? 'Nothing transmitted' : 'What leaves your laptop'}</p>
          </header>
          <div className="statusline">
            <span className={`pill-status ${busy ? 'on' : ''}`}>{status || (raw.trim() ? 'Live scan' : 'Waiting for input')}</span>
            <span className="muted">Detection: {detecting ? 'scanning…' : !!raw.trim() && nanoText === scanKey ? 'patterns + Gemini Nano' : nano.state === 'available' && !!raw.trim() && scannedText === scanKey ? 'patterns only (Gemini Nano scan failed)' : 'patterns only'}</span>
          </div>
          <h4 className="sub">Sanitized preview</h4>
          <div className="sanitized" aria-label="Sanitized text">
            {!view.raw.sanitized
              ? <span className="muted">Start typing. Sensitive values are replaced instantly, and this is the only text a cloud model would ever receive.</span>
              : view.raw.segments.map((s, i) => s.token ? <code key={`${i}-${s.text}`} className="tok">{s.text}</code> : <span key={i}>{s.text}</span>)}
          </div>
          {nano.state !== 'available' && raw.trim() && <p className="note">Gemini Nano is not available here, so detection uses patterns only. Names and project terms they cannot recognise will not be hidden unless you add them under Always mask these.</p>}
          {offline && <p className="note">Offline mode: this text is processed on your device. No network request is made.</p>}
          <h4 className="sub">Detected information{detecting ? ' · scanning…' : n ? ` · ${n}` : ''}</h4>
          <div className="vault" aria-label="Token interception table">
            <div className="vault-head"><span>Placeholder</span><span>Original value, held in browser memory</span></div>
            <div className="vault-body">
              {n === 0
                ? <p className="vault-empty">No sensitive values detected yet.</p>
                : view.entries.map((e) => (
                  <div className="vault-row" key={e.token}>
                    <code className="tok">{e.token}</code>
                    <span className="vault-val" title={e.value}>{e.value}</span>
                    <span className="vault-kind">{KIND_LABEL[e.kind]}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>

        <div className="conduit" aria-hidden="true"><i /></div>

        {/* C — restored output */}
        <section className="pane pane-out" aria-labelledby="ws-c">
          <header>
            <h3 id="ws-c">Restored output</h3>
            <button className="copy" onClick={copy} disabled={!outRaw}>{copied ? 'Copied' : copyFailed ? 'Copy blocked, select text instead' : 'Copy'}</button>
          </header>
          <div className="statusline">
            <span className={`pill-status ${stage === 5 ? 'done' : busy ? 'on' : ''}`}>
              {error ? 'Stopped' : stage === 5 ? 'Ready to use' : busy ? status : 'No output yet'}
            </span>
            <span className="muted">{mode === 'idle' ? 'No run yet' : offline ? 'Processing on your device' : 'Cloud Gemini on sanitized text'}</span>
          </div>
          <div className="out-body" aria-live="polite">
            {error ? <p className="error"><b>Could not finish.</b> {error}</p>
              : outSegments.length
                ? renderOutput(outSegments)
                : <span className="muted">The answer appears here with the original values restored locally.</span>}
          </div>
          <div className="out-foot">
            {stage === 5 && !error && <span className="badge">{offline ? 'Processed on your device' : 'Real values restored locally'}</span>}
            {engine && stage === 5 && <span className="muted">{engine}</span>}
          </div>
        </section>
      </div>
    </div>
  );
}
