// Pose data + math for the hero cluster's three-can entrance. Kept separate
// from arcLayout.js (which drives the flavor-gallery carousel) since the
// hero composition is a fixed cluster, not a draggable arc.
//
// Hero and gallery share a single Canvas/camera now (see Scene.jsx —
// HERO_CAMERA below is that camera's exact config) — the same 5 can objects
// fly into the cluster on load and later flip into the gallery arc on
// scroll, never swapped for different instances. The positions below are
// used completely as-is, unremapped: r3f's camera aspect always tracks the
// live viewport (there's no such thing as a fixed "design aspect" to
// convert from), so these plain world coordinates already land in the same
// place under any viewport size that the original hero-only build did.
import { FLAVORS } from '../data/flavors';

const flavorIndex = (id) => FLAVORS.findIndex((f) => f.id === id);

// Must match Scene.jsx's <Canvas camera> exactly — the one real camera hero
// and gallery both render through.
export const HERO_CAMERA = { position: [0, 0, 3.6], fov: 30 };

// end = resting pose in the cluster, start = off-stage launch point,
// control = bezier control point the can arcs through on the way in.
// rotY carries extra full turns on top of the resting angle so the flight
// reads as a spiral, not a straight glide.
// Desktop end poses are back-solved from the Figma reference (node 47:21,
// Frame 40, 1200x650): each can's bounding-box center in that frame was
// unprojected through this scene's actual camera (position [0,0,3.6],
// fov 30, aspect 1200/650) back to world x/y at a chosen depth, so the can
// lands at the same screen position the design shows it at — rather than
// eyeballed, which is what made the previous pass read as too small. Scale
// and rotation are still tuned by eye against that same reference.
// Slot geometry (position/rotation/scale) stays tied to its visual role —
// top/left/right — the flavor occupying each slot is just which id/
// flavorIndex is attached to it below.
const DESKTOP_CANS = [
  {
    // Top slot: raised ~50px screen-space higher than the first Figma pass
    // (world +0.14, using this depth's ~0.0028 world-units-per-px). rotZ
    // was 2.356 (135°, rim pointing hard toward bottom-left, matching the
    // Figma mockup); pulled back 17.5° toward straight-down (center) per
    // feedback that it read as leaning too far left.
    // y pulled down from the original 0.88 — at this depth (camera fov 30,
    // z 3.6) the vertical frustum only reaches ~0.91 world units above
    // center, so a can half-height above that poked past the top edge and
    // read as cropped. Went 0.88 -> 0.65 (overcorrected into a visible gap)
    // -> 0.8 (verified clean at 600-925px viewport heights) -> 0.72, a
    // little extra margin on top of that, confirmed clipping-free at
    // 1440x900/1920x1080/2560x1440 by projecting the can's own *settled*
    // group position through the real Three.js camera (not a mid-flight
    // frame — the entrance tween takes ~1.5s to land here, and a screenshot
    // grabbed before it settles can look clipped purely because the can is
    // still partway through its descent, still higher up than its resting y).
    id: 'strawberry',
    flavorIndex: flavorIndex('strawberry'),
    end: { x: 0.1, y: 0.72, z: 0.2, rotY: 0.15, rotZ: 2.661, scale: 1.13 },
    start: { x: 0.3, y: 2.54, z: -0.4, rotY: 0.15, rotZ: 2.661 + Math.PI * 3, scale: 0.3 },
    control: { x: -0.1, y: 1.69, z: 0.9 },
    delay: 0,
  },
  {
    id: 'blueberry',
    flavorIndex: flavorIndex('blueberry'),
    end: { x: -1.39, y: -0.47, z: 0.1, rotY: 0.2, rotZ: -0.44, scale: 1.217 },
    start: { x: -3.2, y: -1.1, z: -0.6, rotY: 0.2, rotZ: -0.44 - Math.PI * 3, scale: 0.28 },
    control: { x: -2.3, y: -1.4, z: 0.6 },
    delay: 0.12,
  },
  {
    id: 'orange',
    flavorIndex: flavorIndex('orange'),
    end: { x: 1.79, y: -0.05, z: -0.2, rotY: -0.25, rotZ: 1.05, scale: 1.13 },
    start: { x: 3.2, y: 0.5, z: -0.9, rotY: -0.25, rotZ: 1.05 + Math.PI * 3, scale: 0.26 },
    control: { x: 2.4, y: -0.3, z: 0.3 },
    delay: 0.24,
  },
];

