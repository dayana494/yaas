import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ArcCards from './ArcCards';
import SectionHeading from './SectionHeading';
import FaqScreen from './FaqScreen';
import HeroGradientBackground from './HeroGradientBackground';
import { ADVANTAGES_HEADING_FULL } from '../data/advantages';
import { ADVANTAGES_TRIGGER_ID } from '../data/layout';
import { mobilePinType, useOverlapEnabled } from '../scroll/riseTransition';

gsap.registerPlugin(ScrollTrigger);

// Extra scroll distance the scrub travels across, on top of the pinned
// section's own 100vh, driving a continuous
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
  // The pin type depends on the width (mobilePinType), so the trigger is
  // rebuilt when the breakpoint is crossed.
  const overlap = useOverlapEnabled();

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
        ...mobilePinType(),
        invalidateOnRefresh: true,
        onUpdate: (self) => applyProgress(self.progress),
      });
    }, pinRef);

    return () => {
      // HomePage's correction pass replaces this trigger with one created
      // outside this context, which ctx.revert() would not reach.
      ScrollTrigger.getById(ADVANTAGES_TRIGGER_ID)?.kill(true);
      ctx.revert();
    };
  }, [simpleMode, overlap]);

  // Two nested boxes, the same split Screen 2 uses. .advantages is the rise
  // container: it carries the negative margin the climb is made of, the top
  // corners that round off during it, the stacking order, and the 120px inset
  // above the pin — and it stays in normal flow. .advantages-pin is the
  // one-viewport box GSAP actually pins.
  //
  // Keeping them separate is what lets both offsets be true at once: the 120px
  // is above the pinned box, so it is scrolled through during the rise and
  // costs the pinned viewport nothing, leaving the heading to sit at exactly
  // Screen 2's own pinned offset once the pin engages.
  //
  // The FAQ renders inside this section rather than as a sibling, so the two
  // blocks share one backdrop instead of each mounting its own gradient.
  return (
    <section className="advantages" id="why-yaas">
      {/* One backdrop for the whole section — the advantages block, the gap
          under it and the FAQ below all sit on this single gradient instead of
          each rendering its own instance of it. It is one viewport tall and is
          moved down by scroll/riseTransition.js's backdrop driver so it stays
          in frame for as long as the section does; being absolute (not fixed,
          not sticky) it stays inside this section's own overflow clip, so the
          rounded dome still shapes it during the climb.
          The static gradient underneath it is in advantages.css — the WebGL
          canvas is not painted at every moment, and that fill is what keeps
          the section from ever being transparent. */}
      <div className="advantages-bg" aria-hidden="true">
        <HeroGradientBackground />
      </div>
      <div className="advantages-pin" ref={pinRef}>
        <div className="advantages-title-row">
          <SectionHeading as="h2" className="advantages-title" text={ADVANTAGES_HEADING_FULL} />
        </div>
        <div className="advantages-content">
          <ArcCards ref={cardsRef} active={!simpleMode} />
        </div>
      </div>

      <FaqScreen />
    </section>
  );
}
