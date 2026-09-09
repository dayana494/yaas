import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ArcCards from './ArcCards';
import DropText from './DropText';
import HeroGradientBackground from './HeroGradientBackground';
import { ADVANTAGES_HEADING } from '../data/advantages';
import { ADVANTAGES_TRIGGER_ID } from '../data/layout';

gsap.registerPlugin(ScrollTrigger);

// Extra scroll distance the scrub travels across, on top of the pinned
// section's own 100vh — same "+=Npx, scrub, pin" shape as ScenarioCards.jsx
// (see src/components/ScenarioCards.jsx), just driving a continuous
// active-card progress instead of a discrete per-card timeline.
const SCROLL_LENGTH_MULTIPLIER = 2.2;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function AdvantagesScreen() {
  const pinRef = useRef(null);
  const cardsRef = useRef(null);

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // The pinned arc carousel now runs at every width (mobile included, per
  // spec — the arc motion itself, not a simplified linear swipe, just at a
  // smaller card size/arc radius; see advantages.css's own mobile rules for
  // .advantage-card/.advantages-arc-cards). prefers-reduced-motion is the
  // only thing that still falls back to the plain, non-pinned reveal.
  const simpleMode = reducedMotion;

  useEffect(() => {
    const applyProgress = (progress) => {
      cardsRef.current?.applyProgress(progress);
    };

    if (simpleMode) {
      // No pin, no scrub — everything settles straight into its resting
      // position and just fades in once, the moment the section scrolls
      // into view (same shape as ScenarioHeadline's own reveal).
      applyProgress(1);
      const ctx = gsap.context(() => {
        gsap.set(pinRef.current, { opacity: 0 });
        gsap.to(pinRef.current, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: pinRef.current, start: 'top 85%', once: true },
        });
      }, pinRef);
      return () => ctx.revert();
    }

    applyProgress(0);
    const ctx = gsap.context(() => {
      // Same "top top" chained-after-an-earlier-pin situation as
      // ScenarioCardsIsometric's own trigger (see its comment) — its exact
      // start gets corrected once from App.jsx after every section has
      // mounted, same mechanism, same reason.
      ScrollTrigger.create({
        id: ADVANTAGES_TRIGGER_ID,
        trigger: pinRef.current,
        start: 'top top',
        end: () => `+=${window.innerHeight * SCROLL_LENGTH_MULTIPLIER}`,
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => applyProgress(self.progress),
      });
    }, pinRef);

    return () => ctx.revert();
  }, [simpleMode]);

  return (
    <section className="advantages" id="why-yaas" ref={pinRef}>
      <HeroGradientBackground />
      <div className="section-heading-grid advantages-heading-grid">
        <DropText as="h2" className="advantages-heading" text={ADVANTAGES_HEADING} />
      </div>
      <div className="advantages-content">
        <ArcCards ref={cardsRef} active={!simpleMode} />
      </div>
    </section>
  );
}
