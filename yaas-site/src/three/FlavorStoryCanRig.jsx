import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCanGeometry } from './useCanGeometry';
import { CAN_CAP_MATERIAL, useCanMaterials } from './useCanMaterials';
import { FLAVORS } from '../data/flavors';

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
      return;
    }
    group.rotation.set(rotation.x, rotation.y, rotation.z);
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
