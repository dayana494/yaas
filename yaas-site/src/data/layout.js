// Shared scroll-layout constants for the merged hero+gallery intro section
// (see App.jsx and index.css's .intro-wrap/.intro-pin) — kept here so
// anything below it on the page that needs to know exactly how tall that
// section's own reserved scroll room is (in viewport-height units) doesn't
// have to duplicate the numbers or read them off App.jsx directly.
//
// 1 (the pinned box's own visible height) + ENTRANCE_UNITS (the
// hero->gallery flip) + INTERACTIVE_UNITS (the slider<->detail
// sub-navigation) — see ScenarioCardsIsometric.jsx for why this matters:
// its own scroll-trigger start needs this exact total to compute a reliable
// absolute scroll position, since GSAP's own 'top top' string parsing for a
// trigger positioned after an earlier *pinned* section doesn't reconcile
// correctly here even after an explicit ScrollTrigger.refresh().
export const ENTRANCE_UNITS = 1;
export const INTERACTIVE_UNITS = 1;
export const INTRO_TOTAL_VH_UNITS = 1 + ENTRANCE_UNITS + INTERACTIVE_UNITS;

// The gallery -> detail card flight is scrubbed across INTERACTIVE_UNITS of
// scroll, but it still plays out in real time whenever the page scrolls itself
// through that window (the snap after a partial scroll, a tap on the centre
// can): this is how long the whole window takes then. Kept from the timed
// GSAP transition it replaced, so those cases move exactly as that one did.
export const DETAIL_TRANSITION_DURATION = 1.1;

// Dead scroll between the hero -> gallery entrance and the gallery -> card
// flight, in the same scaled units: nothing on the intro reacts to it, the page
// just scrolls. It is what lets one scroll gesture finish the entrance and stop
// on a usable gallery, instead of carrying straight on into the card.
export const GALLERY_SETTLE_GAP_UNITS = 0.5;

// The shortest time the hero -> gallery entrance can play out in, however fast
// the scroll. Its visible progress follows the scroll 1:1 up to that speed and
// is rate-limited beyond it. Unlimited, a fast flick crossed the whole entrance
// in a frame or two and the cans that travel furthest (lemon and apple, which
// slide in from off the arc) jumped to their slots instead of flying there.
export const ENTRANCE_MIN_SECONDS = 1;

// Screen 2 rises up over the still-pinned intro to cover it (the
// state-of-space transition), rather than the intro scrolling away to reveal
// it. Both numbers extend .intro-wrap's own pin, so the intro is held still
// for the whole handover:
//   ...gallery finishes... | SCREEN2_GAP_PX held | SCREEN2_RISE_UNITS rise |
// and Screen 2's own pin picks up exactly where the rise lands. The gap is
// the breathing room asked for between the two blocks — deliberately scroll
// distance *before* the rise rather than padding inside Screen 2, which
// would have pushed its pinned contents down out of position.
// Desktop only: below 1024 there is no rise and HomePage holds for neither.
export const SCREEN2_GAP_PX = 120; // 120px, matching .screen2's own padding (was 150)
export const SCREEN2_RISE_UNITS = 1;

// Gap between the end of the scenario-card stack and the start of
// AdvantagesScreen — must match .screen2's own padding-bottom in
// screen2.css exactly (AdvantagesScreen's own scroll-trigger start adds
// this on top of a live DOM measurement — see its own comment for why it
// can't just measure the gap directly).
export const SCREEN2_BOTTOM_GAP = 120;

// Scroll-trigger IDs shared between the section that owns each pin and
// whatever comes after it — see ScenarioCardsIsometric.jsx's and
// AdvantagesScreen.jsx's own comments for why chaining off the *previous*
// trigger's resolved `.end` (a real GSAP-tracked number) instead of a plain
// 'top top' string is necessary here.
export const INTRO_TRIGGER_ID = 'introPin';
export const SCREEN2_ARC_TRIGGER_ID = 'screen2ArcGallery';
export const SCENARIO_CARDS_TRIGGER_ID = 'scenarioCardsIso';
export const ADVANTAGES_TRIGGER_ID = 'advantagesPin';

// Screen 5 — About the Brand. Like Screen 2 and Screen 3 it is chained after a
// pinned section, so its own pin start needs the same one-off correction from
// HomePage.jsx (see the comment there).
export const ABOUT_TRIGGER_ID = 'aboutBrandPin';

// The pin's scroll budget, in viewport heights, split into the phases the spec
// names. The first unit is spent entirely on the handover: Advantages/FAQ is
// still on screen above, sliding off with its bottom corners rounding away
// (see createFallDriver in scroll/riseTransition.js), and this section is held
// still underneath it with the heading already centred and at full size. Only
// once that unit is behind us does anything here start moving.
// Desktop only — below 1024 nothing slides off over this section, so the phase
// and its scroll are dropped (BrandTeaserScreen.jsx).
export const ABOUT_EXIT_UNITS = 1;
// The last stretch is a deliberate hold: once the stack has assembled and the
// side copy has landed, the pin keeps the finished layout on screen for roughly
// another viewport of scrolling. That is the window the card cycle plays in — a
// budget that ended the moment the stack landed would release the pin on the
// same frame and scroll the whole thing away before a single card had turned.
export const ABOUT_SCROLL_UNITS = 4;

// The footer, on the homepage only, where it is uncovered by the About the
// Brand + Contacts section sliding up off it — so it too is chained after a pin
// and needs the same corrected start.
export const FOOTER_TRIGGER_ID = 'footerPin';

// How much scrolling the intro pin costs, as a multiplier on the unit counts
// above.
//
// The units are viewport heights, so the pin holds the first screen in place
// for ENTRANCE + INTERACTIVE + RISE of them — on a phone that is several
// swipes of scrolling in which nothing leaves the screen, which is what made
// the handover to Screen 2 feel like it had to be dragged through. Below 1024
// the same choreography plays out over a shorter scroll instead: every stage
// still happens, in the same order, just at less cost per stage.
//
// A multiplier rather than separate mobile unit counts, so the ratios between
// the entrance, the interactive window and the rise stay exactly as they are
// and only the total shortens.
export const MOBILE_INTRO_SCALE = 0.6;

// Viewport heights -> pixels, with that scale applied. Read live rather than
// captured, so rotating a phone or crossing the breakpoint re-resolves it on
// the next ScrollTrigger refresh.
export function introUnitsPx(units) {
  const narrow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  return units * window.innerHeight * (narrow ? MOBILE_INTRO_SCALE : 1);
}
