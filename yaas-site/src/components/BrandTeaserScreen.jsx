import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ContactSection from './ContactSection';
import { BRAND_TEASER } from '../data/homepageCopy';
import { asset } from '../data/assetUrl';
import {
  ABOUT_PHOTOS,
  CYCLE_DURATION,
  CYCLE_EASE,
  CYCLE_INTERVAL_MS,
  SCATTER,
  STACK_SLOTS,
} from '../data/aboutBrand';
import { ABOUT_EXIT_UNITS, ABOUT_SCROLL_UNITS, ABOUT_TRIGGER_ID } from '../data/layout';

gsap.registerPlugin(ScrollTrigger);

// How far out of focus the heading goes as it fades. It never moves and never
// scales — it dissolves where it stands.
const HEADING_BLUR_PX = 26;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// Screen 5 — About the Brand. Figma 302:2 (opening state) and 302:146
// (assembled state). Four phases, all of them scrubbed off one pin except the
// last, which is a plain repeating timer:
//
//   0. the section above slides off with its bottom corners rounding away
//      (that part is not here — it's a document-flow handover plus the fall
//      driver in scroll/riseTransition.js), while this one waits underneath
//      with the heading centred at full size;
//   1. heading centred, full size — the state phase 0 uncovers;
//   2. the heading blurs out where it stands, and the four photos fly in from
//      off-screen and converge into the overlapping stack from the mock;
//   3. the left paragraph and the right paragraph + CTA slide in from their own
//      edges, timed to land with the stack;
//   4. from then on the front card drops to the back of the stack every two
//      seconds, forever.
export default function BrandTeaserScreen() {
  const pinRef = useRef(null);
  const headingRef = useRef(null);
  const deckRef = useRef(null);
  const leftRef = useRef(null);
  const asideRef = useRef(null);
  // Phase 4's state, shared across every run of the effect below — see the
  // comment where it is used.
  const cycleRef = useRef({ running: false, timer: 0, active: 0 });

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const pin = pinRef.current;
    const deck = deckRef.current;
    if (!pin || !deck) return undefined;

    const cards = Array.from(deck.querySelectorAll('.about-brand-card'));
    const N = cards.length;

    // ---- phase 4: the endless deck cycle --------------------------------
    // `active` is the index of the card currently at the front. A card's offset
    // from it — 0 at the front, N-1 at the back — is the only thing that decides
    // where that card goes, so a step is just `active` moving on by one and
    // every card re-tweening to the slot its new offset names. STACK_SLOTS runs
    // back to front, hence the flip. No buttons, no manual control: the offsets
    // and the timer are the whole mechanism.
    //
    // All of its state lives on a ref rather than in this closure. The pin's
    // trigger outlives any single run of this effect — HomePage kills and
    // recreates it once after mount, and React re-runs effects freely (twice on
    // every mount in development) — so an onUpdate closure from an earlier run
    // can still call in here. With the state in the closure each of those had
    // its own timer and its own idea of the order, and they spent the whole time
    // killing each other's tweens: measured three concurrent chains, two steps
    // each, with the cards never visibly moving. One shared record makes a
    // second caller a no-op instead.
    const cycle = cycleRef.current;
    const slotForOffset = (offset) => STACK_SLOTS[N - 1 - offset];
    const offsetOf = (index, active) => (active - index + N) % N;

    // The assembled state is this same mapping with the front-most card active,
    // so nothing has to hand over between phase 3 and phase 4 — phase 4 just
    // starts stepping a layout that is already correct.
    const RESTING_ACTIVE = N - 1;

    // Every tween the cycle starts, so stopping it can kill exactly those. NOT
    // gsap.killTweensOf(cards): that kills every tween targeting a card,
    // the scrubbed timeline's own among them — after which the cards stay
    // wherever the cycle left them and scrolling back up moves nothing
    // (measured: frozen in the assembled pose with the heading still on screen).
    const cycleTweens = [];

    function applyDeck(active, animate) {
      cards.forEach((card, index) => {
        const offset = offsetOf(index, active);
        const to = { ...slotForOffset(offset), x: 0 };
        // z-index is switched, never tweened. GSAP happily animates it as a
        // number, and a stack of four cards crossing through fractional values
        // spends the transition with two cards reading the same z (measured:
        // "1 2 1 2" mid-step) — the order visibly flickers. The new order is
        // correct from the first frame instead; the transforms are what travel.
        gsap.set(card, { zIndex: N - 1 - offset });
        if (!animate) {
          gsap.set(card, { ...to, scale: 1 });
          return;
        }
        cycleTweens.push(gsap.to(card, { ...to, duration: CYCLE_DURATION, ease: CYCLE_EASE }));
        // The one card whose offset wraps all the way round is the one leaving
        // the front for the back. On a stack this tight the slot change alone is
        // nearly invisible, so it dips as it goes — which is also what turns the
        // z-index drop above into "sliding under the others" rather than a pop.
        if (offset === N - 1) {
          cycleTweens.push(
            gsap.to(card, {
              keyframes: [
                { scale: 0.94, duration: CYCLE_DURATION * 0.4, ease: 'power3.in' },
                { scale: 1, duration: CYCLE_DURATION * 0.6, ease: CYCLE_EASE },
              ],
            })
          );
        }
      });
    }

    function stepCycle() {
      // Cheap enough to pay every two seconds, and it keeps four tweens off a
      // section nobody is looking at.
      const box = pin.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight) return;
      // Backwards through the indices: the card directly behind the front one is
      // the one that should come up next.
      cycle.active = (cycle.active - 1 + N) % N;
      applyDeck(cycle.active, true);
    }

    function startCycle() {
      if (cycle.running) return;
      cycle.running = true;
      // setInterval rather than gsap.delayedCall, even though everything else
      // here is GSAP: this is scheduled from inside the pin's own onUpdate, i.e.
      // while GSAP is mid-tick and inside the context this section's timeline
      // was built in, and a delayedCall created there was collected by that
      // context and never ran a single step (measured — startCycle fired, the
      // callback never did).
      cycle.timer = window.setInterval(stepCycle, CYCLE_INTERVAL_MS);
    }

    function stopCycle() {
      if (!cycle.running) return;
      cycle.running = false;
      window.clearInterval(cycle.timer);
      cycle.timer = 0;
      cycleTweens.forEach((tween) => tween.kill());
      cycleTweens.length = 0;
      // Reset the bookkeeping only — deliberately nothing is written to the DOM
      // here. The timeline owns the cards everywhere below the threshold and
      // re-asserts every one of these properties (x, y, rotate, skewX, scale,
      // zIndex, opacity) the moment its playhead crosses the fly-in tweens, so
      // stamping the resting layout on the way out only fought it: onUpdate
      // advances the playhead first and then calls in here, so the set landed
      // *after* the timeline's write on the same tick and the cards stayed
      // pinned at the assembled centre while only their opacity animated back.
      //
      // RESTING_ACTIVE is what the timeline's own assembled state matches (card
      // i in slot i), so restarting from it later needs no hand-over either.
      cycle.active = RESTING_ACTIVE;
    }

    const settle = () => {
      // The assembled state. Also the whole of what prefers-reduced-motion gets:
      // the heading has finished dissolving by this point, so this is the layout
      // from Figma 302:146 exactly.
      gsap.set(headingRef.current, { opacity: 0, filter: `blur(${HEADING_BLUR_PX}px)` });
      cycle.active = RESTING_ACTIVE;
      applyDeck(RESTING_ACTIVE, false);
      gsap.set(cards, { opacity: 1 });
      gsap.set([leftRef.current, asideRef.current], { xPercent: 0, opacity: 1 });
    };

    if (reducedMotion) {
      settle();
      return undefined;
    }

    // ---- phases 1-3: one scrubbed timeline ------------------------------
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });

      // Phase 1 occupies the first ABOUT_EXIT_UNITS of the range and has no
      // tweens of its own on purpose: that is the stretch of scroll the block
      // above spends sliding off, and the spec asks for the heading to be
      // centred and full-size for all of it.
      //
      // Then it goes out of focus and fades, in place. No y, no scale — the
      // whole point is that it does not travel anywhere.
      tl.fromTo(
        headingRef.current,
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: `blur(${HEADING_BLUR_PX}px)`, ease: 'power1.in', duration: 0.75 },
        ABOUT_EXIT_UNITS
      );

      cards.forEach((card, i) => {
        const scatter = SCATTER[i];
        const slot = STACK_SLOTS[i];
        tl.fromTo(
          card,
          {
            x: () => scatter.x * window.innerWidth,
            y: () => scatter.y * window.innerHeight,
            rotate: slot.rotate + scatter.rotate,
            skewX: slot.skewX,
            scale: 1,
            opacity: 0,
            zIndex: i,
          },
          {
            x: 0,
            y: slot.y,
            rotate: slot.rotate,
            skewX: slot.skewX,
            opacity: 1,
            ease: 'power2.out',
            duration: 1.3,
          },
          ABOUT_EXIT_UNITS + 0.15 + i * 0.07
        );
      });

      // The side copy is timed off the end of the convergence above, not off a
      // round number: the last card lands at 0.15 + 3*0.07 + 1.3 = 1.66, and
      // these run 1.35 -> 1.95, so they are travelling through the moment the
      // stack lands and settle just after it — which is what the reference does
      // (measured: its side copy is still 47% of the way out when its photos are
      // ~90% assembled).
      const textsAt = ABOUT_EXIT_UNITS + 1.35;
      tl.fromTo(
        leftRef.current,
        { xPercent: -140, opacity: 0 },
        { xPercent: 0, opacity: 1, ease: 'power2.out', duration: 0.6 },
        textsAt
      );
      tl.fromTo(
        asideRef.current,
        { xPercent: 140, opacity: 0 },
        { xPercent: 0, opacity: 1, ease: 'power2.out', duration: 0.6 },
        textsAt
      );

      // Everything above is the assembly; whatever is left of the budget is the
      // hold the finished layout sits in. Filling it with an idle tween rather
      // than leaving the timeline short is what keeps the phases at their real
      // durations — a shorter timeline would just be stretched across the whole
      // scroll range and every timing above would drift. Same trick as
      // ScenarioCardsIsometric's own rise tail.
      const assembleEnd = tl.duration();
      tl.to({}, { duration: Math.max(0, ABOUT_SCROLL_UNITS - assembleEnd) }, assembleEnd);

      // Phase 4 owns the cards from the moment the assembly is done — i.e. for
      // the whole hold, not just the single frame at progress 1. Derived from
      // the timeline rather than hard-coded so re-timing a phase above can
      // never leave this threshold behind.
      const cycleFrom = assembleEnd / ABOUT_SCROLL_UNITS;

      // Applied once up front so the section starts in its phase-1 state even
      // before the first scroll event — ScrollTrigger's onUpdate does not
      // necessarily fire pre-scroll.
      tl.progress(0);

      // 'top top' is a placeholder here: this section is chained after
      // AdvantagesScreen's own pin, and GSAP's resolution of 'top top' in that
      // position is not reliable (see ScenarioCardsIsometric.jsx). HomePage
      // kills and recreates this trigger once after mount with a measured
      // numeric start.
      //
      // The timeline is driven from onUpdate rather than handed over as
      // `animation`, which is the same shape AdvantagesScreen uses: `scrub`
      // smooths `self.progress` itself, so setting the playhead from it gives
      // exactly the same easing a linked animation would. Linking it was the
      // bug — HomePage's correction pass kills and recreates this trigger with
      // kill(revert, allowAnimation: true), which deliberately spares the linked
      // animation, and the timeline came back out of that unpaused. Measured
      // after the swap: start/end and progress were perfect (13455 -> 17055,
      // progress 0 / 0.25 / 0.5 / 0.75 / 0.94 against scroll) while tl.time()
      // read 3.75 / 2.38 / 1.7 / 1.81 / 2.4 — a playhead running on its own
      // clock. A callback survives the vars copy intact and has no such state.
      ScrollTrigger.create({
        id: ABOUT_TRIGGER_ID,
        trigger: pin,
        start: 'top top',
        end: () => `+=${ABOUT_SCROLL_UNITS * window.innerHeight}`,
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        // invalidateOnRefresh only reaches a linked animation, so with the
        // timeline driven by hand this is what re-resolves its function-based
        // values (the scatter offsets, which are fractions of the viewport)
        // after a resize.
        onRefresh: () => tl.invalidate(),
        onUpdate: (self) => {
          tl.progress(self.progress);
          // The cycle and the scrub both write the cards' transforms, so only
          // one of them may be live at a time. The cycle owns them from the
          // moment the assembly is done; scrolling back up hands them straight
          // back.
          if (self.progress >= cycleFrom) startCycle();
          else stopCycle();
        },
      });
    }, pin);

    return () => {
      stopCycle();
      ctx.revert();
    };
  }, [reducedMotion]);

  return (
    <section className={`about-brand ${reducedMotion ? 'is-static' : ''}`} id="about">
      {/* Figma 302:148 — the oversized wordmark the section is set on, at the
          5% opacity it carries in the mock. One viewport tall and kept in frame
          by scroll/riseTransition.js's backdrop driver, the same way the
          Advantages section's gradient is: that is what lets the contact block
          below share this one field instead of starting a second copy of it,
          so the join between the two has no seam. */}
      <div className="about-brand-bg" aria-hidden="true">
        <img src={asset('/images/about-brand-wordmark.svg')} alt="" />
      </div>

      <div className="about-brand-pin" ref={pinRef}>
        <div className="about-brand-heading-slot">
          <h2 className="about-brand-heading" ref={headingRef}>
            <span className="about-brand-heading-line about-brand-heading-line-1">
              {BRAND_TEASER.h2Lines[0]}
            </span>
            <span className="about-brand-heading-line about-brand-heading-line-2">
              {BRAND_TEASER.h2Lines[1]}
            </span>
          </h2>
        </div>

        <div className="about-brand-stage">
          <p className="about-brand-text about-brand-text-lead" ref={leftRef}>
            {BRAND_TEASER.copyParagraphs[0]}
          </p>

          <div className="about-brand-deck" ref={deckRef}>
            {ABOUT_PHOTOS.map((photo, i) => (
              <div className="about-brand-card" key={`${photo.src}-${i}`}>
                <img src={photo.src} alt={photo.alt} loading="lazy" />
              </div>
            ))}
          </div>

          {/* No "Read Our Story" CTA any more, at any width: there is no
              separate About the Brand page for it to open, and none is
              planned, so it pointed at a route that does not exist. Removed
              rather than hidden — a link to nowhere is not worth keeping
              around. This block is the whole of that story now. */}
          <div className="about-brand-aside" ref={asideRef}>
            <p className="about-brand-text">{BRAND_TEASER.copyParagraphs[1]}</p>
          </div>
        </div>
      </div>

      {/* Inside this section rather than after it, so it sits on the backdrop
          above instead of mounting a second one — the same arrangement the FAQ
          has inside the Advantages section. */}
      <ContactSection />
    </section>
  );
}
