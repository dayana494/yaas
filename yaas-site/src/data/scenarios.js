// Screen 2 copy — verbatim from yaas-homepage.md ("Screen 2 — About the
// Drink"). The doc gives the headline as 5 fragments revealed line by line;
// the build uses them as the two sentences Figma node 258:208 colours
// separately — GROUP_1 in ink, GROUP_2 in the brand pink, both wrapping
// naturally inside one centred measure (see ScenarioArcGallery.jsx).
import { asset } from './assetUrl';

// One string, not two. Figma node 258:208 colours the second sentence in the
// brand pink, and that is done inside the single reveal now (accentFrom, see
// DropText) rather than by rendering two headings side by side — two boxes
// wrap where the boxes end, not where the sentence does.
export const SCREEN2_HEADLINE =
  "This isn't about hyping you up. It's about staying locked in to your own thing.";

// Where the pink half begins. Derived rather than written as a number so it
// cannot drift out of step if the copy is ever edited.
export const SCREEN2_HEADLINE_ACCENT_AT = SCREEN2_HEADLINE.indexOf("It's about");

// Screen 2's arc gallery (Figma node 258:208) — left-to-right order of the
// looping strip, with the party shot dead centre: that's the photo the
// scroll-driven travel stops on before it expands (see
// ScenarioArcGallery.jsx). Photos themselves all come from
// /public/photos/scenarios — the Figma mockup's own images are placement
// stand-ins only, never assets.
export const SCREEN2_ARC_ORDER = ['gaming', 'roadtrip', 'squad', 'workout', 'lecture'];
export const SCREEN2_ARC_STOP_ID = 'squad';

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
    href: '/flavors/strawberry',
    photo: asset('/photos/scenarios/party.webp'),
  },
  {
    id: 'roadtrip',
    title: 'Road trip / festival run',
    caption: "When the drive's long and the vibe's gotta stay maxed",
    flavor: 'lemon',
    href: '/flavors/lemon',
    photo: asset('/photos/scenarios/road.webp'),
  },
  {
    id: 'lecture',
    title: "Lecture/class that won't end",
    caption: "When the professor's on hour three and you're somehow still with it",
    flavor: 'apple',
    href: '/flavors/apple',
    photo: asset('/photos/scenarios/univer.webp'),
  },
  {
    id: 'workout',
    title: 'Workout, gym session',
    caption: "When it's not your last set and you already thought you were done",
    flavor: 'orange',
    href: '/flavors/orange',
    photo: asset('/photos/scenarios/sport.webp'),
  },
  {
    id: 'gaming',
    title: 'Late-night gaming session',
    caption: 'When one more round decides everything',
    flavor: 'blueberry',
    href: '/flavors/blueberry',
    photo: asset('/photos/scenarios/game.webp'),
  },
];
