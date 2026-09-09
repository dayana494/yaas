import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCanGeometry } from './useCanGeometry';
import { useCanMaterials } from './useCanMaterials';
import { FLAVORS } from '../data/flavors';
import {
  SIDE_MARGIN_PX,
  VERTICAL_OFFSET_PX,
  CAN_Z,
  CAN_SCALE,
  CAN_ROTATION,
  FLOAT_AMPLITUDE,
  FLOAT_DURATION,
} from './screen2Layout';

gsap.registerPlugin(ScrollTrigger);

const flavorIndex = (id) => FLAVORS.findIndex((f) => f.id === id);

const CANS = [
  { id: 'lemon', side: -1 },
  { id: 'apple', side: 1 },
];

// The two cans framing the screen 2 headline: hug the left/right screen
// edge, vertically offset from the headline text's own center by
// VERTICAL_OFFSET_PX (per can — see screen2Layout.js). Position is derived
// from real DOM rects + this canvas's
// actual camera/viewport at the moment it flies in — not a fixed
// Figma-derived world coordinate — since "screen edge" and "headline
// center" only mean something in live screen pixels, and this canvas
// isn't the hero's fixed-aspect pre-scaled stage. One-shot flip-in the
// moment the section scrolls into view, then a slow idle hover — no
// further scroll-linked movement.
export default function Screen2CanRig({ triggerRef, headlineRef }) {
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const groupRefs = useMemo(() => CANS.map(() => ({ current: null })), []);
  const groupRefSetters = useMemo(() => groupRefs.map((r) => (el) => (r.current = el)), [groupRefs]);

  // Invisible until the entrance fires, regardless of default (0,0,0)
  // position — avoids a flash at the world origin before onEnter runs.
  useEffect(() => {
    groupRefs.forEach((r) => r.current?.scale.setScalar(0.0001));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: triggerRef.current,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          const canvasRect = triggerRef.current.getBoundingClientRect();
          const headlineRect = headlineRef.current.getBoundingClientRect();
          const headlineCenterYPx = headlineRect.top + headlineRect.height / 2 - canvasRect.top;

          const dist = camera.position.z - CAN_Z;
          const halfH = Math.tan((camera.fov / 2) * (Math.PI / 180)) * dist;
          const halfW = halfH * (size.width / size.height);
          const pxToWorldX = (px) => (px / size.width) * 2 * halfW;
          const pxToWorldY = (px) => (px / size.height) * 2 * halfH;
          // Canvas top = +halfH in world Y (camera looks down -Z at origin).
          const centerWorldY = halfH - pxToWorldY(headlineCenterYPx);

          // Below screen2.css's own mobile breakpoint (max-width: 768px),
          // the headline itself switches to a single centered column
          // (max-width: 420px) — on a canvas much narrower than ~600px that
          // column alone claims nearly the full width, leaving the two cans
          // nowhere to sit beside it without sitting *on* it (both ends up
          // converging toward the same centered spot as the text — confirmed
          // visually at 375px, directly over "hyping you up"). There's no
          // shrink that fixes that; skipping the cans below this width
          // (leaving them at the invisible scale they mount with) is the
          // actual fix, same as how other pinned sections fall back to a
          // simpler layout on narrow viewports instead of forcing their
          // desktop composition to fit.
          if (size.width < 600) return;

          // SIDE_MARGIN_PX/CAN_SCALE were tuned against a desktop-width
          // canvas. Because pxToWorldX converts a *pixel* margin using
          // size.width in both numerator and denominator, the margin's own
          // world-unit size ends up independent of canvas width — but
          // halfW (how much world-space half the canvas actually spans)
          // shrinks as the canvas narrows, so the *same* fixed can render
          // size (CAN_SCALE, also in constant world units) covers a much
          // bigger share of that shrunken half-width. Below the site's own
          // ~900px "real desktop" floor, this let each can's edge reach
          // past the headline's own edge and into its (by-then centered,
          // mobile-fallback) text — confirmed visually at 768px. widthScale
          // shrinks the cans themselves proportionally on narrower canvases;
          // margin is left alone since it already holds its real-pixel
          // meaning at any width once the can footprint sharing that space
          // is corrected. Two-segment ramp, not a single ratio: a plain
          // size.width/N would also have shrunk real desktop widths (every
          // width this project already treats as "desktop", >=1024px, per
          // AdvantagesScreen's own breakpoint) below their original,
          // already-correct size — this pins 1024px+ at the original 1.0
          // untouched, ramps down to the value confirmed fixing the 768px
          // overlap, then continues down to this function's own 600px floor
          // (below which it returns early and never gets here at all).
          const widthScale =
            size.width >= 1024
              ? 1
              : size.width >= 768
                ? 0.38 + ((size.width - 768) / (1024 - 768)) * 0.62
                : 0.3 + ((size.width - 600) / (768 - 600)) * 0.08;

          CANS.forEach(({ id, side }, i) => {
            const group = groupRefs[i].current;
            if (!group) return;

            const rot = CAN_ROTATION[id];
            const scale = CAN_SCALE[id] * widthScale;
            const endX = side * (halfW - pxToWorldX(SIDE_MARGIN_PX));
            const endY = centerWorldY + pxToWorldY(VERTICAL_OFFSET_PX[id]);

            // Start further out past the same edge, a bit higher, smaller,
            // with an extra rotation turn — reads as flying in from off
            // that side of the screen with a flip, not fading in place.
            group.position.set(side * (halfW + pxToWorldX(320)), endY + pxToWorldY(140), CAN_Z - 0.6);
            group.rotation.set(0, rot.rotY, rot.rotZ - side * Math.PI * 2);
            group.scale.setScalar(scale * 0.34);

            gsap.to(group.position, { x: endX, y: endY, z: CAN_Z, duration: 1.3, ease: 'power3.out' });
            gsap.to(group.rotation, {
              z: rot.rotZ,
              duration: 1.3,
              ease: 'power3.out',
              onComplete: () => {
                // Idle hover once settled — small, slow, sine-eased drift
                // so it reads as floating rather than static.
                gsap.to(group.position, {
                  y: endY + FLOAT_AMPLITUDE,
                  duration: FLOAT_DURATION,
                  ease: 'sine.inOut',
                  yoyo: true,
                  repeat: -1,
                });
              },
            });
            gsap.to(group.scale, { x: scale, y: scale, z: scale, duration: 1.3, ease: 'power3.out' });
          });
        },
      });
    });

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <group>
      {CANS.map((can, i) => (
        <group key={can.id} ref={groupRefSetters[i]}>
          <mesh geometry={geometry} material={materials[flavorIndex(can.id)]} />
        </group>
      ))}
    </group>
  );
}
