import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FIREWALL as D, OriginalText, ReplyWithTokens, SanitizedText } from './demo';
import { KIND_LABEL } from '../services/tokenizer';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { name: 'You type', copy: 'A normal message, with real details in it.' },
  { name: 'Detected locally', copy: 'CloakFlow finds the sensitive values in your browser. Nothing has been sent.' },
  { name: 'Replaced', copy: 'Each value becomes a placeholder. The originals go into a vault that lives in browser memory.' },
  { name: 'Cloud AI', copy: 'Only the placeholder version is sent, through Firebase AI Logic. The model answers using placeholders.' },
  { name: 'Restored locally', copy: 'The answer returns and the vault swaps the real values back in, on your device.' },
];
const TIMES = [0, 1.8, 3.8, 5.8, 8.4];

export default function FirewallDemo() {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [step, setStep] = useState(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const play = () => {
    tl.current?.kill();
    setStep(0);
    if (reduce) { setStep(4); return; }
    const t = gsap.timeline();
    TIMES.forEach((at, i) => t.call(() => setStep(i), undefined, at));
    tl.current = t;
  };
  const jump = (i: number) => { tl.current?.kill(); setStep(i); };

  useLayoutEffect(() => {
    const st = ScrollTrigger.create({ trigger: root.current, start: 'top 65%', once: true, onEnter: play });
    return () => { st.kill(); tl.current?.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // placeholders pop in as the values are replaced; packets travel the pipe
  useEffect(() => {
    if (reduce || !root.current) return;
    const q = gsap.utils.selector(root.current);
    if (step === 2) gsap.fromTo(q('.fw-line .tok'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.12, duration: 0.5, ease: 'back.out(2)' });
    if (step === 2) gsap.from(q('.fw-vault li'), { x: -14, opacity: 0, stagger: 0.12, duration: 0.4, delay: 0.3 });
    if (step === 3) gsap.fromTo(q('.packet-out'), { left: '0%', opacity: 1 }, { left: '78%', duration: 1.4, ease: 'power2.inOut', onComplete: () => { gsap.to(q('.packet-out'), { opacity: 0, duration: 0.3 }); } });
    if (step === 3) gsap.fromTo(q('.fw-reply-cloud'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, delay: 1.6 });
    if (step === 4) gsap.fromTo(q('.packet-in'), { left: '78%', opacity: 1 }, { left: '0%', duration: 1.1, ease: 'power2.inOut', onComplete: () => { gsap.to(q('.packet-in'), { opacity: 0, duration: 0.3 }); } });
    if (step === 4) gsap.fromTo(q('.fw-result'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, delay: 1 });
    if (step === 1) gsap.fromTo(q('.fw-original mark.found'), { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', stagger: 0.18, duration: 0.5, delay: 0.2 });
  }, [step, reduce]);

  return (
    <div ref={root} className="fw">
      <div className="fw-steps" role="tablist" aria-label="Pipeline stages">
        {STEPS.map((s, i) => (
          <button key={s.name} role="tab" aria-selected={step === i} className={`fw-step ${step === i ? 'on' : step > i ? 'past' : ''}`} onClick={() => jump(i)}>{s.name}</button>
        ))}
        <button className="link fw-replay" onClick={play}>Replay</button>
      </div>

      <div className="fw-stage">
        <div className="fw-zone fw-browser">
          <h3>Your browser</h3>
          <p className="fw-line fw-original" hidden={step >= 2}><OriginalText demo={D} mark={step >= 1 ? 'found' : 'none'} /></p>
          <p className="fw-line" hidden={step < 2}><SanitizedText demo={D} /></p>
          <ul className="fw-vault" aria-label="Local vault" style={{ visibility: step >= 2 ? 'visible' : 'hidden' }}>
            {D.entries.map((e) => (
              <li key={e.token}><code className="tok">{e.token}</code><span>{D.vault.get(e.token)!.value}</span><em>{KIND_LABEL[e.kind]}</em></li>
            ))}
          </ul>
          <div className="fw-result" style={{ visibility: step >= 4 ? 'visible' : 'hidden' }}>
            <h4>Restored locally</h4>
            <p>{D.restoredReply.map((p, i) => (p.restored ? <mark key={i} className="restored">{p.text}</mark> : <span key={i}>{p.text}</span>))}</p>
          </div>
        </div>

        <div className="fw-pipe" aria-hidden="true">
          <span className="fw-wall">Browser boundary</span>
          <div className="packet packet-out"><code className="tok">sanitized</code></div>
          <div className="packet packet-in"><code className="tok">answer</code></div>
        </div>

        <div className="fw-zone fw-cloud">
          <h3>Cloud AI</h3>
          <div style={{ visibility: step >= 3 ? 'visible' : 'hidden' }}>
            <h4>Receives</h4>
            <p className="fw-line"><SanitizedText demo={D} /></p>
          </div>
          <div className="fw-reply-cloud" style={{ visibility: step >= 3 ? 'visible' : 'hidden' }}>
            <h4>Replies</h4>
            <p className="fw-line"><ReplyWithTokens text={D.reply} /></p>
            <p className="fine">Illustrative reply, shown to explain the flow.</p>
          </div>
          {step < 3 && <p className="muted fw-idle">Nothing here yet.</p>}
        </div>
      </div>

      <p className="fw-caption" aria-live="polite"><b>{STEPS[step].name}.</b> {STEPS[step].copy}</p>
    </div>
  );
}
