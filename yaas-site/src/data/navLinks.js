import { asset } from './assetUrl';

// One source of truth for where the header menu and the footer nav point.
//
// They used to carry their own copies, which is how they drifted apart: the
// footer's Flavors went to the /flavors page while the header's went to the
// homepage gallery anchor, and the footer's hash links were written as '/#faq'
// (an absolute path off the deploy root) while the header's were plain '#faq'.
// Same labels, four different behaviours. Both surfaces now read these.
//
// Flavors is a section like the rest now. It had a page of its own, built from
// this same gallery, and that page is gone — the menu and the footer point at
// the gallery on the homepage instead.

// Section anchors on the homepage. The ids live on the sections themselves —
// #why-yaas on AdvantagesScreen, #about on BrandTeaserScreen, #faq on
// FaqScreen, #contact on ContactSection — and scroll/sectionNav.js is what
// turns a click into the scroll, including from another page.
export const SECTION_WHY_YAAS = '#why-yaas';
export const SECTION_ABOUT = '#about';
export const SECTION_FAQ = '#faq';
export const SECTION_CONTACT = '#contact';

// The href to actually render for one of those. A bare '#faq' would be wrong
// anywhere but the homepage — on /flavors it means "this page, fragment faq" —
// and on the sub-path deploy a written-out '/#faq' walks off the deploy root
// entirely. sectionHref('#faq') is '/#faq' at the root and '/yaas/#faq' under
// GitHub Pages, so the link is correct as a plain URL: right in a new tab,
// right before JS runs, right if JS never runs. The click handler still takes
// over for the smooth in-app version.
export function sectionHref(hash) {
  return asset(`/${hash}`);
}

// The homepage's own flavor gallery — what both menus' "Flavors" points at,
// and where the hero's "See the Flavors" CTA goes.
export const SECTION_FLAVORS = '#flavors';
