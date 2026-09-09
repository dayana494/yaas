// Verbatim copy for the homepage, screen by screen — sourced from
// yaas-homepage.md.
export const HERO = {
  h1: 'YAAS. That feeling when everything just hits different.',
  subhead: 'Zero-sugar energy for people who move at their own speed. Flavor maxed out, sugar at zero.',
  badges: ['0g sugar', '5 cal', '11.2 FL OZ', '5 flavors'],
  cta: 'See the Flavors →',
};

// Screen 3 heading/subhead (yaas-homepage.md) — the homepage's own 3D
// gallery (SliderScreen.jsx) doesn't render this copy itself; reused here
// as the /flavors page's own heading instead.
export const FLAVOR_GALLERY = {
  h2: '5 Flavors. One Energy.',
  subhead: "Spin the cans, find your match — everybody's chill, just in their own way.",
};

export const BRAND_TEASER = {
  h2Lines: ['Not For Everyone.', 'For Our People.'],
  // Split into the same two sentences/paragraphs Figma node 173:2 shows —
  // still the one verbatim copy block from yaas-homepage.md, just broken at
  // its own existing sentence boundary rather than run as one paragraph.
  copyParagraphs: [
    "YAAS was made by people who were done with energy drinks that hit you with a sugar bomb and taste like a chemistry set.",
    "We're about clean ingredients, real flavor, and energy that actually works for you, not against you. No posturing, no cutting corners — just a charge you can trust.",
  ],
  cta: 'Read Our Story →',
  ctaHref: '/about',
};

export const CONTACT = {
  h2: 'Hit Us Up',
  copy: "Questions, ideas, partnership pitches — hit us up, we'll figure it out.",
  // The source doc (yaas-homepage.md, Screen 7) only names these three
  // channel types — email / Telegram / VK — with no actual address/handle
  // for any of them, plus its own dev note that Telegram/VK were carried
  // over from the RU site and should be swapped for the US brand's real
  // socials before shipping. No invented address/handle/link here as a
  // result — `href: null` renders as a plain (non-clickable) label instead
  // of a fabricated contact.
  channels: [
    { label: 'Email', href: null },
    { label: 'Telegram', href: null },
    { label: 'VK', href: null },
  ],
  cta: 'See All Contact Info →',
  ctaHref: '/contacts',
};
