import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CASES = [
  { icon: '🧑‍⚖️', title: 'Legal', text: 'Draft client contracts without exposing names or case details to AI' },
  { icon: '💼', title: 'Finance', text: 'Analyze deals and write reports with sensitive figures protected' },
  { icon: '🏥', title: 'Healthcare', text: 'Document patient notes with PII stripped before cloud processing' },
  { icon: '💻', title: 'Engineering', text: 'Share code with API keys and credentials auto-redacted' },
  { icon: '🎯', title: 'Sales', text: 'Write outreach emails with prospect data never leaving your device' },
  { icon: '📰', title: 'Journalism', text: 'Research and write stories with source identities protected' },
];

export default function UseCases() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('.uc', { scrollTrigger: { trigger: '.uc-grid', start: 'top 85%' }, y: 40, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="usecases" id="use-cases">
      <h2>Who uses CloakFlow</h2>
      <div className="uc-grid">
        {CASES.map((c) => (
          <article className="uc" key={c.title}>
            <span className="uc-icon" aria-hidden="true">{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
