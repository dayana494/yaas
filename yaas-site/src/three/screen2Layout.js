// Pose data for the two cans that frame the screen 2 headline (lemon left,
// apple right) — independent meshes, not the hero's own cans travelling
// down.
//
// Position is computed at runtime now (see Screen2CanRig), not baked in
// here: "hug the screen edge, vertically centered on the headline, ±15px"
// only has a stable meaning in real screen pixels, and this canvas's
// on-screen size changes with viewport width/height (it isn't the fixed,
// pre-scaled 1200-wide stage the hero uses) — so the edge/offset math has
// to read the actual DOM rects each time, not assume one Figma-derived
// world position.
// How close the can's own center sits to the left/right screen edge. This
// isn't the gap to the can's visible edge — it has to clear the can's own
// rendered half-width (roughly 350px * scale at this camera/distance) too,
// or the can clips off-screen instead of just "hugging" it.
export const SIDE_MARGIN_PX = 190;
// +up / -down in px from the headline's own vertical center, per can. Apple
// sits 40px lower than its original symmetric -15px per feedback.
export const VERTICAL_OFFSET_PX = { lemon: 15, apple: -55 };
export const CAN_Z = 0.1;
export const CAN_SCALE = { lemon: 1.0, apple: 0.92 };
export const CAN_ROTATION = {
  lemon: { rotY: 0.15, rotZ: -0.354 },
  apple: { rotY: -0.15, rotZ: 0.215 },
};

// Idle float once settled: small, slow up/down drift so they read as
// hovering rather than perfectly static.
export const FLOAT_AMPLITUDE = 0.06;
export const FLOAT_DURATION = 3.2;
