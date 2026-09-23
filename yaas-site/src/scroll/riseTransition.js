import { useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Shared "rise into place" transition — Screen 2's, kept as its own module
// rather than inlined, so anything else that needs the same climb can reuse it
// instead of growing a second copy.
//
// The rise itself is pure document flow: the section carries a
// `margin-top: -100dvh` so it already overlaps the previous section's last
// viewport, and that previous section is held still (its own pin is extended
// by SCREEN2_RISE_UNITS, see data/layout.js) while its top edge travels from
// the bottom of the screen to the top. Nothing is transformed, so any GSAP
// pin living inside the rising section keeps measuring clean natural flow.
//
// This module owns only the part that can't be expressed in flow: the top
// corners. They interpolate as one scroll-synced value, never as two states.
//
// The full radius is half the section's own *rendered* width. At exactly that
// radius the two top corner arcs meet on the centre line and the top edge is
// a true semicircular dome — the shape the transition opens with. A plain
// `50%` can't express it: a percentage radius resolves its vertical half
// against the box's height, which for these sections runs to thousands of
// pixels, giving a stretched ellipse instead of a circle. So it's resolved
// here in px and handed to CSS as a custom property.
//
// Reading the section's live position rather than a ScrollTrigger's progress
// is deliberate: the rise *is* the section's own top edge travelling one
// viewport height, so there's no second definition of "where the rise starts"
// that could drift out of sync. A trigger's onUpdate also doesn't fire on
// every tick of a pin with no scrub of its own, which left the radius
// updating in visible steps.
export function applyRise(el) {
  if (!el) return;
  const vh = window.innerHeight;
  const top = el.getBoundingClientRect().top;
  const covered = Math.min(1, Math.max(0, 1 - top / vh));
  const rise = 1 - covered;
  el.style.setProperty('--rise', String(rise));
  el.style.setProperty('--rise-radius', `${(rise * el.offsetWidth) / 2}px`);
}

// One callback driving every rising section on the page. Returned so the
// caller can hand it straight to gsap.ticker.add/remove.
//
// On GSAP's ticker rather than a scroll listener: scroll events get coalesced
// (measurably — the radius updated in a handful of visible jumps instead of
// continuously), while the ticker runs once per frame alongside everything
// else scroll-driven here, so the corners stay in step with the section they
// belong to.
//
// The ticker alone is not enough to be *safe*, though, only to be smooth.
// --rise-radius is a value someone has to keep writing: the moment nothing
// writes it, it doesn't fall back to anything sensible, it freezes at whatever
// it held on the last frame that ran. A section caught mid-climb then keeps a
// half-sized dome no matter where it is on screen — which is exactly what a
// stale, half-applied state looks like. Ways to get there: the tab is
// throttled (a backgrounded tab, or an embedded preview pane — measured 0
// requestAnimationFrame callbacks in 500ms there), or a hot module swap
// replaces this module and leaves the old callback detached from the ticker
// with no new one attached.
//
// So `attachRiseDriver` also recomputes on plain scroll and resize events,
// which fire regardless of GSAP's state, and — importantly — runs once
// immediately, so a driver that starts late still corrects whatever the last
// one left behind rather than inheriting it.
export function createRiseDriver(selectors) {
  function driveRise() {
    for (const selector of selectors) {
      applyRise(document.querySelector(selector));
    }
  }
  driveRise.reset = () => clearProps(selectors, ['--rise', '--rise-radius']);
  return driveRise;
}

function clearProps(selectors, props) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) props.forEach((prop) => el.style.removeProperty(prop));
  }
}

// The breakpoint every overlapping handover on the site lives behind. Below it
// (phones and tablets) blocks simply follow one another in document flow: every
// negative margin that made a handover is zeroed in CSS, and no pin holds for a
// rise (see riseUnits below).
//
// The exact query the CSS uses, negated — deliberately not '(min-width:
// 1024px)'. At a fractional viewport width (1023.2px at a 1.25 device pixel
// ratio, measured) neither of those two matches, and CSS would keep the
// negative margins while JS dropped the holds they are paid for by.
export const NARROW_QUERY = '(max-width: 1023px)';

export function overlapEnabled() {
  return typeof window !== 'undefined' && !window.matchMedia(NARROW_QUERY).matches;
}

// Attaches `driveRise` to the ticker *and* to scroll/resize, and returns the
// teardown for all three. Belt and braces on purpose — see above.
//
// Only at desktop widths. Below the breakpoint there is nothing for a driver to
// write, and on a phone every frame spent writing custom properties nobody
// reads is a frame the scroll doesn't get — so there it is neither on the
// ticker nor listening to anything. Crossing the breakpoint (a rotation, a
// resized window) attaches or detaches it live, and detaching clears whatever
// it last wrote, so no half-applied dome or fixed backdrop is left behind.
export function attachRiseDriver(ticker, driveRise) {
  const mql = window.matchMedia(NARROW_QUERY);
  let attached = false;

  const attach = () => {
    if (attached) return;
    attached = true;
    driveRise();
    ticker.add(driveRise);
    window.addEventListener('scroll', driveRise, { passive: true });
    window.addEventListener('resize', driveRise);
  };
  const detach = () => {
    if (!attached) return;
    attached = false;
    ticker.remove(driveRise);
    window.removeEventListener('scroll', driveRise);
    window.removeEventListener('resize', driveRise);
    driveRise.reset?.();
  };
  const sync = () => (mql.matches ? detach() : attach());

  sync();
  mql.addEventListener('change', sync);
  return function teardown() {
    mql.removeEventListener('change', sync);
    detach();
  };
}

