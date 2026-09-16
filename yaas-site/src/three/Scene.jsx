import { Suspense, forwardRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from './Lighting';
import CanRig from './CanRig';
import { HERO_CAMERA } from './heroLayout';

// Camera matches HERO_CAMERA (heroLayout.js) exactly — hero and gallery
// share this one Canvas now, and the hero cluster's hand-tuned positions
// were designed against this exact camera; changing it here would shift
// them off their Figma-matched spots.
const Scene = forwardRef(function Scene(props, ref) {
  return (
    <Canvas
      className="site-canvas"
      // Renders on request only. Every motion this scene has is finite — the
      // mount flight, the scroll-scrubbed entrance, the drag and its snap, the
      // detail transitions, the cursor parallax — and each one asks for its own
      // frames while it runs (see CanRig and renderOnDemand.js). Between them
      // the cans are standing still and there is nothing to redraw; on "always"
      // this canvas kept drawing them ~60 times a second regardless, which is
      // what kept the page from ever reaching CPU idle.
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={HERO_CAMERA}
    >
      <Lighting />
      <Suspense fallback={null}>
        <CanRig ref={ref} {...props} />
      </Suspense>
    </Canvas>
  );
});

export default Scene;
