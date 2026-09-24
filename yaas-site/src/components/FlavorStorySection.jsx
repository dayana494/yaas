import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Background from './Background';
import HeroWordmark from './HeroWordmark';
import SiteHeader from './SiteHeader';
import FlavorStoryScene from '../three/FlavorStoryScene';
import { useHeroScale } from '../hooks/useHeroScale';
import { RISE_UNITS, mobilePinType, useOverlapEnabled } from '../scroll/riseTransition';
import { onRealResize } from '../scroll/onRealResize';

gsap.registerPlugin(ScrollTrigger);

// The can's resting pose: dead upright, label square to the camera — the
// same pose the homepage gallery's centred can holds (arcTransform(0) in
// three/arcLayout.js returns rotY 0, and CanRig sets x and z to 0 with it),
// so a flavor page opens on the exact can the gallery hands off from.
const START_ROTATION = { x: 0, y: 0, z: 0 };

const TURN = Math.PI * 2;

// The tumble, in absolute radians. One waypoint per text screen, and each one
// is the pose the can holds at the moment that screen is centred — the poses
// are the point, the turning between them is what gets the can from one to the
// next.
//
//   1. "still not rattled" — a whole roll through the bottom is already behind
//      it, so the can stands back on its base, cap up, with a slight lean.
//   2. "zero sugar. zero panic." — a second roll, and square to the camera:
//      y on a whole multiple of 2π puts the label to the front.
//   3. "0 g sugar · 5 cal…" — still rolling, and turned to its back (y on an
//      ODD multiple of π), which is where the nutrition panel reads.
//   4. the finale — a third roll completes and the can settles upright and
//      front-on again, exactly as it began.
//
// Two head-over-heels rolls, not four, and only on the two handovers that
// earn one: leaving the first screen, and leaving "sweet-tart…" for the
// nutrition panel. x gains a whole 2π across each of those and barely moves
// across the other two, where the motion is carried by the spin (y) and a
// lean (z) instead — so the can keeps turning the whole way down without
// somersaulting through every transition.
//
// Every screen's x still lands within a few degrees of a whole multiple of
// 2π — the can standing on its base — and that is load-bearing for screen 3:
// the two rotations compose, so at x ≈ π (mid-roll, can inverted) a y of π
// turns the FRONT back toward the camera rather than the back. Reading the
// nutrition panel there only works with the can the right way up. Confirmed by
// getting it wrong first: at x = 4π + 2.6 with y = 5π the screen showed the
// label upside down.
//
// x and y are monotonic throughout: a dip would read as the can stalling and
// reversing mid-scroll. z is only ever a small lean, so it is free to wander
// either side of upright.
const WAYPOINTS = [
  // screen 1 — a full roll through the bottom is done; stands, tipped back a little
  { x: TURN - 0.08, y: TURN, z: 0.14 },
  // screen 2 — no roll, just a spin to face front again and a rock forward
  { x: TURN + 0.12, y: TURN * 2, z: -0.16 },
  // screen 3 — the second roll, landing on its back for the nutrition panel
  { x: TURN * 2 - 0.1, y: Math.PI * 5, z: 0.16 },
  // finale — no roll, a half spin back to front, settling upright and square
  { x: START_ROTATION.x + TURN * 2, y: START_ROTATION.y + TURN * 3, z: 0 },
];

// How the copy moves past the can, in viewports of scroll (one timeline
// second each — the trigger's end is this many innerHeights).
//
// Measured off the reference this was modelled on (eathungrytiger.com): its
// jar is position: fixed and never moves, while its headlines are ordinary
// static flow — scroll 1200px and every one of them moves exactly 1200px up.
// So the copy here travels at exactly 1x scroll speed, entering from below the
// fold and leaving over the top, rather than crossfading in place as it did
// before. BLOCK_TRAVEL is 2.2 because a block covers 2.2 viewports of distance
// going from just under the bottom edge to just over the top one, and at 1x
// that costs 2.2 viewports of scroll; SPACING is the reference's own 1.5
// viewports between consecutive headlines.
// Halved from 1: the wait between the first screen leaving and the first
// headline arriving read as dead scroll. The travel itself can't be shortened
// without breaking the 1x speed, so this is the part that gives — the first
// block now starts climbing while the hero is still on its way out, the way
// two sections of an ordinary page overlap at their boundary.
const HERO_UNITS = 0.5;
// Spaced so the air between one screen's caption and the next screen's
// headline matches the air between the first screen and the first headline.
// Not a round number because it isn't a free choice: measured at 1920x920, the
// hero's flavor name ends 821px into the strip and the first headline starts
// 848px after it, while a block's own headline and caption sit 706px apart —
// so consecutive blocks have to start (848 + 706) / 920 = 1.689 viewports
// apart for the two gaps to come out the same.
const BLOCK_SPACING = 1.689;
// Taken off every gap except the first — so "sweet-tart…" sits 100px closer to
// "0 g sugar…", and that 100px closer again to the finale. In pixels rather
// than viewports because that is how the trim was specified, and it is
// converted against the live innerHeight where the timeline is built.
const SHORTEN_LATE_GAPS_PX = 100;
const BLOCK_TRAVEL = 2.2;
// The last block stops half-way instead of leaving: the can comes to rest in
// the middle of it and the gallery then climbs over both, so it holds centred
// for the whole handover.
const FINALE_TRAVEL = BLOCK_TRAVEL / 2;

