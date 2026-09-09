import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCanGeometry } from './useCanGeometry';
import { useCanMaterials } from './useCanMaterials';
import { getHeroCans, bezierPoint, lerp } from './heroLayout';
import { FLAVORS } from '../data/flavors';
import { arcTransform, wrappedDelta, nearestTarget, mod, FLAVOR_N, GALLERY_SLOT_DELTA } from './arcLayout';

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
const DETAIL_ANCHOR = { desktop: { x: 0.365, y: -0.028 }, mobile: { x: 0, y: -0.08 } };
const DETAIL_SCALE = { desktop: 1.55, mobile: 0.95 };
const PARALLAX_AMOUNT = 0.16;
const LERP_SPEED = 6;
const TRANSITION_DURATION = 1.1;
const OFFSCREEN_PUSH = 3.2;
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
  {
    screen,
    activeFlavor,
    isMobile,
    onEnterDetailComplete,
    onFlavorMidSpin,
    onSettle,
    onExitDetailStart,
    onExitDetailComplete,
    armed = true,
    onEntranceStart,
  },
  ref
) {
  const { camera } = useThree();
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
  const screenRef = useRef(screen);
  const heroIndexRef = useRef(activeFlavor);
  const transitioningRef = useRef(false);
  const pointerTarget = useRef({ x: 0, y: 0 });
  const pointerCurrent = useRef({ x: 0, y: 0 });
  const prevScreen = useRef(screen);
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

  screenRef.current = screen;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flies the three hero-flavor cans into their resting cluster pose along a
  // bezier arc, with extra rotation turns baked into the start angle so
  // decelerating into place reads as a spiral settle rather than a straight
  // fly-in. Mount-triggered (independent of scroll — `armed` defaults true,
  // no preloader gates it), calls onEntranceStart the moment it begins so
  // the DOM text layer (HeroScreen) can fade in alongside it.
  useEffect(() => {
    if (!armed || started.current) return;
    started.current = true;

    onEntranceStart?.();

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
        },
        onComplete: () => {
          doneCount += 1;
          if (doneCount === heroCans.length) flightDoneRef.current = true;
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed]);

  function resetMaterialColor(index) {
    materials[index].color.copy(WHITE);
  }

  function runEnterDetailTransition(heroIndex) {
    heroIndexRef.current = heroIndex;
    transitioningRef.current = true;
    resetMaterialColor(heroIndex);
    ghosts.forEach(({ ref }) => {
      if (ref.current) ref.current.visible = false;
    });

    const heroGroup = groupRefs[heroIndex].current;
    const anchor = isMobile ? DETAIL_ANCHOR.mobile : DETAIL_ANCHOR.desktop;
    const target = ndcToWorldAtZ(camera, anchor.x, anchor.y, 0);

    const tl = gsap.timeline({
      onComplete: () => {
        transitioningRef.current = false;
        onEnterDetailComplete?.();
      },
    });

    const detailScale = isMobile ? DETAIL_SCALE.mobile : DETAIL_SCALE.desktop;
    tl.to(heroGroup.position, { x: target.x, y: target.y, z: 0, duration: TRANSITION_DURATION, ease: 'power3.inOut' }, 0);
    tl.to(heroGroup.rotation, { y: 0, z: DETAIL_TILT_Z, duration: TRANSITION_DURATION, ease: 'power3.inOut' }, 0);
    tl.to(
      heroGroup.scale,
      { x: detailScale, y: detailScale, z: detailScale, duration: TRANSITION_DURATION, ease: 'power3.inOut' },
      0
    );

    // Everyone else slides sideways by the same amount, at the same time —
    // a uniform push keeps their spacing constant in flight, instead of
    // easing toward one shared endpoint (which closes the gaps between them
    // as the nearer ones catch up to the farther ones).
    FLAVORS.forEach((_, i) => {
      if (i === heroIndex) return;
      const group = groupRefs[i].current;
      if (!group) return;
      const d = wrappedDelta(i, continuousIndex.current);
      const direction = Math.sign(d) || 1;
      tl.to(
        group.position,
        {
          x: group.position.x + direction * OFFSCREEN_PUSH,
          duration: TRANSITION_DURATION,
          ease: 'power2.in',
          onComplete: () => (group.visible = false),
        },
        0
      );
    });
  }

  function runExitDetailTransition() {
    transitioningRef.current = true;
    onExitDetailStart?.();

    const heroIndex = heroIndexRef.current;
    const heroGroup = groupRefs[heroIndex].current;
    // Flavor spins wind rotation.y up by full turns; unwrap back into
    // [0, 2π) first so the return trip doesn't visibly spin it back down.
    heroGroup.rotation.y %= Math.PI * 2;

    const tl = gsap.timeline({
      onComplete: () => {
        transitioningRef.current = false;
        // Flip the mutable ref immediately so useFrame treats this as the
        // slider from the very next frame, closing the gap before the
        // `screen` prop itself updates (which would otherwise let one frame
        // through the detail-anchor branch and snap the can visibly).
        screenRef.current = 'slider';
        onExitDetailComplete?.();
      },
    });

    // heroIndexRef always names whichever object currently displays the
    // active flavor (runFlavorSpin hands the "hero" role to the correct
    // flavor's own object instead of overwriting a texture), so it simply
    // returns to its own slot — every other index is a plain revival.
    const heroTarget = arcTransform(0, isMobile);
    tl.to(heroGroup.position, { x: heroTarget.x, y: heroTarget.y, z: heroTarget.z, duration: TRANSITION_DURATION, ease: 'power3.inOut' }, 0);
    tl.to(heroGroup.rotation, { y: heroTarget.rotY, z: 0, duration: TRANSITION_DURATION, ease: 'power3.inOut' }, 0);
    tl.to(
      heroGroup.scale,
      { x: heroTarget.scale, y: heroTarget.scale, z: heroTarget.scale, duration: TRANSITION_DURATION, ease: 'power3.inOut' },
      0
    );

    FLAVORS.forEach((_, i) => {
      if (i === heroIndex) return;
      const group = groupRefs[i].current;
      if (!group) return;
      const d = wrappedDelta(i, continuousIndex.current);
      const t = arcTransform(d, isMobile);
      const direction = Math.sign(d) || 1;

      // A group that was ever a hero (flavor switched away from it on the
      // detail screen) keeps DETAIL_TILT_Z from that handoff — clear it so
      // every can comes back to a plain upright arc pose.
      group.visible = true;
      group.position.set(t.x + direction * OFFSCREEN_PUSH, t.y, t.z);
      group.rotation.set(0, t.rotY, 0);
      group.scale.setScalar(t.scale);
      tl.to(group.position, { x: t.x, duration: TRANSITION_DURATION, ease: 'power2.out' }, 0);
    });
  }

  function runFlavorSpin(newIndex) {
    const oldIndex = heroIndexRef.current;
    if (newIndex === oldIndex) return;
    const oldGroup = groupRefs[oldIndex].current;
    const newGroup = groupRefs[newIndex].current;
    if (!oldGroup || !newGroup) return;
    continuousIndex.current = nearestTarget(continuousIndex.current, newIndex);

    // Each object always shows its own intrinsic flavor's material (no
    // imperative texture-swapping to keep track of). The "spin" instead
    // hands the hero role to the target flavor's own object at the visual
    // midpoint — it snaps into the outgoing object's exact current pose
    // (mid-spin, facing away from camera) so the handoff is invisible, then
    // finishes the turn itself, revealing its own label on the way back.
    let handedOff = false;
    const startY = oldGroup.rotation.y;
    const proxy = { t: 0 };

    gsap.to(proxy, {
      t: 1,
      duration: 1.15,
      ease: 'power2.inOut',
      onUpdate: () => {
        const y = startY + proxy.t * Math.PI * 2;
        if (!handedOff) {
          oldGroup.rotation.y = y;
          if (proxy.t >= 0.5) {
            handedOff = true;
            newGroup.position.copy(oldGroup.position);
            newGroup.rotation.copy(oldGroup.rotation);
            newGroup.scale.copy(oldGroup.scale);
            newGroup.visible = true;
            resetMaterialColor(newIndex);
            oldGroup.visible = false;
            heroIndexRef.current = newIndex;
            onFlavorMidSpin?.(newIndex);
          }
        } else {
          newGroup.rotation.y = y;
        }
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
          const focus = 1 - Math.min(1, Math.abs(delta));
          material.color.copy(DIM).lerp(WHITE, focus);
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
        material.color.copy(DIM).lerp(WHITE, 1 - Math.min(1, Math.abs(delta)));
      }
    });

    ghosts.forEach(({ ref }) => {
      if (ref.current) ref.current.visible = false;
    });
  }

  useImperativeHandle(ref, () => ({
    dragBy(deltaSlots) {
      if (screenRef.current !== 'slider') return;
      draggingRef.current = true;
      continuousIndex.current += deltaSlots;
    },
    endDrag(velocitySlotsPerSec = 0) {
      if (screenRef.current !== 'slider') return;
      draggingRef.current = false;
      const projected = continuousIndex.current + THREE.MathUtils.clamp(velocitySlotsPerSec * 0.12, -1.2, 1.2);
      const target = Math.round(projected);
      const duration = THREE.MathUtils.clamp(0.4 + Math.min(Math.abs(velocitySlotsPerSec) * 0.05, 0.45), 0.4, 0.9);
      gsap.to(continuousIndex, { current: target, duration, ease: 'power3.out', onComplete: settle });
    },
    exitToSlider() {
      if (screenRef.current !== 'detail' || transitioningRef.current) return;
      runExitDetailTransition();
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
    setEntranceProgress(t) {
      entranceProgressRef.current = t;
      if (t >= 1 && !entranceDoneRef.current) applyEntrancePose(1);
      entranceDoneRef.current = t >= 1;
    },
  }));

  // Discrete state transitions (screen flip, flavor pick) are driven from
  // props so all click/tap entry points funnel through plain React state.
  useEffect(() => {
    const enteringDetail = prevScreen.current !== 'detail' && screen === 'detail';
    const flavorChanged = prevFlavor.current !== activeFlavor;

    if (enteringDetail) {
      runEnterDetailTransition(activeFlavor);
    } else if (screen === 'detail' && flavorChanged) {
      runFlavorSpin(activeFlavor);
    } else if (screen === 'slider' && flavorChanged && !draggingRef.current) {
      const target = nearestTarget(continuousIndex.current, activeFlavor);
      gsap.to(continuousIndex, { current: target, duration: 0.6, ease: 'power3.out' });
    }

    prevScreen.current = screen;
    prevFlavor.current = activeFlavor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, activeFlavor]);

  useFrame((_, delta) => {
    const lerpF = 1 - Math.exp(-LERP_SPEED * delta);
    pointerCurrent.current.x += (pointerTarget.current.x - pointerCurrent.current.x) * lerpF;
    pointerCurrent.current.y += (pointerTarget.current.y - pointerCurrent.current.y) * lerpF;

    if (!entranceDoneRef.current) {
      applyEntrancePose(entranceProgressRef.current);
      return;
    }

    if (screenRef.current === 'slider') {
      if (transitioningRef.current) return;
      FLAVORS.forEach((_, i) => {
        const group = groupRefs[i].current;
        const mesh = meshRefs[i].current;
        if (!group || !mesh) return;
        if (!group.visible) group.visible = true;

        const d = wrappedDelta(i, continuousIndex.current);
        const t = arcTransform(d, isMobile);
        group.position.set(t.x, t.y, t.z);
        group.rotation.y = t.rotY;
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
    } else if (!transitioningRef.current) {
      const heroIndex = heroIndexRef.current;
      const group = groupRefs[heroIndex].current;
      const mesh = meshRefs[heroIndex].current;
      if (group && camera) {
        const anchor = isMobile ? DETAIL_ANCHOR.mobile : DETAIL_ANCHOR.desktop;
        const target = ndcToWorldAtZ(camera, anchor.x, anchor.y, 0);
        group.position.set(target.x, target.y, 0);
      }
      if (mesh) {
        mesh.rotation.y = pointerCurrent.current.x * PARALLAX_AMOUNT;
        mesh.rotation.x = -pointerCurrent.current.y * PARALLAX_AMOUNT * 0.5;
      }
    }
  });

  return (
    <group>
      {FLAVORS.map((flavor, i) => (
        <group key={flavor.id} ref={groupRefSetters[i]}>
          <mesh ref={meshRefSetters[i]} geometry={geometry} material={materials[i]} />
        </group>
      ))}
      {ghosts.map((g, gi) => (
        <mesh key={g.key} ref={ghostRefSetters[gi]} geometry={geometry} material={materials[g.flavorIndex]} visible={false} />
      ))}
    </group>
  );
});

export default CanRig;
