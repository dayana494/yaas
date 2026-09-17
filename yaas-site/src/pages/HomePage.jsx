import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '../scroll/riseTransition';
import {
  ENTRANCE_UNITS,
  INTERACTIVE_UNITS,
  SCREEN2_GAP_PX,
  SCREEN2_RISE_UNITS,
  INTRO_TRIGGER_ID,
  SCREEN2_ARC_TRIGGER_ID,
  SCENARIO_CARDS_TRIGGER_ID,
  ADVANTAGES_TRIGGER_ID,
  ABOUT_TRIGGER_ID,
  FOOTER_TRIGGER_ID,
} from '../data/layout';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const DetailScreen = lazy(() => import('../components/DetailScreen'));

const WHEEL_THRESHOLD = 22;
const SWIPE_THRESHOLD = 60;
const GESTURE_LOCK_MS = 1200;
// pinSpacing:true (the default — see the pin's own ScrollTrigger below)
// means GSAP reserves ENTRANCE_UNITS+INTERACTIVE_UNITS worth of scroll room
// itself with its own spacer; nothing in index.css has to add up to this
// total. Both constants (plus the section's own 1-viewport visible height)
// live in data/layout.js, shared with ScenarioCardsIsometric.jsx.

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
  // Mirrors the --h2g/`.is-entrance-done` state App.jsx also writes onto
  // introPinRef's DOM node — kept as a plain ref (not React state) so the
  // wheel/touch gesture handlers below can read it every event without
  // re-subscribing, and so scroll-driven updates never trigger a React
  // re-render (this can fire every frame while scrubbing).
  const entranceDoneRef = useRef(false);
  const isMobile = useIsMobile();

  const [screen, setScreen] = useState('slider');
  const [activeFlavor, setActiveFlavor] = useState(DEFAULT_FLAVOR_INDEX);
  const [displayFlavor, setDisplayFlavor] = useState(DEFAULT_FLAVOR_INDEX);
  const [detailTextVisible, setDetailTextVisible] = useState(false);
  const [heroTextVisible, setHeroTextVisible] = useState(false);
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

      // .intro-wrap's own spacer is what everything below sits on top of, and
      // its height comes from an `end` function that may not have been
      // evaluated yet this frame — settle it first so the very first
      // measurement below isn't taken against a short spacer.
      ScrollTrigger.getById(INTRO_TRIGGER_ID)?.refresh();

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
    };

    raf = requestAnimationFrame(correctPinStarts);

    // Those corrected starts are plain numbers, so — unlike the string
    // starts GSAP resolves itself — they don't re-resolve when the viewport
    // changes: after a resize every one of them still describes the old
    // layout, which lands Screen 2's whole travel-and-expand timeline at the
    // wrong scroll position (measured ~930px early). Re-running the pass is
    // what keeps them honest; debounced, and on the next frame so
    // ScrollTrigger's own resize refresh has already settled the new layout.
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(correctPinStarts);
      }, 250);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
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

  const handleEnter = useCallback(() => {
    setScreen((prev) => (prev === 'slider' ? 'detail' : prev));
  }, []);

  const handleEnterDetailComplete = useCallback(() => {
    setDisplayFlavor(activeFlavor);
    setDetailTextVisible(true);
  }, [activeFlavor]);

  const handleFlavorMidSpin = useCallback((i) => {
    setDisplayFlavor(i);
    setDetailTextVisible(true);
  }, []);

  const handleSettle = useCallback((i) => {
    setActiveFlavor(i);
  }, []);

  const handleExitDetailStart = useCallback(() => {
    setDetailTextVisible(false);
  }, []);

  const handleExitDetailComplete = useCallback(() => {
    setScreen('slider');
  }, []);

  // Hero -> gallery entrance. Screens 1+2 are merged into one section
  // (.intro-wrap/.intro-pin, see index.css) so the hero can visibly fade
  // away while the *same* cluster cans flip into their gallery arc slot
  // underneath it (hero and gallery now share one Canvas/camera — see
  // Scene.jsx/CanRig.jsx). Scrubbed 1:1 to scroll position (scrub: true, no
  // easing/lag of its own) and fully reversible by scrolling back up.
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
      pin.style.setProperty('--h2g', String(t));
      pin.classList.toggle('is-entrance-active', t > 0.001);
      const done = t >= 1;
      if (done !== entranceDoneRef.current) {
        entranceDoneRef.current = done;
        pin.classList.toggle('is-entrance-done', done);
      }
      sceneRef.current?.setEntranceProgress(t);
    }

    // Applied once up front so the gallery cans/background start fully
    // hidden even before the first scroll event (ScrollTrigger's own
    // onUpdate doesn't necessarily fire pre-scroll).
    applyEntrance(0);

    // Pinning .intro-pin via ScrollTrigger (transform/position:fixed under
    // the hood) instead of plain CSS `position: sticky` — sticky here hit a
    // real Chromium compositing bug: any opacity<1 descendant (e.g.
    // .background-layer's --h2g fade) inside a sticky ancestor with
    // overflow:hidden intermittently failed to paint over part of the
    // viewport during scroll (a solid black band, proportional to scroll
    // position, with every element's own geometry/style otherwise
    // reporting correctly — not something fixable from this side). This
    // pin covers the *entire* .intro-wrap scroll range (entrance + the
    // slider<->detail phase after it). Releases straight into Screen2 — no
    // decoy cover panel in between (a stand-in copy of Screen2's own
    // heading used to slide up here first; it never quite lined up with
    // the real one, so scrolling through the handoff showed both at once).
    //
    // pinSpacing defaults to true here — same as ScenarioCardsIsometric's
    // own pin into AdvantagesScreen, which never needed any z-index/visibility
    // trickery to hand off cleanly. This used to be pinSpacing:false (relying
    // on .intro-wrap's own CSS height for the reserved scroll room instead of
    // GSAP's auto-inserted spacer), which left the hero's own box visually
    // "scrolling away" for a full extra viewport height after release instead
    // of just disappearing — a lingering tail that no z-index arbitration
    // between it and Screen2 could actually fix, since z-index only decides
    // who paints on top when both are visible, not whether the hero is still
    // there to be seen at all. pinSpacing:true removes the tail entirely:
    // release lands exactly at the spacer's own end, same as every other
    // pinned section on this page.
    // Held past the gallery for two more stretches: a plain SCREEN2_GAP_PX
    // pause, then SCREEN2_RISE_UNITS while Screen 2 climbs up over this
    // still-pinned screen and covers it (see .screen2's own negative margin,
    // which lines the end of this pin up with the top of that section).
    const pinTrigger = ScrollTrigger.create({
      id: INTRO_TRIGGER_ID,
      trigger: introWrapRef.current,
      start: 'top top',
      end: () =>
        `+=${(ENTRANCE_UNITS + INTERACTIVE_UNITS + SCREEN2_RISE_UNITS) * window.innerHeight + SCREEN2_GAP_PX}`,
      pin,
      invalidateOnRefresh: true,
    });

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
    const driveAll = () => {
      driveRise();
      driveFall();
      driveBackdrop();
      driveAboutBackdrop();
    };
    const detachRiseDriver = attachRiseDriver(gsap.ticker, driveAll);

    const entranceTrigger = ScrollTrigger.create({
      trigger: introWrapRef.current,
      start: 'top top',
      end: () => `+=${ENTRANCE_UNITS * window.innerHeight}`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => applyEntrance(self.progress),
    });

    return () => {
      pinTrigger.kill();
      entranceTrigger.kill();
      detachRiseDriver();
    };
  }, []);

  // The carousel/detail app is a normal in-flow section (.intro-wrap) whose
  // inner .intro-pin (pinned via ScrollTrigger above) holds in place for two
  // back-to-back scroll windows: first the hero->gallery
  // entrance above, then this wheel/touch slider<->detail sub-navigation.
  // `entranceDoneRef`
  // keeps the latter from firing mid-entrance (before the gallery cans have
  // even finished settling); otherwise this is unchanged from before the
  // merge — scrolling past the pinned section releases it and continues
  // normally, and scrolling back up releases it the same way, so the page
  // always behaves like one continuously scrollable site. A short lock
  // avoids re-triggering mid-animation.
  useEffect(() => {
    let locked = false;
    function lock() {
      locked = true;
      setTimeout(() => (locked = false), GESTURE_LOCK_MS);
    }
    function isPinned() {
      const el = introWrapRef.current;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top <= 0 && rect.bottom >= window.innerHeight;
    }
    // Scrolling DOWN out of the detail view used to have no handler at all: it
    // fell through to native scroll, which then had to cross the rest of the
    // interactive window before Screen 2's rise even began — the detail view is
    // pinned and static for all of it, so it read as a dead zone of up to a
    // full viewport plus SCREEN2_GAP_PX (measured from the pin geometry: the
    // rise starts at ENTRANCE+INTERACTIVE units in, and detail is entered at
    // ENTRANCE). This eases straight to that point instead, so the next thing
    // the reader sees after letting go is Screen 2 climbing.
    //
    // The mirror of exitToSlider() for the upward direction, and reversible the
    // same way: it lands while the intro is still pinned, so scrolling back up
    // hits the existing detail -> slider branch below exactly as before.
    //
    // Mobile/tablet only, by request — both call sites are gated on isMobile.
    // The dead zone is the same on desktop, but this is a scroll-feel change
    // rather than a layout one and desktop is staying exactly as it was; there
    // a downward wheel in the detail view keeps falling through to native
    // scroll. The gate has to live on the branch conditions rather than in
    // here: those branches preventDefault() before calling this, so a check at
    // this level would swallow the event and leave desktop dead-stopped, which
    // is worse than the fall-through it has today.
    function easeToScreen2() {
      const pinStart = ScrollTrigger.getById(INTRO_TRIGGER_ID)?.start ?? 0;
      const y =
        pinStart + (ENTRANCE_UNITS + INTERACTIVE_UNITS) * window.innerHeight + SCREEN2_GAP_PX;
      gsap.to(window, { duration: 0.7, ease: 'power2.inOut', scrollTo: { y } });
    }

    function onWheel(e) {
      if (!entranceDoneRef.current || !isPinned()) return;
      // While locked, freeze scroll entirely instead of just ignoring the
      // event — a bare early return here left every wheel tick fired during
      // the lock window (rapid trackpad swipes fire many in quick
      // succession, well within GESTURE_LOCK_MS) completely unhandled, so
      // the browser scrolled normally through them. That could burn through
      // the whole interactive budget before React had even rendered the
      // detail screen the first tick just triggered, so scrolling past the
      // gallery would land straight on Screen2 with the flavor detail view
      // never actually seen.
      if (locked) {
        e.preventDefault();
        return;
      }
      if (screen === 'slider' && e.deltaY > WHEEL_THRESHOLD) {
        e.preventDefault();
        lock();
        handleEnter();
      } else if (isMobile && screen === 'detail' && e.deltaY > WHEEL_THRESHOLD) {
        e.preventDefault();
        lock();
        easeToScreen2();
      } else if (screen === 'detail' && e.deltaY < -WHEEL_THRESHOLD) {
        e.preventDefault();
        lock();
        sceneRef.current?.exitToSlider();
      }
    }

    let touchStartY = null;
    function onTouchStart(e) {
      touchStartY = e.touches[0].clientY;
    }
    function onTouchEnd(e) {
      if (touchStartY == null || locked || !entranceDoneRef.current || !isPinned()) return;
      const dy = e.changedTouches[0].clientY - touchStartY;
      touchStartY = null;
      if (screen === 'slider' && dy < -SWIPE_THRESHOLD) {
        lock();
        handleEnter();
      } else if (isMobile && screen === 'detail' && dy < -SWIPE_THRESHOLD) {
        lock();
        easeToScreen2();
      } else if (screen === 'detail' && dy > SWIPE_THRESHOLD) {
        lock();
        sceneRef.current?.exitToSlider();
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [screen, handleEnter, isMobile]);

  const backgroundFlavor = FLAVORS[activeFlavor];

  if (shotFlavor) {
    return (
      <Suspense fallback={null}>
        <ThumbnailShot flavor={shotFlavor} />
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
              ref={sceneRef}
              screen={screen}
              activeFlavor={activeFlavor}
              isMobile={isMobile}
              armed
              onEntranceStart={handleHeroEntranceStart}
              onEnterDetailComplete={handleEnterDetailComplete}
              onFlavorMidSpin={handleFlavorMidSpin}
              onSettle={handleSettle}
              onExitDetailStart={handleExitDetailStart}
              onExitDetailComplete={handleExitDetailComplete}
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
