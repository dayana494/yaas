// Pose data for the two cans framing the contact panel — Figma node 309:195,
// read off its 1920x971 frame.
//
// Everything here is expressed as a fraction of the PANEL's own box, not of the
// section or the viewport. The panel is the one thing whose proportions the
// mock pins down (1820 x 771, rounded 20), and anchoring to it is what keeps
// the composition — can beside heading, can overlapping the panel's corner —
// reading the same at every width instead of drifting as the section's own
// padding changes its aspect.
//
// Panel box in the mock: x 50..1870, y 102..873.
//   orange    centre (283.3, 312.3) -> (0.128, 0.273), rotated -15deg
//   blueberry centre (1627.3, 658.8) -> (0.867, 0.722), rotated +15deg
// Both render at 470px wide, i.e. 470/1820 of the panel.
const DEG = Math.PI / 180;

export const CONTACT_CANS = [
  { id: 'orange', x: 0.128, y: 0.273, rotZ: -15 * DEG, rotY: 0.2 },
  { id: 'blueberry', x: 0.867, y: 0.722, rotZ: 15 * DEG, rotY: -0.2 },
];

// The can's on-screen HEIGHT as a share of the panel's, and the ceiling it
// stops growing at.
//
// Height rather than width, because that is the dimension the composition is
// actually built on: the mock's can art is 470 x 543.5, an aspect of 0.86,
// while this project's can model is a real 330ml cylinder at roughly 0.57.
// Matching the widths would therefore have made our can half again as tall as
// the mock's — measured at 1440: a 342px-wide can standing ~660px tall in a
// 561px panel, against the mock's 543 in 771. Matching the heights puts the can
// in the same slot in the frame, which is what the eye reads.
//
// The cap is the other half of it: past the mock's own 1920 frame a purely
// proportional can keeps inflating, and the spec asks for the mock's
// proportions rather than "whatever the container scales to" — the same
// fixed-size rule the Screen 3 cards ended up needing.
export const CAN_HEIGHT_RATIO = 543.543 / 771;
export const CAN_HEIGHT_MAX_PX = 543.5;
export const CAN_HEIGHT_MIN_PX = 190;

// The mock is a desktop frame, and its proportions do not survive the move to a
// phone: the panel goes from 2.36:1 to 3:4, so a can at 70% of its height ends
// up nearly as wide as the panel itself and sits on top of the heading
// (measured at 390: a 315px can across a 335px panel). Below this width the
// pair shrinks and moves out to hug the panel's outer edges instead, framing
// the text rather than covering it — the same call Screen 2's own cans make at
// their narrow breakpoint.
export const NARROW_MAX_WIDTH = 1024;
// Figma 374:64: both cans sit side by side low on the panel, close together,
// and FULLY inside it — not one at each opposite corner as the desktop mock has
// them, and not cropped by its lower edge. Read off the frame's own render
// rather than its placeholder boxes, which carry transparent padding and made
// the can look nearly twice this size.
//   orange    centre -> (0.668, 0.785) of the panel
//   blueberry centre -> (0.327, 0.785)
// and about 30% of the panel tall.
export const CAN_HEIGHT_RATIO_NARROW = 0.3;
export const CONTACT_CANS_NARROW = [
  { x: 0.668, y: 0.785 },
  { x: 0.327, y: 0.785 },
];

// Straight at the camera, so the label reads flat like the mock's render.
export const CAN_Z = 0;

// The endless hover. Amplitude in px so it stays the same visual drift at any
// canvas size; sine easing both ways, no pause at either end.
export const FLOAT_AMPLITUDE_PX = 16;
export const FLOAT_DURATION = 3.2;
// Offset so the two cans don't rise and fall in lockstep.
export const FLOAT_STAGGER = 0.9;
