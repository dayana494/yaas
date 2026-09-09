import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DropText from './DropText';
import {
  SCREEN2_HEADLINE_GROUP_1,
  SCREEN2_HEADLINE_LINE_2,
  SCREEN2_HEADLINE_LINE_3,
  SCREEN2_SUBLINE,
} from '../data/scenarios';

gsap.registerPlugin(ScrollTrigger);

// Figma node 196:17 lays this headline out as three separately-positioned
// lines (not one wrapping paragraph) — same verbatim text as before
// (SCREEN2_HEADLINE_GROUP_1 + the two-line split of GROUP_2, see
// scenarios.js), each its own DropText/<h2> so they can still drop in
// independently and each carry its own color. .screen2-h2-grid positions
// them with the Figma frame's own calc(% - px) coordinates (already in a
// container-relative form, not hand-derived) — see screen2.css. Mobile
// abandons that grid for a plain stacked/centered layout, same as every
// other Figma-positioned block on this site (.brand-teaser-grid) falls
// back on narrow viewports. No lemon/apple can canvas here anymore — removed
// per spec (kept overlapping this headline at narrow/mid viewports even
// after being scaled down there; simplest fix was dropping them).
export default function ScenarioHeadline() {
  const sectionRef = useRef(null);
  const sublineRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(sublineRef.current, { opacity: 0, y: 14 });
      gsap.to(sublineRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sublineRef.current,
          start: 'top 90%',
          once: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="screen2-headline" ref={sectionRef}>
      <div className="screen2-h2-grid">
        <div className="screen2-h2-lines">
          <DropText as="h2" className="screen2-h2-line screen2-h2-line-1" text={SCREEN2_HEADLINE_GROUP_1} />
          <DropText as="h2" className="screen2-h2-line screen2-h2-line-2" text={SCREEN2_HEADLINE_LINE_2} />
          <DropText as="h2" className="screen2-h2-line screen2-h2-line-3" text={SCREEN2_HEADLINE_LINE_3} />
        </div>

        <p className="screen2-subline" ref={sublineRef}>
          {SCREEN2_SUBLINE}
        </p>
      </div>
    </div>
  );
}
