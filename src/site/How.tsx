import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FIREWALL as D, OriginalText, ReplyWithTokens, SanitizedText } from './demo';

gsap.registerPlugin(ScrollTrigger);

const STAGES = [
  { t: 'Detect locally.', d: 'Patterns find emails, phones, keys, tokens, passwords and cards in your browser. Gemini Nano, Chrome’s on-device model, looks for names and organisations when it is available, and you can protect anything else by selecting it.' },
  { t: 'Replace sensitive values.', d: 'Each value becomes a stable placeholder such as [PERSON_1]. The originals go into a vault in browser memory, and nowhere else.' },
  { t: 'Process sanitized text.', d: 'When you choose cloud AI, only the sanitized text and your sanitized instruction are sent, through Firebase AI Logic, to Gemini. The model answers using the placeholders.' },
  { t: 'Restore locally.', d: 'The answer comes back, and only placeholders your vault issued are swapped for the real values. Offline tools skip the cloud entirely.' },
];

function Visual({ stage }: { stage: number }) {
  return (
    <div className="how-card" aria-hidden="true">
      <div key={stage} className="how-card-body">
        {stage === 0 && (<><h4>Your browser</h4><p className="fw-line"><OriginalText demo={D} mark="found" /></p><p className="fine">{D.entries.length} sensitive values found.</p></>)}
        {stage === 1 && (<><h4>Your browser</h4><p className="fw-line"><SanitizedText demo={D} /></p>
          <ul className="fw-vault">{D.entries.map((e) => (<li key={e.token}><code className="tok">{e.token}</code><span>{D.vault.get(e.token)!.value}</span></li>))}</ul></>)}
        {stage === 2 && (<><h4>Sent to cloud AI</h4><p className="fw-line"><SanitizedText demo={D} /></p><h4>Reply</h4><p className="fw-line"><ReplyWithTokens text={D.reply} /></p></>)}
        {stage === 3 && (<><h4>Restored on your device</h4><p className="fw-line">{D.restoredReply.map((p, i) => (p.restored ? <mark key={i} className="restored">{p.text}</mark> : <span key={i}>{p.text}</span>))}</p></>)}
      </div>
    </div>
  );
}

export default function How() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const steps = gsap.utils.toArray<HTMLElement>('.how-step');
      steps.forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: 'top 58%', onEnter: () => setActive(i), onLeaveBack: () => setActive(Math.max(0, i - 1)) });
      });
      gsap.fromTo('.how-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.how-steps', start: 'top 58%', end: 'bottom 58%', scrub: true } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="how" id="how">
      <div className="how-left">
        <h2>Four stages between your data and the model.</h2>
        <Visual stage={active} />
      </div>
      <ol className="how-steps">
        <div className="how-line"><div className="how-fill" /></div>
        {STAGES.map((s, i) => (
          <li key={s.t} className={`how-step ${active >= i ? 'lit' : ''}`}>
            <span className="how-dot" />
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
