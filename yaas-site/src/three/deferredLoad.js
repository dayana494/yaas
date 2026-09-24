import { useEffect, useState } from 'react';

// Two ways to delay bringing in a Canvas's own JS — three.js, gsap, drei and
// whichever CanRig sits behind it — until it is actually needed, rather than
// at the moment the route mounts regardless of what's on screen. Paired with
// React.lazy() at each call site: gating WHEN a lazy-wrapped component first
// renders is what decides when its dynamic import() actually fires, since
// lazy() only requests the chunk the first time React tries to render it.

// True on the frame *after* the browser paints for the first time. A single
// requestAnimationFrame only guarantees "runs before the next paint" — a
// second one nested inside it is what actually lands one frame past that
// paint (the same trick ScrollAssembleText.jsx already relies on for the
// same reason). For a canvas that is on screen from the first frame with no
// "off-screen" state to wait on — the hero/gallery scene — this is the only
// lever available: it can't be gated on visibility, so the best that can be
// done is keep its chunk out of the very first script the route evaluates.
export function useDeferredMount() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return ready;
}

