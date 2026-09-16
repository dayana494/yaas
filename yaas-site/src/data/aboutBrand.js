// Screen 5 — "About the Brand". Two Figma frames are the source of truth:
//   302:2   — the opening state: the heading alone, centred in the viewport.
//   302:146 — the assembled state: a stack of four photos in the middle, body
//             copy on the left, body copy + CTA on the right.
// The motion between them is ported from the reference site's own "The Cliff
// Villa" section (artkdesigner.github.io/state-of-space): the heading lifts to
// the top of the screen and shrinks, four photos fly in from off-screen and
// converge into one overlapping stack, and the side copy slides in from the
// two edges just as the stack lands.

// Four cards, from the two photos that exist today. The list is what the
// component iterates — it is not written around "two images used twice", so
// dropping the real third and fourth photos in is a matter of replacing the
// last two paths here (and their alt text) and nothing else.
import { asset } from './assetUrl';

export const ABOUT_PHOTOS = [
  { src: asset('/images/about-brand-1.jpg'), alt: 'Two hands holding out YAAS Blueberry and Orange cans' },
  { src: asset('/images/about-brand-2.jpg'), alt: 'Two hands holding out YAAS Blueberry and Orange cans' },
  { src: asset('/images/about-brand-1.jpg'), alt: '' },
  { src: asset('/images/about-brand-2.jpg'), alt: '' },
];

// Where each card rests once the stack has assembled, back-most first — read
// straight off Figma 302:146 (nodes 302:159 / :160 / :161 / :162).
//
// In the mock all four cards are the same 560x707 box on the same centre; the
// fan is made out of rotation alone, with the front card nudged 8px down and
// skewed the other way. So these are rotations, not positions — which is also
// what makes the cycle in phase 4 work: moving a card between slots is just
// re-tweening these three numbers.
export const STACK_SLOTS = [
  { rotate: 6.58, skewX: -2.37, y: 0 },
  { rotate: 2.5, skewX: -2.37, y: 0 },
  { rotate: -1.08, skewX: -2.37, y: 0 },
  { rotate: -3, skewX: 2.37, y: 8 },
];

// Card aspect ratio, 560 / 706.796 in the mock. The card's own width is derived
// from this in CSS, so the two can never drift apart.
export const CARD_ASPECT = 0.7923;

// Where each card flies in from, as a fraction of the viewport measured from
// its resting place — scattered around the four corners, each with a different
// amount of extra spin so they don't read as one rigid object coming apart.
// Multiplied by window.innerWidth/innerHeight at tween time rather than
// declared in vw/vh, so a card that starts 80% of a screen away really is
// off-screen at every size.
export const SCATTER = [
  { x: -0.82, y: -0.42, rotate: -26 },
  { x: 0.86, y: -0.3, rotate: 22 },
  { x: -0.72, y: 0.5, rotate: 18 },
  { x: 0.78, y: 0.46, rotate: -20 },
];

// Phase 4. Every two seconds the front card drops to the back of the stack: the
// active index steps, each card's offset from it changes, and the offset alone
// decides which slot (and which z-index) that card tweens to. 0.8s / power3.out
// is the reference's own feel for that transition.
export const CYCLE_INTERVAL_MS = 2000;
export const CYCLE_DURATION = 0.8;
export const CYCLE_EASE = 'power3.out';
