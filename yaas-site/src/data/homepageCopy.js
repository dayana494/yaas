// Verbatim copy for the homepage, screen by screen — sourced from
// yaas-homepage.md.
export const HERO = {
  h1: 'YAAS. That feeling when everything just hits different.',
  subhead: 'Zero-sugar energy for people who move at their own speed. Flavor maxed out, sugar at zero.',
  badges: ['0 g sugar', '5 cal', '11.2 FL OZ', '5 flavors'],
  cta: 'See the Flavors →',
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
  // 'Read Our Story' and its '/about' target are gone: that page does not
  // exist and is not planned, so the button linked nowhere. See
  // BrandTeaserScreen.jsx.
};

export const CONTACT = {
  // Figma node 309:195 — one sentence, no separate sub-paragraph any more.
  h2: "Questions, ideas, partnership pitches — hit us up, we'll figure it out",
  // One channel, as a pill with a trailing arrow. The mock draws two, but only
  // the address below exists — the Telegram handle never materialised, and a
  // second pill that goes nowhere is worse than one that works.
  actions: [{ label: 'yaas-energy@gmail.com', href: 'mailto:yaas-energy@gmail.com' }],
};
