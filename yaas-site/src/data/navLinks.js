// One source of truth for where the header menu and the footer nav point.
//
// They used to carry their own copies, which is how they drifted apart: the
// footer's Flavors went to the /flavors page while the header's went to the
// homepage gallery anchor, and the footer's hash links were written as '/#faq'
// (an absolute path off the deploy root) while the header's were plain '#faq'.
// Same labels, four different behaviours. Both surfaces now read these.
//
// Flavors is the one entry that is a route rather than a section: the gallery
// has its own page, and both surfaces link to it.
export const FLAVORS_ROUTE = '/flavors';

// Section anchors on the homepage. The ids live on the sections themselves —
// #why-yaas on AdvantagesScreen, #about on BrandTeaserScreen, #faq on
// FaqScreen, #contact on ContactSection — and scroll/sectionNav.js is what
// turns a click into the scroll, including from another page.
export const SECTION_WHY_YAAS = '#why-yaas';
export const SECTION_ABOUT = '#about';
export const SECTION_FAQ = '#faq';
export const SECTION_CONTACT = '#contact';

// The homepage's own flavor gallery. Not in either menu any more (Flavors goes
// to the page instead) — the hero's "See the Flavors" CTA still scrolls to it.
export const SECTION_FLAVORS = '#flavors';
