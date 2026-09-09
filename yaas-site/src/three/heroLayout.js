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

// Standing in a level row (kisadrink.ru's own mobile hero — three cans
// side by side, upright, not the desktop cluster's tilted scatter) instead
// of the old scattered-cluster pose (strawberry alone up top, blueberry/
// orange lower — tuned back when this canvas was still full-bleed behind
// the hero copy; now that .site-canvas is a short, wide bottom band
// (index.css) the old pose's y values (up to 1.34) fall well outside that
// band's own vertical frustum extent anyway). y=0, centered in the band;
// x spread to use the wider aspect a short/wide canvas gives at this fixed
// vertical FOV; only a light rotZ each (a resting few-degree lean, not the
// original's dramatic multi-radian tilt) so they read as standing, not
// toppling.
const MOBILE_CANS = [
  {
    id: 'strawberry',
    flavorIndex: flavorIndex('strawberry'),
    end: { x: 0, y: 0, z: 0.2, rotY: 0.1, rotZ: 0.08, scale: 0.62 },
    start: { x: 0, y: 1.6, z: -0.4, rotY: 0.1, rotZ: 0.08 + Math.PI * 3, scale: 0.2 },
    control: { x: -0.1, y: 1, z: 0.9 },
    delay: 0,
  },
  {
    id: 'blueberry',
    flavorIndex: flavorIndex('blueberry'),
    end: { x: -0.78, y: 0, z: 0, rotY: 0.18, rotZ: -0.1, scale: 0.62 },
    start: { x: -0.78, y: -1.6, z: -0.5, rotY: 0.18, rotZ: -0.1 - Math.PI * 3, scale: 0.2 },
    control: { x: -1, y: -1, z: 0.5 },
    delay: 0.12,
  },
  {
    id: 'orange',
    flavorIndex: flavorIndex('orange'),
    end: { x: 0.78, y: 0, z: -0.1, rotY: -0.18, rotZ: 0.11, scale: 0.62 },
    start: { x: 0.78, y: -1.6, z: -0.7, rotY: -0.18, rotZ: 0.11 + Math.PI * 3, scale: 0.2 },
    control: { x: 1, y: -1, z: 0.3 },
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
