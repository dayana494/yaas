# YAAS — round 7: detail-card nav, contacts, logo links, tablet composition

Grounded against the repo as of commit `b1688a6`. Before starting, note what
was **already fixed in earlier rounds and needs no further work**, so it
isn't redone or second-guessed:

- Block headings wrapping one-word-per-line on iPhone — fixed in `178119d`
  (`DropText.jsx`: pieces render as inline, not inline-block, when there's
  no reveal).
- About-Brand bottom text cut off / uneven gaps — fixed in `178119d`
  (`brand-teaser.css`: svh-based pin, 50px top/bottom, equal gaps).
- Flavor detail card (home, `DetailScreen.jsx`) heading position, and
  heading→can / can→description gap parity for the *default* flavor shown on
  first entry — fixed in `178119d` (`--detail-bottom`, measured live in
  `useCentredBottom`). This does **not** cover every flavor — see the open
  item below (§1b) for the still-broken case where switching flavors breaks
  the fit.
- Hero cans raised — fixed in `178119d` (`heroLayout.js`).
- "Try the Other Flavors" prev arrow buried behind the cards — fixed in
  `b1688a6`.

Everything below is still open, checked directly against the current code.

---

## 1. Add prev/next arrows to the home page's flavor detail card — mobile and tablet-portrait only

