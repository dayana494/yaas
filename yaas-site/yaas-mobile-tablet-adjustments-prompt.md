# Mobile/tablet adjustments — match Figma, fix scroll feel, no visual break on desktop

Everything below is scoped to mobile and tablet unless a step says otherwise. Desktop is already correct — don't change desktop layout, sizing, or behavior while doing this work. The four Figma frames referenced throughout are in file `iBVnVoDHZhsZdJSjgX3IZX`:

- **344:237** — hero screen (nav, logo, cans, copy, CTA)
- **344:286** — gallery/slider screen (big heading, can, prev/next arrows, flavor name)
- **344:335** — single-flavor detail screen (flavor name, can, body copy, CTA)
- **344:359** — reference for block-heading type size across the site

If you have Figma MCP access, pull `get_design_context` on these four nodes yourself before starting — the notes below give you the proportions already extracted from them, but the live file is the source of truth if anything here reads ambiguous.

**Universal rule for every section below:** don't lift Figma's absolute pixel values (its frames are fixed at 390×800/850, a specific device). Convert every position/size to a proportion of that frame (`px / 390` for widths, `px / frame-height` for vertical position) and re-apply it against the *real* viewport (`vw`/`vh`/`dvh`/`clamp()`), the same way the codebase already does elsewhere (`.screen2-h2`'s `4.17vw` is lifted straight from `80/1920`, for exactly this reason — follow that pattern). A phone that's 844px tall and one that's 926px tall should both look like the mockup, not like the mockup stretched or cropped.

**Don't rewrite components.** Every screen below already exists and is already built from the site's shared pieces (`SectionHeading`, `Background`, the shared can rig hooks, the rise-transition driver, etc.). This is a sizing/positioning/spacing pass on those existing components and their CSS, not a rebuild.

---

## 1. Hero screen → match Figma 344:237

Files: `src/components/HeroScreen.jsx`, `src/styles/hero.css` (`.hero-nav`, `.hero-pill`, `.hero-mobile-banner-logo-row`, `.logo-text.hero-mobile-banner-logo`, `.hero-copy`, `.hero-subhead`, `.hero-cta`), `src/three/heroLayout.js` (can cluster position/scale for `isMobile`).

Current mobile hero is explicitly built off a *different* reference (see the comment above `.hero-mobile-banner-logo-row`: "Reference: kisadrink.ru's own mobile hero") rather than this Figma frame — that's the actual mismatch to fix, not a small tweak.

From the Figma frame (390×850 canvas):
- Nav: 4 pills in **one row** (`Flavors` 81px, `About us` 95px, `FAQ` 60px, `Contacts` 97px wide, ~21px gaps, all top:22px) — together they fit inside 390px with room to spare. The current CSS has a comment saying "Four pills at 14px don't fit one row at 375px" and wraps the 4th pill to its own line — that wrap needs to go; retune padding/font/gap so all four sit on one row, the way the mockup shows. Pill height in the mockup is 30px, well under the 44px touch-target minimum already established elsewhere in this file (`.hero-pill`'s own comment) — don't shrink below 44px min-height for the sake of matching 30px exactly; instead match the *visual* proportions (padding, font-size, gap, fully-rounded pill, thin white border, translucent fill) as closely as you can while keeping the tap target intact, and confirm the one-row layout still holds at 375px (the narrowest common phone width).
- Logo "YAAS" wordmark: ~95% of screen width (370/390), vertical position ~12% down (102/850). Compare against the current `.hero-mobile-banner-logo-row`'s `top: 132px` / `left/right: 24px` — adjust to match the Figma proportions using the existing `useFillWidth`-style scale-to-fit technique already in place (don't rebuild that mechanism, just retune its container's position/inset).
- Body copy: font-size 16px (already matches — `.hero-subhead` unmodified for mobile per the file, good), positioned around 30% down the screen, width ~83% of viewport.
- CTA pill: ~51% of screen width, positioned around 41% down.
- Cans: center can roughly 82% of viewport width, ~62% of viewport height, vertically centered around the screen's midpoint; two side cans peek in from the left/right edges, tilted ±15°, partially cropped by the frame edges. Retune `heroLayout.js`'s mobile cluster constants (scale/position) so the rendered cluster matches these proportions — check both against a short phone (iPhone SE-class, ~667px tall) and a tall one (~926px) so nothing overflows or shrinks awkwardly at either end.

## 2. Gallery/slider screen → match Figma 344:286

Files: `src/components/SliderScreen.jsx`, `src/styles/layout.css` (`.slider-heading`, `.slider-stage`, `.arrow`/`.arrow-left`/`.arrow-right`, `.flavor-name`). This is the same component mounted on both the homepage (`#flavors`, screen 1) and `/flavors` (`.flavors-gallery`) — fix it once, both places pick it up.

**Don't change the copy or the arrow icons** — the mockup's own text/arrows are placeholders, per the brief. Only sizes/positions:
- Big section heading ("5 flavors. one energy" — `.slider-heading`): mockup is 56px, top ~8.75% down. Current mobile override is `clamp(26px, 8vw, 44px)` — noticeably smaller than the mockup at every mobile width. Retune toward the mockup's scale (proportionally, via the `px/1920`-style vw formula this codebase already uses elsewhere, capped so it doesn't overshoot on wider tablets).
- Can: ~45% of viewport height, vertically centered around ~34% down.
- Flavor name (`.flavor-name`): mockup is 32px, sitting near the bottom (~91% down). Current mobile override is `clamp(20px, 6vw, 28px)` — a bit small; bring it up toward 32px.
- Left/right arrows: mockup places them vertically centered with the can (~54% down), which is already roughly what the current `.arrow` mobile override does (`top: 79vh` was tuned for where the can actually sits post-redesign — re-verify this number still lines the arrows up with the can vertically once the can's own size/position changes above are made, since moving the can will shift where its vertical center actually is).

## 3. Flavor detail screen → match Figma 344:335

This is `DetailScreen.jsx` (the homepage's own in-slider detail view, reached by tapping the center can — **not** the `/flavors/:slug` route, which is a different component/page). Files: `src/components/DetailScreen.jsx`, `src/styles/layout.css` (`.detail-title`, `.detail-description`, `.detail-cta`).

**Don't change the copy** (placeholder text in the mockup). Only sizes/positions:
- Flavor name heading (`.detail-title`): mockup is 48px, top ~9% down. Current mobile override is `clamp(36px, 12vw, 56px)` — close already; nudge toward 48px as the effective mobile size if it's currently landing noticeably above or below that.
- Can: ~45% of viewport height, rotated ~12°, positioned around 23% down.
- Body copy (`.detail-description`): 16px in the mockup (mockup uses `Bounded:Regular`; current site already uses 14px on mobile per this file's own comment about the site-wide body scale — leave that as-is, it's an intentional site-wide choice, not a per-screen mismatch).
- CTA (`.detail-cta`, "Learn more →" equivalent): mockup places it near the very bottom (~91% down). Confirm the current mobile position doesn't land noticeably higher or get crowded by the flavor-switcher thumbnails below it.

Note: the mockup frame doesn't show the flavor-switcher (`.detail-switcher-wrap`/`.flavor-switcher`) at all — it's likely just below this particular crop. Don't remove it; it's existing functionality the mockup simply doesn't depict. Only match sizing/position for the elements the mockup actually shows (heading, can, body copy, CTA).

## 4. All block headings → match the type scale in Figma 344:359

That frame's heading ("This isn't about hyping you up. It's about staying locked in to your own thing.") renders at **40px**, Soledago regular, line-height 1.1, tracking −0.8px, two-tone (first sentence ink, second in brand pink) — this is the shared "block heading" scale the codebase's own comments already say every section is *supposed* to match (see the "Matches `.screen2-h2`'s own mobile override" comments in `advantages.css`), but the actual mobile values currently disagree with each other and with this target:

| Selector | File | Current mobile size |
|---|---|---|
| `.screen2-h2` | `screen2.css` | `clamp(30px, 4.17vw, 80px)` → renders ~30px |
| `.advantages-heading` | `advantages.css` | `clamp(26px, 8vw, 44px)` → renders ~31-34px |
| `.advantages-title` | `advantages.css` | `clamp(26px, 8vw, 44px)` |
| `.advantages .faq-heading` | `advantages.css` | `clamp(26px, 8vw, 44px)` |

Bring all of these to a single shared mobile value that lands at 40px at common phone widths (they don't need identical clamp() formulas, just the same effective rendered size on mobile) — e.g. a `--block-heading-mobile-size` custom property, or just matching literal clamp() parameters across all four, whichever fits the existing pattern better. Then sweep the rest of the site's own section headings (About the Brand, Contacts, Footer, and `.flavor-gallery-heading` — "Try the Other Flavors" — on the `/flavors/:slug` page) and bring any that are block-level section intros (not product/flavor names) to the same mobile size. Leave flavor/product-name headings alone — `.flavor-name` (slider), `.detail-title`, `.flavor-story-flavorname` — those follow the sizes in sections 2 and 3 above, not this one; they're names, not section headers.

## 5. Remove unnecessary can interactions on mobile/tablet

Audit for interaction logic that only makes sense for a mouse and is still costing something on a touchscreen:

- `src/three/CanRig.jsx` (~line 546-568): the cursor-parallax `pointermove` listener already ignores non-mouse `pointerType` inside its handler, but the listener itself is still attached on every device, including touch-only ones. Add a `window.matchMedia('(pointer: fine)').matches` (or `(hover: hover) and (pointer: fine)`) check before even registering it, so touch/coarse-pointer devices never attach it at all instead of attaching-then-ignoring.
- Check `FlavorSwitcher.jsx`, `FlavorGallery.jsx`/`FlavorStripCard.jsx`, and `ScenarioArcGallery.jsx`/`ArcCards.jsx` for any *JavaScript* hover-driven logic (not plain CSS `:hover`, which already costs nothing on touch) — anything computing on `mouseenter`/`mouseover` for a scale/tilt effect should get the same fine-pointer guard.
- Confirm there's no React-Three-Fiber `onPointerOver`/`onPointerMove`/`onClick` handler on any `<mesh>` anywhere in `src/three/` (a quick grep turned up none right now, which is good — R3F's built-in raycasting on mesh pointer events is the expensive pattern to watch for; if any get added later they need the same guard).

The goal is fewer live listeners/computations on mobile, not a visual change — nothing here should alter how any can looks or moves.

## 6. Smoother scroll between screens

Two specific friction points to fix:

**Gallery → flavor cards** (scrolling past the `/flavors` page's top gallery section, `.flavors-gallery`, down into the plain card grid below it): `.slider-stage` (`layout.css`) is `touch-action: none`, which blocks the browser's native touch-scroll entirely while a finger is on that element — including a vertical swipe that was meant to scroll the page, not drag the carousel. Since the carousel drag (`useCarouselDrag.js`) only reacts to horizontal movement (`e.movementX` / `dx`), change it to `touch-action: pan-y` so vertical swipes pass through to the browser's native scroll while horizontal drags still reach the carousel's own pointer handlers. Test that flavor-swiping (left/right) still works after this change, and that a vertical swipe now scrolls the page normally instead of being swallowed.

**Slider/detail → Screen 2** (on the homepage, after tapping into a flavor's detail view and continuing to scroll down): walk through `src/pages/HomePage.jsx`'s wheel/touch handlers (~line 452-515) and the pin's `end` calculation. Right now `screen === 'detail'` has no explicit forward-scroll handling — scrolling down from the detail view falls through to whatever native scroll distance is left in the pin's reserved room before it releases into Screen 2. Confirm on a real phone/tablet whether that hand-off feels immediate or requires an unexpectedly long/dead scroll before Screen 2 appears; if it's the latter, either shorten the remaining reserved scroll room for that phase or add an explicit "scroll down from detail → ease straight to Screen 2" handler (mirroring the existing `exitToSlider()` pattern used for scrolling up out of detail). Whatever you land on, it needs to stay reversible (scrolling back up still works) same as every other transition on this page.

## 7. Scenario cards centered when pinned (mobile/tablet)

File: `src/styles/screen2.css`. `.scenario-cards-iso` sets `height: 100vh;` with no `100dvh` companion — every *other* full-viewport-height section in this codebase pairs the two (see this same class's own `margin-top: -100vh; margin-top: -100dvh;` two lines below it, and `.flavor-story-wrap` in `flavor-detail.css`), specifically because mobile browsers' collapsing address bar makes plain `100vh` taller than the actually-visible viewport — which is almost certainly why the pinned card reads as shifted toward the top instead of centered. Add the `height: 100dvh;` fallback line.

Then, for the card's own vertical inset: `.scenario-card-iso` uses `top/bottom: var(--iso-card-inset)` (50px, shared with the arc gallery's expand target). Add a mobile override (`@media (max-width: 768px)`, alongside the existing width/border-radius override just below it) setting `--iso-card-inset: 20px` so the card sits with exactly 20px clearance top and bottom, per the brief. Verify afterward that the arc gallery's own expand animation (which measures this same box via `.screen2-arc-target`) still lands the handoff correctly — the two are deliberately coupled through one custom property so they can't drift apart.

## 8. Advantages cards taller on mobile

File: `src/styles/advantages.css`, `.advantages-arc-cards.is-arc-active .advantage-card` (~line 190): `height: clamp(220px, 34vw, 420px)`. At common phone widths this clamps to the 220px floor, which reads squat compared to the desktop card's own aspect ratio (the base/fallback `.advantage-card` rule targets `aspect-ratio: 352 / 385` — roughly 0.91:1, taller than wide). Retune the mobile end of that clamp so the rendered height tracks closer to that same ~0.91:1 ratio against the card's actual on-screen width at mobile sizes (which `ArcCards.jsx` computes at runtime), instead of bottoming out at a fixed 220px — the goal is the same proportions as desktop, just scaled down, not a shorter/wider card shape.

## 9. All resolutions — swap two scenario photos

Two of the "фото сценариев" files have been updated since the last image pass: `party.jpg` is now `party.webp` and `road.jpg` has a newer version at the same filename. Both are already in `банки газировки -v2/фото сценариев/` next to the site project.

- `party.webp` → replace `public/photos/scenarios/party.jpg`. **Extension changes .jpg → .webp** — add it as `party.webp`, delete the old `party.jpg`, and update `src/data/scenarios.js`'s `squad` entry: `photo: '/photos/scenarios/party.jpg'` → `'/photos/scenarios/party.webp'`.
- `road.jpg` → straight overwrite of `public/photos/scenarios/road.jpg` (same filename/extension, no code change needed).

This applies at every screen size, not just mobile/tablet.

---

## Hard constraint, repeated

Desktop must look exactly as it does today after this pass — every change above is either explicitly mobile/tablet-scoped (sections 1-3, 5-8) or a like-for-like asset swap that doesn't touch layout (section 9). Test each section at a phone width (~375-390px), a larger phone (~428px), and a tablet portrait width (~768-834px) before calling it done, and re-check desktop once at the end as a regression pass.

## Verification checklist

- Screenshot mobile hero, gallery, and detail screens against the four Figma frames side by side — proportions should match; exact copy/arrow icons should not (those stay as they are on the live site).
- Confirm all 4 hero nav pills sit on one row at 375px width without wrapping, and remain ≥44px tall.
- Confirm every block heading listed in section 4 renders at the same size on mobile, and that flavor-name headings (section 2/3) were left alone.
- Swipe left/right on the gallery, then continue scrolling down past it on `/flavors` — the page should scroll normally once past the gallery, not fight the touch gesture.
- On the homepage, scroll from hero → slider → tap a can into detail → keep scrolling down — confirm Screen 2 arrives without an unexpectedly long dead zone, and that scrolling back up still reverses cleanly.
- Pin the scenario cards on a phone-width viewport (with dev tools' mobile emulation, address-bar-collapse behavior included if possible) and confirm ~20px of visible gap above and below the card, not visibly shifted up.
- Compare an Advantages card's height/width ratio on mobile against desktop — should read as the same shape, just smaller, not shorter and wider.
- Confirm `party.webp` loads on `/` and `/flavors` wherever the "squad"/party scenario card appears, and that the old `party.jpg` is gone.
- Full regression pass on desktop — nothing above should have moved anything there.
