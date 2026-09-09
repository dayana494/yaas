import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from './Lighting';
import Screen2CanRig from './Screen2CanRig';

// Its own small canvas, scoped to the screen 2 headline — completely
// independent of the shared hero/gallery Scene (see three/Scene.jsx), just
// the two cans (lemon, apple) that flip in and hover beside the headline
// once it scrolls into view.
export default function Screen2Scene({ triggerRef, headlineRef }) {
  return (
    <Canvas
      className="screen2-cans-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.6], fov: 30 }}
    >
      <Lighting />
      <Suspense fallback={null}>
        <Screen2CanRig triggerRef={triggerRef} headlineRef={headlineRef} />
      </Suspense>
    </Canvas>
  );
}