// Viewport heights of scroll a rise travels across. The section below is held
// still (its own pin is extended by exactly this) for the whole handover.
export const RISE_UNITS = 1;

// RISE_UNITS where there is a handover to hold for, 0 below the breakpoint
// where there is none. The one place every pin reads its hold from, so no
// component carries its own copy of the breakpoint check. Read live: a pin's
// `end` function calls it again on every refresh.
export function riseUnits() {
  return overlapEnabled() ? RISE_UNITS : 0;
}

// Keeps a section's backdrop layer in frame for as long as that section
// occupies the viewport — one gradient shared by everything inside the section,
// instead of each block rendering its own instance of it.
//
// This switches the layer between three *states* (a class) rather than moving
// it every frame. Moving it per frame is the obvious implementation and it is
// wrong twice over:
//   - JS runs after the compositor has already scrolled the page, so a
//     transform that compensates for scroll always lands a frame late. The
//     backdrop visibly juddered against the content on every wheel tick.
//   - a per-frame transform (plus the will-change it invites) promotes the
//     layer, and a promoted layer inside this section's rounded overflow clip
//     makes Chromium re-rasterise that mask each frame — which showed up as
//     black bands sweeping through the gradient while scrolling. This codebase
//     already carries a note about the same family of bug with position:
//     sticky; a hand-animated composited layer lands in it too.
// A class flip has neither problem: while fixed, the browser holds the layer
// still on the compositor with nothing for JS to keep up with.
//
// The three states, and why the boundaries are invisible even if the flip
// itself is a frame late — at each one the two positions coincide exactly:
//   - section top still below the viewport top: plain absolute at the
//     section's own top, so it rises *with* the section and stays inside the
//     rounded clip that shapes the dome;
//   - section covering the viewport: fixed. The radius is 0 by now, so it no
//     longer matters that a fixed element escapes the section's overflow clip;
//   - section's bottom above the viewport bottom: absolute again, parked at
//     the section's bottom, so its last viewport stays covered.
export function createViewportBackdropDriver(sectionSelector, backdropSelector) {
  function driveBackdrop() {
    const section = document.querySelector(sectionSelector);
    const backdrop = section?.querySelector(backdropSelector);
    if (!section || !backdrop) return;
    const rect = section.getBoundingClientRect();
    const covering = rect.top <= 0 && rect.bottom >= window.innerHeight;
    const past = rect.bottom < window.innerHeight;
    backdrop.classList.toggle('is-fixed', covering);
    backdrop.classList.toggle('is-parked', past);
  }
  driveBackdrop.reset = () => {
    const backdrop = document.querySelector(sectionSelector)?.querySelector(backdropSelector);
    backdrop?.classList.remove('is-fixed', 'is-parked');
  };
  return driveBackdrop;
}

// The mirror image of applyRise, for the section that is *leaving*.
//
// Where the rise rounds a section's top corners as it climbs into place over
// the one above it, this rounds a section's BOTTOM corners as its own bottom
// edge travels up off the screen, so it closes over the section revealed
// underneath instead of ending on a flat cut. Same shape of transition as the
// reference site uses ahead of its photo-stack section, and the same radius
// formula as the rise — half the section's rendered width, so the two corner
// arcs meet on the centre line and the bottom edge finishes as a true
// semicircle rather than the ellipse a percentage radius would give.
//
// `fall` is 0 while the section's bottom edge is still at or below the bottom
// of the viewport, and 1 once it has reached the top — i.e. exactly the window
// in which the section is being uncovered.
export function applyFall(el) {
  if (!el) return;
  const vh = window.innerHeight;
  const bottom = el.getBoundingClientRect().bottom;
  const fall = Math.min(1, Math.max(0, 1 - bottom / vh));
  el.style.setProperty('--fall', String(fall));
  el.style.setProperty('--fall-radius', `${(fall * el.offsetWidth) / 2}px`);
}

// Same shape as createRiseDriver — hand the result to attachRiseDriver, which
// covers the ticker plus scroll and resize for the reasons above.
export function createFallDriver(selectors) {
  function driveFall() {
    for (const selector of selectors) {
      applyFall(document.querySelector(selector));
    }
  }
  driveFall.reset = () => clearProps(selectors, ['--fall', '--fall-radius']);
  return driveFall;
}

// React side of overlapEnabled(), for effects whose timelines are *built* around
// the hold (an idle tail, a phase offset) rather than just reading riseUnits()
// from an `end` function: put the result in the effect's deps and the effect
// rebuilds when the breakpoint is crossed. The refresh re-measures every pin
// once the rebuilt ones exist, without a page reload.
export function useOverlapEnabled() {
  const [enabled, setEnabled] = useState(overlapEnabled);
  useEffect(() => {
    const mql = window.matchMedia(NARROW_QUERY);
    const onChange = (e) => {
      setEnabled(!e.matches);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return enabled;
}
