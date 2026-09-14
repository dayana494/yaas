import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Characters start spread out along the line and rotated away from the reader,
// then converge on their real places as the heading scrolls in — ported from
// the reference component's CharacterV1 (Skiper31's text-scroll-animation).
//
// Only the mechanic came across, and it was rewritten rather than installed.
// The reference is Next.js + TypeScript + Tailwind + shadcn and leans on two
// packages this project does not have and should not get:
//   - framer-motion, for useScroll + useTransform. Those map one-to-one onto a
//     ScrollTrigger with scrub, which is what drives every other scroll-linked
//     thing on this site; adding a second animation runtime to do the same job
//     would leave two systems reading the same scroll position.
//   - lenis, for smooth scrolling. That one is not a local choice at all — it
//     takes over scrolling for the whole document, and every pin, scrub and
//     hand-off on this page is tuned against the browser's own scroll.
// The numbers below are the reference's own: 50px of spread and 50deg of
// rotateX per step away from the centre character, resolving over the first
// half of the element's scroll pass, with the container in 500px perspective.
const SPREAD_PX = 50;
const ROTATE_DEG = 50;

export default function ScrollAssembleText({ text, as: Tag = 'span', className = '' }) {
  const containerRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
  );

  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mql) return undefined;
    const handler = (event) => setReducedMotion(event.matches);
    setReducedMotion(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const characters = useMemo(() => Array.from(text), [text]);
  const centerIndex = Math.floor(characters.length / 2);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const pieces = container.querySelectorAll('[data-assemble-piece]');

    if (reducedMotion) {
      gsap.set(pieces, { x: 0, rotateX: 0 });
      return undefined;
    }

    // Two frames late, for the same reason DropText is: React runs child
    // effects before parent ones, so at this point HomePage has not yet
    // corrected the chained pin starts, and a trigger created against that
    // unsettled layout resolves its range somewhere else entirely. Waiting two
    // frames puts this after that one-rAF pass. invalidateOnRefresh then keeps
    // the range honest across resizes.
    let ctx = null;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        ctx = gsap.context(() => {
          gsap.fromTo(
            pieces,
            {
              x: (i) => (i - centerIndex) * SPREAD_PX,
              rotateX: (i) => (i - centerIndex) * ROTATE_DEG,
            },
            {
              x: 0,
              rotateX: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: container,
                // The reference resolves this over the first half of the
                // element's own scroll pass; 'top bottom' -> 'top 45%' is that
                // same window expressed against the viewport: spread when the
                // heading first appears at the bottom, assembled a little
                // above the middle of the screen.
                start: 'top bottom',
                end: 'top 45%',
                scrub: true,
                invalidateOnRefresh: true,
              },
            }
          );
        }, container);
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      gsap.killTweensOf(pieces);
      ctx?.revert();
    };
  }, [characters, centerIndex, reducedMotion]);

  return (
    <Tag ref={containerRef} className={className} style={{ perspective: '500px' }}>
      {characters.map((char, i) => (
        <span
          key={i}
          data-assemble-piece
          className="assemble-piece"
          // A space has no glyph to give it width once it is inline-block, so
          // it would collapse and run the words together.
          style={char === ' ' ? { width: '0.28em' } : undefined}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </Tag>
  );
}
