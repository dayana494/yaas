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

// Gap between the end of the scenario-card stack and the start of
// AdvantagesScreen — must match .screen2's own padding-bottom in
// screen2.css exactly (AdvantagesScreen's own scroll-trigger start adds
// this on top of a live DOM measurement — see its own comment for why it
// can't just measure the gap directly).
export const SCREEN2_BOTTOM_GAP = 150;

// Scroll-trigger IDs shared between the section that owns each pin and
// whatever comes after it — see ScenarioCardsIsometric.jsx's and
// AdvantagesScreen.jsx's own comments for why chaining off the *previous*
// trigger's resolved `.end` (a real GSAP-tracked number) instead of a plain
// 'top top' string is necessary here.
export const INTRO_TRIGGER_ID = 'introPin';
export const SCENARIO_CARDS_TRIGGER_ID = 'scenarioCardsIso';
export const ADVANTAGES_TRIGGER_ID = 'advantagesPin';
