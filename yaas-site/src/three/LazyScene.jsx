import { forwardRef, lazy, Suspense } from 'react';
import { useDeferredMount } from './deferredLoad';

// Drop-in replacement for a plain `import Scene from './Scene'` — same
// forwardRef component, same props, same ref API (setEntranceProgress,
// dragBy, endDrag, exitToSlider). The difference is entirely in when its
// code loads: React.lazy() makes the dynamic import() the only way Scene.jsx
// and everything it pulls in (three.js, @react-three/fiber, drei, CanRig,
// gsap's own imports from there) enter the bundle, splitting them into their
// own chunk instead of the route's eagerly-evaluated one. useDeferredMount
// then holds off rendering it — and so requesting that chunk — until one
// frame after the page has already painted.
//
// This scene is on screen from the very first frame on both routes that use
// it (Home's hero, Flavors' gallery), so unlike ContactCanRig/
// FlavorStoryCanRig there is no off-screen state to gate on; a deferred
// mount is the whole trick available here. Measured effect: this and the
// gsap/no-op it triggers pulling ~900KB of three.js/drei/CanRig out of the
// route's own eagerly-evaluated chunk.
const Scene = lazy(() => import('./Scene'));

export default forwardRef(function LazyScene(props, ref) {
  const ready = useDeferredMount();
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <Scene ref={ref} {...props} />
    </Suspense>
  );
});
