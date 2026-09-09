// Screen 2 copy — verbatim from yaas-homepage.md ("Screen 2 — About the Drink").
// The original doc gives 5 fragments revealed line by line; the live build
// groups them into two phrases that swap in place on scroll (see
// ScenarioHeadline.jsx) instead of stacking as 5 separate lines.
export const SCREEN2_HEADLINE_LINES = [
  "This isn't about",
  'hyping you up.',
  "It's about",
  'staying locked in',
  'to your own thing.',
];

export const SCREEN2_HEADLINE_GROUP_1 = "This isn't about hyping you up.";
export const SCREEN2_HEADLINE_GROUP_2 = "It's about staying locked in to your own thing.";

// Figma node 196:17 breaks GROUP_2 across two lines instead of one — same
// verbatim text as SCREEN2_HEADLINE_GROUP_2 above, just split where that
// frame splits it. ScenarioHeadline.jsx renders these two plus GROUP_1 as
// three lines at both breakpoints — absolutely positioned per the Figma
// grid on desktop, simply stacked and centered on mobile.
export const SCREEN2_HEADLINE_LINE_2 = "It's about staying";
export const SCREEN2_HEADLINE_LINE_3 = 'locked in to your own thing.';

export const SCREEN2_SUBLINE =
  "You don't drink YAAS on a schedule — you drink it when you need to show up 100%.";

// Each scenario ties to a flavor (matches src/data/flavors.js ids). Order
// here is the on-screen card order. `photo` is omitted for scenarios
// without a real photo yet (ScenarioCards falls back to a flavor-color
// gradient placeholder).
export const SCENARIOS = [
  {
    id: 'squad',
    title: 'Hanging with the squad till sunrise',
    caption: "When the night's just getting started and your battery isn't",
    flavor: 'strawberry',
    href: '/catalog/strawberry',
    photo: '/photos/scenarios/party.jpg',
  },
  {
    id: 'roadtrip',
    title: 'Road trip / festival run',
    caption: "When the drive's long and the vibe's gotta stay maxed",
    flavor: 'lemon',
    href: '/catalog/lemon',
    photo: '/photos/scenarios/road.jpg',
  },
  {
    id: 'lecture',
    title: "Lecture/class that won't end",
    caption: "When the professor's on hour three and you're somehow still with it",
    flavor: 'apple',
    href: '/catalog/apple',
    photo: '/photos/scenarios/univer.jpg',
  },
  {
    id: 'workout',
    title: 'Workout, gym session',
    caption: "When it's not your last set and you already thought you were done",
    flavor: 'orange',
    href: '/catalog/orange',
    photo: '/photos/scenarios/sport.png',
  },
  {
    id: 'gaming',
    title: 'Late-night gaming session',
    caption: 'When one more round decides everything',
    flavor: 'blueberry',
    href: '/catalog/blueberry',
    photo: '/photos/scenarios/game.png',
  },
];