// One viewport of scroll, expressed in the units the blocks are actually
// transformed in.
//
// They live inside the 1200x650 hero stage, which is scale()d as a whole at
// the desktop breakpoint — so a `y` of N pixels set on a block renders as
// N * heroScale on screen, and asking for one viewport of travel would
// overshoot it by that factor. Dividing it back out is what keeps the copy at
// true 1x. Below 1024 the stage carries no scale and this is just innerHeight.
function stageScale() {
  const scaled = window.matchMedia('(min-width: 1024px)').matches;
  const scale = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--hero-scale')
  );
  return scaled && scale > 0 ? scale : 1;
}

function viewportTravel() {
  return window.innerHeight / stageScale();
}

// The breakpoint HeroWordmark itself switches on: above it the giant desktop
// wordmark, below it the contained mobile banner.
const MOBILE_QUERY = '(max-width: 768px)';

// Ink top and bottom of a run of text, in screen px.
//
// Read off the rendered text rather than computed from the CSS, because the
// copy and the can sit in different coordinate systems: the name is inside the
// scaled stage, the can is in a full-bleed canvas measured in world units, and
// the only thing they share is the screen. Canvas metrics give the real ink
// bounds instead of the line box, which for Soledago sits a long way below and
// above the letters.
function textInk(el) {
  const style = getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize);
  const lineHeight = parseFloat(style.lineHeight) || fontSize;
  const context = textInk.ctx || (textInk.ctx = document.createElement('canvas').getContext('2d'));
  context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  const metrics = context.measureText(el.textContent.trim());
  const baselineInBox =
    (lineHeight - (metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent)) / 2 +
    metrics.fontBoundingBoxAscent;
  const scale = stageScale();
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + (baselineInBox - metrics.actualBoundingBoxAscent) * scale,
    // The LAST line's, in case the name has wrapped.
    bottom: rect.bottom - (lineHeight - baselineInBox - metrics.actualBoundingBoxDescent) * scale,
  };
}

// Where the can sits on the first screen, as a fraction of the screen, plus
// which part of the can that fraction refers to.
//
// Desktop stands it on the flavor name's baseline ('foot'), so the can and the
// name share one line. A phone has no room for that: the wordmark is a banner
// at the top and the name sits at the foot, and standing the can on the name
// pushed it right down against it. There it is centred in the gap instead
// ('centre'), which is what "equal air above and below" asks for. The mobile
// wordmark is an SVG, so its own box is already its ink and needs no metrics.
function measureCanAnchor(nameEl, boxEl) {
  if (!nameEl || !boxEl) return null;
  const box = boxEl.getBoundingClientRect();
  if (!(box.height > 0)) return null;
  const name = textInk(nameEl);

  if (window.matchMedia(MOBILE_QUERY).matches) {
    const logo = boxEl.querySelector('.hero-mobile-banner-logo');
    if (!logo) return null;
    const centre = (logo.getBoundingClientRect().bottom + name.top) / 2;
    return { mode: 'centre', at: (centre - box.top) / box.height };
  }

  return { mode: 'foot', at: (name.bottom - box.top) / box.height };
}

// How many visual lines an element's text currently wraps into. transform:
// scale() on an ancestor (the 1200x650 stage) doesn't change this: the
// number of line boxes is a layout fact, unaffected by how big the result is
// painted — so this works the same at every --hero-scale, unlike a height
// comparison would (a scaled box's rendered height isn't the raw layout
// height any tolerance could be checked against).
function countLines(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
  return tops.size;
}

