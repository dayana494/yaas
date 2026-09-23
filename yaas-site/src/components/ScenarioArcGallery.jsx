import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionHeading from './SectionHeading';
import {
  SCENARIOS,
  SCREEN2_ARC_ORDER,
  SCREEN2_ARC_STOP_ID,
  SCREEN2_HEADLINE,
  SCREEN2_HEADLINE_ACCENT_AT,
  SCREEN2_SUBLINE,
} from '../data/scenarios';
import { SCREEN2_ARC_TRIGGER_ID } from '../data/layout';
import { mobilePinType, useOverlapEnabled } from '../scroll/riseTransition';

gsap.registerPlugin(ScrollTrigger);

const byId = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
const ARC = SCREEN2_ARC_ORDER.map((id) => byId[id]);

// Three copies of the five-photo strip, so the arc always has real cards
// filling it on both sides through the whole travel instead of running out
// at an edge — the loop the spec asks for, without the index wrapping (and
// the pop it causes) that a true modulo carousel needs. The travel below is
// only ~2.3 slots, so three cycles is comfortably more than enough.
const CYCLES = 5;
const STRIP = Array.from({ length: ARC.length * CYCLES }, (_, i) => ARC[i % ARC.length]);
// The party shot in the middle cycle — where the travel stops (spec step 3).
const STOP_INDEX = ARC.length * Math.floor(CYCLES / 2) + SCREEN2_ARC_ORDER.indexOf(SCREEN2_ARC_STOP_ID);
// How far the strip slides left before it settles on that card — long
// enough that a good handful of photos pass through the middle on the way,
// rather than the one or two a short travel showed. Deliberately not a whole
// number: this is a ribbon that drifts and comes to rest, not a card-by-card
// pager. The strip carries CYCLES copies of the set precisely so there's
// always real content either side across a travel this long.
const TRAVEL_SLOTS = 7;

// ---------- Arc shape ----------
// Concave (Figma node 258:208): the centre card sits flat and furthest away,
// the ones beside it curve *toward* the viewer, so they read taller and
// trapezoidal — near edge stretched, far edge foreshortened — rather than
// shrinking away like a convex/cover-flow arc would. Every number is a
// multiple of the card's own measured width, so the whole arc scales with
// the card instead of needing its own breakpoints.
// x is applied *after* the per-card perspective() in the transform list, so
// these are literal on-screen pixels rather than pre-projection units —
// which is what makes the spacing tunable straight against the mockup.
const ARC_Z_STEP = 0.7; // translateZ toward the viewer, per slot of arc depth
// Rounds off the corner in that depth profile at the middle of the arc.
// Depth used to be a flat multiple of |d|, which is a cusp at d = 0 — and a
// cusp there makes a card's rendered width change direction abruptly as it
// crosses the middle, which left the one pair of neighbours straddling the
// centre noticeably tighter than every other pair while the strip moved.
const ARC_Z_SMOOTH = 0.35;
const ARC_ROT_STEP = 24; // degrees of rotateY per slot — what makes the trapezoid
const ARC_PERSPECTIVE = 2.62; // perspective distance, also in card widths
// Constant clear space between neighbouring photos, in card widths. Spacing
// used to be a plain sine of the slot offset, which spread cards unevenly:
// a card's *rendered* width changes as it travels out along the arc (the
// perspective magnifies it while the rotation foreshortens it), so a fixed
// x-step left the gaps growing and shrinking as the strip moved, and the
// wider outer cards ran into their neighbours. Positions are now integrated
// from the rendered width itself (buildSpacingTable), which holds this gap
// constant at every offset and at every moment of the travel.
const ARC_GAP = 0.06;
// Past this the arc's own maths stops meaning anything (the rotation passes
// 90°, the perspective divide flips sign) and nothing is drawn anyway — the
// spare strip copies out here only need to keep the chain of positions
// going, so they reuse the edge values from this offset.
const EXTENT_CLAMP = 3.2;
// Cards hold full opacity across the visible arc and fade out past it, so
// the strip's far ends never pop in or out mid-travel.
const FADE_START = 2.2;
const FADE_END = 3.1;

