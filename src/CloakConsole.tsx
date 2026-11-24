import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import GradientText from './reactbits/GradientText';
import BlurText from './reactbits/BlurText';
import Workspace from './Workspace';
import AppView from './AppView';
import Shield from './Shield';
import Problem from './site/Problem';
import FirewallDemo from './site/FirewallDemo';
import How from './site/How';
import Capabilities from './site/Capabilities';
import FinalCta from './site/FinalCta';
import { detectOnDeviceAI } from './services/aiService.js';
import type { SceneDrive } from './scene/HeroScene';

gsap.registerPlugin(ScrollTrigger);
const HeroScene = lazy(() => import('./scene/HeroScene'));

/** Each section has its own light: where the glow sits and how strong it is. */
const WASH: Record<string, [string, string, number]> = {
  top: ['76%', '45%', 0.0], problem: ['18%', '55%', 0.035], firewall: ['50%', '35%', 0.15],
  how: ['85%', '45%', 0.08], experience: ['50%', '25%', 0.11], capabilities: ['15%', '55%', 0.09], start: ['50%', '55%', 0.2],
};

function SitePage() {
  const root = useRef<HTMLDivElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const drive: SceneDrive = useRef({ scroll: 0, reveal: 0 });
  const [nano, setNano] = useState('checking this browser');

  useEffect(() => {
    detectOnDeviceAI()
      .then((d: { available: boolean }) => setNano(d.available ? 'ready in this browser' : 'not available in this browser'))
      .catch(() => setNano('not available in this browser'));
  }, []);

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const l = new Lenis({ lerp: 0.08 });
    lenis.current = l;
    l.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      if (reduce) drive.current.reveal = 1;
      else {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.from('.h1-mask > span', { yPercent: 115, duration: 1.2, stagger: 0.13 }, 0.1)
          .from('.hero-fade', { y: 22, opacity: 0, duration: 1, stagger: 0.1 }, 0.8)
          .from('.scroll-ind', { opacity: 0, duration: 1 }, 1.8)
          .to(drive.current, { reveal: 1, duration: 2.4, ease: 'power3.out' }, 0);
      }
      ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: (s) => { drive.current.scroll = s.progress; } });
      if (!reduce) gsap.to('.scroll-ind', { opacity: 0, scrollTrigger: { trigger: '.hero', start: 'top top', end: '15% top', scrub: true } });

      // workspace panes flatten out of perspective as the workspace arrives
      if (!reduce) {
        gsap.fromTo('.pane-in', { rotateY: 12, z: -50 }, { rotateY: 3, z: 0, ease: 'none', scrollTrigger: { trigger: '.chamber', start: 'top 95%', end: 'top 35%', scrub: true } });
        gsap.fromTo('.pane-out', { rotateY: -12, z: -50 }, { rotateY: -3, z: 0, ease: 'none', scrollTrigger: { trigger: '.chamber', start: 'top 95%', end: 'top 35%', scrub: true } });
      }

      // section lighting changes as you move through the story
      Object.entries(WASH).forEach(([id, [x, y, a]]) => {
        const to = () => gsap.to('.wash', { '--wx': x, '--wy': y, '--wa': a, duration: reduce ? 0 : 1.4, ease: 'power2.out', overwrite: 'auto' });
        ScrollTrigger.create({ trigger: id === 'top' ? '.hero' : `#${id}`, start: 'top 55%', end: 'bottom 55%', onEnter: to, onEnterBack: to });
      });
    }, root);

    // in-page anchors go through Lenis; "#/app" is a route and is left to the browser
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]');
      const h = a?.getAttribute('href');
      if (!a || !h || h === '#' || h.startsWith('#/')) return;
      e.preventDefault();
      if (h === '#top') l.scrollTo(0); else l.scrollTo(h, { offset: -10 });
      history.replaceState(null, '', h);
    };
    document.addEventListener('click', onClick);
    const h0 = window.location.hash; // arriving from the app view with a section hash
    if (h0.length > 1 && !h0.startsWith('#/') && h0 !== '#top') setTimeout(() => l.scrollTo(h0, { immediate: true, offset: -10 }), 200);

    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    return () => { document.removeEventListener('click', onClick); ctx.revert(); gsap.ticker.remove(tick); l.destroy(); lenis.current = null; };
  }, []);

  const go = (id: string) => lenis.current?.scrollTo(`#${id}`, { offset: -10 });

  return (
    <div ref={root} className="page">
      <div className="wash" aria-hidden="true" />
      <a className="skip" href="#experience">Skip to the workspace</a>
      <nav className="nav" aria-label="Primary">
        <a className="logo" href="#top"><Shield />CloakFlow</a>
        <div className="nav-links">
          <a href="#firewall">Firewall</a><a href="#how">How it works</a><a href="#experience">Workspace</a><a href="#capabilities">Capabilities</a>
        </div>
        <a className="btn btn-solid btn-sm" href="#/app">Open app</a>
      </nav>

      <main id="top">
        <section className="hero">
          <Suspense fallback={<div className="scene-fallback" aria-hidden="true" />}>
            <HeroScene drive={drive} />
          </Suspense>
          <div className="hero-copy">
            <h1>
              <span className="h1-mask"><span>Your AI.</span></span>
              <span className="h1-mask"><span>Your Data.</span></span>
              <span className="h1-mask"><span><GradientText colors={['#00ff88', '#c8ffe3', '#00c46e', '#00ff88']} animationSpeed={4}>Your Control.</GradientText></span></span>
            </h1>
            <p className="lede hero-fade">CloakFlow is a privacy firewall between you and AI. It finds names, numbers and keys in your browser, swaps them for placeholders, and only then lets a cloud model read your text. The real values stay with you and are restored locally.</p>
            <div className="hero-actions hero-fade">
              <button className="btn btn-solid btn-lg" onClick={() => go('experience')}>Try CloakFlow</button>
              <button className="btn btn-ghost btn-lg" onClick={() => go('how')}>See how it works</button>
            </div>
          </div>
          <div className="scroll-ind" aria-hidden="true"><i />Scroll</div>
        </section>

        <Problem />

        <section className="section firewall" id="firewall">
          <div className="section-head">
            <div role="heading" aria-level={2} className="h2"><BlurText className="blur-text" text="Watch a message cross the firewall." animateBy="words" delay={80} direction="bottom" /></div>
            <p>This runs the real tokenizer on a real sentence. Press a stage to jump to it, or replay the whole journey.</p>
          </div>
          <FirewallDemo />
        </section>

        <How />

        <section className="section experience" id="experience">
          <div className="section-head">
            <h2>Now try it with your own text.</h2>
            <p>This is the working product. Detection runs in your browser as you type. Cloud runs send only the sanitized text.</p>
          </div>
          <Workspace />
        </section>

        <Capabilities nano={nano} />
        <FinalCta />
      </main>

      <footer className="footer">
        <div className="logo"><Shield size={20} />CloakFlow</div>
        <p>Original values stay in your browser. Sanitized text goes to Gemini through Firebase AI Logic only when you choose cloud AI.</p>
        <div className="foot-links"><a href="#/app">App</a><a href="#how">How it works</a><a href="#capabilities">Capabilities</a></div>
      </footer>
    </div>
  );
}

const getRoute = () => (window.location.hash.startsWith('#/app') ? 'app' : 'site');

export default function CloakConsole() {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const f = () => { const r = getRoute(); setRoute(r); if (r === 'app') window.scrollTo(0, 0); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route === 'app' ? <AppView /> : <SitePage />;
}
