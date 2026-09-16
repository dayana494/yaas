import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useCanGeometry } from './useCanGeometry';
import { CAN_CAP_MATERIAL, useCanMaterials } from './useCanMaterials';
import { FLAVORS } from '../data/flavors';
import { useCanvasOnScreen, useRenderHold } from './renderOnDemand';

// The single can on a flavor detail page. Deliberately NOT the homepage's
// CanRig: that one has grown a hero->gallery entrance-flight state machine
// and a five-can cluster layout, none of which applies here. Only the two
// shared low-level hooks are reused, so the model and the label textures are
// still loaded exactly once for the whole site.

const IDLE_SPIN_SPEED = 0.45; // rad/s, simple-mode only
// Fraction of the smaller viewport dimension the can's own largest dimension
// is fitted into. Measured against the *largest* dimension on purpose: the
// can tumbles through horizontal poses, so its silhouette height and width
// swap during the scroll. Sizing to the max means no pose ever clips.
const FIT_FRACTION = 0.62;

// `rotation` is a plain, stable {x,y,z} object owned by the section above and
// mutated by its GSAP timeline; this reads it every frame.
//
// Why a proxy object and not a ref to the THREE.Group (which is what the
// build prompt sketched): this rig mounts inside <Suspense>, i.e. only once
// the .glb and five label textures have finished loading — which is several
// hundred ms *after* the section's own useEffect has already run and built
// the timeline. Tweening `canRigRef.current.group.rotation` from that effect
// would dereference null every time. Handing the timeline a plain object that
// exists from the first render removes the ordering problem entirely: the can
// picks up whatever rotation the scroll has already reached on its first
// rendered frame, however late it arrives.
export default function FlavorStoryCanRig({ flavorId, rotation, spin = false }) {
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const groupRef = useRef(null);
  const { viewport } = useThree();
  const { invalidate, keepAlive, holding } = useRenderHold();
  const onScreen = useCanvasOnScreen();

  const index = useMemo(() => {
    const i = FLAVORS.findIndex((f) => f.id === flavorId);
    return i === -1 ? 0 : i;
  }, [flavorId]);

  // The source scan's origin is wherever the photogrammetry put it, not the
  // can's middle. Rotating the group around that origin would swing the can
  // through an arc instead of tumbling in place, so the mesh is offset back
  // by its own bounding-box center and the group spins around true center.
  const { offset, maxDimension } = useMemo(() => {
    const box = geometry.boundingBox ?? new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    return { offset: center, maxDimension: Math.max(size.x, size.y, size.z) || 1 };
  }, [geometry]);

  const scale = useMemo(
    () => (Math.min(viewport.width, viewport.height) * FIT_FRACTION) / maxDimension,
    [viewport.width, viewport.height, maxDimension]
  );

  // Scroll-driven mode. `rotation` is mutated in place by a GSAP timeline
  // owned by the section above this rig, so there is no tween here whose
  // onUpdate could ask for a frame. Watching the object from the ticker gets
  // the same result from this side of the boundary: three numbers compared per
  // rAF tick, on a ticker ScrollTrigger is already running anyway, and a frame
  // requested only on the ticks where the scroll actually moved the can.
  useEffect(() => {
    if (spin) return undefined;
    const last = { x: NaN, y: NaN, z: NaN };
    const watch = () => {
      if (rotation.x === last.x && rotation.y === last.y && rotation.z === last.z) return;
      last.x = rotation.x;
      last.y = rotation.y;
      last.z = rotation.z;
      keepAlive();
    };
    gsap.ticker.add(watch);
    return () => gsap.ticker.remove(watch);
  }, [rotation, spin, keepAlive]);

  // Scale is derived from the viewport, and the mesh offset from the geometry;
  // neither goes through a tween, so redraw after any render that changed them.
  useEffect(() => {
    keepAlive();
  });

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (spin) {
      // Simple mode: no scroll timeline to follow, so the can just turns on
      // its own axis at a readable pace, held at a slight tilt so the label
      // isn't edge-on flat.
      group.rotation.x = 0.12;
      group.rotation.y += delta * IDLE_SPIN_SPEED;
      group.rotation.z = 0;
      // An endless spin has no end to invalidate up to, so it runs on exactly
      // one condition instead: someone can see it. Off screen the loop simply
      // stops being re-armed and the page goes quiet; useCanvasOnScreen asks
      // for the frame that starts it again on the way back.
      if (onScreen.current) invalidate();
      return;
    }
    group.rotation.set(rotation.x, rotation.y, rotation.z);
    holding();
  });

  return (
    <group ref={groupRef} scale={scale}>
      <mesh
        geometry={geometry}
        material={[materials[index], CAN_CAP_MATERIAL]}
        position={[-offset.x, -offset.y, -offset.z]}
      />
    </group>
  );
}