// Shrinks one kicker's font-size, if it has to, so its headline never runs
// past `maxLines`.
//
// Every screen's kicker sits in a box sized from the Figma mock at one fixed
// font-size — right for "STILL NOT RATTLED", but "NEVER IN A RUSH, NEVER
// BEHIND" (blueberry) or "SHARP TASTE, SHARPER FOCUS" (lemon, split layout)
// run a line or two past it at that same size, at almost every width:
// confirmed live, both screens' kickers wrap 3-4 lines instead of 2 on
// several flavors, from phones up through desktop. Only strawberry's own
// copy happens to fit the box it was sized for.
//
// Widening the box instead of shrinking the font was the first idea, and it
// works for the centred screen — but the split screen's kicker and caption
// share the stage's width down the middle (0-809 / 809-1200), so widening
// one runs straight into the other; a general fix has to work for both
// layouts the same way, and font-size is the one knob that does. The floor
// (55% of the box's own nominal size) is well under the worst case actually
// measured (lemon's split kicker needed 82%), so it is a backstop, not a
// value anything is expected to hit.
//
// Binary search, not a step-down loop: the box's nominal font-size is
// authored per breakpoint (a clamp() on mobile, a fixed px on desktop), so
// this has no fixed starting point to count down from — only a known range
// (the nominal size itself, down to the floor) to search within. 20 steps
// settles to a fraction of a pixel, well inside anything a reader could see.
function fitKickerLines(el, maxLines = 2, minRatio = 0.55) {
  if (!el || !el.textContent.trim()) return;
  el.style.fontSize = '';
  const nominal = parseFloat(getComputedStyle(el).fontSize);
  if (!(nominal > 0) || countLines(el) <= maxLines) return;

  const floor = nominal * minRatio;
  el.style.fontSize = `${floor}px`;
  if (countLines(el) > maxLines) return; // best effort — floor is still too wide for this text

  let lo = floor;
  let hi = nominal;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = `${mid}px`;
    if (countLines(el) <= maxLines) lo = mid;
    else hi = mid;
  }
  el.style.fontSize = `${lo}px`;
}

