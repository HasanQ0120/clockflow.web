import { Fragment, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { n: '1', title: 'Type anything private', text: 'Your raw text stays local, in this browser tab.' },
  { n: '2', title: 'AI detects & masks PII', text: 'On your device, built-in patterns and Gemini Nano (where your browser has it) find sensitive data and swap it for placeholders.' },
  { n: '3', title: 'Cloud AI responds privately', text: 'Only sanitized tokens reach the cloud. The real values are restored locally.' },
];

export default function DemoPipeline() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('.dp-step, .dp-arrow', { scrollTrigger: { trigger: '.dp-flow', start: 'top 85%' }, y: 30, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="demopipe" id="demo">
      <h2>See it in action</h2>
      <ol className="dp-flow">
        {STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <li className="dp-step">
              <span className="dp-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
            {i < STEPS.length - 1 && <li className="dp-arrow" aria-hidden="true"><svg viewBox="0 0 48 24" width="48" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h42M34 3l10 9-10 9" /></svg></li>}
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