// Split of this section's own pinned scroll: travel first, then the expand.
// Both grew with TRAVEL_SLOTS above — the longer ribbon needs the extra
// scroll distance to keep roughly a third of a viewport per photo passing
// through the middle, rather than racing through them.
const ARC_PHASE = 0.62;
const SCROLL_UNITS = 3.4; // viewport heights of scroll the whole pin spans

// How the rest of the screen (headline, subline, every card but the growing
// one) dissolves across the expand. Faster than the expand itself so the
// screen is clear before the card lands, not still dissolving under it.
const VEIL_RATE = 1.25;
const VEIL_BLUR_PX = 18;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Where a card at slot offset `u` actually renders its two vertical edges,
// as distances from its own centre. Both corners are projected exactly
// rather than treated as if they shared one depth: rotateY swings the outer
// corner toward the viewer and the inner one away, and the perspective
// divide is non-linear, so the card renders as a trapezoid whose outer half
// is visibly wider than its inner half. Assuming a symmetric box is what
// let neighbours overlap by ~60px mid-travel.
// Smoothed stand-in for |u|: same slope far out, rounded through zero.
function arcDepth(u) {
  return Math.sqrt(u * u + ARC_Z_SMOOTH * ARC_Z_SMOOTH) - ARC_Z_SMOOTH;
}

function edgeExtents(rawU, cardW, perspective) {
  const u = Math.max(-EXTENT_CLAMP, Math.min(EXTENT_CLAMP, rawU));
  const theta = (-u * ARC_ROT_STEP * Math.PI) / 180;
  const z = ARC_Z_STEP * cardW * arcDepth(u);
  const half = cardW / 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const floor = perspective * 0.15; // keeps the divide away from the camera plane
  const left = (half * cos * perspective) / Math.max(perspective - z - half * sin, floor);
  const right = (half * cos * perspective) / Math.max(perspective - z + half * sin, floor);
  return { left, right };
}

// Lays the whole strip out for one frame and returns each card's x, in
// pixels, measured from the middle of the arc.
//
// Spacing has to hold the *clear space between neighbouring edges*
// constant, and every card renders as a lopsided trapezoid whose two edges
// sit at different distances from its own centre (see edgeExtents). So
// rather than deriving positions from any width-versus-offset curve — which
// only ever approximates the gap, and was worst exactly across the middle
// of the arc where that curve turns — this walks the strip pair by pair and
// puts each card's near edge one gap from its neighbour's. Exact by
// construction, at any fractional offset, so the spacing stays even while
// the strip is moving and not just where it comes to rest.
//
// The ladder is then shifted so that slot offset 0 lands at x = 0,
// interpolating between the two cards straddling it — which is what keeps
// the strip's motion continuous as cards cross the middle, instead of the
// whole arc jumping each time a different card becomes the middle one.
function layoutArc(ds, cardW, perspective) {
  const extents = ds.map((d) => edgeExtents(d, cardW, perspective));
  const gapPx = ARC_GAP * cardW;
  const ladder = [0];
  for (let i = 1; i < ds.length; i += 1) {
    ladder[i] = ladder[i - 1] + extents[i - 1].right + gapPx + extents[i].left;
  }

  let k = 0;
  while (k < ds.length - 2 && ds[k + 1] < 0) k += 1;
  const span = ds[k + 1] - ds[k];
  const t = span === 0 ? 0 : (0 - ds[k]) / span;
  const zero = ladder[k] + (ladder[k + 1] - ladder[k]) * t;

  return ladder.map((v) => v - zero);
}

