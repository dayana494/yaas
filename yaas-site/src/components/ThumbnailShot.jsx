import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from '../three/Lighting';
import { useCanGeometry } from '../three/useCanGeometry';
import { useCanMaterials } from '../three/useCanMaterials';
import { FLAVORS } from '../data/flavors';

// A bare, single-can scene used only for offline PNG capture (the puppeteer
// render step that generates the switcher thumbnails) — loaded via
// ?shot=<flavorId>. Not part of the normal app UI.
function ShotCan({ flavorId }) {
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const index = Math.max(0, FLAVORS.findIndex((f) => f.id === flavorId));
  return <mesh geometry={geometry} material={materials[index]} />;
}

export default function ThumbnailShot({ flavor }) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      dpr={2}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Lighting />
      <Suspense fallback={null}>
        <ShotCan flavorId={flavor} />
      </Suspense>
    </Canvas>
  );
}
