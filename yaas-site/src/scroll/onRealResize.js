// `resize`, minus the address bar.
//
// On a phone the browser's address bar collapses and expands as the page
// scrolls, and every time it does, innerHeight changes and `resize` fires —
// several times within one scroll gesture. Nothing on this site needs to
// re-measure for that: GSAP's own ScrollTrigger already ignores it on touch
// devices (ignoreMobileResize), and the rest of our listeners were re-running
// layout mid-scroll for nothing — HomePage's pin-start correction killed and
// recreated every pin on the page each time, which is what made a real phone
// shake while scrolling.
//
// So on a touch device a resize that leaves the width alone is dropped. A real
// one — a rotation, a split-screen change — always changes the width. With a
// mouse or trackpad as the primary pointer every resize still counts, since a height-only change of
// a desktop window is a real resize and the hero's fit and the pins depend on
// the height too.
//
// Returns the unsubscribe function.
export function onRealResize(handler) {
  // The PRIMARY pointer being a finger — phones and tablets. Not "has a touch
  // screen": a touch-screen laptop still gets real height-only window resizes.
  // The same line GSAP draws for its own ignoreMobileResize (isTouch === 1).
  const touch = window.matchMedia('(pointer: coarse)').matches;
  let lastWidth = window.innerWidth;
  const onResize = () => {
    const width = window.innerWidth;
    if (touch && width === lastWidth) return;
    lastWidth = width;
    handler();
  };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

// Calls `fn` once the page has stopped scrolling — straight away if it already
// has. For work that must not land mid-gesture (rebuilding pins moves every
// section under the reader's finger), e.g. after a rotation made during an
// inertial scroll. A quiet-period timer rather than `scrollend`: it behaves the
// same in every browser, including Safari versions without that event, and
// needs no fallback. Returns a cancel function.
const QUIET_MS = 300;
let lastScrollAt = 0;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'scroll',
    () => {
      lastScrollAt = performance.now();
    },
    { passive: true }
  );
}

export function whenScrollIdle(fn) {
  let timer = 0;
  let cancelled = false;
  const check = () => {
    if (cancelled) return;
    const since = performance.now() - lastScrollAt;
    if (since >= QUIET_MS) {
      fn();
      return;
    }
    timer = setTimeout(check, QUIET_MS - since);
  };
  check();
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
