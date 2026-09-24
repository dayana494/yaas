import { useCallback, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

// Every Canvas on this site runs frameloop="demand": three.js renders a frame
// only when something asks for one, instead of burning a 60fps loop forever on
// a scene that is standing still. The cans move in bursts — a mount flight, a
// scroll scrub, a drag, a transition — and between those bursts there is
// nothing to redraw, so the page can actually reach CPU idle. It could not
// before: an untouched homepage sat at ~600 WebGL draw calls a second
// indefinitely, which is what stopped Lighthouse (and PageSpeed, which gave up
// with RPC::DEADLINE_EXCEEDED) from ever finishing a run.
//
// The catch, and the reason this file exists rather than a bare invalidate()
// at each call site: r3f's invalidate() means two different things depending on
// where it is called from (see its source in the loop module).
//
//   - Called from inside a useFrame callback, it sets the pending frame count
//     to 2, which keeps the render loop running into the next tick.
//   - Called from anywhere else, it sets that count to 1. The loop renders one
//     frame, finds nothing pending, and stops.
//
// So invalidating from a GSAP onUpdate — the obvious place, since it fires once
// per rAF tick for exactly as long as a tween runs — renders every OTHER frame:
// each tick restarts a loop that immediately stops again. Measured, that halved
// the contact cans' float from 54fps to 27. Only a useFrame can sustain the
// loop, so that is what holding() below is for, and everything outside the
// frame loop just opens a window for it to sustain across.
const KEEP_ALIVE = 0.1;

export function useRenderHold() {
  const invalidate = useThree((s) => s.invalidate);
  const untilRef = useRef(0);
  const askedThisFrameRef = useRef(false);

  // Ask for frames continuously for `seconds`. Used for two kinds of motion:
  //
  //  - Tweened. A GSAP onUpdate calls keepAlive() below, refreshing a window
  //    just long enough to outlive one rAF tick, so the frames drawn track the
  //    tween exactly and stop a beat after it does.
  //  - Converging. The cursor parallax and the gallery's focus dimming are
  //    exp(-LERP_SPEED*t) lerps toward a target, so they have no completion to
  //    hang a final frame on — they just get close enough to stop mattering.
  //    Those hold for a fixed settle window instead (see SETTLE_WINDOW).
  // At most one invalidate() per frame. The hero flight runs one GSAP tween per
  // can and each one calls keepAlive() from its own onUpdate, so a single frame
  // asked three times over; r3f's invalidate() is additive (state.frames +=
  // 1, capped at 60), so those extra calls bought nothing but a couple of
  // redundant frames drawn after every tween ended. The window itself is still
  // extended by every call — only the request for a frame is coalesced.
  //
  // holding() below deliberately does NOT go through this: it is the one call
  // that must land inside useFrame on every frame to keep the loop alive (see
  // the note above), and coalescing it would stall the loop it exists to
  // sustain.
  const hold = useCallback(
    (seconds) => {
      const until = performance.now() + seconds * 1000;
      if (until > untilRef.current) untilRef.current = until;
      if (askedThisFrameRef.current) return;
      askedThisFrameRef.current = true;
      requestAnimationFrame(() => {
        askedThisFrameRef.current = false;
      });
      invalidate();
    },
    [invalidate]
  );

  const keepAlive = useCallback(() => hold(KEEP_ALIVE), [hold]);

  // Call at the end of a useFrame callback. This is the only place the loop can
  // be sustained from, per the note above: while a window is open it re-arms
  // the next frame, and once the window closes it stops and the canvas goes
  // quiet. Without it the loop draws a single frame per hold() and the tweens
  // and lerps both run at half rate or stall.
  const holding = useCallback(() => {
    if (performance.now() >= untilRef.current) return false;
    invalidate();
    return true;
  }, [invalidate]);

  return { invalidate, hold, keepAlive, holding };
}

// Two animations on this site are deliberately endless: the contact cans' sine
// float and the flavor page's idle spin. Neither can invalidate its way to an
// idle page, because nothing would ever stop asking for the next frame. So they
// run on one condition instead — somebody can see them. Returns a ref (read it
// inside useFrame; it must not re-render anything) and asks for a frame on the
// way back on screen so the first visible one is current.
export function useCanvasOnScreen() {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const onScreenRef = useRef(true);

  useEffect(() => {
    const el = gl?.domElement;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      onScreenRef.current = visible;
      if (visible) invalidate();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [gl, invalidate]);

  return onScreenRef;
}
