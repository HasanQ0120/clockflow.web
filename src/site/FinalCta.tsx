import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function FinalCta() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reduce) return;
      const trigger = { trigger: root.current, start: 'top 70%', end: 'center 50%', scrub: 0.8 };
      gsap.fromTo('.cta-shield', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: trigger });
      gsap.fromTo('.cta-check', { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { ...trigger, start: 'top 45%', end: 'center 40%' } });
      gsap.fromTo('.cta-art', { scale: 0.86, rotate: -4 }, { scale: 1, rotate: 0, ease: 'none', scrollTrigger: trigger });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="final" id="start">
      <svg className="cta-art" viewBox="0 0 400 460" aria-hidden="true">
        <circle className="ring r1" cx="200" cy="230" r="170" />
        <circle className="ring r2" cx="200" cy="230" r="210" />
        <path className="cta-shield" pathLength={1} d="M200 40 L340 92 V210 C340 300 285 370 200 410 C115 370 60 300 60 210 V92 Z" />
        <path className="cta-check" pathLength={1} d="M135 222 L185 272 L272 166" />
        <g className="chips-pass">
          <rect x="-60" y="150" width="50" height="10" rx="5" /><rect x="-40" y="228" width="34" height="10" rx="5" /><rect x="-70" y="300" width="60" height="10" rx="5" />
        </g>
      </svg>
      <div className="final-copy">
        <h2>Bring the work you could never paste anywhere else.</h2>
        <p>Open the workspace, paste something real, and read the sanitized version before anything is sent.</p>
        <a className="btn btn-solid btn-lg" href="#/app">Try CloakFlow Free</a>
      </div>
    </section>
  );
}
