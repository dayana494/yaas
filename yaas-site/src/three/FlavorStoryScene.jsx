import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from './Lighting';
import FlavorStoryCanRig from './FlavorStoryCanRig';

// Its own small canvas for the flavor detail page's story section — same
// shape as Screen2Scene: transparent, shared Lighting rig, one Suspense
// boundary. Independent of the homepage's Scene/CanRig entirely.
export default function FlavorStoryScene({ flavorId, rotation, spin }) {
  return (
    <Canvas
      className="flavor-story-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
    >
      <Lighting />
      <Suspense fallback={null}>
        <FlavorStoryCanRig flavorId={flavorId} rotation={rotation} spin={spin} />
      </Suspense>
    </Canvas>
  );
}