`DetailScreen.jsx` (the card you land on after tapping/scrolling into a
flavor from the "5 Flavors. One Energy." gallery) has no way to switch
flavor except the small thumbnail row (`FlavorSwitcher`, "Choose the
flavor") — and that row is desktop-only today (`.detail-switcher-wrap` is
hidden by the existing `max-width: 1023px` rule in `layout.css`, "Desktop-only
control"). The gallery screen right before it (`SliderScreen.jsx`) already
has this exact control:

```jsx
<button type="button" className="arrow arrow-left" data-interactive aria-label="Previous flavor" onClick={goPrev}>
  <img src={asset('/icons/arrow-left.svg')} alt="" />
</button>
<button type="button" className="arrow arrow-right" data-interactive aria-label="Next flavor" onClick={goNext}>
  <img src={asset('/icons/arrow-right.svg')} alt="" />
</button>
```
with `goPrev`/`goNext` wrapping through `FLAVOR_COUNT` via `onPickFlavor`.

Add the same pair to `DetailScreen.jsx`, wired to the `onPickFlavor` prop it
already receives (same wraparound math as `SliderScreen`'s `goPrev`/`goNext`).
Reuse the `.arrow`/`.arrow-left`/`.arrow-right` classes so they inherit the
same look. Center them on `.detail-can-space`, the same way the gallery's
arrows are centered on its can.

**Scope: mobile and tablet-portrait only.** Desktop keeps today's thumbnail
switcher and gets no arrows — it never had them and nothing here asks for
them there. Tablet-landscape should also keep the thumbnail switcher rather
than getting arrows: per §6 below, tablet-landscape is being brought in line
with desktop's composition generally, so un-hide `.detail-switcher-wrap`
there (instead of just leaving it hidden under the old `max-width: 1023px`
rule) and give the new arrows their own media query scoped to "mobile and
tablet-portrait" (i.e. everywhere below 1024px *except* the new
`orientation: landscape` tablet range from §6/§7) rather than a blanket
`max-width: 1023px`.

## 1b. Flavor detail card — content only fits for the default flavor (Strawberry); other flavors overflow

Confirmed still open — not fixed by `178119d`. Repro: enter the detail card
on mobile/tablet with Strawberry (the default/center flavor) showing —
title, can, description and CTA all fit and are centered correctly. Switch
to any other flavor via the switcher/arrows — its content no longer fits
(per the user's screenshots: same card, same viewport, only the active
flavor changed).

`useCentredBottom` (`DetailScreen.jsx`) measures the four children's summed
height on every mount/resize and centers the group by writing
`--detail-bottom`, but it only *centers* — it never shrinks anything, so if
`groupH` (title + can-space + description + CTA + 3×30px gaps) exceeds
`copy.clientHeight` for a given flavor's title/description, `bottom` clamps
to `0` and the excess simply runs off the bottom of the screen uncorrected.
`.detail-can-space`'s height is also a fixed proportion of the column
(`(100% + pad + bottom) * 0.2835`, `layout.css`), not content-aware.

Titles are similar lengths across flavors (`CITRUS LEMON`, `BLUEBERRY RUSH`,
`WILD STRAWBERRY`, `SOLAR ORANGE`, `GREEN APPLE` — `data/flavors.js`), so a
raw character-count difference is an unlikely sole cause; more likely
candidates, in rough order of likelihood, worth checking directly rather
than guessing:

- **Title line-wrap differs per flavor.** At `var(--block-heading)` size on a
  narrow phone, a longer/differently-shaped title (e.g. `BLUEBERRY RUSH` or
  `WILD STRAWBERRY`) may wrap to 2 lines while a shorter one (`GREEN APPLE`)
  stays on 1 — one extra title line is enough height to push `groupH` past
  `copy.clientHeight`. Check actual rendered line count per title at common
  phone widths.
- **Measurement timing on flavor switch.** `useCentredBottom`'s
  `ResizeObserver` re-measures on every mount (the `key={flavor.id}` on
  `.detail-copy` remounts the whole block per flavor) — but the *first*
  render into this card (Strawberry, before `textVisible` flips true) happens
  while the block is still `opacity: 0` and the layout has settled; a
  flavor picked via the switcher/arrows afterward remounts while the card is
  already visible and mid-interaction. If the `ResizeObserver`'s first
  callback fires before webfont metrics or the new (possibly wrapped) title
  have settled, `--detail-bottom` could be computed from a stale/incomplete
  height and never re-corrected.

Fix so every flavor's card fits and centers the same way Strawberry's does
— whether that means capping the description to a fixed number of lines,
scaling the can/gaps down slightly when `groupH` would overflow, or fixing
a measurement-timing bug, should be decided after confirming which of the
above (or something else) is actually happening on a real device, the same
way past ambiguous layout bugs in this project were run down rather than
guessed at.

## 2. Flavor-name label under the can (gallery) — not visible on mobile

`SliderScreen.jsx` renders `.flavor-name` (the flavor's title, under the
can). On mobile it's positioned by `layout.css`:

```css
.flavor-name {
  bottom: 13svh;
  font-size: clamp(24px, 8.2vw, 38px);
}
```

Check it live on a real phone at the current can position (the can was
raised in `178119d`, which may have thrown off the "space under the name
should match the space between heading and can" balance this rule's comment
describes). The ask: the label should read with roughly a 30px gap to the
bottom of the visible (`svh`) viewport, fully on-screen — adjust the `bottom`
value so it lands there rather than reasoning about it purely from the old
comment's math, since the can's own position moved since that comment was
written.

## 3. Contacts — one button instead of two

`data/homepageCopy.js`:

```js
export const CONTACT = {
  ...
  actions: [
    { label: 'Email', href: null },
    { label: 'Telegram', href: null },
  ],
};
```

`ContactSection.jsx` maps `CONTACT.actions` into pills (`<button>` when
`href` is `null`, `<a>` when it's set) — this is the single place both the
homepage contact block and `/contacts` (`ContactsPage.jsx`, if it renders
the same section) pick it up from.

Replace the two actions with one:

```js
actions: [
  { label: 'yaas-energy@gmail.com', href: 'mailto:yaas-energy@gmail.com' },
],
```

That alone makes `ContactSection.jsx` render it as a real `<a>` pill with
the same arrow it already draws — no JSX changes needed there. Just confirm
the single-pill layout (`.contact-actions`'s `gap`/stacking rules, sized for
two pills) still looks right at every width with only one child; adjust
`.contact-actions`/`.contact-pill` width rules in `contact.css` if a single
centered pill needs a different width than two stacked ones did.

## 4. Every YAAS logo should link to the homepage

Three places render the wordmark, none of them a link:

- `HeroWordmark.jsx` — mobile (`YaasWordmarkSvg` inside
  `.hero-mobile-banner-logo-row`) and desktop (`Logo` inside
  `.hero-logo-giant`), both wrapped in `aria-hidden="true"` divs.
- `Footer.jsx` — `<Logo ref={logoRef} className="site-footer-logo-giant" />`.
- `FlavorStorySection.jsx` — `<HeroWordmark fitToContainer />` (the
  `/flavors/:slug` masthead).

Wrap each rendered logo element in a `react-router-dom` `<Link to="/">`
(the homepage is already `/`, and `App.jsx`'s `basename` handles the
`/yaas/` deploy prefix, so a plain `to="/"` is correct everywhere including
from `/flavors/:slug`). Where the wrapper currently carries
`aria-hidden="true"` (decorative), drop that in favor of a real
`aria-label="YAAS home"` on the link, since it's now an interactive,
meaningful control. Keep every existing visual/animation/sizing behavior —
`useInkFitWidth`'s ref, the SVG's className, the footer's `logoRef` — intact
by putting the `<Link>` around the existing markup rather than restructuring
it.

## 5. Flavor detail pages (`/flavors/:slug`) — "Try the Other Flavors" as a vertical stack on mobile

`FlavorGallery.jsx` (the "Try the Other Flavors" strip, not the homepage's
3D gallery) is still a horizontal swipeable row below 768px:

```css
/* flavor-detail.css */
@media (max-width: 767px) {
  .flavor-gallery-track {
    --gallery-visible: 1;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    ...
  }
  .arrow-gallery { display: none; }
}
```

Change this breakpoint's block so the track stacks the `FlavorStripCard`s
vertically instead — one under another, `15px` gap, full container width
each, no horizontal scroll/scroll-snap. `FlavorGallery.jsx`'s JSX doesn't
need to change (`.flavor-gallery-track` already just wraps whatever cards
are in `otherFlavors`); this is a CSS-only change (`flex-direction: column`
or `display: grid` with a `15px` row-gap, dropping the `overflow-x`/
`scroll-snap`/`--gallery-visible` machinery for this width). Leave the ≥768px
behavior (horizontal row with the prev/next arrows) as-is.

## 6/7. Tablet — there is currently no portrait/landscape split at all

This is the biggest item. Check the codebase: every "tablet" rule in
`hero.css`, `layout.css`, `contact.css`, `brand-teaser.css` lives inside
`@media (max-width: 1023px)` or `@media (max-width: 768px)` — i.e. **tablet
today is styled identically to phones**, full stop. There is exactly one
`@media (min-width: 769px) and (max-width: 1023px)` rule anywhere in the
codebase (`advantages.css:494`), and zero `orientation:` queries. That's the
actual root cause of every "tablet looks wrong" complaint below — none of
it has ever been styled on purpose.

Introduce a real split. Use the range the codebase already treats as
"tablet" elsewhere (`769px`–`1023px`) crossed with `orientation`:

```css
/* tablet landscape — matches desktop's hero/nav/logo composition */
@media (min-width: 769px) and (max-width: 1023px) and (orientation: landscape) { ... }

/* tablet portrait — matches mobile's hero composition */
@media (min-width: 769px) and (max-width: 1023px) and (orientation: portrait) { ... }
```

placed after the existing `max-width: 1023px` mobile rules so they can
override what's needed without duplicating everything (portrait tablet
should mostly just inherit the mobile rules — only the specific overrides
below are new).

### 6. Tablet landscape hero (and the same treatment on `/flavors/:slug`)

Against desktop's current values (`hero.css`, inside `min-width: 1024px`):
`.hero-nav { top: 20px; }`. Give tablet-landscape the same `top: 20px` (it's
currently inheriting the mobile bucket's `top: 16px`, i.e. "too low" is a
real, if small, discrepancy — confirm on an actual tablet whether 4px is
really what's being seen, or whether the nav's *vertical centering relative
to the pills' own height* is the actual mismatch, since the mobile and
desktop pill rules also differ in padding/min-height).

- Subhead-to-bottom-of-screen gap: match whatever desktop's `.hero-copy`/
  `.hero-subhead` rule currently produces (read the `min-width: 1024px`
  block in `hero.css` for its exact spacing rule) rather than the mobile
  bucket's.
- Logo: desktop's `.hero-logo-giant`/`Logo` (`HeroWordmark.jsx`'s non-mobile
  branch) is already centered by construction — `useMediaQuery('(max-width:
  768px)')` in `HeroWordmark.jsx` currently treats *everything* above 768px
  as desktop, so tablet landscape is likely already getting the desktop
  branch (worth confirming with a quick log/breakpoint check) rather than
  the mobile SVG branch. If it is, "center it" may just mean fixing
  `.hero-logo-giant`'s `top`/`width` for this range specifically rather than
  building anything new — check before assuming it needs new markup.
