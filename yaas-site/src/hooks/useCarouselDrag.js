import { useMemo, useRef } from 'react';

const PIXELS_PER_SLOT = 150;

// Converts pointer/touch drag gestures on an overlay element into slot-unit
// deltas for the carousel, with a small velocity estimate for release
// inertia. No React state involved — every callback goes straight to the
// imperative CanRig ref so dragging never triggers a re-render.
export function useCarouselDrag(sceneRef, enabled) {
  const dragState = useRef({ active: false, lastX: 0, lastT: 0, lastV: 0 });

  return useMemo(() => {
    function onPointerDown(e) {
      if (!enabled) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      dragState.current = { active: true, lastX: x, lastT: performance.now(), lastV: 0 };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragState.current.active) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const now = performance.now();
      const dx = x - dragState.current.lastX;
      const dt = Math.max(1, now - dragState.current.lastT);
      const deltaSlots = -dx / PIXELS_PER_SLOT;
      sceneRef.current?.dragBy(deltaSlots);
      dragState.current.lastV = (-dx / PIXELS_PER_SLOT) / (dt / 1000);
      dragState.current.lastX = x;
      dragState.current.lastT = now;
    }

    function endDrag() {
      if (!dragState.current.active) return;
      dragState.current.active = false;
      sceneRef.current?.endDrag(dragState.current.lastV);
    }

    // A tap (no real movement) still opens a "drag" on pointerdown; calling
    // endDrag for it re-commits the unchanged position ~0.4s later and stomps
    // whatever the tap's own click handling just navigated to. Taps must
    // clear dragState without going through the inertia/settle pipeline.
    function cancelDrag() {
      dragState.current.active = false;
    }

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerLeave: endDrag,
      cancelDrag,
    };
  }, [sceneRef, enabled]);
}
