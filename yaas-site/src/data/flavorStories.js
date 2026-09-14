// Per-flavor copy for the flavor detail page's scroll-driven can story.
// Only strawberry is filled in for now — add the other 4 flavors here later,
// same shape, once their copy is written. FlavorDetailPage falls back to the
// flavor's own flavors.js title/description when there's no entry, so every
// /flavors/:slug route renders something real in the meantime.

// Same can, same spec across the whole line — so it's a constant here rather
// than repeated per flavor, and the fallback story can use it too.
export const DEFAULT_BADGES = '0g sugar · 5 cal · 11.2 FL OZ';

export const FLAVOR_STORIES = {
  strawberry: {
    heroKicker: 'WILD STRAWBERRY',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      'Sweet-tart and unbothered — the flavor that keeps its cool no matter how loud the room gets. Calm in a can, charged underneath.',
    rotationBlocks: [
      { kicker: 'STILL NOT RATTLED', line: "Chaos speed-runs around her. She doesn't blink." },
      { kicker: 'ZERO SUGAR. ZERO PANIC.', line: "Sweet-tart hit, ice-cold nerves — that's the whole personality." },
      { kicker: "SHE'S THE VIBE, NOT THE HYPE", line: 'No shouting, no spiraling. Just locked in, however loud the room gets.' },
      { kicker: 'GRAB ONE, KEEP YOUR COOL', line: '0g sugar · 5 cal · 11.2 FL OZ — same calm, every single can.' },
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
    rotationBlocks: [{ kicker: flavor.title, line: flavor.description }],
  };
}

export const GALLERY_HEADING = 'Try the Other Flavors';
