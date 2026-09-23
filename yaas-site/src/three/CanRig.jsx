import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCanGeometry } from './useCanGeometry';
import { CAN_CAP_MATERIAL, useCanMaterials, whenTexturesLoaded } from './useCanMaterials';
import { getHeroCans, bezierPoint, lerp } from './heroLayout';
import { FLAVORS } from '../data/flavors';
import { arcTransform, wrappedDelta, nearestTarget, mod, FLAVOR_N, GALLERY_SLOT_DELTA } from './arcLayout';
import { useRenderHold } from './renderOnDemand';

// The two flavors with no hero-cluster counterpart — they slide in from
// further out along the arc during the entrance, instead of flying in from
// the cluster like strawberry/orange/blueberry. Deltas match their natural
// rest slot in the gallery's own arc order (see arcLayout's wrappedDelta)
// when strawberry is centered — the two outermost of the 5-flavor row.
const SLIDE_IN_DELTA = { lemon: -2, apple: 2 };
const SLIDE_IN_EXTRA = 1.15;
const slideEase = (t) => 1 - Math.pow(1 - t, 3);

// Hero cluster entrance (mount-triggered, independent of scroll) — see the
// comment above the flight effect below.
const FLIGHT_DURATION = 1.5;
const posEase = gsap.parseEase('power2.inOut');

const DETAIL_TILT_Z = THREE.MathUtils.degToRad(-13);
// In NDC, so +y is up from the middle of the screen.
//
// The mobile value is no longer read off the mock directly: .detail-copy now
// lays its four items out with space-between around a stand-in box of exactly
// this can's height (.detail-can-space, layout.css), and this is where the
// stand-in lands — 0.13 puts the can's centre on it, which is what makes the
// gap above the can and the gap below it the same as the other two.
const DETAIL_ANCHOR = { desktop: { x: 0.365, y: -0.028 }, mobile: { x: 0, y: 0.13 } };
// Figma 344:335 puts this can at ~45% of the screen with its top ~23% down.
// That frame does not draw the flavor switcher, which on the real screen owns
// the bottom ~20% — and the real body copy runs five lines where the mock's
// placeholder runs three. At 45% the can ran straight through both. 36%,
// centred at 37%, is the largest that clears the title above and the copy
// below on a 667-tall phone, and it keeps the mock's proportions on taller
// ones.
// Mobile: the Figma frame's 0.656, 1.2x smaller (as the gallery can in
// arcLayout.js) so the detail card's title, copy and "Learn more" all fit a
// real phone's height. .detail-can-space (layout.css) is this over the
// canvas's 1.929-unit height — keep the two in step.
const DETAIL_SCALE = { desktop: 1.55, mobile: 0.547 };
// Where the detail can should sit, in NDC.
//
// Below 1024 this follows the DOM rather than a constant. .detail-copy lays
// its four items out with space-between around a stand-in box of exactly this
// can height (.detail-can-space, layout.css), so the can belongs wherever that
// box lands — and it moves: a one-line flavor name leaves more room than a
// two-line one, which shifts the whole column. Measured across the five
// flavors, a fixed anchor was out by up to 23px on the short-titled ones.
//
// Falls back to the constant when the stand-in is not in the DOM yet (the
// detail screen is lazy-loaded) or is display: none (desktop).
//
// Measured against the canvas's own box, not the window. NDC are the canvas's
// coordinates, and on a phone the two differ in both ways that matter: the
// canvas fills the intro's 100vh (the large viewport) while innerHeight tracks
// the address bar, and once the sticky intro starts to release, the canvas
// is no longer at the top of the window. Against the window, the stand-in's
// own scroll was counted twice — the can drifted up the screen at double the
// page's speed, off its card, and jumped whenever the address bar moved.
function detailAnchor(isMobile, canvas) {
  if (!isMobile) return DETAIL_ANCHOR.desktop;
  const el = typeof document !== 'undefined' && document.querySelector('.detail-can-space');
  if (el && canvas) {
    const rect = el.getBoundingClientRect();
    const box = canvas.getBoundingClientRect();
    if (rect.height > 0 && box.height > 0) {
      const centre = rect.top + rect.height / 2 - box.top;
      return { x: 0, y: 1 - (2 * centre) / box.height };
    }
  }
  return DETAIL_ANCHOR.mobile;
}

