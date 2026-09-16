import { lazy, Suspense, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Background from './Background';
import DropText from './DropText';
import { useLazyOnVisible } from '../three/deferredLoad';
import { RISE_UNITS } from '../scroll/riseTransition';

// Dynamic import — three.js, @react-three/fiber and FlavorStoryCanRig only
// enter the bundle through this call, in their own chunk, requested only
// once useLazyOnVisible below says the canvas layer is actually about to be
// on screen (see deferredLoad.js). This section sits at the top of the
// flavor detail page, so in practice that fires almost immediately on
// mount — the real saving is that FlavorDetailPage's own initial script no
// longer has to parse three.js to render anything at all.
const FlavorStoryScene = lazy(() => import('../three/FlavorStoryScene'));

gsap.registerPlugin(ScrollTrigger);

// The can's resting pose: a slight 3/4 turn so the label reads as a cylinder
// rather than a flat sticker before anything has scrolled.
const START_ROTATION = { x: 0.08, y: -0.35, z: 0.04 };

// One full tumble, in absolute radians, sampled at four waypoints — it rolls
// forward, passes through horizontal with the cap swinging toward the viewer,
// keeps turning past upside-down, and lands back on exactly the start pose
// (x +2π, y +2π) so the label faces front again at the end. Every channel is
// monotonic on purpose: any dip would read as the can stalling and reversing
// mid-scroll instead of turning continuously.
const WAYPOINTS = [
  { x: 0.75, y: 1.25, z: 0.12 },
  { x: 1.85, y: 2.6, z: -0.18 },
  { x: 3.4, y: 4.1, z: 0.16 },
  { x: START_ROTATION.x + Math.PI * 2, y: START_ROTATION.y + Math.PI * 2, z: 0 },
];

// Same edge-to-edge scaleX fit the hero and footer wordmarks use (see
// HeroWordmark's useFillWidth) — no font-size alone lands a fixed
// four-character string exactly on its container's width. Waits on
// document.fonts so the natural width isn't measured against a fallback face
// and then left scaled to the wrong number.
function useFillWidth(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    function fit() {
      el.style.transform = 'none';
      const rowWidth = el.parentElement?.getBoundingClientRect().width ?? 0;
      const naturalWidth = el.getBoundingClientRect().width;
      if (naturalWidth > 0 && rowWidth > 0) {
        el.style.transform = `scaleX(${rowWidth / naturalWidth})`;
      }
    }

    let cancelled = false;
    fit();
    const fontsReady = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    fontsReady.finally(() => {
      if (cancelled) return;
      fit();
      // The display face is wider than the fallback, so the section's own
      // height can change on this frame — let the pin remeasure against it.
      ScrollTrigger.refresh();
    });
    window.addEventListener('resize', fit);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', fit);
    };
  }, [ref]);
}

// Section A of the flavor detail page: the hero read and the scroll-driven
// tumble, as one continuous pinned block.
//
// The copy deliberately sits in two layers with the can's canvas between
// them — the giant YAAS wordmark behind the can, the flavor name and product
// line in front of it — so the can passes over its own headline as it turns
// instead of being boxed into empty space beside it.
export default function FlavorStorySection({ flavor, story, simpleMode }) {
  const wrapRef = useRef(null);
  const heroBackRef = useRef(null);
  const heroFrontRef = useRef(null);
  const yaasRef = useRef(null);
  const blockRefs = useRef([]);
  // Stable across renders and mutated in place by the timeline below — the
  // can rig reads it every frame. See FlavorStoryCanRig for why the rotation
  // travels as a plain object rather than as a ref to the THREE.Group.
  const rotationRef = useRef({ ...START_ROTATION });
  const canvasLayerRef = useRef(null);
  const canVisible = useLazyOnVisible(canvasLayerRef);

  useFillWidth(yaasRef);

  const blocks = story.rotationBlocks;

  useEffect(() => {
    if (simpleMode) return undefined;

    const ctx = gsap.context(() => {
      const els = blockRefs.current.filter(Boolean);
      if (!els.length) return;

      gsap.set(els, { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapRef.current,
          start: 'top top',
          // One viewport per tumble waypoint, plus RISE_UNITS more during
          // which the can is simply held still while the gallery below climbs
          // up over it — the same handover the homepage's own pinned sections
          // give the sections that rise onto them.
          end: () => `+=${(WAYPOINTS.length + RISE_UNITS) * window.innerHeight}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Hero copy clears out early so it isn't still sitting over the can once
      // the tumble and its own text blocks start.
      tl.to([heroBackRef.current, heroFrontRef.current], { opacity: 0, duration: 0.4, ease: 'power1.out' }, 0.05);

      WAYPOINTS.forEach((rot, i) => {
        tl.to(rotationRef.current, { ...rot, duration: 1, ease: 'power1.inOut' }, i);
      });

      // Blocks spread across the tumble however many there are: four (the real
      // strawberry copy) gives one per waypoint, while the single-block
      // fallback for a flavor with no story written yet stretches across the
      // whole thing instead of flashing past in the first quarter.
      const step = WAYPOINTS.length / els.length;
      els.forEach((el, i) => {
        tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, i * step + 0.1).to(
          el,
          { opacity: 0, y: -24, duration: 0.5 },
          i * step + step * 0.8
        );
      });

      // The hold. Animates nothing — it exists only so the timeline's own
      // duration matches the pin's extended length. Without it the waypoints
      // above would stretch to fill the extra RISE_UNITS of pinned scroll
      // instead of holding their real timing, since a scrubbed timeline maps
      // the trigger's whole 0->1 onto its own duration.
      tl.to({}, { duration: RISE_UNITS }, WAYPOINTS.length);
    }, wrapRef);

    return () => ctx.revert();
  }, [simpleMode, blocks]);

  return (
    <section className={`flavor-story-wrap${simpleMode ? ' is-simple' : ''}`} ref={wrapRef}>
      <div className="flavor-story-sticky">
        <Background color={flavor.color} />

        <div className="flavor-hero-copy flavor-hero-copy-back" ref={heroBackRef}>
          <div className="flavor-story-yaas-row">
            <h1 className="flavor-story-yaas" ref={yaasRef}>
              YAAS
            </h1>
          </div>
        </div>

        <div className="flavor-story-canvas-layer" aria-hidden="true" ref={canvasLayerRef}>
          {canVisible && (
            <Suspense fallback={null}>
              <FlavorStoryScene flavorId={flavor.id} rotation={rotationRef.current} spin={simpleMode} />
            </Suspense>
          )}
        </div>

        <div className="flavor-hero-copy flavor-hero-copy-front" ref={heroFrontRef}>
          <DropText as="h2" className="flavor-story-flavorname" text={flavor.title} />
          <p className="flavor-hero-badges">{story.heroBadges}</p>
          <p className="flavor-hero-line">{story.heroLine}</p>
        </div>

        <div className="flavor-rotation-blocks">
          {blocks.map((block, i) => (
            <div
              className="flavor-rotation-block"
              key={block.kicker}
              ref={(el) => {
                blockRefs.current[i] = el;
              }}
            >
              <p className="flavor-rotation-kicker">{block.kicker}</p>
              <p className="flavor-rotation-line">{block.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
