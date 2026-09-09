import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

function splitText(text, splitBy) {
  if (splitBy === 'lines') {
    const lines = text.split('\n');
    return lines.map((line, i) => ({ value: line, separator: i < lines.length - 1 ? '\n' : '' }));
  }
  if (splitBy === 'words') {
    const matches = text.match(/\S+\s*/g) ?? [text];
    return matches.map((word) => ({
      value: word.trimEnd(),
      separator: word.endsWith(' ') ? ' ' : '',
    }));
  }
  return Array.from(text).map((character) => ({
    value: character === ' ' ? ' ' : character,
    separator: '',
  }));
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

  const initialPieceStyle = reducedMotion
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

    if (reducedMotion) {
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
      const ctx = gsap.context(() => {
        ScrollTrigger.create({ trigger: container, start: scrollStart, once: true, onEnter: playPieces });
      }, container);
      return () => {
        gsap.killTweensOf(pieces);
        ctx.revert();
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
  }, [segments, reducedMotion, animateOnScroll, play]);

  return (
    <Tag ref={containerRef} className={className}>
      {segments.map((segment, i) => (
        <span
          key={i}
          data-drop-piece
          className={splitBy === 'lines' ? 'drop-text-piece drop-text-piece-block' : 'drop-text-piece'}
          style={initialPieceStyle}
        >
          {segment.value}
          {segment.separator}
        </span>
      ))}
    </Tag>
  );
});

export default DropText;
