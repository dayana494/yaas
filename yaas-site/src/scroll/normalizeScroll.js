import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registered here too so isTouch is resolved whichever page imports this first.
gsap.registerPlugin(ScrollTrigger);

// Hands touch scrolling to GSAP's scroll normalizer, on touch-only devices.
//
// On iOS Safari and a number of Android browsers, native momentum scrolling
// runs on its own thread and reports scrollY to the page in bursts rather than
// once per frame, and the address bar moves the viewport under it on top of
// that. Every pin and scrub on these pages reads that scroll position, so each
// of them stuttered along with it — the shaking that stayed after the resize
// storm was fixed (onRealResize.js). normalizeScroll is GSAP's documented fix
// for exactly this: it takes touch input itself, drives the scroll from the
// main thread (momentum included), and keeps the address bar from resizing the
// viewport mid-gesture.
//
// Touch-only (isTouch === 1: a finger is the only pointer), not every width:
// with a mouse or trackpad the native scroll is already smooth, and taking over
// the wheel would only cost the OS's own scroll feel. allowNestedScroll leaves
// the horizontal carousels that scroll natively on a phone (the flavor gallery
// track, the advantages card row) swipeable.
//
// Imported by the pages that pin (HomePage, FlavorDetailPage) rather than
// App.jsx, so routes without GSAP don't load it. Idempotent: the normalizer is
// global, one call is enough for the session.
let enabled = false;

export function enableTouchScrollNormalizer() {
  if (enabled || typeof window === 'undefined') return;
  enabled = true;
  if (ScrollTrigger.isTouch === 1) {
    ScrollTrigger.normalizeScroll({ allowNestedScroll: true });
  }
}
