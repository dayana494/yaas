import { useEffect, useRef } from 'react';
import { createGradient } from '../gradient/createGradient';
import gradientPreset from '../gradient/dsgnmax.ru_19544_config.json';

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
export default function HeroGradientBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let controller;
    const raf = requestAnimationFrame(() => {
      controller = createGradient(canvasRef.current, GRADIENT_OVERRIDES);
    });
    return () => {
      cancelAnimationFrame(raf);
      controller?.stop();
    };
  }, []);

  return (
    <div className="hero-gradient-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="hero-gradient-canvas" />
    </div>
  );
}
