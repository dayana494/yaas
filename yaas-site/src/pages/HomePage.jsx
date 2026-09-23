import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import Scene from '../three/LazyScene';
import Background from '../components/Background';
import HeroGradientBackground from '../components/HeroGradientBackground';
import HeroWordmark from '../components/HeroWordmark';
import HeroScreen from '../components/HeroScreen';
import Screen2 from '../components/Screen2';
import AdvantagesScreen from '../components/AdvantagesScreen';
import BrandTeaserScreen from '../components/BrandTeaserScreen';
import Footer from '../components/Footer';
import SliderScreen from '../components/SliderScreen';
// Lazy: the offline puppeteer thumbnail-capture tool (?shot=<flavorId>),
// never used by a real visitor. It statically imports useCanGeometry /
// useCanMaterials — the same three.js entry point Scene.jsx's own lazy
// chunk uses — so importing it eagerly here would have pulled that whole
// graph back into every normal page load regardless of LazyScene.
const ThumbnailShot = lazy(() => import('../components/ThumbnailShot'));
import { FLAVORS, DEFAULT_FLAVOR_INDEX } from '../data/flavors';
import {
  attachRiseDriver,
  createFallDriver,
  createRiseDriver,
  createViewportBackdropDriver,
  overlapEnabled,
} from '../scroll/riseTransition';
import { SCROLL_TO_STATE, scrollToSection } from '../scroll/sectionNav';
import { onRealResize, whenScrollIdle } from '../scroll/onRealResize';
import { enableTouchScrollNormalizer } from '../scroll/normalizeScroll';
import {
  DETAIL_TRANSITION_DURATION,
  ENTRANCE_MIN_SECONDS,
  ENTRANCE_UNITS,
  GALLERY_SETTLE_GAP_UNITS,
  introUnitsPx,
  INTERACTIVE_UNITS,
  SCREEN2_GAP_PX,
  SCREEN2_RISE_UNITS,
  SCREEN2_ARC_TRIGGER_ID,
  SCENARIO_CARDS_TRIGGER_ID,
  ADVANTAGES_TRIGGER_ID,
  ABOUT_TRIGGER_ID,
  FOOTER_TRIGGER_ID,
} from '../data/layout';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
// Before any trigger is created — see scroll/normalizeScroll.js.
enableTouchScrollNormalizer();

const DetailScreen = lazy(() => import('../components/DetailScreen'));

const DETAIL_EDGE_PX = 2;

