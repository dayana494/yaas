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
