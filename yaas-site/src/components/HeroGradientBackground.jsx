import { useEffect, useRef, useState } from 'react';
import { createGradient } from '../gradient/createGradient';
import gradientPreset from '../gradient/dsgnmax.ru_19544_config.json';
import { asset } from '../data/assetUrl';

// dsgnmax.ru exports its config as { state: { points: [...], ...} } — the
// engine itself expects { pts: [...], ...} (see DEFAULT_CFG in
// createGradient.js), so just rename that one key rather than touching the
// engine's field names.
const { points, showSkeleton, ...gradientCfg } = gradientPreset.state;
const GRADIENT_OVERRIDES = { ...gradientCfg, pts: points };

// Thin React wrapper around the standalone gradient.js canvas engine — the
// shader/animation logic itself lives untouched in createGradient(), this
// just owns the mount/unmount lifecycle so the WebGL context and its
// listeners get torn down when the hero screen unmounts.
//
// createGradient() reads the canvas's own clientWidth/clientHeight the
// moment it runs (to size its framebuffers) — called straight from this
// effect, that read landed immediately after React's own initial commit
// inserted the canvas, forcing the browser to flush that whole commit's
// layout synchronously right then instead of on its own schedule.
// PageSpeed's "Forced reflow" audit caught it. A requestAnimationFrame
// between mount and that first read lets the browser fold the flush into
// its normal per-frame layout pass instead — this component renders on
// every page (hero, footer, contacts) and nothing about it depends on
// painting one frame earlier than that.
// Below 1024 the animated gradient is replaced by a still of itself.
//
// This component renders in five places — the hero, the advantages/FAQ block,
// contacts, the footer and the flavors page — and each one is its own WebGL
// context running its own shader at 60fps. That is five contexts and five
// render loops on a phone, for a background that is slow-moving colour and
// reads as a flat field at that size anyway.
//
// The still is the design's own gradient.jpg, re-encoded to WebP: 1920x980 and
// 23KB against the source's 326, at a quality where the two are visually the
// same image (measured across the full frame, mean difference under 1 of 255
// per channel, worst pixel 6). One image decode in place of a shader.
//
// A media query alone could hide the canvas, but it would still be created,
// compiled and animated behind the hidden element — the point is not to start
// it at all, so the decision has to reach the component.
const STATIC_QUERY = '(max-width: 1023px)';
const STILL_URL = asset('/images/gradient-still.webp');

function useStaticGradient() {
  const [isStatic, setIsStatic] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(STATIC_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(STATIC_QUERY);
    const onChange = (e) => setIsStatic(e.matches);
    mql.addEventListener('change', onChange);
    // Crossing the breakpoint mid-session flips this, which unmounts the canvas
    // (stopping the loop) or mounts one and starts it — handled by the effect
    // below keying off the same state.
    setIsStatic(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isStatic;
}

export default function HeroGradientBackground() {
  const canvasRef = useRef(null);
  const isStatic = useStaticGradient();

  useEffect(() => {
    if (isStatic) return undefined;
    let controller;
    const raf = requestAnimationFrame(() => {
      controller = createGradient(canvasRef.current, GRADIENT_OVERRIDES);
    });
    return () => {
      cancelAnimationFrame(raf);
      controller?.stop();
    };
  }, [isStatic]);

  if (isStatic) {
    return (
      <div
        className="hero-gradient-wrap is-static"
        aria-hidden="true"
        style={{ backgroundImage: `url(${STILL_URL})` }}
      />
    );
  }

  return (
    <div className="hero-gradient-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="hero-gradient-canvas" />
    </div>
  );
}