// Walks a shown 0..1 progress toward whatever set() last asked for, on the GSAP
// ticker, at no more than one full sweep per `minSeconds`. Below that speed it
// is one frame behind the scroll and otherwise exact; above it, a flick still
// plays the whole motion instead of jumping to its end.
function createRateLimitedProgress(minSeconds, apply) {
  let target = 0;
  let shown = 0;
  let ticking = false;
  const step = (_time, deltaMs) => {
    const diff = target - shown;
    const maxStep = deltaMs / 1000 / minSeconds;
    shown = Math.abs(diff) <= maxStep ? target : shown + Math.sign(diff) * maxStep;
    apply(shown);
    if (shown === target) {
      gsap.ticker.remove(step);
      ticking = false;
    }
  };
  return {
    set(next) {
      target = next;
      if (ticking || target === shown) return;
      ticking = true;
      gsap.ticker.add(step);
    },
    kill() {
      gsap.ticker.remove(step);
      ticking = false;
    },
  };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function HomePage() {
  const shotFlavor = useMemo(
    () => (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('shot') : null),
    []
  );
  const sceneRef = useRef(null);
  const introWrapRef = useRef(null);
  const introPinRef = useRef(null);
  // Mirrors the `.is-entrance-done` class written onto introPinRef's DOM node,
  // so scroll-driven updates only touch the class when it actually flips.
  const entranceDoneRef = useRef(false);
  // Last progress each intro scrub reported, and which side of the detail
  // window's two thresholds it is on — refs, not state, since both scrubs
  // fire every frame while scrolling.
  const entranceProgressRef = useRef(0);
  const detailProgressRef = useRef(0);
  const detailStartedRef = useRef(false);
  const detailDoneRef = useRef(false);
  const detailTriggerRef = useRef(null);
  // The detail window's own scroll progress, and the function that applies
  // it — held back at 0 until the entrance has visibly finished, since the
  // entrance's smoothing can still be landing after the scroll has moved on.
  const detailScrollProgressRef = useRef(0);
  const applyDetailRef = useRef(null);
  const isMobile = useIsMobile();

  // Set by a section link clicked on another page (see scroll/sectionNav.js).
  // Held in a ref rather than read from location inside the effect below so
  // that consuming it cannot re-run that whole correction pass.
  const { state: routerState } = useLocation();
  const pendingScrollRef = useRef(routerState?.[SCROLL_TO_STATE] ?? null);

  const [screen, setScreen] = useState('slider');
  const [activeFlavor, setActiveFlavor] = useState(DEFAULT_FLAVOR_INDEX);
  const [displayFlavor, setDisplayFlavor] = useState(DEFAULT_FLAVOR_INDEX);
  const [detailTextVisible, setDetailTextVisible] = useState(false);
  const [heroTextVisible, setHeroTextVisible] = useState(false);
  const activeFlavorRef = useRef(activeFlavor);
  activeFlavorRef.current = activeFlavor;
  // No preloader and no fade-in: the page paints as soon as it can. The
  // `loaded` flag and the rAF that flipped it existed only to drive the
  // whole-page opacity transition, which had to go — see the note in
  // styles/index.css for why it was costing the Lighthouse score.

  // Two sections further down the page — ScenarioCardsIsometric and
  // AdvantagesScreen — each pin themselves starting from a placeholder
  // 'top top' (see ScenarioCardsIsometric.jsx's comment for the full story:
  // GSAP's own "top top" resolution for a trigger chained after an earlier
  // *pinned* section is unreliable here, and so is computing the correct
  // number from inside a ScrollTrigger `start` callback, since GSAP invokes
  // those *during* its own refresh pass while other triggers are
  // transiently mid-remeasurement). This corrects both, once, from plain
  // application code — outside any ScrollTrigger callback, where every
  // read below has been confirmed to always be accurate — in a single pass
  // after every section on the page has mounted and created its own
  // (placeholder) trigger. React fires child effects before parent effects,
  // so this component's own top-level effects (this one included) are
  // guaranteed to run last, after all of them exist; the extra rAF is a
  // small safety margin in case anything still-Suspense-gated (a 3D scene's
  // assets, a webfont) resolves a tick after the initial commit and nudges
  // layout again.
  //
  // Each correction *measures* the section's own real natural (still
  // un-pinned — scrollY is still 0 here, before the user has scrolled at
  // all) resting position directly via getBoundingClientRect(), rather than
  // hand-summing the previous section's `.end` + element heights: that
  // manual chain kept landing a fixed ~50px short because GSAP's own
  // pin-spacer wrapping (on the section *before* it) zeroes the pinned
  // element's own margin out and folds it into the spacer instead — a CSS
  // detail invisible to a plain-heights sum but already reflected in
  // whatever the browser actually lays out. Reading .advantages only
  // *after* cards' trigger has been rebuilt (not before) matters too: cards'
  // corrected spacer has a different height than its placeholder one, which
  // shifts everything below it, .advantages included.
  useEffect(() => {
    let raf = 0;
    let resizeTimer = 0;

    const correctPinStarts = () => {
      // Each correction below is now gated on *only* its own trigger/element
      // existing, not on every other one too. They used to share one
      // all-or-nothing guard requiring cards, advantages *and* brand-teaser
      // all at once — harmless on desktop (all three exist), but on mobile
      // AdvantagesScreen never creates ADVANTAGES_TRIGGER_ID at all (it's
      // correctly in its own simpleMode there — no carousel pin to correct).
      // That guard failing meant the *entire* pass bailed out silently,
      // including cards' own correction, which has nothing to do with
      // whether Advantages happens to be pinned — leaving cardsIso's pin
      // permanently stuck on GSAP's mis-resolved 'top top' placeholder
      // (confirmed by direct instrumentation: it was activating on the very
      // first pixel of scroll instead of after the headline). That's what
      // made the card stack appear to pin and show through *underneath* the
      // still-in-flow Screen2 headline on mobile — the headline hadn't
      // actually reached the pin yet; the pin had just already engaged.
      // Every measurement below reads a section's *spacer* where GSAP has
      // already wrapped one around it, never the section itself: a pinned
      // element is position:fixed, so its own rect reports where it's stuck
      // on screen rather than the document slot it came from — and with the
      // placeholder 'top top' these pins can already be engaged by the time
      // this pass runs. The spacer always stays in normal flow and always
      // holds the real slot. Reading the element directly put Screen 2's arc
      // pin 934px early on mobile (measured), which ran its whole
      // travel-then-expand timeline before the section had even reached the
      // top of the viewport.
      const slotTop = (el) => {
        const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
        return box.getBoundingClientRect().top + window.scrollY;
      };

      // .intro-wrap is CSS sticky with its height set directly (see the
      // entrance effect below), not a GSAP pin, so there is no spacer above
      // arcEl to settle first — its measurement is already correct.

      // Screen 2's arc gallery is now the first pin after .intro-wrap, so it
      // inherits the same unreliable 'top top' resolution and gets corrected
      // first — everything below measures against its settled spacer.
      const arcTrigger = ScrollTrigger.getById(SCREEN2_ARC_TRIGGER_ID);
      const arcEl = document.querySelector('.screen2-arc');
      if (arcTrigger && arcEl) {
        const arcVars = { ...arcTrigger.vars, start: slotTop(arcEl), animation: arcTrigger.animation };
        arcTrigger.kill(true, true);
        const newArcTrigger = ScrollTrigger.create(arcVars);
        newArcTrigger.refresh();
      }

      const cardsTrigger = ScrollTrigger.getById(SCENARIO_CARDS_TRIGGER_ID);
      const cardsIsoEl = document.querySelector('.scenario-cards-iso');
      if (cardsTrigger && cardsIsoEl) {
        // Mutating `.vars.start` on an already-created trigger and calling
        // `.refresh()` (its own instance's, or even one single *global*
        // ScrollTrigger.refresh() once every number above was final) does
        // update the trigger's own public `.start`/`.end` correctly, but not
        // some other internal state GSAP uses to compute the *pinned
        // element's actual on-screen transform* — the section stayed visibly
        // pinned to the wrong offset even though `.start`/`.end` read back
        // exactly right. Killing each trigger and recreating it fresh (same
        // `animation`, so the linked timeline keeps driving it) rebuilds that
        // internal state from scratch instead of trying to patch it.
        // kill(revert, allowAnimation): without explicit `true, true` this
        // both leaves the old pin's inline styles/spacer only *partially*
        // reverted (the new trigger's fresh pin then measures against that
        // stale residue instead of clean natural flow) and, for cards
        // specifically, kills its linked flip-card timeline too (passed back
        // in via `animation` below — it needs to keep running).
        const cardsStart = slotTop(cardsIsoEl);
        const cardsVars = { ...cardsTrigger.vars, start: cardsStart, animation: cardsTrigger.animation };
        cardsTrigger.kill(true, true);
        const newCardsTrigger = ScrollTrigger.create(cardsVars);
        // Its pin-spacer's final height isn't necessarily sized synchronously
        // inside create() itself — an explicit per-instance refresh() (not the
        // global one, which is what caused the original mid-remeasurement
        // reads) forces it to settle *before* .advantages gets measured below,
        // so that measurement reflects cards' real (new) spacer size instead
        // of a stale one and doesn't land the two pins overlapping.
        newCardsTrigger.refresh();
      }

      // Either Screen 3 variant may be mounted here, and each pins a
      // different box: the hover-stack version pins .advantages-pin (the
      // full-viewport box nested inside the rise container — the container
      // itself must stay in flow, since GSAP folds a pinned element's margins
      // into its spacer and that negative margin *is* the rise), the legacy
      // arc version pins .advantages itself. Under prefers-reduced-motion the
      // legacy version creates no ADVANTAGES_TRIGGER_ID at all and there's
      // nothing here to correct — that's fine, its fallback uses a plain
      // self-relative 'top 85%' fade with no dependency on a previous pin.
      const advantagesTrigger = ScrollTrigger.getById(ADVANTAGES_TRIGGER_ID);
      const advantagesEl = document.querySelector('.advantages-pin') || document.querySelector('.advantages');
      if (advantagesTrigger && advantagesEl) {
        // Reading .advantages only *after* cards' trigger has been rebuilt
        // (not before) matters: cards' corrected spacer has a different
        // height than its placeholder one, which shifts everything below it,
        // .advantages included.
        const advantagesStart = slotTop(advantagesEl);
        const advantagesVars = { ...advantagesTrigger.vars, start: advantagesStart, animation: advantagesTrigger.animation };
        advantagesTrigger.kill(true, true);
        const newAdvantagesTrigger = ScrollTrigger.create(advantagesVars);
        newAdvantagesTrigger.refresh();
      }

      // About the Brand is chained after Advantages' own pin and inherits the
      // same unreliable 'top top' resolution, so it gets the same treatment,
      // measured last of all — every spacer above it is settled by this point.
      // Under prefers-reduced-motion it creates no trigger at all (the section
      // renders in its assembled state instead), hence the guard.
      const aboutTrigger = ScrollTrigger.getById(ABOUT_TRIGGER_ID);
      const aboutEl = document.querySelector('.about-brand-pin');
      if (aboutTrigger && aboutEl) {
        const aboutVars = { ...aboutTrigger.vars, start: slotTop(aboutEl), animation: aboutTrigger.animation };
        aboutTrigger.kill(true, true);
        const newAboutTrigger = ScrollTrigger.create(aboutVars);
        newAboutTrigger.refresh();
      }

      // Last of all, the footer's own reveal pin — measured after everything
      // above it has settled, same as each step before it.
      const footerTrigger = ScrollTrigger.getById(FOOTER_TRIGGER_ID);
      const footerEl = document.querySelector('.site-footer.is-reveal');
      if (footerTrigger && footerEl) {
        const footerVars = { ...footerTrigger.vars, start: slotTop(footerEl) };
        footerTrigger.kill(true, true);
        ScrollTrigger.create(footerVars).refresh();
      }

      ScrollTrigger.refresh();

      // A section link clicked from another page lands here. It has to wait for
      // exactly this moment: every pinned section's scroll window was just
      // recomputed above, and a scroll fired any earlier aims at a document
      // that is about to change height under it. Consumed once — the flag is
      // cleared so the resize re-run below doesn't yank the reader back.
      if (pendingScrollRef.current) {
        const hash = pendingScrollRef.current;
        pendingScrollRef.current = null;
        scrollToSection(hash);
      }
    };

    raf = requestAnimationFrame(correctPinStarts);

    // Those corrected starts are plain numbers, so — unlike the string
    // starts GSAP resolves itself — they don't re-resolve when the viewport
    // changes: after a resize every one of them still describes the old
    // layout, which lands Screen 2's whole travel-and-expand timeline at the
    // wrong scroll position (measured ~930px early). Re-running the pass is
    // what keeps them honest; debounced, and on the next frame so
    // ScrollTrigger's own resize refresh has already settled the new layout.
    //
    // Only on a real resize (onRealResize): on a phone the address bar fires
    // `resize` several times per scroll gesture, and re-running this pass for
    // each one killed and recreated every pin on the page mid-scroll — the
    // shake on real devices. And never mid-gesture even then (whenScrollIdle):
    // this pass measures the document as if nothing were moving, and rebuilding
    // the pins under an inertial scroll after a rotation would jolt every
    // section the reader is looking at.
    let cancelIdle = () => {};
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelIdle();
        cancelIdle = whenScrollIdle(() => {
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(correctPinStarts);
        });
      }, 250);
    };
    const offResize = onRealResize(onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      cancelIdle();
      offResize();
    };
  }, []);

  const handleHeroEntranceStart = useCallback(() => {
    setHeroTextVisible(true);
  }, []);

  const handlePickFlavor = useCallback(
    (i) => {
      if (i === activeFlavor) return;
      if (screen === 'detail') setDetailTextVisible(false);
      setActiveFlavor(i);
    },
    [screen, activeFlavor]
  );

  // A tap on the centre can opens its card by scrolling to the end of the
  // detail window, so the tap and a scroll land in the same place and
  // scrolling back up undoes either. Linear on purpose: the scrub applies the
  // flight's own easing, so a linear scroll plays it exactly as the old timed
  // transition did. autoKill hands control straight back if the reader scrolls.
  // The dead gap in front of the window is skipped outright — nothing on screen
  // changes across it, and gliding through it would only delay the flight.
  const handleEnter = useCallback(() => {
    const trigger = detailTriggerRef.current;
    if (!trigger) return;
    if (window.scrollY < trigger.start) window.scrollTo(0, trigger.start);
    gsap.to(window, {
      duration: DETAIL_TRANSITION_DURATION,
      ease: 'none',
      scrollTo: { y: trigger.end, autoKill: true },
    });
  }, []);

  const handleFlavorMidSpin = useCallback((i) => {
    setDisplayFlavor(i);
    if (detailDoneRef.current) setDetailTextVisible(true);
  }, []);

  const handleSettle = useCallback((i) => {
    setActiveFlavor(i);
  }, []);

  // Re-applies both scrubs whenever the lazily-mounted scene attaches: any
  // progress reported before it existed would otherwise be lost until the
  // next scroll event (e.g. a reload that restores the scroll position).
  const attachScene = useCallback((api) => {
    sceneRef.current = api;
    if (!api) return;
    api.setEntranceProgress(entranceProgressRef.current);
    api.setDetailProgress(detailProgressRef.current);
  }, []);

  // Hero -> gallery entrance. Screens 1+2 are merged into one section
  // (.intro-wrap/.intro-pin, see index.css) so the hero can visibly fade
  // away while the *same* cluster cans flip into their gallery arc slot
  // underneath it (hero and gallery now share one Canvas/camera — see
  // Scene.jsx/CanRig.jsx). Scrubbed from scroll position, 1:1 up to the speed
  // at which the whole entrance would take ENTRANCE_MIN_SECONDS and no faster,
  // so however hard the flick, the cans still fly the whole way; fully
  // reversible by scrolling back up. Stopping
  // part-way snaps on to whichever end the reader was heading for, so one
  // gesture from the hero always lands on the finished gallery.
  // Every tick this drives two independent surfaces:
  //  - the hero DOM's fade/blur and the gallery background's fade-in, both
  //    pure CSS via the --h2g custom property set directly on the pin node
  //    (no React state — this can fire every animation frame while
  //    scrubbing, and a re-render per frame would be wasteful);
  //  - the cans themselves, via CanRig's own imperative setEntranceProgress
  //    (Three.js object state CSS can't reach).
  useEffect(() => {
    const pin = introPinRef.current;
    if (!pin) return undefined;

    function applyEntrance(t) {
      entranceProgressRef.current = t;
      pin.style.setProperty('--h2g', String(t));
      pin.classList.toggle('is-entrance-active', t > 0.001);
      const done = t >= 1;
      sceneRef.current?.setEntranceProgress(t);
      if (done !== entranceDoneRef.current) {
        entranceDoneRef.current = done;
        pin.classList.toggle('is-entrance-done', done);
        applyDetailRef.current?.(done ? detailScrollProgressRef.current : 0);
      }
    }

    // Applied once up front so the gallery cans/background start fully
    // hidden even before the first scroll event (ScrollTrigger's own
    // onUpdate doesn't necessarily fire pre-scroll).
    applyEntrance(0);

    // .intro-pin is plain CSS `position: sticky` (see index.css), which
    // handles "hold in place, then release into Screen2" natively. Sticky has
    // no spacer, so the scroll room it holds for — ENTRANCE_UNITS +
    // GALLERY_SETTLE_GAP_UNITS + INTERACTIVE_UNITS, then a plain
    // SCREEN2_GAP_PX pause and SCREEN2_RISE_UNITS while Screen 2 climbs over
    // it (see .screen2's own negative margin) — is set here as the wrapper's
    // height: sticky's range is wrapper height minus the pin's own 100vh.
    //
    // This used to be a GSAP ScrollTrigger pin because sticky hit a Chromium
    // compositing bug: any opacity<1 descendant (e.g. .background-layer's
    // --h2g fade) inside a sticky ancestor with overflow:hidden
    // intermittently failed to paint over part of the viewport during scroll
    // (a solid black band, proportional to scroll position). If that band
    // comes back, going back to a pin is the known fix.
    //
    // The rise is left out of introUnitsPx's mobile scaling: Screen 2 climbs
    // by plain scrolling (its -100vh margin), so it always takes a full
    // viewport of scroll. A scaled-down budget never shortened it, it only
    // started it early — below 1024 that put Screen 2 over the flavor card
    // before the card's scroll-scrubbed flight had even landed.
    //
    // Below 1024 there is no rise at all (.screen2 carries no negative margin
    // there), so neither the gap nor the rise is held for: the intro releases
    // the moment the card lands and Screen 2 simply follows it in flow.
    // Re-read on every resize, which is also what a rotation or a breakpoint
    // crossing fires.
    const setIntroWrapHeight = () => {
      const wrap = introWrapRef.current;
      if (!wrap) return;
      const handoverPx = overlapEnabled()
        ? SCREEN2_GAP_PX + SCREEN2_RISE_UNITS * window.innerHeight
        : 0;
      const extraPx =
        introUnitsPx(ENTRANCE_UNITS + GALLERY_SETTLE_GAP_UNITS + INTERACTIVE_UNITS) + handoverPx;
      wrap.style.height = `calc(100vh + ${extraPx}px)`;
    };
    setIntroWrapHeight();
    // Same filtering as the pin-start pass above: a real resize only, applied
    // once scrolling has stopped. The address bar is not a reason to resize
    // the intro — GSAP doesn't refresh for it either, so the two stay in step.
    let introResizeTimer = 0;
    let cancelIntroIdle = () => {};
    const onIntroResize = () => {
      clearTimeout(introResizeTimer);
      introResizeTimer = setTimeout(() => {
        cancelIntroIdle();
        cancelIntroIdle = whenScrollIdle(setIntroWrapHeight);
      }, 250);
    };
    const offIntroResize = onRealResize(onIntroResize);

    // Top corners round off while a section is mid-climb and flatten out as it
    // finishes covering — the giveaway detail of this transition, and only
    // ever visible during the rise itself. Both rising sections run off this
    // one driver. See scroll/riseTransition.js for how the radius is derived,
    // why it reads each section's live position rather than a trigger's
    // progress, and why attachRiseDriver listens to scroll and resize on top
    // of the ticker instead of trusting the ticker alone.
    const driveRise = createRiseDriver(['.screen2', '.advantages']);
    // Screen 3 and the FAQ nested inside it share one gradient layer; this
    // keeps it in frame for as long as that section is (see its own comment in
    // scroll/riseTransition.js), and rides the same attach helper so it can
    // never be left frozen either.
    const driveBackdrop = createViewportBackdropDriver('.advantages', '.advantages-bg');
    // The same idea for the wordmark field the About and Contact blocks share.
    const driveAboutBackdrop = createViewportBackdropDriver('.about-brand', '.about-brand-bg');
    // The other half of the same idea, one section further down: Advantages/FAQ
    // is uncovered by climbing over Screen 2, and is itself left behind by
    // sliding up off About the Brand — so it rounds at the top on the way in and
    // at the bottom on the way out.
    // Both blocks that are left behind by the one below them: Advantages/FAQ
    // slides up off About the Brand, and About the Brand + Contacts slides up
    // off the footer. Same driver, same radius formula.
    const driveFall = createFallDriver(['.advantages', '.about-brand']);
    const drivers = [driveRise, driveFall];
    const driveAll = () => drivers.forEach((drive) => drive());
    // Called when the breakpoint drops below 1024 and the driver detaches (see
    // attachRiseDriver), so no dome is left where it was.
    driveAll.reset = () => drivers.forEach((drive) => drive.reset());
    const detachRiseDriver = attachRiseDriver(gsap.ticker, driveAll);
    // The backdrops are the exception: fixed while their section covers the
    // screen at every width, phones included, so they ride their own driver
    // that stays attached below 1024. It only reads two rects and flips a
    // class when a boundary is crossed — no per-frame style writes.
    const driveBackdrops = () => {
      driveBackdrop();
      driveAboutBackdrop();
    };
    const detachBackdropDriver = attachRiseDriver(gsap.ticker, driveBackdrops, { allWidths: true });

    // A speed limit rather than GSAP's numeric scrub, whose ease-out catch-up
    // still spent most of the flight in its first few frames, and which would
    // have lagged every slow, careful scroll too.
    const entranceProgress = createRateLimitedProgress(ENTRANCE_MIN_SECONDS, applyEntrance);

    const entranceTrigger = ScrollTrigger.create({
      trigger: introWrapRef.current,
      start: 'top top',
      end: () => `+=${introUnitsPx(ENTRANCE_UNITS)}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => entranceProgress.set(self.progress),
      snap: {
        snapTo: 1,
        directional: true,
        delay: 0.08,
        duration: { min: 0.2, max: DETAIL_TRANSITION_DURATION },
        ease: 'none',
      },
    });

    return () => {
      clearTimeout(introResizeTimer);
      cancelIntroIdle();
      offIntroResize();
      entranceTrigger.kill();
      entranceProgress.kill();
      detachRiseDriver();
      detachBackdropDriver();
    };
  }, []);

  // Gallery -> flavor detail card, driven by the same page scroll as the
  // entrance above and Screen 2's rise below, with no wheel/touch
  // interception: an INTERACTIVE_UNITS window maps straight onto the card's
  // flight (CanRig's setDetailProgress), reversibly. It starts
  // GALLERY_SETTLE_GAP_UNITS after the entrance ends — dead scroll in which
  // nothing reacts, so the gesture that brought the gallery in can run out
  // there instead of opening the card — and it stays at 0 until the smoothed
  // entrance has visibly landed, however far the scroll has already gone.
  // introUnitsPx keeps the shorter mobile budget, like every other intro stage.
  //
  // The DOM follows the same progress through two thresholds, at the moments
  // the timed transition used to flip them: the gallery UI hides as soon as
  // the flight starts, and the card's copy shows only once the can has landed
  // (and hides the moment it leaves).
  //
  // Screen 2's rise now simply follows this window, so the old mobile-only
  // easeToScreen2() jump (which skipped a viewport of static detail card) has
  // nothing left to skip: that viewport is the flight itself now, and the
  // rise starts SCREEN2_GAP_PX after the can lands.
  //
  // Snap finishes a flight the reader stopped part-way through, in the
  // direction they were scrolling, so the can is never left hanging between
  // the two: the page glides the rest of the window and the scrub turns that
  // into the same flight a full scroll produces. It only acts once scrolling
  // has stopped inside this window, so it can never overlap Screen 2's rise.
  useEffect(() => {
    function applyDetail(t) {
      detailProgressRef.current = t;
      sceneRef.current?.setDetailProgress(t);
      const started = t > 0;
      if (started !== detailStartedRef.current) {
        detailStartedRef.current = started;
        setScreen(started ? 'detail' : 'slider');
      }
      const done = t >= 1;
      if (done !== detailDoneRef.current) {
        detailDoneRef.current = done;
        if (done) setDisplayFlavor(activeFlavorRef.current);
        setDetailTextVisible(done);
      }
    }
    // Same speed limit as the entrance, at the old timed flight's own length:
    // a normal scroll is followed 1:1, but the card can't pop in whole — which
    // matters most when the entrance lands with the scroll already deep in
    // this window and the card's progress is released all at once.
    const detailProgress = createRateLimitedProgress(DETAIL_TRANSITION_DURATION, applyDetail);
    applyDetailRef.current = (t) => detailProgress.set(t);

    const trigger = ScrollTrigger.create({
      trigger: introWrapRef.current,
      start: () => `top+=${introUnitsPx(ENTRANCE_UNITS + GALLERY_SETTLE_GAP_UNITS)} top`,
      end: () => `+=${introUnitsPx(INTERACTIVE_UNITS)}`,
      scrub: true,
      invalidateOnRefresh: true,
      // A couple of pixels of dead band at each end: scroll positions come
      // back fractional on scaled displays (and after a programmatic scroll),
      // and landing 0.4px past the gallery must not already count as leaving.
      onUpdate: (self) => {
        const band = DETAIL_EDGE_PX / Math.max(1, self.end - self.start);
        const p = self.progress;
        detailScrollProgressRef.current = p <= band ? 0 : p >= 1 - band ? 1 : p;
        detailProgress.set(entranceDoneRef.current ? detailScrollProgressRef.current : 0);
      },
      snap: {
        snapTo: 1,
        directional: true,
        delay: 0.08,
        duration: { min: 0.2, max: DETAIL_TRANSITION_DURATION },
        ease: 'none',
      },
    });
    detailTriggerRef.current = trigger;

    return () => {
      trigger.kill();
      detailProgress.kill();
      detailTriggerRef.current = null;
      applyDetailRef.current = null;
    };
  }, []);

  const backgroundFlavor = FLAVORS[activeFlavor];

  if (shotFlavor) {
    // ?rotY / ?rotZ (radians) pose the capture — used to shoot the contact
    // block's two cans at the exact angles its 3D rig used to render them at.
    const shotParams = new URLSearchParams(window.location.search);
    return (
      <Suspense fallback={null}>
        <ThumbnailShot
          flavor={shotFlavor}
          rotY={Number(shotParams.get('rotY')) || 0}
          rotZ={Number(shotParams.get('rotZ')) || 0}
        />
      </Suspense>
    );
  }

  return (
    <div className="homepage">
      <section id="flavors" className="intro-wrap" ref={introWrapRef}>
        <div className="intro-pin" ref={introPinRef}>
          <HeroGradientBackground />

          <div className="app-root">
            <Background color={backgroundFlavor.color} />
            <div className={`center-glow ${screen === 'slider' ? 'is-visible' : ''}`} aria-hidden="true" />

            {/* Sits between the flavor background and the can canvas below
                (see .app-root's z-index stack in index.css) — the giant
                wordmark stays behind the cans, same as before the merge. */}
            <HeroWordmark />

            <Scene
              ref={attachScene}
              activeFlavor={activeFlavor}
              isMobile={isMobile}
              armed
              onEntranceStart={handleHeroEntranceStart}
              onFlavorMidSpin={handleFlavorMidSpin}
              onSettle={handleSettle}
            />

            <div className="ui-layer">
              <SliderScreen
                sceneRef={sceneRef}
                activeFlavor={activeFlavor}
                onPickFlavor={handlePickFlavor}
                onEnter={handleEnter}
                visible={screen === 'slider'}
              />

              {screen === 'detail' && (
                <Suspense fallback={null}>
                  <DetailScreen
                    activeFlavor={displayFlavor}
                    onPickFlavor={handlePickFlavor}
                    textVisible={detailTextVisible}
                  />
                </Suspense>
              )}
            </div>
          </div>

          <HeroScreen textVisible={heroTextVisible} />
        </div>
      </section>
      <Screen2 />
      <AdvantagesScreen />
      <BrandTeaserScreen />
      <Footer reveal />
    </div>
  );
}
