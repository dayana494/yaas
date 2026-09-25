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
    // normalizeScroll is built on Observer, which captures every touch
    // sequence on the page to drive the scroll itself — including one that
    // starts on a button or a link. A real finger almost never lands
    // perfectly still: a tap that drifts a pixel or two while the Observer is
    // watching gets read as the start of a scroll drag rather than a tap, and
    // the eventual pointerup's click is swallowed instead of reaching the
    // element under it. This is the documented reason Observer/normalizeScroll
    // ship an `ignore` option — elements matching it get left to native
    // pointer handling, click included, instead of being captured.
    //
    // `[data-interactive]` is already this codebase's one marker for "this is
    // a real control" (every nav pill, the hero CTA, every arrow, the flavor
    // switcher's thumbnails, the slider's own drag stage) — reusing it here
    // rather than inventing a second list keeps the two from drifting apart.
    // .slider-stage carries it too: its own drag is already disabled below
    // 1024 (see SliderScreen.jsx — useCarouselDrag's `enabled` is desktop-only)
    // and it already tells the browser to let native panning through there
    // (touch-action: pan-y, layout.css), so excluding it from the Observer's
    // capture doesn't take anything away on a phone — it only stops the
    // Observer from being a second thing standing between a tap and the
    // "open this flavor's card" it's supposed to trigger.
    ScrollTrigger.normalizeScroll({ allowNestedScroll: true, ignore: '[data-interactive]' });
  }
}
