// Pure math helpers for the flavor-arc carousel, shared by the per-frame
// layout loop and the drag/settle logic. Kept free of React/Three imports
// so it's trivial to reason about and test in isolation.

export const FLAVOR_N = 5;

// Shortest signed distance (in slot units) from a fixed slot index to the
// current continuous carousel position, wrapping around the 5 flavors.
export function wrappedDelta(slotIndex, continuousIndex, n = FLAVOR_N) {
  let d = slotIndex - continuousIndex;
  d = ((d % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

// Nearest real number congruent to `flavorIndex` (mod n) to `current` —
// lets us tween the continuous index toward a target flavor via the
// shortest path in either direction instead of always spinning forward.
export function nearestTarget(current, flavorIndex, n = FLAVOR_N) {
  const base = Math.round((current - flavorIndex) / n) * n + flavorIndex;
  let best = base;
  let bestDist = Math.abs(best - current);
  for (const cand of [base - n, base + n]) {
    const d = Math.abs(cand - current);
    if (d < bestDist) {
      best = cand;
      bestDist = d;
    }
  }
  return best;
}

export function mod(n, m) {
  return ((n % m) + m) % m;
}

const DESKTOP = {
  spacingX: 0.85,
  degPerSlot: 22,
  depthZ: 0.3,
  scaleStep: 0.1,
  minScale: 0.62,
  dipY: 0.02,
  fadeRange: 2.5,
};

// Sized and placed from Figma 344:286 (390x800), now that the mobile canvas is
// full-bleed rather than a bottom band. In that frame the centre can spans
// 34.7%-77.3% of the screen, i.e. 42.6% of its height centred at 56% down.
// At this fixed vertical FOV the full-height canvas is 1.929 world units tall,
// so that height is baseScale below and that centre is yOffset.
const MOBILE = {
  spacingX: 1.35,
  degPerSlot: 34,
  depthZ: 0.4,
  scaleStep: 0.22,
  minScale: 0.35,
  dipY: 0.02,
  fadeRange: 1.05,
  baseScale: 0.82,
  yOffset: -0.116,
};

// Roughly 20px of screen space at typical viewport heights, in world units
// — nudges the whole arc down a touch relative to the heading above it.
// Desktop only — mobile carries its own yOffset above, since its can sits much
// lower in the frame relative to the heading than the desktop arc does.
const ARC_Y_OFFSET = -0.045;

// Which gallery arc slot (delta from the centered flavor) each hero-cluster
// can settles into once the hero->gallery entrance finishes (see CanRig's
// setEntranceProgress) — blueberry left, orange right, matching each can's
// own side in the hero cluster (heroLayout.js) so the flip never has to
// cross them past each other. Matches the FLAVORS array order (flavors.js)
// exactly — the gallery's own per-frame arc placement (wrappedDelta over
// FLAVORS' index order) lands on these same deltas, so nothing visually
// snaps once the entrance hands off to the normal slider loop.
export const GALLERY_SLOT_DELTA = { strawberry: 0, blueberry: -1, orange: 1 };

export function arcTransform(delta, isMobile) {
  const cfg = isMobile ? MOBILE : DESKTOP;
  const abs = Math.abs(delta);
  const sign = Math.sign(delta);
  const x = delta * cfg.spacingX;
  const z = -abs * cfg.depthZ;
  const y = -abs * abs * cfg.dipY + (cfg.yOffset ?? ARC_Y_OFFSET);
  const rotY = -sign * abs * cfg.degPerSlot * (Math.PI / 180);
  const scale = (cfg.baseScale ?? 1) * Math.max(cfg.minScale, 1 - abs * cfg.scaleStep);
  const visibility = Math.max(0, 1 - abs / cfg.fadeRange);
  return { x, y, z, rotY, scale, visibility };
}