export default function ScenarioArcGallery() {
  const pinRef = useRef(null);
  const stageRef = useRef(null);
  const targetRef = useRef(null);
  const copyRef = useRef(null);
  const headlineRef = useRef(null);
  const sublineRef = useRef(null);
  const cardRefs = useRef([]);
  const setCardRef = (i) => (el) => (cardRefs.current[i] = el);

  // Everything the per-frame math needs, measured once per refresh instead of
  // re-read every tick (these only change on resize/refresh, and reading rects
  // mid-scrub would thrash layout).
  const metricsRef = useRef({ cardW: 0, cardH: 0, targetW: 0, targetH: 0, dx: 0, dy: 0 });
  const progressRef = useRef(0);
  const resizeObsRef = useRef(null);
  const screen2Ref = useRef(null);
  // The pin type depends on the width (mobilePinType), so the trigger is
  // rebuilt when the breakpoint is crossed.
  const overlap = useOverlapEnabled();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = cardRefs.current;
      const stage = stageRef.current;
      const target = targetRef.current;
      if (!cards.length || !stage || !target) return undefined;

      // Offset of an element's border box from an ancestor, walking the
      // offsetParent chain — deliberately not getBoundingClientRect: rects
      // fold in both the pin's own fixed-positioning and any transform
      // already written onto these elements, and they read differently again
      // during ScrollTrigger's refresh pass (which transiently reverts every
      // pin on the page to remeasure natural flow). Offsets are plain layout
      // numbers and stay valid through all of it.
      function offsetWithin(el, ancestor) {
        let x = 0;
        let y = 0;
        let node = el;
        while (node && node !== ancestor) {
          x += node.offsetLeft;
          y += node.offsetTop;
          node = node.offsetParent;
        }
        return { x, y };
      }

      function measure() {
        // Card 0 is never width/height-mutated (only the centre card is, by
        // the expand below), and offsetWidth/Height ignore transforms — so
        // this reads the arc card's true CSS size, not a rotated bounding box.
        const sample = cards[0];
        const root = pinRef.current;
        // Both go null the moment React detaches this component's refs, and
        // both callers can still fire after that: a ResizeObserver delivers
        // asynchronously, and ScrollTrigger.refresh() walks every live trigger
        // — including this one, in the window before the cleanup below kills
        // it. Leaving the homepage through a <Link> hit exactly that: the
        // flavor page's own refresh() on mount ran measure() against detached
        // refs, threw on sample.offsetWidth, and took the whole app down to a
        // blank screen. Nothing to measure yet (or any more) is not an error.
        if (!sample || !root) return;
        const stageOff = offsetWithin(stage, root);
        const targetOff = offsetWithin(target, root);
        // Both boxes are centred on their container's own 50% line (the
        // target via left:50% + translateX(-50%), the cards the same way), so
        // offsetLeft already *is* each one's visual centre — no need to undo
        // the translate.
        const cardW = sample.offsetWidth;
        metricsRef.current = {
          cardW,
          cardH: sample.offsetHeight,
          targetW: target.offsetWidth,
          targetH: target.offsetHeight,
          dx: targetOff.x - (stageOff.x + stage.offsetWidth / 2),
          dy: targetOff.y + target.offsetHeight / 2 - (stageOff.y + stage.offsetHeight / 2),
        };
      }

      function apply(progress) {
        progressRef.current = progress;
        const { cardW, cardH, targetW, targetH, dx, dy } = metricsRef.current;
        if (!cardW) return;

        const travelT = easeInOut(clamp01(progress / ARC_PHASE));
        const expandT = clamp01((progress - ARC_PHASE) / (1 - ARC_PHASE));
        const centre = STOP_INDEX - TRAVEL_SLOTS * (1 - travelT);

        // Everything on this screen that isn't the growing card blurs out and
        // fades to a true opacity 0 as that card takes the container — not
        // merely hidden behind it, which would still show at the 50px insets
        // the expanded card leaves around itself. Reaching 0 at expandT 0.8
        // (hence the 1.25) rather than at 1 means the screen is already clear
        // by the time the card actually lands, instead of the last of the old
        // content still dissolving under a card that has stopped moving.
        const veilT = clamp01(expandT * VEIL_RATE);
        const veilOpacity = String(1 - veilT);
        const veilBlur = veilT === 0 ? 'none' : `blur(${veilT * VEIL_BLUR_PX}px)`;
        [headlineRef.current, sublineRef.current].forEach((el) => {
          if (!el) return;
          el.style.opacity = veilOpacity;
          el.style.filter = veilBlur;
        });

        const perspective = ARC_PERSPECTIVE * cardW;
        // Laid out as one strip per frame: each card's position depends on
        // its neighbours' rendered edges, not on its own offset alone.
        const ds = cards.map((_, i) => i - centre);
        const xs = layoutArc(ds, cardW, perspective);

        cards.forEach((card, i) => {
          if (!card) return;
          const d = ds[i];
          const abs = Math.abs(d);

          // Past the fade-out edge the strip's spare copies would still be
          // laid out (and, being nearer the viewer, huge) — drop them from
          // rendering entirely rather than leaving invisible giants behind.
          if (abs > FADE_END) {
            card.style.opacity = '0';
            card.style.visibility = 'hidden';
            return;
          }
          card.style.visibility = 'visible';

          const isCentre = i === STOP_INDEX;
          const x = xs[i];
          const z = ARC_Z_STEP * cardW * arcDepth(d);
          const rotY = -d * ARC_ROT_STEP;

          const arcOpacity = abs <= FADE_START ? 1 : 1 - (abs - FADE_START) / (FADE_END - FADE_START);

          if (isCentre) {
            // The travel always ends with this card at d === 0, so its arc
            // transform is already identity by the time the expand starts —
            // growing it is a straight interpolation from the resting arc
            // box to the full-container target box, no transform unwinding.
            const e = easeInOut(expandT);
            card.style.width = `${lerp(cardW, targetW, e)}px`;
            card.style.height = `${lerp(cardH, targetH, e)}px`;
            card.style.opacity = String(arcOpacity);
            card.style.zIndex = '5';
            card.style.transform =
              `translate(-50%, -50%) translate3d(${x + dx * e}px, ${dy * e}px, 0) ` +
              `perspective(${perspective}px) translateZ(${z * (1 - e)}px) rotateY(${rotY * (1 - e)}deg)`;
          } else {
            // Everything else clears out of the way as the centre card takes
            // over the container — blurring on the same ramp as the headline
            // and subline so the whole screen dissolves as one thing rather
            // than the side cards snapping out while the copy softens.
            card.style.opacity = String(arcOpacity * (1 - veilT));
            card.style.filter = veilBlur;
            card.style.zIndex = String(4 - Math.min(3, Math.round(abs)));
            card.style.transform =
              `translate(-50%, -50%) translate3d(${x}px, 0, 0) ` +
              `perspective(${perspective}px) translateZ(${z}px) rotateY(${rotY}deg)`;
          }
        });

        // Title/caption fade in over the back half of the expand, so the card
        // matches the first .scenario-card-iso exactly at the hand-off.
        if (copyRef.current) {
          copyRef.current.style.opacity = String(clamp01((expandT - 0.55) / 0.35));
        }
      }

      screen2Ref.current = pinRef.current.closest('.screen2');
      screen2Ref.current?.classList.add('is-arc-running');

      measure();
      apply(0);

      // The stage's own box shifts whenever the headline above it reflows —
      // most notably when the display webfont finishes loading and the
      // heading settles at its real height, which lands after the first
      // measure. Re-measuring on that (and on any later resize of the stage)
      // is what keeps the expand's landing point exact; without it the card
      // finished 8px shy of the stack's own card.
      const ro = new ResizeObserver(() => {
        measure();
        apply(progressRef.current);
      });
      resizeObsRef.current = ro;
      ro.observe(stage);
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          measure();
          apply(progressRef.current);
        });
      }

      ScrollTrigger.create({
        id: SCREEN2_ARC_TRIGGER_ID,
        trigger: pinRef.current,
        // Placeholder — corrected once from HomePage.jsx after every section
        // has mounted, same as every other pin chained after .intro-wrap's
        // (see that file's own comment for why 'top top' can't be trusted
        // here).
        start: 'top top',
        end: () => `+=${SCROLL_UNITS * window.innerHeight}`,
        // Tracks scroll 1:1 rather than easing behind it (the stack below
        // uses scrub: 1 for its own flips). The hand-off depends on the card
        // being *exactly* at its target the moment progress hits 1 — any lag
        // there and the stack's identical card is revealed while this one is
        // still a few percent short, which reads as a pop.
        scrub: true,
        pin: true,
        ...mobilePinType(),
        invalidateOnRefresh: true,
        onRefresh: () => {
          measure();
          apply(progressRef.current);
        },
        onUpdate: (self) => {
          apply(self.progress);
          // The stack below is pulled up a full viewport (see
          // .scenario-cards-iso's own margin) so its pin can start exactly
          // where this one ends. That overlap means it would otherwise creep
          // into frame from the bottom through the back half of this pin —
          // it stays hidden until the hand-off itself.
          screen2Ref.current?.classList.toggle('is-arc-running', self.progress < 1);
        },
      });
    }, pinRef);

    return () => {
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      screen2Ref.current?.classList.remove('is-arc-running');
      screen2Ref.current = null;
      // HomePage's correction pass replaces this trigger with one created
      // outside this context, which ctx.revert() would not reach.
      ScrollTrigger.getById(SCREEN2_ARC_TRIGGER_ID)?.kill(true);
      ctx.revert();
    };
  }, [overlap]);

  return (
    <section className="screen2-arc" ref={pinRef}>
      {/* Invisible stand-in carrying the exact geometry of a real
          .scenario-card-iso — the expand measures this instead of
          recomputing that rule's own width/inset formula, so the card lands
          pixel-identical to the stack that takes over right after it. */}
      <div className="scenario-card-iso screen2-arc-target" ref={targetRef} aria-hidden="true" />

      <div className="screen2-arc-inner">
        <div className="screen2-headline" ref={headlineRef}>
          {/* One heading, not two. It is still two-tone: the whole sentence
              goes through a single reveal, and accentFrom marks the character
              where the pink half starts so those pieces take the accent class
              (see DropText).
              As two headings it was two independent reveals inside two
              inline-blocks, so the line breaks fell wherever that pair of boxes
              happened to wrap rather than where the sentence does — the seam
              this fixes. */}
          <h2 className="screen2-h2">
            <SectionHeading
              as="span"
              className="screen2-h2-ink"
              text={SCREEN2_HEADLINE}
              accentFrom={SCREEN2_HEADLINE_ACCENT_AT}
              accentClassName="screen2-h2-accent"
            />
          </h2>
        </div>

        <div className="screen2-arc-stage" ref={stageRef}>
          {STRIP.map((scenario, i) => (
            <article
              className={`screen2-arc-card ${i === STOP_INDEX ? 'is-centre' : ''}`.trim()}
              key={`${scenario.id}-${i}`}
              ref={setCardRef(i)}
            >
              <div className="scenario-card-bg" style={{ backgroundImage: `url(${scenario.photo})` }} />
              {i === STOP_INDEX && (
                <>
                  <div className="scenario-card-shade" />
                  <div className="scenario-card-copy" ref={copyRef}>
                    <h3 className="scenario-card-title">{scenario.title}</h3>
                    <p className="scenario-card-caption">{scenario.caption}</p>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>

        <p className="screen2-subline" ref={sublineRef}>{SCREEN2_SUBLINE}</p>
      </div>
    </section>
  );
}
