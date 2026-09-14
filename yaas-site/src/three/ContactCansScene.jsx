import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import Lighting from './Lighting';
import ContactCanRig from './ContactCanRig';

// Its own small canvas for the contact block's two cans — independent of the
// hero/gallery Scene and of Screen 2's, same as those are of each other. It
// covers the whole section rather than just the panel: the cans overlap the
// panel's rounded corners and break past its edges in the mock, and a canvas
// clips to its own box.
export default function ContactCansScene({ panelRef }) {
  const canvasRef = useRef(null);

  return (
    <Canvas
      ref={canvasRef}
      className="contact-cans-canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 3.6], fov: 30 }}
    >
      <Lighting />
      <Suspense fallback={null}>
        <ContactCanRig panelRef={panelRef} canvasRef={canvasRef} />
      </Suspense>
    </Canvas>
  );
}