// Re-poised against Figma 344:237 (390x850), replacing a row lifted from a
// different reference (kisadrink.ru) that this frame does not resemble.
//
// What that frame shows, measured off its own render rather than off its node
// boxes — those boxes are photo crop windows with empty margin in them, which
// is why "82% of the frame width" appears in the brief while the visible can is
// nearer 50%: a large upright centre can whose body spans about half the
// screen's width and runs from ~51% down to just above the bottom edge, plus a
// blueberry and an orange tilted +-15deg and cropped by the left and right
// edges, both sitting a little lower than the centre one.
//
// Converted to this canvas's own frustum rather than copied as pixels. The
// canvas is full-bleed, so at this fixed vertical FOV it is 1.929 world units
// tall: a can of world height h covers h/1.929 of the screen. The frame's
// centre can runs 51%-94% down, so 0.43 of the height; the two side cans sit a
// little lower and are cropped by the left and right edges.
//
// How far the two side cans lean in toward Strawberry, in radians.
//
// 20deg, up from 15. Figma 344:237 is the reference, but its own numbers do
// not settle this: the side cans there report a different aspect than the
// centre one (0.684 against 0.608), so those boxes are either rotated frames
// or differently-cropped fills, and an angle cannot be read back from them
// either way. This is the design's call on the rendered result instead --
// the previous 15 read as too upright against the mock.
//
// Mobile only. The desktop cluster has its own poses and is untouched.
const MOBILE_SIDE_TILT = 0.349;

const MOBILE_CANS = [
  {
    id: 'strawberry',
    flavorIndex: flavorIndex('strawberry'),
    end: { x: 0, y: -0.434, z: 0.2, rotY: 0.1, rotZ: 0.05, scale: 0.83 },
    start: { x: 0, y: 1.7, z: -0.4, rotY: 0.1, rotZ: 0.05 + Math.PI * 3, scale: 0.22 },
    control: { x: -0.1, y: 1.3, z: 0.9 },
    delay: 0,
  },
  {
    id: 'blueberry',
    flavorIndex: flavorIndex('blueberry'),
    end: { x: -0.37, y: -0.52, z: 0, rotY: 0.18, rotZ: -MOBILE_SIDE_TILT, scale: 0.78 },
    start: { x: -1.6, y: -1.5, z: -0.5, rotY: 0.18, rotZ: -MOBILE_SIDE_TILT - Math.PI * 3, scale: 0.2 },
    control: { x: -1.5, y: -1.1, z: 0.5 },
    delay: 0.12,
  },
  {
    id: 'orange',
    flavorIndex: flavorIndex('orange'),
    end: { x: 0.37, y: -0.52, z: -0.1, rotY: -0.18, rotZ: MOBILE_SIDE_TILT, scale: 0.78 },
    start: { x: 1.6, y: -1.5, z: -0.7, rotY: -0.18, rotZ: MOBILE_SIDE_TILT + Math.PI * 3, scale: 0.2 },
    control: { x: 1.5, y: -1.1, z: 0.3 },
    delay: 0.24,
  },
];

export function getHeroCans(isMobile) {
  return isMobile ? MOBILE_CANS : DESKTOP_CANS;
}

// Quadratic bezier — used to bow the flight path into an arc instead of a
// straight line between start and end.
export function bezierPoint(p0, c, p1, t, out) {
  const mt = 1 - t;
  out.x = mt * mt * p0.x + 2 * mt * t * c.x + t * t * p1.x;
  out.y = mt * mt * p0.y + 2 * mt * t * c.y + t * t * p1.y;
  out.z = mt * mt * p0.z + 2 * mt * t * c.z + t * t * p1.z;
  return out;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