const PARALLAX_AMOUNT = 0.16;
const LERP_SPEED = 6;
// How long to keep asking for frames after the last cursor move / drag input.
// Both the parallax tilt and the gallery's focus dimming are exp(-LERP_SPEED*t)
// lerps, so they approach their target without ever formally arriving: after
// 0.8s they sit within e^-4.8 (~0.8%) of it, which on a 0.16rad tilt is well
// under a tenth of a degree. See useRenderHold.
const SETTLE_WINDOW = 0.8;
const OFFSCREEN_PUSH = 3.2;
// The curves of the timed gallery <-> detail timelines this scrub replaced,
// now applied to scroll progress instead of elapsed time. Pushing the other
// cans out with an ease-in means the way back reads as the ease-out the old
// exit timeline used, without a second curve.
const heroEase = gsap.parseEase('power3.inOut');
const pushEase = gsap.parseEase('power2.in');
// Extra repeat cycles of the 5 flavors shown further out in the arc, purely
// decorative, so the slider reads as an endless loop (à la ciaoenergy.com)
// instead of stopping dead after the 5th can.
const GHOST_CYCLES = [-1, 1];

function ndcToWorldAtZ(camera, ndcX, ndcY, targetZ) {
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const t = (targetZ - camera.position.z) / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(t));
}

const WHITE = new THREE.Color(1, 1, 1);
const DIM = new THREE.Color(0.72, 0.72, 0.75);
const tmpColor = new THREE.Color();

