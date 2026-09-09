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
export default function HeroGradientBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const controller = createGradient(canvasRef.current, GRADIENT_OVERRIDES);
    return () => controller.stop();
  }, []);

  return (
    <div className="hero-gradient-wrap" aria-hidden="true">
      <canvas ref={canvasRef} className="hero-gradient-canvas" />
    </div>
  );
}
