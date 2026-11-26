import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DETECTED_CATEGORIES, KIND_LABEL } from '../services/tokenizer';
import { FIREWALL as D, ReplyWithTokens } from './demo';

gsap.registerPlugin(ScrollTrigger);

const SAMPLE_EMAIL = D.entries.find((e) => e.kind === 'EMAIL')!;

export default function Capabilities({ nano }: { nano: string }) {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      // each capability enters from its own direction, matching its place in the composition
      gsap.from('.cap-a', { scrollTrigger: { trigger: '.cap-a', start: 'top 85%' }, x: -70, opacity: 0, duration: 0.9, ease: 'power3.out' });
      gsap.from('.cap-b', { scrollTrigger: { trigger: '.cap-b', start: 'top 85%' }, y: 60, opacity: 0, duration: 0.9, ease: 'power3.out' });
      gsap.from('.cap-c', { scrollTrigger: { trigger: '.cap-c', start: 'top 85%' }, y: 60, opacity: 0, duration: 0.9, delay: 0.1, ease: 'power3.out' });
      gsap.from('.cap-d', { scrollTrigger: { trigger: '.cap-d', start: 'top 85%' }, x: 70, opacity: 0, duration: 0.9, ease: 'power3.out' });
      gsap.from('.cap-e, .cap-f', { scrollTrigger: { trigger: '.cap-e', start: 'top 88%' }, y: 50, opacity: 0, stagger: 0.14, duration: 0.8, ease: 'power3.out' });
      gsap.fromTo('.scan', { yPercent: -100 }, { yPercent: 400, duration: 2.6, repeat: -1, ease: 'none', scrollTrigger: { trigger: '.cap-a', start: 'top 90%', toggleActions: 'play pause resume pause' } });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="caps" id="capabilities">
      <h2>Six things it does, and how.</h2>
      <div className="cap-grid">
        <article className="cap cap-a">
          <h3>Local privacy detection</h3>
          <p>{DETECTED_CATEGORIES.length} categories are recognised in your browser, with Gemini Nano helping on names, before any request exists.</p>
          <div className="chips scanbox">{DETECTED_CATEGORIES.map((k) => (<span className="chip" key={k}>{KIND_LABEL[k]}</span>))}<i className="scan" /></div>
        </article>

        <article className="cap cap-b">
          <h3>Sensitive information masking</h3>
          <p className="swap"><s>{SAMPLE_EMAIL.value}</s><code className="tok">{SAMPLE_EMAIL.token}</code></p>
          <p className="fine">The same value always gets the same placeholder in a session.</p>
        </article>

        <article className="cap cap-c">
          <h3>Protected cloud AI</h3>
          <div className="wire" aria-hidden="true"><span>Browser</span><i /><span>Gemini</span></div>
          <p className="fine">The request carries placeholders. The vault stays behind.</p>
        </article>

        <article className="cap cap-d">
          <h3>Local restoration</h3>
          <p className="restore-row"><ReplyWithTokens text="Email [PERSON_1] today" /><span className="arrow" aria-hidden="true">becomes</span><span>Email <mark className="restored">Sarah</mark> today</span></p>
          <p className="fine">Only placeholders the local vault issued are restored. Unknown ones are left exactly as they are.</p>
        </article>

        <article className="cap cap-e">
          <h3>Offline grammar correction</h3>
          <p className="before-after"><s>i recieve teh report yesterday</s><span>I receive the report yesterday</span></p>
          <p className="fine">Runs on your device. Chrome Gemini Nano: {nano}.</p>
        </article>

        <article className="cap cap-f">
          <h3>Offline quick summary</h3>
          <ul className="bullets"><li>Key obligations and owners</li><li>Deadlines and open questions</li><li>Next actions</li></ul>
          <p className="fine">Nothing is transmitted. Placeholders are preserved, then restored.</p>
        </article>
      </div>
    </section>
  );
}