const CanRig = forwardRef(function CanRig(
  { activeFlavor, isMobile, onFlavorMidSpin, onSettle, armed = true, onEntranceStart, onReady },
  ref
) {
  const { camera, gl } = useThree();
  const { invalidate, hold, keepAlive, holding } = useRenderHold();
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const flavorIndexById = useMemo(() => Object.fromEntries(FLAVORS.map((f, i) => [f.id, i])), []);

  // Hero cluster data (strawberry/blueberry/orange) — same world coords the
  // original hero-only build used (see heroLayout.js; no remapping needed,
  // r3f's camera aspect already tracks the live viewport same as before).
  // The same 3 group objects fly into the cluster on mount below, then flip
  // into their gallery arc slot on scroll (see setEntranceProgress), never
  // swapped for different instances.
  const heroCans = useMemo(() => getHeroCans(isMobile), [isMobile]);
  // Bezier control point for the *second* flight (cluster -> gallery arc
  // slot on scroll) — lifted up and nudged toward camera so blueberry/orange
  // (which swap sides, see GALLERY_SLOT_DELTA) visibly sweep past each other
  // at different depths on the way, instead of colliding head-on. Both
  // offsets are deliberately mild — camera sits at z 3.6, so anything much
  // closer than the resting ~z 0 reads as a jarring, oversized close-up
  // mid-flight (a first version at y+0.9/z 0.8 did exactly that).
  const clusterToArc = useMemo(
    () =>
      Object.fromEntries(
        heroCans.map((can) => {
          const delta = GALLERY_SLOT_DELTA[can.id] ?? 0;
          const rest = arcTransform(delta, isMobile);
          return [
            can.flavorIndex,
            {
              start: can.end,
              control: { x: (can.end.x + rest.x) / 2, y: Math.max(can.end.y, rest.y) + 0.35, z: 0.2 },
              end: rest,
            },
          ];
        })
      ),
    [heroCans, isMobile]
  );

  const groupRefs = useMemo(() => FLAVORS.map(() => ({ current: null })), []);
  const meshRefs = useMemo(() => FLAVORS.map(() => ({ current: null })), []);
  // Stable callback-ref identities so React never detaches/reattaches on
  // every render (a fresh inline arrow per render would do exactly that).
  const groupRefSetters = useMemo(() => groupRefs.map((r) => (el) => (r.current = el)), [groupRefs]);
  const meshRefSetters = useMemo(() => meshRefs.map((r) => (el) => (r.current = el)), [meshRefs]);

  const ghosts = useMemo(
    () =>
      GHOST_CYCLES.flatMap((cycle) =>
        FLAVORS.map((flavor, i) => ({
          key: `${flavor.id}-${cycle}`,
          flavorIndex: i,
          cycle,
          ref: { current: null },
        }))
      ),
    []
  );
  const ghostRefSetters = useMemo(() => ghosts.map((g) => (el) => (g.ref.current = el)), [ghosts]);

  const continuousIndex = useRef(activeFlavor);
  const draggingRef = useRef(false);
  const heroIndexRef = useRef(activeFlavor);
  const activeFlavorRef = useRef(activeFlavor);
  // 0 = gallery, 1 = detail card; scroll-scrubbed via setDetailProgress.
  const detailProgressRef = useRef(0);
  // Extra Y rotation of the hero can while a flavor switch spins it.
  const spinAngleRef = useRef(0);
  const spinTweenRef = useRef(null);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const prevFlavor = useRef(activeFlavor);
  // Entrance progress lives in a ref (not applied directly from the ref API
  // below) and gets *read* every useFrame tick instead — CanRig mounts only
  // once its Suspense-gated assets (geometry/textures) resolve, which can
  // land after App.jsx's own mount effect already fired setEntranceProgress
  // once; reading a ref every frame means the very first frame this rig
  // ever renders already reflects the real progress (0 pre-scroll, whatever
  // it is if the user scrolled before assets finished loading) instead of
  // momentarily flashing every can at Three.js's raw default pose.
  const entranceProgressRef = useRef(0);
  const entranceDoneRef = useRef(false);
  // True once the mount-triggered cluster flight below has finished for
  // every hero-linked can — applyEntrancePose leaves those three alone
  // until then, so it doesn't fight the flight tween over group.position.
  const flightDoneRef = useRef(false);
  const posed = useRef(false);
  const started = useRef(false);

  activeFlavorRef.current = activeFlavor;

  // Pose the 3 hero-linked cans at their off-stage launch point the moment
  // their groups exist, so there's no visible jump from "wherever r3f
  // defaults a group" to the flight's actual start position.
  useEffect(() => {
    if (posed.current) return;
    posed.current = true;
    heroCans.forEach((can) => {
      const group = groupRefs[can.flavorIndex].current;
      if (!group) return;
      group.position.set(can.start.x, can.start.y, can.start.z);
      group.rotation.set(0, can.start.rotY, can.start.rotZ);
      group.scale.setScalar(can.start.scale);
    });
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tells the page the hero is ready to be seen: all three cluster labels
  // loaded, uploaded to the GPU and drawn in a rendered frame. The cans are
  // still parked off-stage at this point (the flight waits on `armed`), so
  // they can be frustum-culled and skip their first upload; initTexture
  // forces it, so the flight's first frame doesn't hitch on it.
  useEffect(() => {
    if (!onReady) return undefined;
    let cancelled = false;
    whenTexturesLoaded(heroCans.map((can) => can.flavorIndex)).then(() => {
      if (cancelled) return;
      heroCans.forEach((can) => {
        const map = materials[can.flavorIndex].map;
        if (map) gl.initTexture(map);
      });
      const off = addAfterEffect(() => {
        off();
        if (!cancelled) onReady();
      });
      invalidate();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flies the three hero-flavor cans into their resting cluster pose along a
  // bezier arc, with extra rotation turns baked into the start angle so
  // decelerating into place reads as a spiral settle rather than a straight
  // fly-in. Mount-triggered (independent of scroll — `armed` defaults true;
  // the homepage holds it false until the first-load preloader is gone),
  // calls onEntranceStart the moment it begins so the DOM text layer
  // (HeroScreen) can fade in alongside it.
  useEffect(() => {
    if (!armed || started.current) return;
    started.current = true;

    onEntranceStart?.();

    // Reloading part-way down the page restores the scroll position, so the
    // hero is already gone — but this flight is mount-triggered and knows
    // nothing about scroll, so the three cans used to come sweeping in from
    // off-screen over whatever section the reader actually landed on.
    //
    // Past the top of the page there is no hero to fly into: the cans are put
    // straight into the cluster pose the flight would have ended at, and
    // flightDoneRef is set so applyEntrancePose takes over from there on the
    // next frame with whatever entrance progress the restored scroll implies.
    // A threshold rather than exactly 0 because a few pixels of restored
    // scroll still counts as the top.
    if (window.scrollY > 4) {
      heroCans.forEach((can) => {
        const group = groupRefs[can.flavorIndex].current;
        if (!group) return;
        const { end } = can;
        group.position.set(end.x, end.y, end.z);
        group.rotation.set(0, end.rotY, end.rotZ);
        group.scale.setScalar(end.scale);
        group.visible = true;
      });
      flightDoneRef.current = true;
      invalidate();
      return undefined;
    }

    const flightPos = { x: 0, y: 0, z: 0 };
    let doneCount = 0;
    heroCans.forEach((can) => {
      const group = groupRefs[can.flavorIndex].current;
      if (!group) return;
      const { start, control, end } = can;

      const proxy = { t: 0 };
      gsap.to(proxy, {
        t: 1,
        duration: FLIGHT_DURATION,
        delay: can.delay,
        ease: 'power3.out',
        onUpdate: () => {
          bezierPoint(start, control, end, proxy.t, flightPos);
          group.position.set(flightPos.x, flightPos.y, flightPos.z);
          group.rotation.y = lerp(start.rotY, end.rotY, proxy.t);
          group.rotation.z = lerp(start.rotZ, end.rotZ, proxy.t);
          group.scale.setScalar(lerp(start.scale, end.scale, proxy.t));
          keepAlive();
        },
        onComplete: () => {
          doneCount += 1;
          if (doneCount === heroCans.length) flightDoneRef.current = true;
          // flightDoneRef opens applyEntrancePose's first branch below, so the
          // scene has new work to do on the very next frame even though the
          // tween that was driving it has just stopped.
          invalidate();
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  function resetMaterialColor(index) {
    materials[index].color.copy(WHITE);
  }

  // Leaving the gallery: fixes which can flies out to the card (the active
  // flavor) and makes sure the carousel is heading for that can's slot, so
  // the pose below starts from where the gallery actually is and comes back
  // to a settled carousel. A drag cut short by the scroll is dropped rather
  // than committed — its settle would otherwise re-pick the flavor mid-flight.
  function beginDetail() {
    const hero = activeFlavorRef.current;
    heroIndexRef.current = hero;
    draggingRef.current = false;
    resetMaterialColor(hero);
    const target = nearestTarget(continuousIndex.current, hero);
    if (Math.abs(target - continuousIndex.current) > 1e-3) {
      gsap.killTweensOf(continuousIndex);
      gsap.to(continuousIndex, { current: target, duration: 0.6, ease: 'power3.out', onUpdate: keepAlive });
    }
  }

  // Gallery (t = 0) -> detail card (t = 1) as a pure function of t, so it can
  // be scrubbed both ways. Same endpoints and curves as the timed timelines it
  // replaced: the hero can flies to the card's anchor, and everyone else
  // slides sideways by the same amount — a uniform push keeps their spacing
  // constant in flight, instead of easing toward one shared endpoint (which
  // closes the gaps between them as the nearer ones catch up to the farther
  // ones). Every pose starts from the can's live arc slot, which is also
  // exactly what the gallery branch of tick() draws at t = 0, so crossing
  // between the two never snaps.
  function applyDetailPose(t) {
    const heroIndex = heroIndexRef.current;
    const ci = continuousIndex.current;
    const heroT = heroEase(t);
    const pushT = pushEase(t);

    FLAVORS.forEach((_, i) => {
      if (i === heroIndex) return;
      const group = groupRefs[i].current;
      if (!group) return;
      const d = wrappedDelta(i, ci);
      const from = arcTransform(d, isMobile);
      const direction = Math.sign(d) || 1;
      group.visible = t < 1;
      group.position.set(from.x + direction * OFFSCREEN_PUSH * pushT, from.y, from.z);
      // Also clears DETAIL_TILT_Z off a can that was the hero before a
      // flavor switch handed that role on.
      group.rotation.set(0, from.rotY, 0);
      group.scale.setScalar(from.scale);
    });

    const group = groupRefs[heroIndex].current;
    if (group) {
      const from = arcTransform(wrappedDelta(heroIndex, ci), isMobile);
      const anchor = detailAnchor(isMobile, gl.domElement);
      const target = ndcToWorldAtZ(camera, anchor.x, anchor.y, 0);
      const detailScale = isMobile ? DETAIL_SCALE.mobile : DETAIL_SCALE.desktop;
      group.visible = true;
      group.position.set(lerp(from.x, target.x, heroT), lerp(from.y, target.y, heroT), lerp(from.z, 0, heroT));
      group.rotation.set(0, lerp(from.rotY, 0, heroT) + spinAngleRef.current, lerp(0, DETAIL_TILT_Z, heroT));
      group.scale.setScalar(lerp(from.scale, detailScale, heroT));
    }
    const mesh = meshRefs[heroIndex].current;
    if (mesh) {
      mesh.rotation.y = pointerCurrent.current.x * PARALLAX_AMOUNT;
      mesh.rotation.x = -pointerCurrent.current.y * PARALLAX_AMOUNT * 0.5;
    }

    ghosts.forEach(({ ref }) => {
      if (ref.current) ref.current.visible = false;
    });
  }

  function runFlavorSpin(newIndex) {
    const oldIndex = heroIndexRef.current;
    if (newIndex === oldIndex) return;
    spinTweenRef.current?.progress(1);

    // Each object always shows its own intrinsic flavor's material (no
    // imperative texture-swapping to keep track of). The "spin" instead
    // hands the hero role to the target flavor's own object at the visual
    // midpoint — applyDetailPose poses whichever object is the hero, so the
    // new one takes over the outgoing one's exact pose (mid-spin, facing away
    // from camera) and the handoff is invisible; it then finishes the turn
    // itself, revealing its own label on the way back.
    let handedOff = false;
    const proxy = { t: 0 };

    spinTweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: 1.15,
      ease: 'power2.inOut',
      onUpdate: () => {
        spinAngleRef.current = proxy.t * Math.PI * 2;
        if (!handedOff && proxy.t >= 0.5) {
          handedOff = true;
          gsap.killTweensOf(continuousIndex);
          continuousIndex.current = nearestTarget(continuousIndex.current, newIndex);
          resetMaterialColor(newIndex);
          heroIndexRef.current = newIndex;
          onFlavorMidSpin?.(newIndex);
        }
        keepAlive();
      },
      onComplete: () => {
        // A full turn — back to 0 rather than 2π so nothing winds up.
        spinAngleRef.current = 0;
        spinTweenRef.current = null;
        invalidate();
      },
    });
  }

  function settle() {
    const idx = mod(Math.round(continuousIndex.current), FLAVOR_N);
    onSettle?.(idx);
  }

  // strawberry/orange/blueberry: once the mount flight above has settled
  // them into the cluster, this eases them the rest of the way from that
  // cluster pose into their normal gallery arc slot — same 3 objects the
  // whole time, a continuous flip rather than a crossfaded handoff between
  // two different canvases. lemon/apple have no cluster pose to start from,
  // so they just slide in from further out along the arc. Called every
  // frame from useFrame while the entrance isn't done (see
  // entranceProgressRef above).
  function applyEntrancePose(t) {
    const clamped = THREE.MathUtils.clamp(t, 0, 1);
    const eased = posEase(clamped);

    if (flightDoneRef.current) {
      const pos = { x: 0, y: 0, z: 0 };
      Object.entries(GALLERY_SLOT_DELTA).forEach(([id, delta]) => {
        const i = flavorIndexById[id];
        const group = groupRefs[i]?.current;
        const material = materials[i];
        const tween = clusterToArc[i];
        if (!group || !tween) return;

        bezierPoint(tween.start, tween.control, tween.end, eased, pos);
        group.position.set(pos.x, pos.y, pos.z);
        // A full extra spin around its own (Y) axis, on top of the base
        // facing — but compressed into the first 40% of the flip (spinT),
        // not spread across the whole thing, so it reads as a quick spin
        // rather than a slow reveal that lingers on the label's back/side.
        // A full 2π (not a half-turn) so the net offset is zero once it
        // completes — the can lands facing the same way arcTransform
        // expects, no permanent backwards flip.
        const spinT = Math.min(1, t / 0.4);
        group.rotation.y = lerp(tween.start.rotY, tween.end.rotY, eased) + spinT * Math.PI * 2;
        group.rotation.z = lerp(tween.start.rotZ, 0, eased);
        group.scale.setScalar(lerp(tween.start.scale, tween.end.scale, eased));
        group.visible = true;
        if (material) {
          // The dimming belongs to the gallery, where it marks which can is
          // in focus. In the hero cluster there is no focus to mark and all
          // three cans are equals — but the delta this reads is their GALLERY
          // slot offset, which is already +-1 for blueberry and orange while
          // they are still in the cluster, so both sat dimmed on the first
          // screen. Fading it in with the entrance means full colour at rest
          // and the gallery's own focus by the time the gallery is there.
          const focus = 1 - Math.min(1, Math.abs(delta));
          material.color.copy(DIM).lerp(WHITE, lerp(1, focus, clamped));
        }
      });
    }

    Object.entries(SLIDE_IN_DELTA).forEach(([id, delta]) => {
      const i = flavorIndexById[id];
      const group = groupRefs[i]?.current;
      const material = materials[i];
      if (!group) return;
      const rest = arcTransform(delta, isMobile);
      const start = arcTransform(delta + Math.sign(delta) * SLIDE_IN_EXTRA, isMobile);
      const slideT = slideEase(clamped);
      group.position.set(lerp(start.x, rest.x, slideT), lerp(start.y, rest.y, slideT), lerp(start.z, rest.z, slideT));
      group.rotation.set(0, rest.rotY, 0);
      group.scale.setScalar(lerp(start.scale, rest.scale, slideT));
      // Stays hidden at rest (t===0) — lemon/apple have no place in the
      // hero cluster, so nothing of them should show until the entrance
      // actually starts pulling them in from off-arc.
      group.visible = clamped > 0;
      if (material) {
        // Same as above. These two are invisible at rest anyway, but they fade
        // in over the same window and would otherwise arrive pre-dimmed.
        material.color.copy(DIM).lerp(WHITE, lerp(1, 1 - Math.min(1, Math.abs(delta)), clamped));
      }
    });

    ghosts.forEach(({ ref }) => {
      if (ref.current) ref.current.visible = false;
    });
  }

  useImperativeHandle(ref, () => ({
    dragBy(deltaSlots) {
      if (detailProgressRef.current > 0) return;
      draggingRef.current = true;
      continuousIndex.current += deltaSlots;
      // A hold rather than a bare invalidate: the focus dimming the slider
      // branch lerps per frame keeps moving after the pointer stops.
      hold(SETTLE_WINDOW);
    },
    endDrag(velocitySlotsPerSec = 0) {
      if (detailProgressRef.current > 0) return;
      draggingRef.current = false;
      const projected = continuousIndex.current + THREE.MathUtils.clamp(velocitySlotsPerSec * 0.12, -1.2, 1.2);
      const target = Math.round(projected);
      const duration = THREE.MathUtils.clamp(0.4 + Math.min(Math.abs(velocitySlotsPerSec) * 0.05, 0.45), 0.4, 0.9);
      gsap.to(continuousIndex, {
        current: target,
        duration,
        ease: 'power3.out',
        onUpdate: keepAlive,
        onComplete: () => {
          settle();
          hold(SETTLE_WINDOW);
        },
      });
    },
    // Driven by HomePage's scroll-scrubbed gallery <-> detail ScrollTrigger,
    // the same way setEntranceProgress below is: it only records t and asks
    // for a frame, and tick() poses the cans from it.
    setDetailProgress(t) {
      const next = THREE.MathUtils.clamp(t, 0, 1);
      const prev = detailProgressRef.current;
      if (next === prev) return;
      if (prev === 0) beginDetail();
      detailProgressRef.current = next;
      if (next === 0) {
        // Back in the gallery mid-spin: finish the switch now, so the
        // carousel settles on the flavor the page already shows.
        spinTweenRef.current?.progress(1);
        // The gallery lerps its focus dimming back in, which outlives this
        // call — see SETTLE_WINDOW.
        hold(SETTLE_WINDOW);
      } else {
        invalidate();
      }
    },
    // Driven by App.jsx's scroll-scrubbed hero->gallery ScrollTrigger.
    // useFrame below reads entranceProgressRef every tick and applies the
    // pose (see applyEntrancePose) for the normal in-between case, but a
    // fast/instant scroll (e.g. a JS `scrollTo` straight to the end, not a
    // gradual wheel scroll) can jump t from mid-range straight to 1 in one
    // call — entranceDoneRef would then flip true *before* useFrame ever
    // gets a tick at t===1, so the exact settle pose (upright, rotZ back to
    // 0) never actually gets applied and the can freezes at whatever
    // in-between rotation it last had. Calling applyEntrancePose(1) here
    // directly, synchronously, guarantees that exact final frame always
    // happens regardless of frame timing.
    // Scroll-scrubbed, so this runs on every scroll tick — invalidating here
    // is what keeps the entrance drawing for as long as the user is actually
    // scrolling through it, and not one frame longer.
    setEntranceProgress(t) {
      entranceProgressRef.current = t;
      invalidate();
      if (t >= 1 && !entranceDoneRef.current) applyEntrancePose(1);
      entranceDoneRef.current = t >= 1;
    },
  }));

  // Flavor picks are driven from props so all click/tap entry points funnel
  // through plain React state.
  useEffect(() => {
    const flavorChanged = prevFlavor.current !== activeFlavor;

    if (detailProgressRef.current > 0 && flavorChanged) {
      runFlavorSpin(activeFlavor);
    } else if (flavorChanged && !draggingRef.current) {
      const target = nearestTarget(continuousIndex.current, activeFlavor);
      gsap.to(continuousIndex, {
        current: target,
        duration: 0.6,
        ease: 'power3.out',
        onUpdate: keepAlive,
        onComplete: () => hold(SETTLE_WINDOW),
      });
    }

    prevFlavor.current = activeFlavor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFlavor]);

  // Feeds pointerTarget, which the frame loop below smooths into
  // pointerCurrent and turns into the cans' tilt. Nothing wrote it before, so
  // every `pointerCurrent.current.x * PARALLAX_AMOUNT` in that loop was
  // multiplying by a permanent zero and the cans never reacted to the cursor
  // at all — the maths was there, the input was not.
  //
  // Normalised to -1..1 from the centre of the window rather than from the
  // canvas: the cans read as reacting to the cursor anywhere on the screen,
  // which is how the reference (ciaoenergy.com) behaves.
  //
  // Mouse only. A coarse pointer has no hover position to follow, and a touch
  // drag would otherwise yank the cans sideways mid-swipe; reduced motion opts
  // out entirely and leaves the target at rest.
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) return undefined;
    // Never attached on a touch device, rather than attached and then ignored
    // per event. The handler below already drops non-mouse pointers, but a
    // window-level pointermove still fires for every finger movement on a
    // touchscreen — waking this listener on each one to do nothing. A device
    // with no fine pointer has no cursor to follow, so there is nothing here
    // for it to do at all.
    const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches ?? true;
    if (!finePointer) return undefined;

    const onPointerMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pointerTarget.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.current.y = (event.clientY / window.innerHeight) * 2 - 1;
      hold(SETTLE_WINDOW);
    };
    const onPointerLeave = () => {
      pointerTarget.current.x = 0;
      pointerTarget.current.y = 0;
      hold(SETTLE_WINDOW);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [hold]);

  // The same tilt the gallery and the detail card already apply, factored out
  // so the hero cluster can use it too: mostly a left/right turn on Y, with a
  // much smaller nod on X, both on the inner mesh so nothing that poses the
  // outer group has to know about it.
  function applyPointerTilt() {
    for (let i = 0; i < meshRefs.length; i += 1) {
      const mesh = meshRefs[i].current;
      if (!mesh) continue;
      mesh.rotation.y = pointerCurrent.current.x * PARALLAX_AMOUNT;
      mesh.rotation.x = -pointerCurrent.current.y * PARALLAX_AMOUNT * 0.5;
    }
  }

  function tick(delta) {
    const lerpF = 1 - Math.exp(-LERP_SPEED * delta);
    pointerCurrent.current.x += (pointerTarget.current.x - pointerCurrent.current.x) * lerpF;
    pointerCurrent.current.y += (pointerTarget.current.y - pointerCurrent.current.y) * lerpF;

    if (!entranceDoneRef.current) {
      applyEntrancePose(entranceProgressRef.current);
      // The hero cluster lives in this branch — it is the state the page opens
      // on, and it used to be the one state with no cursor response at all,
      // because applyEntrancePose returns before the tilt below ever runs.
      // applyEntrancePose only writes each can's *group* transform, so putting
      // the tilt on the inner mesh adds to it instead of fighting it.
      applyPointerTilt();
      return;
    }

    if (detailProgressRef.current > 0) {
      applyDetailPose(detailProgressRef.current);
      return;
    }

    FLAVORS.forEach((_, i) => {
      const group = groupRefs[i].current;
      const mesh = meshRefs[i].current;
      if (!group || !mesh) return;
      if (!group.visible) group.visible = true;

      const d = wrappedDelta(i, continuousIndex.current);
      const t = arcTransform(d, isMobile);
      group.position.set(t.x, t.y, t.z);
      // Upright in full, not just rotY: a scroll that jumps straight from the
      // card back to the gallery skips the scrub's own return to z = 0.
      group.rotation.set(0, t.rotY, 0);
      group.scale.setScalar(t.scale);

      const focus = 1 - Math.min(1, Math.abs(d));
      mesh.rotation.y = pointerCurrent.current.x * PARALLAX_AMOUNT * focus;
      mesh.rotation.x = -pointerCurrent.current.y * PARALLAX_AMOUNT * 0.5 * focus;

      tmpColor.copy(DIM).lerp(WHITE, focus);
      materials[i].color.lerp(tmpColor, lerpF);
    });

    ghosts.forEach(({ flavorIndex, cycle, ref }) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.visible = true;
      const d = wrappedDelta(flavorIndex, continuousIndex.current) + cycle * FLAVOR_N;
      const t = arcTransform(d, isMobile);
      mesh.position.set(t.x, t.y, t.z);
      mesh.rotation.y = t.rotY;
      mesh.scale.setScalar(t.scale);
    });
  }

  // tick() above has three early returns; wrapping it keeps holding() on every
  // path out of it. holding() is what re-arms the demand loop for the next
  // frame while a settle window is still open — without it the loop draws once
  // per hold() and stops, and the lerps freeze part-way.
  useFrame((_, delta) => {
    tick(delta);
    holding();
  });

  // Anything that re-renders this rig may have changed what a frame should
  // look like without going through a tween: a viewport crossing isMobile
  // flips the whole arc layout, and activeFlavor arrives as a prop. A
  // short hold after every render covers all of them at the cost of a handful
  // of frames, instead of enumerating them and missing one.
  useEffect(() => {
    hold(SETTLE_WINDOW);
  });

  return (
    <group>
      {FLAVORS.map((flavor, i) => (
        <group key={flavor.id} ref={groupRefSetters[i]}>
          <mesh ref={meshRefSetters[i]} geometry={geometry} material={[materials[i], CAN_CAP_MATERIAL]} />
        </group>
      ))}
      {ghosts.map((g, gi) => (
        <mesh
          key={g.key}
          ref={ghostRefSetters[gi]}
          geometry={geometry}
          material={[materials[g.flavorIndex], CAN_CAP_MATERIAL]}
          visible={false}
        />
      ))}
    </group>
  );
});

export default CanRig;
