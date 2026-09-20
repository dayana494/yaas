# Fill in the remaining 4 flavor detail pages — copy only, no new code

`/flavors/strawberry` is done and live. This is a content-only task: every other piece of that page — `FlavorStorySection.jsx`, `FlavorStoryScene.jsx`/`FlavorStoryCanRig.jsx`, `FlavorGallery.jsx`, the rise transition into it, all the CSS — is already fully generic and keyed off the shared `FLAVORS` registry (`src/data/flavors.js`), not hardcoded to strawberry. Confirmed by grep: no file outside `src/data/` references "strawberry" except as a code comment describing the *default* flavor, never as a special case that would block another flavor's page from working.

The only thing missing for blueberry, orange, lemon and apple is their entry in `FLAVOR_STORIES` in `src/data/flavorStories.js` — right now only `strawberry` is filled in, and the other four silently fall back to a bare one-block placeholder (see `getFlavorStory`'s fallback branch). Add the four entries below, in the exact same shape as the existing `strawberry` one, and nothing else on the page should need to change. Menu and footer are already shared site-wide components (`HeroScreen`/nav, `Footer`) — don't touch them, they're correct as-is.

## What to add

Open `src/data/flavorStories.js` and add these four keys to the `FLAVOR_STORIES` object, alongside the existing `strawberry` entry (same `layout` rotation — center / split / caption / finale — same as strawberry's four blocks, same `DEFAULT_BADGES` constant reused for `heroBadges`):

```js
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
    "Warm and bright without even trying — the energy that pulls the room in, never pushes it.",
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
    "Sharp and quick on her feet — already three steps ahead while everyone else is catching up.",
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
    "Crisp and matter-of-fact — nothing left to argue about, nothing left to prove either.",
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
```

Each one mirrors strawberry's own voice/length/rhythm exactly (short all-caps kickers, one-sentence lines, the same badges-restated caption block, the same "GRAB ONE, ___" finale) but leans into that flavor's own established personality from `flavors.js`'s own card copy — lemon quick/sharp, blueberry unhurried/quiet, orange warm/bright, apple crisp/matter-of-fact — so the five pages read as one family without being interchangeable reskins of the same words.

`heroKicker` isn't actually read by `FlavorStorySection.jsx` right now (the flavor name shown on the page comes from `flavor.title` in `flavors.js`, already `'BLUEBERRY RUSH'` / `'SOLAR ORANGE'` / `'CITRUS LEMON'` / `'GREEN APPLE'`) — it's included anyway only because the existing `strawberry` entry has it and the brief is to match that shape exactly. Leave it in for consistency; no need to wire it up to anything.

## After adding the copy

No animation, layout, or component code should need to change — the tumble timeline, the rise transition into "Try the Other Flavors," the can rig, all of it already reads flavor-agnostically off `FLAVORS`/`FLAVOR_STORIES`. If any of these four pages *doesn't* end up looking/animating identically to `/flavors/strawberry` once its copy is in, that's a real bug to fix (something is accidentally strawberry-specific after all), not something to route around with a one-off change to that flavor's page.

## Verification checklist

- Visit `/flavors/blueberry`, `/flavors/orange`, `/flavors/lemon`, `/flavors/apple` — each should show its own copy, its own flavor color, its own can label, with the exact same tumble/scroll mechanics and rise-into-gallery transition as `/flavors/strawberry`.
- Confirm the four rotation blocks crossfade at the same waypoints/timing as strawberry's for each flavor (same `WAYPOINTS`/`RISE_UNITS` — nothing here should differ per flavor).
- In each page's "Try the Other Flavors" gallery strip, confirm the *current* flavor's card is marked active (`isActive`) and the other four link out correctly.
- Confirm the shared nav and footer render identically to the strawberry page (they should — no changes touched them).
- Quick text pass: no leftover placeholder/lorem copy, no stray reference to another flavor's name inside any of the four new entries.
