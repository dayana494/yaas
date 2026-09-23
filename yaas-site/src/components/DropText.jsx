import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useOverlapEnabled } from '../scroll/riseTransition';

gsap.registerPlugin(ScrollTrigger);

// Per-character/word "drop in" reveal — ported from a third-party React
// component (Hyperiux Vault's DropText, a Next.js/Tailwind/TypeScript/shadcn
// component) into this project's own plain GSAP + CSS stack, the same way
// ScenarioHeadline's own reveal was: this codebase has no Tailwind/
// TypeScript/shadcn pipeline to hang a whole component-library integration
// off of, so the same visual effect (pieces start offset/rotated/scaled/
// blurred/transparent and animate to rest, staggered) is reimplemented
// directly in GSAP, which every other animation on this site already uses.
// Renders as `as` (default span) so it can drop straight into an existing
// heading tag/className — the caller's own CSS still owns font, color, etc.
const STAGGER_FROM_MAP = { left: 'start', right: 'end', center: 'center', random: 'random' };


// Each segment also carries where it starts in the original string. That is
// what lets ONE DropText render a heading whose second sentence is a different
// colour: the caller gives a character offset and every piece from there on
// takes the accent class. Splitting the heading across two DropTexts instead —
// which is what Screen 2 used to do — makes them two independent reveals over
// two inline-blocks, so the line breaks fall wherever that pair of boxes
// happens to wrap rather than wherever the sentence does.
function splitText(text, splitBy) {
  let offset = 0;
  const withOffset = (value, separator) => {
    const start = offset;
    offset += value.length + separator.length;
    return { value, separator, start };
  };
  if (splitBy === 'lines') {
    const lines = text.split('\n');
    return lines.map((line, i) => withOffset(line, i < lines.length - 1 ? '\n' : ''));
  }
  if (splitBy === 'words') {
    const matches = text.match(/\S+\s*/g) ?? [text];
    return matches.map((word) => withOffset(word.trimEnd(), word.endsWith(' ') ? ' ' : ''));
  }
  return Array.from(text).map((character) =>
    withOffset(character === ' ' ? ' ' : character, '')
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

const DropText = forwardRef(function DropText(
  {
    text,
    as: Tag = 'span',
    className = '',
    splitBy = 'words',
    // Character offset from which pieces take `accentClassName`. Null means
    // the whole string is one colour, which is every caller but Screen 2's
    // headline.
    accentFrom = null,
    accentClassName = '',
    staggerFrom = 'random',
    xOffset = 0,
    yOffset = -80,
    rotate = 0,
    blur = 0,
    scaleFrom = 1,
    startOpacity = 0,
    duration = 0.7,
    delay = 0,
    stagger = 0.045,
    ease = 'power2.out',
    // Most headings on this site reveal as they scroll into view; the
    // per-flavor detail title instead plays once some external signal says
    // to (see DetailScreen: `play={textVisible}`, since its heading exists
    // — opacity: 0, not unmounted — for a moment before that flips true).
    // Irrelevant when animateOnScroll is true.
    animateOnScroll = true,
    scrollStart = 'top 85%',
    play = true,
  },
  forwardedRef
) {
  const containerRef = useRef(null);
  useImperativeHandle(forwardedRef, () => containerRef.current);

  const segments = useMemo(() => splitText(text, splitBy), [text, splitBy]);
  const reducedMotion = useReducedMotion();
  // No reveal at all below 1024: the headings are simply there, the same as
  // with prefers-reduced-motion. On a phone the staggered drop-in read as the
  // heading glitching — half-faded words passing over its other lines — and
  // the brief is to drop it there entirely rather than tame it.
  const overlap = useOverlapEnabled();
  const still = reducedMotion || !overlap;

  const initialPieceStyle = still
    ? undefined
    : {
        opacity: startOpacity,
        filter: `blur(${blur}px)`,
        transform: `translate3d(${xOffset}px, ${yOffset}px, 0px) rotate(${rotate}deg) scale(${scaleFrom})`,
      };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const pieces = container.querySelectorAll('[data-drop-piece]');

    if (still) {
      gsap.set(pieces, { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)' });
      return undefined;
    }

    function playPieces() {
      gsap.fromTo(
        pieces,
        { x: xOffset, y: yOffset, rotate, scale: scaleFrom, opacity: startOpacity, filter: `blur(${blur}px)` },
        {
          x: 0,
          y: 0,
          rotate: 0,
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          duration,
          delay,
          stagger: { each: stagger, from: STAGGER_FROM_MAP[staggerFrom] ?? 'random' },
          ease,
        }
      );
    }

    if (animateOnScroll) {
      // An IntersectionObserver, not a ScrollTrigger.
      //
      // ScrollTrigger resolves 'top 85%' into an absolute scroll position at
      // creation time, and for a heading inside a *pinned* box that position is
      // not trustworthy: while pinned the element is position: fixed, so its own
      // rect reports where it is stuck on screen rather than the document slot
      // it came from, and every pin on this page also has its start corrected by
      // hand one frame after mount (see HomePage), which moves the spacers and
      // therefore everything measured against them. Two separate defects came
      // out of that. First the trigger fired at load for headings still
      // thousands of pixels below the fold — patched here with a two-frame
      // deferral and a geometric guard. Then, once the About the Brand and
      // Contact blocks joined the pinned sections, the opposite: measured on a
      // full slow scroll of the page, .advantages-title, .faq-heading and
      // .contact-heading revealed 0 of 10, 0 of 5 and 0 of 12 pieces — their
      // triggers had resolved somewhere already behind the reader and never
      // called back, so the guard never got a chance to say yes.
      //
      // An observer has no resolved position to be wrong about. It reports
      // whether the element is actually on screen, which is the only thing this
      // reveal ever wanted to know, and it is just as true of a pinned element
      // as a static one. rootMargin trims the bottom 15% of the viewport so it
      // still fires where 'top 85%' did — as the heading comes up into view,
      // not the instant its first pixel clears the edge.
      //
      // The reveal also waits for the webfonts, the same as the play-on-signal
      // path below. The pieces are invisible until it runs, so a heading that
      // reaches the screen before its face has loaded (a cold first visit on a
      // slow connection) stays hidden through the swap instead of dropping in
      // at the fallback's narrower width and then re-wrapping wider.
      let played = false;
      let cancelled = false;
      const fontsReady = 'fonts' in document ? document.fonts.ready : Promise.resolve();
      const observer = new IntersectionObserver(
        (entries) => {
          if (played || !entries.some((entry) => entry.isIntersecting)) return;
          played = true;
          observer.disconnect();
          fontsReady.finally(() => {
            if (!cancelled) playPieces();
          });
        },
        { threshold: 0, rootMargin: '0px 0px -15% 0px' }
      );
      observer.observe(container);

      return () => {
        cancelled = true;
        observer.disconnect();
        gsap.killTweensOf(pieces);
      };
    }

    if (!play) return undefined;
    let cancelled = false;
    const fontsReady = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    fontsReady.finally(() => {
      if (!cancelled) playPieces();
    });
    return () => {
      cancelled = true;
      gsap.killTweensOf(pieces);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, still, animateOnScroll, play]);

  return (
    <Tag ref={containerRef} className={className}>
      {segments.map((segment, i) => (
        // The separator sits OUTSIDE the animated span on purpose. A piece is
        // display: inline-block, and white-space processing drops a trailing
        // space at the end of one — so with the space inside, every heading on
        // the site rendered its words run together ("Thisisn'tabouthyping"),
        // visible only where a line happened to wrap. Between two inline-blocks
        // the same space renders normally. It is whitespace, so nothing is lost
        // by it not being part of the reveal.
        // With no reveal to run (`still`), each piece is a plain inline span —
        // not an inline-block on its own compositing layer. On iPhone WebKit
        // balanced a heading made of those inline-blocks into one word per
        // line for its first few lines ("WHY / YAAS / BEATS / ..."); it only
        // ever showed once the reveal stopped hiding the first layout. Plain
        // text wraps like any other heading. The accent class still applies.
        <Fragment key={i}>
          <span
            data-drop-piece={still ? undefined : ''}
            className={[
              still ? '' : 'drop-text-piece',
              splitBy === 'lines' ? 'drop-text-piece-block' : '',
              accentFrom != null && segment.start >= accentFrom ? accentClassName : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={initialPieceStyle}
          >
            {segment.value}
          </span>
          {segment.separator}
        </Fragment>
      ))}
    </Tag>
  );
});

export default DropText;
