import { Suspense, forwardRef, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from './Lighting';
import CanRig from './CanRig';
import { HERO_CAMERA } from './heroLayout';

// Device pixels per CSS pixel, at rest and while the hero cans are flying in.
//
// At rest this is unchanged — up to 2, so a still can on a retina screen is
// drawn at exactly the resolution it always was.
//
// The flight is the exception, and it is the most expensive thing this page
// ever does: ~1.4s of unbroken 60fps redraw, on every first load, starting the
// moment the preloader lifts. Every one of those frames costs a full-canvas
// draw plus a compositor commit, and both scale with the pixel count — measured
// on a throttled phone profile, dropping the flight to 1 device pixel per CSS
// pixel took ~200ms off Total Blocking Time. A can in free flight across the
// screen is the one moment its edges cannot be studied, and the frame that
// lands is drawn at full resolution again (r3f redraws on the dpr change), so
// nothing that can be held still is affected.
const REST_DPR = [1, 2];
const FLIGHT_DPR = 1;

// Camera matches HERO_CAMERA (heroLayout.js) exactly — hero and gallery
// share this one Canvas now, and the hero cluster's hand-tuned positions
// were designed against this exact camera; changing it here would shift
// them off their Figma-matched spots.
const Scene = forwardRef(function Scene(props, ref) {
  // Driven from CanRig, which owns the flight (and skips it outright when the
  // page loads already scrolled past the hero — hence a callback pair rather
  // than reading `armed`, which only says the flight is allowed to start).
  const [flying, setFlying] = useState(false);
  const handleFlightStart = useCallback(() => setFlying(true), []);
  const handleFlightEnd = useCallback(() => setFlying(false), []);

  return (
    <Canvas
      className="site-canvas"
      // .site-canvas (index.css) asks for this too, and never got it: r3f
      // writes pointer-events: auto onto its container INLINE, which no
      // stylesheet rule can outrank. The canvas is decoration — the slider's
      // own drag stage sits above it in .ui-layer — and left clickable it
      // covered the hero wordmark's home link underneath.
      style={{ pointerEvents: 'none' }}
      // Renders on request only. Every motion this scene has is finite — the
      // mount flight, the scroll-scrubbed entrance, the drag and its snap, the
      // detail transitions, the cursor parallax — and each one asks for its own
      // frames while it runs (see CanRig and renderOnDemand.js). Between them
      // the cans are standing still and there is nothing to redraw; on "always"
      // this canvas kept drawing them ~60 times a second regardless, which is
      // what kept the page from ever reaching CPU idle.
      frameloop="demand"
      // A prop rather than an imperative setDpr() from inside the canvas: r3f
      // re-applies this prop on every Canvas render and would undo an
      // imperative change the next time any prop above changed.
      dpr={flying ? FLIGHT_DPR : REST_DPR}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={HERO_CAMERA}
    >
      <Lighting />
      <Suspense fallback={null}>
        <CanRig ref={ref} onFlightStart={handleFlightStart} onFlightEnd={handleFlightEnd} {...props} />
      </Suspense>
    </Canvas>
  );
});

export default Scene;