// Section A of the flavor detail page: the hero read and the scroll-driven
// tumble, as one continuous pinned block.
//
// The first screen is built on the homepage hero's own fixed 1200x650 stage
// (hooks/useHeroScale) rather than a layout of its own — same scale, same
// grid, same menu component — so the wordmark and the pills land exactly
// where the homepage draws them and the flavor's own copy takes the grid slot
// the homepage's subhead/CTA row occupies. The text screens that follow sit on
// that same stage, which is what keeps their type locked to the can's scale
// the way the mock draws it instead of drifting against it on resize.
export default function FlavorStorySection({ flavor, story, simpleMode }) {
  const wrapRef = useRef(null);
  const stickyRef = useRef(null);
  const nameRef = useRef(null);
  const heroCopyRef = useRef(null);
  const heroWordmarkRef = useRef(null);
  // Fraction of the screen the can's foot is stood on — the flavor name's
  // baseline. Null until measured, which is one frame; the can renders
  // centred for that frame, then drops onto the line.
  const [canAnchor, setCanAnchor] = useState(null);
  const blockRefs = useRef([]);
  // Each block that has a kicker gets a slot here (index-aligned with blocks,
  // holes where a block has none — the caption-only screen). fitKickerLines
  // reads and writes these directly; nothing else needs to re-render off it.
  const kickerRefs = useRef([]);
  // Stable across renders and mutated in place by the timeline below — the
  // can rig reads it every frame. See FlavorStoryCanRig for why the rotation
  // travels as a plain object rather than as a ref to the THREE.Group.
  // `drop` rides along with the rotation: 1 while the can is stood on the
  // flavor name for the first screen, 0 once it has lifted back to the centre
  // line the text screens are composed around. The rig reads both off this one
  // object every frame.
  const rotationRef = useRef({ ...START_ROTATION, drop: 1 });

  useHeroScale();

  const blocks = story.rotationBlocks;
  // The gallery only climbs over this section at desktop widths; below 1024 it
  // follows in plain flow, so the pin loses its hold and the timeline its idle
  // tail. Rebuilt when the breakpoint is crossed.
  const overlap = useOverlapEnabled();

  useEffect(() => {
    let cancelled = false;
    const remeasure = () => {
      if (cancelled) return;
      const next = measureCanAnchor(nameRef.current, stickyRef.current);
      if (!next) return;
      setCanAnchor((prev) =>
        prev && prev.mode === next.mode && Math.abs(prev.at - next.at) < 0.001 ? prev : next
      );
    };
    const fonts = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    fonts.finally(remeasure);
    remeasure();
    const offRemeasure = onRealResize(remeasure);
    return () => {
      cancelled = true;
      offRemeasure();
    };
  }, [flavor.title]);

  // Caps every kicker at 2 lines (see fitKickerLines) — depends on `blocks`
  // because navigating between flavor pages (the gallery's own <Link>s) swaps
  // this component's props without remounting it, so a flavor with different,
  // longer copy needs this to run again rather than keeping the previous
  // flavor's fit.
  useEffect(() => {
    let cancelled = false;
    const refit = () => {
      if (cancelled) return;
      kickerRefs.current.forEach((el) => fitKickerLines(el));
    };
    const fonts = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    fonts.finally(refit);
    refit();
    const offRefit = onRealResize(refit);
    return () => {
      cancelled = true;
      offRefit();
    };
  }, [blocks]);

  useEffect(() => {
    if (simpleMode) return undefined;

    const ctx = gsap.context(() => {
      const els = blockRefs.current.filter(Boolean);
      if (!els.length) return;

      // The moment each block sits centred on the screen — the instant its
      // composition is the one the page was designed around, and so the
      // instant the can has to be holding that screen's pose. Every block but
      // the last passes through its centre half way along its travel; the last
      // one stops there, which is also where the can comes to rest and the
      // gallery starts climbing.
      // Where each block starts its climb. The first gap keeps the full
      // BLOCK_SPACING — that is the one matched to the hero's own gap — while
      // every gap after it is pulled in by SHORTEN_LATE_GAPS_PX, so the back
      // half of the sequence reads tighter than the opening.
      const shorten = SHORTEN_LATE_GAPS_PX / window.innerHeight;
      const starts = els.map((_, i) => i).reduce((acc, i) => {
        acc.push(i === 0 ? HERO_UNITS : acc[i - 1] + BLOCK_SPACING - (i >= 2 ? shorten : 0));
        return acc;
      }, []);
      const centres = starts.map(
        (start, i) => start + (i === els.length - 1 ? FINALE_TRAVEL : BLOCK_TRAVEL / 2)
      );
      const finaleCentre = centres[centres.length - 1];
      // RISE_UNITS flat, not riseUnits(): that helper drops the hold to 0 below
      // 1024, because every other handover on the site stops overlapping there.
      // This page keeps its rounded climb on a phone, so it always pays for one.
      const hold = RISE_UNITS;
      const total = finaleCentre + hold;

      gsap.set(els, { opacity: 1, y: viewportTravel() * 1.1 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          // Long enough for every block to cross the screen at 1x scroll
          // speed, plus RISE_UNITS at the end during which the can is simply
          // held still while the gallery below climbs up over it — the same
          // handover the homepage's own pinned sections give the sections that
          // rise onto them.
          end: () => `+=${total * window.innerHeight}`,
          scrub: 1,
          pin: true,
          ...mobilePinType(),
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // The first screen leaves the way every screen after it does: it travels
      // up and off, at scroll speed, rather than dissolving on the spot. Menu,
      // wordmark, flavor name and product line go as one piece.
      //
      // Both layers here are unscaled boxes, so the travel is plain pixels and
      // a viewport of scroll moves them exactly a viewport — no dividing out
      // the stage scale the way the blocks inside it need.
      tl.fromTo(
        [heroWordmarkRef.current, heroCopyRef.current],
        { y: 0 },
        { y: () => -window.innerHeight * 1.1, duration: 1.1, ease: 'none' },
        0
      );

      // The can lifts off the flavor name's baseline to the centre line over
      // the same stretch, so it rises with the first screen rather than
      // snapping once the screen is gone.
      tl.fromTo(rotationRef.current, { drop: 1 }, { drop: 0, duration: 1.1, ease: 'power1.inOut' }, 0);

      // The tumble runs from the very first pixel of scroll to the moment the
      // last block settles. It used to be held back until the hero had left,
      // which left the can sitting dead still through the whole first screen;
      // starting it at 0 means the first thing a scroll does is turn the can.
      // Each waypoint is timed to land exactly on its own screen's centred
      // moment, so the can is holding that screen's pose while that screen is
      // the one being read. (The even split is only the fallback for a flavor
      // whose copy isn't written yet and so has a different number of blocks
      // than there are poses.)
      //
      // Linear segments, not eased ones: an ease-in on the first segment is
      // what made the can look stuck for the opening stretch — it spends the
      // first pixels of scroll barely moving. With 'none' the very first pixel
      // of scroll turns it. Only the last segment eases out, so the can settles
      // into its resting pose instead of arriving at full speed and stopping
      // dead.
      const poseTimes =
        els.length === WAYPOINTS.length
          ? centres
          : WAYPOINTS.map((_, i) => ((i + 1) / WAYPOINTS.length) * finaleCentre);

      WAYPOINTS.forEach((rot, i) => {
        const isLast = i === WAYPOINTS.length - 1;
        const from = i === 0 ? 0 : poseTimes[i - 1];
        tl.to(
          rotationRef.current,
          { ...rot, duration: poseTimes[i] - from, ease: isLast ? 'power1.out' : 'none' },
          from
        );
      });

      // Each block rides up the screen at 1x scroll speed — in from under the
      // bottom edge, out over the top — instead of fading in and out on the
      // spot. `ease: 'none'` is the whole point: any easing would make the
      // copy drift against the scroll it is supposed to be moving with.
      els.forEach((el, i) => {
        const start = starts[i];
        const isLast = i === els.length - 1;
        tl.fromTo(
          el,
          { y: () => viewportTravel() * 1.1 },
          {
            y: () => (isLast ? 0 : viewportTravel() * -1.1),
            duration: isLast ? FINALE_TRAVEL : BLOCK_TRAVEL,
            ease: 'none',
          },
          start
        );
      });

      // The hold. Animates nothing — it exists only so the timeline's own
      // duration matches the pin's extended length. Without it everything
      // above would stretch to fill the extra RISE_UNITS of pinned scroll
      // instead of holding its real timing, since a scrubbed timeline maps
      // the trigger's whole 0->1 onto its own duration.
      if (hold > 0) tl.to({}, { duration: hold }, finaleCentre);
    }, wrapRef);

    return () => ctx.revert();
  }, [simpleMode, blocks, overlap]);

  return (
    <section className={`flavor-story-wrap${simpleMode ? ' is-simple' : ''}`} ref={wrapRef}>
      <div className="flavor-story-sticky" ref={stickyRef}>
        <Background color={flavor.color} />

        {/* The homepage's own giant wordmark component, unmodified — it owns
            both the desktop edge-to-edge treatment and the contained mobile
            one, so the flavor page's logo is the hero's logo at every width
            rather than a second version of it that has to be kept in step.
            The wrapper exists only to give the timeline one element to fade:
            HeroWordmark renders its own positioned stage, which this box then
            becomes the containing block for. */}
        <div className="flavor-hero-wordmark-layer" ref={heroWordmarkRef}>
          <HeroWordmark fitToContainer />
        </div>

        <div className="flavor-story-canvas-layer" aria-hidden="true">
          <FlavorStoryScene
            flavorId={flavor.id}
            rotation={rotationRef.current}
            spin={simpleMode}
            anchor={canAnchor}
          />
        </div>

        {/* The plain wrapper is what the timeline moves. The stage inside it
            carries translate(-50%,-50%) scale(...) of its own, and animating a
            `y` straight onto that would have GSAP decompose and rewrite the
            whole transform — the scale included. Moving an unscaled box around
            it leaves the stage's own maths untouched, and keeps the travel in
            real pixels so it matches the scroll 1:1. */}
        <div className="flavor-hero-copy-layer" ref={heroCopyRef}>
          <div className="hero-stage flavor-hero-stage">
            <SiteHeader />
            <div className="flavor-hero-row">
              <p className="flavor-hero-name" ref={nameRef}>{flavor.title}</p>
              <p className="flavor-hero-badges">{story.heroBadges}</p>
            </div>
          </div>
        </div>

        <div className="hero-stage flavor-rotation-blocks">
          {blocks.map((block, i) => (
            <div
              className={`flavor-rotation-block is-layout-${block.layout ?? 'center'}`}
              key={block.kicker ?? block.line}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
            >
              {block.kicker ? (
                <p
                  className="flavor-rotation-kicker"
                  ref={(el) => {
                    kickerRefs.current[i] = el;
                  }}
                >
                  {block.kicker}
                </p>
              ) : null}
              {block.line ? <p className="flavor-rotation-line">{block.line}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