- Cans: explicitly unchanged — don't touch `heroLayout.js`'s tablet-range
  values.
- `--block-heading`: do **not** let tablet-landscape pick up desktop's
  `--block-heading: clamp(30px, 4.17vw, 80px)` (`index.css:47`) while doing
  this — keep it at the same `clamp(30px, 10.26vw, 40px)` tablet/mobile
  value (`index.css:82`) it already has. This matters for §8's "tablet
  portrait heading should match tablet landscape" ask below: they should
  both stay on the existing mobile/tablet `--block-heading`, only the
  nav/logo/subhead positioning changes for landscape.

Apply the same nav-top/logo-centering/subhead-gap treatment to the
`/flavors/:slug` masthead (`FlavorStorySection.jsx`'s `<HeroWordmark
fitToContainer />` + its own nav, if it renders one) at the same
tablet-landscape breakpoint.

### 7. Tablet portrait hero — rebuild as mobile's composition

Tablet portrait should read as mobile's hero (nav → logo → subhead → CTA →
three cans, same tilt/arrangement), not desktop's. Since tablet currently
already inherits the `max-width: 1023px` mobile rules by default, this is
largely "no-op below 768px, and for 769–1023px-portrait specifically, pull
in the same proportional values mobile uses rather than anything new" — the
work here is mostly making sure the portrait branch of the split in §6/7
*doesn't* accidentally pick up any of the landscape overrides above, and
that `heroLayout.js`'s can-cluster math (which is presumably keyed on a
`max-width: 1024` check today — check `three/heroLayout.js` for exactly how
`isMobile`/tablet is detected there and whether it needs the same
orientation split) still resolves to the mobile cluster in portrait at this
width.

## 8. Tablet-portrait-specific sizing (flavor card can, Contacts panel, About-Brand stack, heading size)

All under the new `(min-width: 769px) and (max-width: 1023px) and
(orientation: portrait)` query:

- **Flavor detail card can too large** — `three/CanRig.jsx`'s
  `DETAIL_SCALE = { desktop: 1.55, mobile: 0.547 }` is keyed only on
  `isMobile` (check how that flag is computed there — likely the same
  `max-width: 1023` bucket as everything else). Give tablet-portrait a can
  scale close to mobile's `0.547` (not desktop's `1.55`) so it sits between
  the heading and description with visible gaps to both, the same way it
  now does on phones per `178119d`'s `--detail-bottom` measurement (which
  should already handle the vertical centering correctly once the scale is
  right — this is a scale-constant change, not a new layout mechanism).
- **Block heading size** — already covered by §6: portrait should already be
  on the same `clamp(30px, 10.26vw, 40px)` value as landscape; just confirm
  nothing in this pass accidentally overrides it for portrait specifically.
- **Contacts panel** — currently `max-width: 1023px` gives `.contact-panel`
  `height: calc(100svh - 40px)` (full screen height less 20px top/bottom;
  `contact.css` around line 160). Add a portrait-tablet override so the
  panel is **not** full-height: size it so there's a `50px` gap from the
  bottom of `.contact-actions` (the button — now a single button, per §3) to
  the top of the cans, and the gap from the bottom of the cans to the
  panel's bottom edge equals the gap from the panel's top edge to
  `.contact-heading` (the existing `padding-top: calc(var(--contact-panel-h)
  * 80 / 760)` rule, or its portrait-tablet equivalent). This likely means
  computing `--contact-panel-h` from content height instead of `100svh` for
  this range — check `ContactCans.jsx` for how the cans are positioned
  relative to the panel to get the "gap to cans" measurement right.
- **About-Brand stack 1.2x smaller** — `brand-teaser.css`'s `.about-brand-
  deck` width formula (`min(82%, calc((100svh - 446px) * 0.7923))` per the
  `178119d`/`97a7ee2` history — read the current exact rule, it may have
  changed again in `178119d`'s svh retune) should get a portrait-tablet
  override at `/1.2` of whatever the current mobile/default value resolves
  to, while keeping the "equidistant from the text above and below" behavior
  the existing `.about-brand-stage`'s `justify-content: space-between` /
  gap rule already provides — don't hardcode a gap, just shrink the deck and
  let the existing space-between logic keep it centered.

---

## 9. Global — restore a smooth single-scroll gallery→flavor-card transition

This is the one item to **investigate rather than blind-fix** — it's
behavioral/feel, not a clear CSS bug, and past attempts to guess at this
kind of thing (the DropText flicker) went through two iterations before
landing right.

Current state, `HomePage.jsx`:

```js
const DETAIL_TEXT_AT = { desktop: 1, narrow: 0.85 };
...
const done = t >= (overlapEnabled() ? DETAIL_TEXT_AT.desktop : DETAIL_TEXT_AT.narrow);
...
applyDetailRef.current?.(done ? detailScrollProgressRef.current : 0);
```
driven by `createRateLimitedProgress(DETAIL_TRANSITION_DURATION, applyDetail)`
(`DETAIL_TRANSITION_DURATION` in `data/layout.js`).

The complaint is: the can doesn't move smoothly into the card, and the
text/button appear with a delay — on mobile specifically ("narrow"), which
already shows its text *earlier* in the progress (`0.85`) than desktop
(`1`), so the lag isn't obviously explained by this threshold alone. Likely
candidates to check against a real device: (a) `createRateLimitedProgress`
itself rate-limiting the scrub below what feels smooth on mobile frame
rates, (b) the can's own scrub (wherever `CanRig`/`Scene` reads this same
progress) using a different easing/timing than the text, so they visibly
desync even if both eventually land correctly, or (c) `normalizeScroll`
(added for the mobile jitter fix) interacting with this specific scrubbed
transition's frame timing. Don't change `DETAIL_TEXT_AT` or
`DETAIL_TRANSITION_DURATION` speculatively — trace where the can's own
position is driven from this same `t`/progress value and compare its timing
against the text's, since a mismatch between those two is the most likely
source of "laggy" as described (not a single value being wrong).

**Keep exactly as-is**: the existing pause between hero→gallery and
gallery→card (don't touch `GALLERY_SETTLE_GAP_UNITS`, `ENTRANCE_UNITS`, or
`MOBILE_INTRO_SCALE` in `data/layout.js` — those were already tuned in
earlier rounds and are not what's being complained about here).

## 10. Homepage hero logo — one fitted wordmark everywhere (mobile, tablet-portrait, desktop)

Three different, inconsistent behaviors today, all traced to the same
cause. `HeroWordmark.jsx`:

- **Mobile** (`isMobile`, ≤768px): renders `YaasWordmarkSvg` inside
  `.hero-mobile-banner-logo-row` with no fitting step at all — just
  whatever intrinsic size the SVG/CSS gives it.
- **Tablet-portrait and desktop** (`!isMobile`): renders `Logo` inside
  `.hero-logo-giant`, wrapped with `useInkFitWidth(desktopLogoRef,
  fitToContainer && !isMobile)`. But the homepage's own call site
  (`HomePage.jsx:788`) is just `<HeroWordmark />` — `fitToContainer` is
  never passed, so it defaults to `false` and `useInkFitWidth` never runs.
  Without it, `Logo` renders at its deliberate full intrinsic size — per the
  component's own comment, "1742px of ink in a 1698px container" at
  1920×920 — wider than `.hero-logo-giant`, and clipped by that element's
  `overflow`. That's the desktop right-edge clipping *and* the tablet-portrait
  overflow (same unfitted code path, just a narrower container to overflow).

`FlavorStorySection.jsx` already calls it correctly — `<HeroWordmark
fitToContainer />` — which is why the flavor-page masthead fits edge-to-edge
with no clipping. `useInkFitWidth` scales the wordmark with a **uniform**
scale (its own comment is explicit about this being deliberate, to avoid
the non-uniform-`scaleX` blur bug an earlier version had), so reusing it on
mobile does not reintroduce that blur.

Fix:
- Change `HomePage.jsx:788` to `<HeroWordmark fitToContainer />`, matching
  the flavor page's call. This alone fixes desktop's clipped right edge —
  it'll ink-fit to `.hero-logo-giant`'s actual width instead of bleeding
  past it.
- Replace the `isMobile` branch's `YaasWordmarkSvg` with the same `Logo` +
  `useInkFitWidth` approach the non-mobile branch uses, sized to
  `.hero-mobile-banner-logo-row`'s width — i.e. the mobile hero should
  render the identical wordmark component as desktop (not a separate SVG
  file), just scaled down to fit. `YaasWordmarkSvg` can stay in the
  codebase if it's still referenced elsewhere; the homepage hero specifically
  should stop using it.
- With `fitToContainer` effectively always on, tablet-portrait — which was
  silently taking the same unfitted desktop code path — should automatically
  stop overflowing once this lands; confirm it on an actual tablet-portrait
  viewport rather than assuming.
- Keep `.hero-logo-giant` / `.hero-mobile-banner-logo-row`'s existing
  vertical position and box sizing as they are — only the fit mechanism and
  which component renders inside changes, not where the box itself sits.

---

## Verification

- All four gallery-style flavor cards (not just Strawberry) fit their
  content on a real phone.
- All four non-default flavors on the detail card fit their content the
  same way Strawberry does, on a real phone and on tablet-portrait — not
  just the one shown on first entry.
- Detail-card arrows appear on mobile and tablet-portrait only; tablet-
  landscape and desktop show the thumbnail switcher instead, not arrows.
- Homepage hero logo: identical wordmark (not a separate SVG) at every
  width, always fully on-screen with no clipping, sized to its container's
  width — mobile, tablet-portrait and desktop. Tablet-portrait specifically
  no longer overflows past the screen edge.
- Detail card has working prev/next arrows on mobile and tablet, wired the
  same way the gallery's are.
- Flavor name label fully visible above the bottom edge on a real phone.
- Contacts shows one button, `yaas-energy@gmail.com`, opens the mail app.
- Every YAAS logo (hero, footer, flavor-page masthead) navigates to `/`.
- `/flavors/:slug`'s "Try the Other Flavors" is a vertical list on phones,
  horizontal row with arrows on tablet/desktop.
- Tablet landscape hero/flavors masthead: nav top offset, subhead gap and
  logo centering visibly match desktop; cans unchanged.
- Tablet portrait hero: reads as mobile's composition, not desktop's.
- Tablet portrait: detail-card can sized like mobile's; Contacts panel is
  not full height and its two gaps match as specified; About-Brand stack is
  visibly smaller than mobile's but still centered between its two text
  blocks; block heading size matches tablet landscape's.
- Gallery→detail-card scroll on mobile: can and text/button move together,
  no perceptible desync or delay, and the existing hero→gallery /
  gallery→card pauses are unchanged.
- Full desktop regression pass — nothing in this round should move anything
  at ≥1024px except where explicitly noted (there is no desktop-facing
  change in this round; every section above is mobile/tablet-scoped).
