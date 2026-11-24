import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CountUp from '../reactbits/CountUp';
import BlurText from '../reactbits/BlurText';
import { OriginalText, PROBLEM, SanitizedText } from './demo';

gsap.registerPlugin(ScrollTrigger);

/**
 * Raw input, then everything a provider receives, then what a privacy layer would let through.
 * On desktop the story is scrubbed by normal scrolling (no pinning, no dead zone); elsewhere it reads as a stack.
 */
export default function Problem() {
  const root = useRef<HTMLElement>(null);
  const n = PROBLEM.entries.length;

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      root.current?.classList.add('is-scrub');
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.problem', start: 'top 60%', end: 'bottom 55%', scrub: 0.5 },
      });
      tl.set('.pcap-1', { opacity: 1 })
        .fromTo('.paste .exposed', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', stagger: 0.25, duration: 0.5 }, 0.6)
        .to('.pcap-1', { opacity: 0, y: -10, duration: 0.3 }, 2.4)
        .fromTo('.pcap-2', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, 2.6)
        .fromTo('.exposed-count', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 2.6)
        .to('.layer-raw', { opacity: 0, filter: 'blur(10px)', duration: 0.8 }, 4.4)
        .fromTo('.layer-safe', { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.8 }, 4.4)
        .to('.pcap-2, .exposed-count', { opacity: 0, duration: 0.3 }, 4.4)
        .fromTo('.pcap-3', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, 4.9)
        .to({}, { duration: 0.6 });
      return () => root.current?.classList.remove('is-scrub');
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} className="problem" id="problem">
      <div className="problem-pin">
        <div className="problem-head">
          <div role="heading" aria-level={2} className="h2"><BlurText className="blur-text" text="Every paste is a handoff." animateBy="words" delay={90} direction="bottom" /></div>
          <p>Paste a message into an AI tool and all of it is transmitted to someone else&rsquo;s servers. The names, the numbers, the keys. What happens next depends on a policy you did not write.</p>
        </div>
        <div className="problem-stage">
          <div className="paste" aria-label="Example of a pasted message">
            <p className="paste-text layer-raw"><OriginalText demo={PROBLEM} mark="exposed" /></p>
            <p className="paste-text layer-safe"><SanitizedText demo={PROBLEM} /></p>
          </div>
          <div className="captions" aria-live="polite">
            <p className="pcap pcap-1">What you typed</p>
            <p className="pcap pcap-2">What the provider receives, in full
              <span className="exposed-count"><CountUp to={n} duration={1.4} /> sensitive values travel with it</span>
            </p>
            <p className="pcap pcap-3">What CloakFlow lets through</p>
          </div>
        </div>
      </div>
    </section>
  );
}
