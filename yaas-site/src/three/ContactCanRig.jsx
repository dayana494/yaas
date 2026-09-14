import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useCanGeometry } from './useCanGeometry';
import { useCanMaterials } from './useCanMaterials';
import { FLAVORS } from '../data/flavors';
import {
  CAN_HEIGHT_MAX_PX,
  CAN_HEIGHT_MIN_PX,
  CAN_HEIGHT_RATIO,
  CAN_HEIGHT_RATIO_NARROW,
  CAN_Z,
  CONTACT_CANS,
  CONTACT_CANS_NARROW,
  NARROW_MAX_WIDTH,
  FLOAT_AMPLITUDE_PX,
  FLOAT_DURATION,
  FLOAT_STAGGER,
} from './contactLayout';

const flavorIndex = (id) => FLAVORS.findIndex((f) => f.id === id);

// The two cans beside the contact panel. Same can.glb and same per-flavor label
// materials every other can on this site uses (useCanGeometry/useCanMaterials)
// — nothing new is modelled or textured here, this is only a third placement of
// the existing model.
//
// Placement is measured, not baked: the mock's numbers are fractions of the
// panel's own box (see contactLayout.js), so the rig reads the panel's live rect
// against this canvas's rect and converts through the camera's own frustum —
// the same approach Screen2CanRig uses, and for the same reason. A world
// coordinate derived once from a 1920-wide frame would only be right at that
// one width.
export default function ContactCanRig({ panelRef, canvasRef }) {
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const groupRefs = useMemo(() => CONTACT_CANS.map(() => ({ current: null })), []);
  const groupRefSetters = useMemo(() => groupRefs.map((r) => (el) => (r.current = el)), [groupRefs]);

  // The model's own height in world units at scale 1, so the scale needed for a
  // given on-screen pixel height can be solved for rather than guessed. Cached
  // on the geometry: it is the one shared instance, and this never changes.
  const naturalHeight = useMemo(() => {
    if (!geometry) return 1;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = new THREE.Vector3();
    geometry.boundingBox.getSize(box);
    return box.y || 1;
  }, [geometry]);

  useEffect(() => {
    const panel = panelRef.current;
    const canvas = canvasRef.current;
    if (!panel || !canvas || !size.width || !size.height) return undefined;

    const panelRect = panel.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    if (!panelRect.width || !canvasRect.width) return undefined;

    // World units spanned by half the canvas at the cans' own depth.
    const dist = camera.position.z - CAN_Z;
    const halfH = Math.tan((camera.fov / 2) * (Math.PI / 180)) * dist;
    const halfW = halfH * (size.width / size.height);
    const pxToWorldX = (px) => (px / size.width) * 2 * halfW;
    const pxToWorldY = (px) => (px / size.height) * 2 * halfH;

    // Panel box in canvas pixels.
    const panelLeft = panelRect.left - canvasRect.left;
    const panelTop = panelRect.top - canvasRect.top;

    const narrow = size.width < NARROW_MAX_WIDTH;
    const heightRatio = narrow ? CAN_HEIGHT_RATIO_NARROW : CAN_HEIGHT_RATIO;
    const heightPx = narrow
      ? panelRect.height * heightRatio
      : Math.max(CAN_HEIGHT_MIN_PX, Math.min(CAN_HEIGHT_MAX_PX, panelRect.height * heightRatio));
    const scale = pxToWorldY(heightPx) / naturalHeight;

    const ctx = gsap.context(() => {
      CONTACT_CANS.forEach((can, i) => {
        const group = groupRefs[i].current;
        if (!group) return;

        const place = narrow ? CONTACT_CANS_NARROW[i] : can;
        const centerXPx = panelLeft + panelRect.width * place.x;
        const centerYPx = panelTop + panelRect.height * place.y;
        // Canvas centre is world (0,0); +Y is up, so a pixel distance measured
        // down from the canvas top becomes halfH minus that distance.
        const worldX = pxToWorldX(centerXPx) - halfW;
        const worldY = halfH - pxToWorldY(centerYPx);

        group.position.set(worldX, worldY, CAN_Z);
        group.rotation.set(0, can.rotY, can.rotZ);
        group.scale.setScalar(scale);

        // The float: one endless yoyo, sine-eased in both directions so it
        // never stalls at the turn. Staggered so the pair doesn't pulse
        // together. delay rather than a separate timeline — a yoyo repeat
        // keeps its phase from whenever it started.
        gsap.to(group.position, {
          y: worldY + pxToWorldY(FLOAT_AMPLITUDE_PX),
          duration: FLOAT_DURATION,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: i * FLOAT_STAGGER,
        });
      });
    });

    return () => ctx.revert();
  }, [camera, size.width, size.height, naturalHeight, panelRef, canvasRef, groupRefs]);

  return (
    <group>
      {CONTACT_CANS.map((can, i) => (
        <group key={can.id} ref={groupRefSetters[i]}>
          <mesh geometry={geometry} material={materials[flavorIndex(can.id)]} />
        </group>
      ))}
    </group>
  );
}
