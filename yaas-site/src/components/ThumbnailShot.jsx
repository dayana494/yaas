import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from '../three/Lighting';
import { useCanGeometry } from '../three/useCanGeometry';
import { CAN_CAP_MATERIAL, useCanMaterials } from '../three/useCanMaterials';
import { FLAVORS } from '../data/flavors';

// A bare, single-can scene used only for offline PNG capture (the puppeteer
// render step that generates the switcher thumbnails) — loaded via
// ?shot=<flavorId>. Not part of the normal app UI.
function ShotCan({ flavorId, rotY, rotZ }) {
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const index = Math.max(0, FLAVORS.findIndex((f) => f.id === flavorId));
  return (
    <mesh
      geometry={geometry}
      material={[materials[index], CAN_CAP_MATERIAL]}
      rotation={[0, rotY, rotZ]}
    />
  );
}

// rotY/rotZ so a capture can be posed, not just centred: the contact block's
// two cans are now flat images (see ContactCans.jsx), and they have to come out
// of here at exactly the pose the 3D rig used to render them at — rotY is a
// yaw, which decides how much of the wrap-around label faces the camera and so
// cannot be faked with a CSS transform afterwards. Both default to 0, which is
// the switcher-thumbnail case this file was originally written for.
export default function ThumbnailShot({ flavor, rotY = 0, rotZ = 0 }) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      dpr={2}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Lighting />
      <Suspense fallback={null}>
        <ShotCan flavorId={flavor} rotY={rotY} rotZ={rotZ} />
      </Suspense>
    </Canvas>
  );
}
