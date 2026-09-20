// Per-flavor copy for the flavor detail page's scroll-driven can story.
// Every flavor in the FLAVORS registry has an entry here; getFlavorStory's
// fallback below is now only a safety net for a flavor added to flavors.js
// before its copy is written.

// Same can, same spec across the whole line — so it's a constant here rather
// than repeated per flavor, and the fallback story can use it too.
export const DEFAULT_BADGES = '0g sugar · 5 cal · 330 ml';

// Every entry is four screens, matching Figma 389-2 one for one — including
// the two that carry only half a block: the third is a caption with no
// headline over it, the fourth a headline with no caption under it.
//
// `layout` picks the screen's composition (see .flavor-rotation-block's
// modifiers in styles/flavor-detail.css), each lifted from that mock:
//   center  — headline centered up top, caption centered low
//   split   — headline top-left, caption bottom-right
//   caption — caption alone, left, on the vertical centre line
//   finale  — headline alone, wide and centered; the can stops on it
//
// The five read as one family — short all-caps kickers, one-sentence lines,
// the badges restated in the caption screen, a "GRAB ONE, ___" finale — while
// each leans on the personality its own card copy in flavors.js already
// established: strawberry unbothered, blueberry unhurried, orange warm,
// lemon quick, apple matter-of-fact.
//
// `heroKicker` is not read by anything today: the name on the page comes from
// flavor.title in flavors.js, which already carries these exact strings. It is
// kept so all five entries are the same shape.
export const FLAVOR_STORIES = {
  strawberry: {
    heroKicker: 'WILD STRAWBERRY',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      'Sweet-tart and unbothered — the flavor that keeps its cool no matter how loud the room gets. Calm in a can, charged underneath.',
    // An earlier version of this list paired a kicker with a line on all four
    // and carried a fifth idea ("SHE'S THE VIBE, NOT THE HYPE" / "No shouting,
    // no spiraling…") that the design has no screen for; the mock's own
    // sequence replaces it.
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

  blueberry: {
    heroKicker: 'BLUEBERRY RUSH',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      "Deep and unhurried — she's not racing anyone, she's just already there. Quiet confidence, steady undercurrent.",
    rotationBlocks: [
      {
        layout: 'center',
        kicker: 'NEVER IN A RUSH, NEVER BEHIND',
        line: 'She moves at her own pace and still gets there first.',
      },
      {
        layout: 'split',
        kicker: 'ZERO FLEX. ZERO NEED TO.',
        line: 'Deep berry calm, steady current underneath — nothing to prove.',
      },
      {
        layout: 'caption',
        line: '0g sugar · 5 cal · 330 ml — same quiet strength, every single can.',
      },
      {
        layout: 'finale',
        kicker: 'GRAB ONE, KEEP YOUR PACE',
      },
    ],
  },

  orange: {
    heroKicker: 'SOLAR ORANGE',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      'Warm and bright without even trying — the energy that pulls the room in, never pushes it.',
    rotationBlocks: [
      {
        layout: 'center',
        kicker: 'BRIGHT WITHOUT TRYING',
        line: "She doesn't raise her voice. She doesn't have to.",
      },
      {
        layout: 'split',
        kicker: 'ZERO SHOUTING. FULL GLOW.',
        line: 'Juicy citrus heat, easy warmth — the mood just follows.',
      },
      {
        layout: 'caption',
        line: '0g sugar · 5 cal · 330 ml — same warm glow, every single can.',
      },
      {
        layout: 'finale',
        kicker: 'GRAB ONE, KEEP IT BRIGHT',
      },
    ],
  },

  lemon: {
    heroKicker: 'CITRUS LEMON',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      'Sharp and quick on her feet — already three steps ahead while everyone else is catching up.',
    rotationBlocks: [
      {
        layout: 'center',
        kicker: 'ALREADY THREE STEPS AHEAD',
        line: "Quick reflexes, quicker mind. She's solved it before you finish the question.",
      },
      {
        layout: 'split',
        kicker: 'SHARP TASTE, SHARPER FOCUS',
        line: "Zesty hit, clear head — that's the whole trick.",
      },
      {
        layout: 'caption',
        line: '0g sugar · 5 cal · 330 ml — same sharp focus, every single can.',
      },
      {
        layout: 'finale',
        kicker: 'GRAB ONE, STAY QUICK',
      },
    ],
  },

  apple: {
    heroKicker: 'GREEN APPLE',
    heroBadges: DEFAULT_BADGES,
    heroLine:
      'Crisp and matter-of-fact — nothing left to argue about, nothing left to prove either.',
    rotationBlocks: [
      {
        layout: 'center',
        kicker: 'NOTHING LEFT TO ARGUE',
        line: "The whole day's a deadline. She's still not rattled.",
      },
      {
        layout: 'split',
        kicker: 'ZERO DRAMA. FULL CRISP.',
        line: "Tart bite, cool head — that's the whole personality.",
      },
      {
        layout: 'caption',
        line: '0g sugar · 5 cal · 330 ml — same crisp calm, every single can.',
      },
      {
        layout: 'finale',
        kicker: 'GRAB ONE, STAY CRISP',
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
