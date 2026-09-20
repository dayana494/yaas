// Per-flavor copy for the flavor detail page's scroll-driven can story.
// Only strawberry is filled in for now — add the other 4 flavors here later,
// same shape, once their copy is written. FlavorDetailPage falls back to the
// flavor's own flavors.js title/description when there's no entry, so every
// /flavors/:slug route renders something real in the meantime.

// Same can, same spec across the whole line — so it's a constant here rather
// than repeated per flavor, and the fallback story can use it too.
export const DEFAULT_BADGES = '0g sugar · 5 cal · 330 ml';

export const FLAVOR_STORIES = {
  strawberry: {
    heroKicker: 'WILD STRAWBERRY',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      'Sweet-tart and unbothered — the flavor that keeps its cool no matter how loud the room gets. Calm in a can, charged underneath.',
    // Four screens, matching Figma 389-2 one for one — including the two that
    // carry only half a block: the third is a caption with no headline over
    // it, the fourth a headline with no caption under it. An earlier version
    // of this list paired a kicker with a line on all four and carried a
    // fifth idea ("SHE'S THE VIBE, NOT THE HYPE" / "No shouting, no
    // spiraling…") that the design doesn't have a screen for; the mock's own
    // sequence replaces it.
    //
    // `layout` picks the screen's composition (see .flavor-rotation-block's
    // modifiers in styles/flavor-detail.css), each lifted from that mock:
    //   center  — headline centered up top, caption centered low
    //   split   — headline top-left, caption bottom-right
    //   caption — caption alone, left, on the vertical centre line
    //   finale  — headline alone, wide and centered; the can stops on it
    rotationBlocks: [
      {
        layout: 'center',
        kicker: 'STILL NOT RATTLED',
        line: "Chaos speed-runs around her. She doesn't blink.",
      },
      {
        layout: 'split',
        kicker: 'ZERO SUGAR. ZERO PANIC.',
        line: "Sweet-tart hit, ice-cold nerves — that's the whole personality.",
      },
      {
        layout: 'caption',
        line: '0g sugar · 5 cal · 330 ml — same calm, every single can.',
      },
      {
        layout: 'finale',
        kicker: 'GRAB ONE, KEEP YOUR COOL',
      },
    ],
  },
};

// Builds the page's story object for any flavor: its own entry when one
// exists, otherwise a one-block stand-in assembled from flavors.js so the
// route still reads as a finished page instead of an empty pinned section.
export function getFlavorStory(flavor) {
  const story = FLAVOR_STORIES[flavor.id];
  if (story) return story;
  return {
    heroKicker: flavor.title,
    heroBadges: DEFAULT_BADGES,
    heroLine: flavor.description,
    rotationBlocks: [
      { layout: 'center', kicker: flavor.title, line: flavor.description },
    ],
  };
}

export const GALLERY_HEADING = 'Try the Other Flavors';
