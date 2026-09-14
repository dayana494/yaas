# YAAS — Strawberry Flavor Page: Claude Code Build Prompt

Research notes (why this prompt is shaped this way), then the actual prompt to paste into Claude Code, at the bottom.

**Revision note:** this replaces the first draft of this prompt. That draft was written against an older snapshot of `yaas-site/` (no router yet). A newer snapshot of the project ("банки газировки -v2") showed the codebase has moved substantially further — routing now exists, a shared "rounded section climbs up and covers the one before it" scroll utility now exists, and a placeholder route for this exact page already exists. Every section below is corrected against that newer snapshot.

---

## Research summary

**Reference site mechanic (eathungrytiger.com hero → product story section):** it's a single jar, pinned dead-center of the viewport (`position: sticky`) for a tall scroll section. As you scroll: the big headline/kicker text that was over the jar scrolls away first; then the jar itself starts tumbling — a continuous, multi-axis rotation (not just spinning on one vertical axis: it tips forward, rolls toward showing its cap top-down, keeps turning past upside-down, tilts back) entirely driven by scroll position (scrub, not autoplay) while short headline+subhead pairs crossfade in beside/behind it at a few points along the way. Nav bar and background stay fixed throughout. After the block we needed (the tumble + text swaps), the reference goes on to a liquid-pour money-shot and ingredient sections — **excluded from this build per your instructions**, along with the reference's own type system (Salmond/Graphikx, its orange/brown palette) — that page was mechanical inspiration only.

**Reference cards (benzerodrinks.ru flavor gallery):** on desktop, 3 full-bleed colored cards sit side by side, each its own flavor's color, with the can peeking up from the bottom edge (mostly cropped off) at rest. On hover, the can enlarges and rises further into frame — confirmed by direct interaction, not just static screenshots.

**Your actual codebase**, re-checked against the newer "банки газировки -v2" snapshot (`git`-tracked now, deployed via `vercel.json`), has moved well past both the original tech brief *and* the first draft of this prompt:

- **Routing already exists.** `react-router-dom` is installed and wired in `App.jsx`:
  ```jsx
  <Route path="/" element={<HomePage />} />
  <Route path="/contacts" element={<ContactsPage />} />
  <Route path="/flavors" element={<FlavorsPage />} />
  <Route path="/flavors/:slug" element={<FlavorDetailPage />} />
  ```
  So the route is `/flavors/:slug` (param name `slug`), **not** `/catalog/:flavorId` — the first draft of this prompt got that wrong, working from an older snapshot. **`src/pages/FlavorDetailPage.jsx` already exists too**, as a deliberate placeholder:
  ```jsx
  export default function FlavorDetailPage() {
    const { slug } = useParams();
    const flavor = FLAVORS.find((f) => f.id === slug);
    return (
      <div className="page">
        <section className="flavor-detail-placeholder">…"Coming Soon"…</section>
        <Footer />
      </div>
    );
  }
  ```
  This task is to **replace that placeholder's body** with the real page — keep the `.page` wrapper, the `useParams()`/`slug` lookup, the `<Footer />` at the end, and the not-found fallback for an unrecognized slug (same shape, real content).

  *Heads up, unrelated to this task:* a few existing hrefs still point at the old `/catalog/{id}` shape — `DetailScreen.jsx`'s "Learn more →" link and every `href` in `data/scenarios.js`. They're stale (the route moved to `/flavors/:slug`), so they currently 404. Worth a one-line fix while in the area, but it's a pre-existing bug, not part of this page.

- **`FlavorCard.jsx` already exists** — used on `/flavors`' own grid (plain white card: image, title, description, "Learn More →"). It is **not** the "colored background, can peeks up, hover scales+tilts" gallery card this task needs for the bottom of the flavor detail page — that's a different visual treatment, specific to this page, modeled on benzerodrinks.ru. Name the new one something distinct (e.g. `FlavorStripCard`) so it's never confused with the existing grid card.

- **A shared "rise" scroll utility already exists** — `src/scroll/riseTransition.js` (`applyRise`, `createRiseDriver`, `attachRiseDriver`, `createFallDriver`, `RISE_UNITS`). This is exactly the "white rounded-top block climbs up and covers the pinned section above it" effect the homepage already uses twice (Screen 2 covering the intro, About-the-Brand covering Advantages/FAQ) — **this is what the bottom "Try the Other Flavors" gallery should use**, not a hand-rolled static `border-radius`. Full mechanics and exact reuse instructions are in section 2, Section B below — this was the biggest correction from the first draft, which invented its own static version of this effect before knowing the real one existed.

- Still true from the first draft: one shared can geometry/material set (`useCanGeometry`, `useCanMaterials` in `src/three/`), reused by every 3D scene instead of reloading per-section; `Background.jsx` (flat per-flavor color + `/textures/bg-texture.jpg` overlay, unchanged) is the "pink + pattern from the strawberry card" reuse; `DropText.jsx` is the shared text-reveal component; copy lives in `src/data/*.js`, never hardcoded in components; every page other than the homepage ends with `<Footer />` (see `ContactsPage.jsx`, `FlavorsPage.jsx` — both just render their content, then `<Footer />`).

This prompt is written to slot into that system, not bypass it.

---

## English copy for the mid-page rotation story (written fresh for this task)

Kept in Strawberry's calm/confident register (same voice as her `flavors.js` description and the "unbothered queen" persona) — light slang, no "cures your fatigue" framing, matches the brand-voice rules already in `homepageCopy.js`. Four blocks, meant to crossfade in as the can tumbles through the scroll-pinned sequence:

1. **Kicker:** STILL NOT RATTLED
   **Line:** Chaos speed-runs around her. She doesn't blink.

2. **Kicker:** ZERO SUGAR. ZERO PANIC.
   **Line:** Sweet-tart hit, ice-cold nerves — that's the whole personality.

3. **Kicker:** SHE'S THE VIBE, NOT THE HYPE
   **Line:** No shouting, no spiraling. Just locked in, however loud the room gets.

4. **Kicker:** GRAB ONE, KEEP YOUR COOL
   **Line:** 0g sugar · 5 cal · 11.2 FL OZ — same calm, every single can.

First-screen copy (translated from your Russian source, matching `flavors.js`'s existing "WILD STRAWBERRY" title and the site's US units):

> **WILD STRAWBERRY**
> 0g sugar · 5 cal · 11.2 FL OZ
> Sweet-tart and unbothered — the flavor that keeps its cool no matter how loud the room gets. Calm in a can, charged underneath.

Bottom gallery heading: **"Try the Other Flavors"** (matches the tone of the existing `SCREEN3_HEADING`, "5 Flavors. One Energy.").

---

# ↓↓↓ The Claude Code prompt (paste everything below this line) ↓↓↓

Build out the real Strawberry flavor detail page at the existing route `/flavors/:slug`, replacing the placeholder body of `src/pages/FlavorDetailPage.jsx`. This is page 1 of what will eventually be 5 flavor pages — build it generically (keyed by the `slug` param), not hardcoded to strawberry, even though strawberry is the only one with finished rotation-story copy right now. Keep the existing placeholder's shape: the `.page` wrapper div, the `useParams()` → `FLAVORS.find()` lookup, the "flavor not found" fallback for an unrecognized slug, and `<Footer />` at the end.

## 0. Do not touch routing — it already exists

`react-router-dom` is already installed; `App.jsx` already routes `/flavors/:slug` to this component. Don't add a router, don't change the route path, don't rename the `slug` param. (Separately, unrelated to this task: `DetailScreen.jsx`'s "Learn more →" link and every `href` in `data/scenarios.js` still point at the old `/catalog/{id}` shape and 404 — worth a one-line fix while you're in the area, but not part of this page.)

## 1. New data file — `src/data/flavorStories.js`

```js
// Per-flavor copy for the flavor detail page's scroll-driven can story.
// Only strawberry is filled in for now — add the other 4 flavors here later,
// same shape, once their copy is written.
export const FLAVOR_STORIES = {
  strawberry: {
    heroKicker: 'WILD STRAWBERRY',
    heroBadges: '0g sugar · 5 cal · 11.2 FL OZ',
    heroLine:
      "Sweet-tart and unbothered — the flavor that keeps its cool no matter how loud the room gets. Calm in a can, charged underneath.",
    rotationBlocks: [
      { kicker: 'STILL NOT RATTLED', line: "Chaos speed-runs around her. She doesn't blink." },
      { kicker: 'ZERO SUGAR. ZERO PANIC.', line: 'Sweet-tart hit, ice-cold nerves — that\'s the whole personality.' },
      { kicker: "SHE'S THE VIBE, NOT THE HYPE", line: 'No shouting, no spiraling. Just locked in, however loud the room gets.' },
      { kicker: 'GRAB ONE, KEEP YOUR COOL', line: '0g sugar · 5 cal · 11.2 FL OZ — same calm, every single can.' },
    ],
  },
};

export const GALLERY_HEADING = 'Try the Other Flavors';
```

In `FlavorDetailPage.jsx`, fall back to the flavor's own `flavors.js` `title`/`description` when `FLAVOR_STORIES[slug]` has no entry yet, so the route still renders something real for the other 4 flavors instead of erroring.

## 2. Page structure — inside `src/pages/FlavorDetailPage.jsx`

Two stacked sections above the existing `<Footer />`, in normal document flow (this page scrolls independently of the homepage — it is not embedded inside `HomePage`'s own scroll machinery):

### Section A — `FlavorStorySection` (hero + mid-page rotation, one continuous pinned block)

This is the section modeled on the Hungry Tiger mechanic — **but only the tumble-and-text-swap part**. Do not build a liquid-pour moment or any content resembling the reference site's blocks below that.

Structure (mirrors the existing `.screen3-wrap` / `.app-root` sticky pattern already used elsewhere in this codebase):

```jsx
<section className="flavor-story-wrap" ref={wrapRef}>
  <div className="flavor-story-sticky">
    <Background color={flavor.color} />  {/* reuse existing component as-is */}
    <FlavorStoryCanvas flavorId={flavor.id} ref={canRigRef} />
    <div className="flavor-hero-copy" ref={heroCopyRef}>
      <h1 className="flavor-story-yaas" ref={yaasRef}>YAAS</h1>
      <DropText as="h2" className="flavor-story-flavorname" text={flavor.title} />
      <p className="flavor-hero-badges">{story.heroBadges}</p>
      <p className="flavor-hero-line">{story.heroLine}</p>
    </div>
    <div className="flavor-rotation-blocks">
      {story.rotationBlocks.map((block, i) => (
        <div className="flavor-rotation-block" key={i} ref={(el) => (blockRefs.current[i] = el)}>
          <p className="flavor-rotation-kicker">{block.kicker}</p>
          <p className="flavor-rotation-line">{block.line}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

- `.flavor-story-wrap` — `position: relative; height: 500vh;` (100vh hero read + 400vh for the 4-block rotation — tune by feel once it's live).
- `.flavor-story-sticky` — `position: sticky; top: 0; height: 100vh; overflow: hidden;` — same recipe as `.app-root`.
- `Background` — pass `color={flavor.color}` exactly like the flavor slider already does. This is the "same pink + pattern as the strawberry card" reuse you asked for; no new component needed.
- **"YAAS" full-width:** don't reach for a `clamp()` guess here — this codebase already solved "make a short string exactly fill its container's width" for the giant hero wordmark and the footer wordmark, both via the same `useFillWidth` scaleX-fit hook (see `HeroWordmark.jsx`: measure the text's natural rendered width, then `transform: scaleX(containerWidth / naturalWidth)`, refit on resize). Reuse that exact technique for `.flavor-story-yaas` (don't import `HeroWordmark` itself — it's wired to the intro's own z-index stack and a mobile-banner variant that don't apply here; just reuse the `useFillWidth`-style hook against this page's own element). `flavor.title` ("WILD STRAWBERRY") sits directly under it at a smaller fixed scale (`clamp(28px, 5vw, 64px)`, similar scale to `.slider-heading`), centered. The can renders in the same `<Canvas>` centered below/through this text (z-index between the two text layers, or simply allow overlap since the user explicitly wants the can able to sit over the headline — don't fight it with careful non-overlapping layout).
- `heroBadges`/`heroLine` sit below the can, fade out early in the scroll (tie their opacity to the same master timeline, fading out over roughly the first 15% of scroll progress) so they don't linger once the tumble starts.

**The can rig — `src/three/FlavorStoryCanRig.jsx`** (new, small, reuses existing hooks — do not duplicate `useCanGeometry`/`useCanMaterials`):

```jsx
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useCanGeometry } from './useCanGeometry';
import { useCanMaterials } from './useCanMaterials';
import { FLAVORS } from '../data/flavors';

const FlavorStoryCanRig = forwardRef(function FlavorStoryCanRig({ flavorId }, ref) {
  const geometry = useCanGeometry();
  const materials = useCanMaterials();
  const groupRef = useRef(null);
  const index = useMemo(() => FLAVORS.findIndex((f) => f.id === flavorId), [flavorId]);

  useImperativeHandle(ref, () => ({ group: groupRef.current }));

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={materials[index]} />
    </group>
  );
});
export default FlavorStoryCanRig;
```

Wrap it in its own `<Canvas>` (own file, `src/three/FlavorStoryScene.jsx`, same shape as `Screen2Scene.jsx`: `Suspense` + `Lighting` + this rig, `camera={{ position: [0, 0, 3.4], fov: 32 }}`). This stays fully independent of the homepage's own `CanRig.jsx` (which has since grown a hero→gallery entrance-flight state machine that has nothing to do with this page) — don't reuse or extend that component, just the two shared low-level hooks.

**Driving the tumble + text crossfade — one master GSAP timeline**, same idiom as every other scroll-pinned section in this codebase (`ScenarioCardsIsometric.jsx`, `AdvantagesScreen.jsx`, etc.): a `gsap.timeline` with a `scrollTrigger` of `pin: true, scrub: 1`. Build it in `FlavorStorySection`'s own `useEffect`, after both the can-rig ref and the 4 block DOM refs exist. **Important correction from the first draft:** because the gallery section right after this one rises up to cover it (see Section B), this pin must hold for an *extra* `RISE_UNITS` worth of scroll at the end — exactly the pattern `ScenarioCardsIsometric.jsx` and the homepage's intro pin already use for the sections underneath their own rises:

```js
import { RISE_UNITS } from '../scroll/riseTransition';

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: wrapRef.current,
    start: 'top top',
    end: () => `+=${(4 + RISE_UNITS) * window.innerHeight}`,
    scrub: 1,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  },
});

// hero copy fades out early
tl.to(heroCopyRef.current, { opacity: 0, duration: 0.4 }, 0.05);

// can tumbles through 4 multi-axis waypoints, one per text block — tune
// the actual radian values by eye against the reference's tumbling motion
// (it rolls forward, tips to show the cap near top-down, keeps turning past
// upside-down, then eases back toward upright) — these are a starting point:
const waypoints = [
  { x: 0.6, y: 1.2, z: 0.1 },
  { x: 1.7, y: 2.4, z: -0.2 },
  { x: 3.1, y: 3.6, z: 0.15 },
  { x: 3.9, y: 4.8, z: 0 },
];
waypoints.forEach((rot, i) => {
  tl.to(canRigRef.current.group.rotation, { ...rot, duration: 1, ease: 'power1.inOut' }, i);
});

// text blocks crossfade in step with each waypoint
blockRefs.current.forEach((el, i) => {
  tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, i + 0.1)
    .to(el, { opacity: 0, y: -24, duration: 0.5 }, i + 0.8);
});

// idle hold so the timeline's own duration matches the pin's extended
// length — same trick ScenarioCardsIsometric.jsx uses for its own rise
// tail, otherwise the 4 waypoints above would stretch to fill the extra
// RISE_UNITS of pinned scroll instead of holding their real timing.
tl.to({}, { duration: RISE_UNITS }, waypoints.length);
```

Set every block to `opacity: 0` initially via `gsap.set` before the timeline runs, same as `ScenarioCardsIsometric.jsx` initializes its own cards before building its scrub timeline.

**Mobile/reduced-motion fallback** (mirror `AdvantagesScreen.jsx`'s simple-mode fallback): below the desktop breakpoint or with `prefers-reduced-motion: reduce`, skip the pin/scrub entirely — render the can with a slow continuous idle Y-axis spin (`useFrame`-driven), and let the 4 text blocks stack as plain, scroll-revealed blocks underneath (reuse `DropText` with its default scroll-triggered behavior instead of the master timeline).

### Section B — `FlavorGallery` ("Try the Other Flavors")

A separate, non-pinned section directly below Section A, that **rises up and covers Section A's last frame** — reuse the site's existing rise mechanism (`src/scroll/riseTransition.js`) exactly the way `.screen2` and `.about-brand` already do, rather than a hand-rolled static overlap:

```css
.flavor-gallery {
  position: relative;
  z-index: 2; /* paints over .flavor-story-sticky, which is position: sticky */
  margin-top: -100vh;
  margin-top: -100dvh;
  border-top-left-radius: var(--rise-radius, 0px);
  border-top-right-radius: var(--rise-radius, 0px);
  overflow: hidden;
  background: var(--paper); /* #fdfaf1, already defined in styles/index.css */
  padding: 64px 0 80px;
}
```

And in `FlavorDetailPage.jsx`'s own effect, alongside the master timeline above:

```js
import { createRiseDriver, attachRiseDriver } from '../scroll/riseTransition';
import gsap from 'gsap';

useEffect(() => {
  const driveRise = createRiseDriver(['.flavor-gallery']);
  const detach = attachRiseDriver(gsap.ticker, driveRise);
  return detach;
}, []);
```

`--rise-radius` is then written every frame by that driver (it starts at half `.flavor-gallery`'s own rendered width — a true dome — and eases to 0 as the section's top edge travels from the bottom of the viewport to the top); nothing else needs to compute it. This is the same shared utility, same custom property, same idiom already used twice on the homepage — not a second implementation of it.

Inside `.flavor-gallery`: `<h2>{GALLERY_HEADING}</h2>` (`DropText`, scroll-revealed as normal), then a horizontal gallery:

```jsx
<div className="flavor-gallery-track" ref={trackRef}>
  {FLAVORS.map((f) => (
    <a key={f.id} className="flavor-gallery-card" href={`/flavors/${f.id}`} style={{ '--card-color': f.color }}>
      <h3>{f.title}</h3>
      <img src={f.thumbnail} alt="" className="flavor-gallery-can" />
    </a>
  ))}
</div>
<button className="arrow arrow-gallery-next" onClick={scrollNext} aria-label="Next flavors">
  <img src="/icons/arrow-right.svg" alt="" />
</button>
```

(Note the route is `/flavors/${f.id}`, matching the app's actual route — not `/catalog/${f.id}`.)

- This new card (call the component `FlavorStripCard` or similar — deliberately not `FlavorCard`, which already exists for the plain `/flavors` grid and looks nothing like this) reuses the existing `.arrow` class from `layout.css` for its nav control (same hover/scale treatment already established) rather than a new button style. Only a right-pointing arrow is required per your spec ("click the arrow to scroll right"); add a left one too for symmetry/backtracking, faded/disabled at the start.
- `.flavor-gallery-track`: `display: flex; gap: <spacing>; overflow-x: hidden; scroll-behavior: smooth;` — the arrow's `scrollNext` does `trackRef.current.scrollBy({ left: cardWidth + gap, behavior: 'smooth' })`. Card width sized so exactly 3 are visible at the desktop breakpoint (`calc((100% - 2*gap)/3)`), same "3 visible, click to reveal more" behavior as the benzerodrinks.ru reference confirmed live.
- Each `.flavor-gallery-card`: full-height colored background using `--card-color` (`f.color`, each flavor's *own* brand color from `flavors.js` — exactly the "each keeps its own color" requirement), the same `.background-texture` pattern overlay reused inside it, flavor title top, `f.thumbnail` can image bottom, mostly cropped by the card's `overflow: hidden` so only the top of the can peeks in at rest.
- Hover (confirmed live against the reference): `transform: scale(1.12) rotate(-4deg); transition: transform 250ms ease;` on `.flavor-gallery-can` — scale up and tilt, same spirit as the existing `.flavor-thumb:hover` rotate-to-upright trick in `layout.css`, just inverted into a tilt+grow instead of a straighten.
- The card for the currently-viewed flavor can get a subtle `is-active` ring/border treatment, matching `.flavor-thumb.is-active` conventions elsewhere.

Keep `<Footer />` (already in the placeholder) as the last thing on the page, unchanged — every other route already ends with it plainly, no special wiring needed from this page for it to work.

## 3. Responsiveness

Match the site's existing fluid-typography approach (`clamp()` everywhere, as seen throughout `layout.css`/`hero.css`/`flavors-page.css`) rather than the hero's fixed-1200px-stage-scale technique — that technique exists only because the hero has to match one exact Figma frame; this page doesn't need that constraint. At the tablet/mobile breakpoints already established in this codebase (`768px`, `1024px`), the gallery should drop to 2 then 1 visible card (adjust the `calc()` divisor), and the rotation-story section should switch to the simplified/mobile mode described above.

## 4. What NOT to build

- No liquid-pour animation or moment.
- No ingredient/ecosystem/ "why it's better" content blocks below the gallery — the page ends after `FlavorGallery` + `Footer`.
- No new type system, color palette, or spacing scale borrowed literally from the Hungry Tiger reference — only the *mechanic* (pinned tumble + text swap) was reference material. Every color, font, and asset here comes from this codebase's own `flavors.js`, `styles/index.css` tokens, and `/textures`/`/icons` assets.
- Don't add routing, don't rename the `slug` param, don't touch `HomePage.jsx`'s own scroll/gesture logic or its many chained ScrollTriggers — this page is fully independent of it.
- Don't reuse `FlavorCard.jsx` for the bottom gallery, and don't extend the homepage's `CanRig.jsx` — both were built for a different job and have grown state machines specific to that job.

## 5. Acceptance checklist

- [ ] `/flavors/strawberry` renders the new page in place of the old placeholder; `/flavors/apple` (etc.) also renders without crashing, falling back to that flavor's own `flavors.js` copy where `flavorStories.js` has no entry yet; an unknown slug still shows the existing not-found fallback.
- [ ] Can is the shared `useCanGeometry`/`useCanMaterials` asset — no duplicate model/texture loading, and no reuse of the homepage's own `CanRig.jsx`.
- [ ] Scroll-pin/scrub story section behaves like the site's other pinned sections (same libraries, same idiom) and correctly holds for the extra `RISE_UNITS` while the gallery climbs over it; degrades to a simple non-pinned version on mobile/reduced-motion.
- [ ] The gallery's rounded top comes from `scroll/riseTransition.js` (`--rise-radius`, `createRiseDriver`/`attachRiseDriver`), not a static `border-radius`.
- [ ] Gallery shows 3 cards on desktop, each in its own flavor's brand color, can peeks from the bottom and scales+tilts on hover, arrow click scrolls to reveal more, links point at `/flavors/{id}`.
- [ ] No pour animation, no extra content blocks between the gallery and the footer.
- [ ] Whole page holds together down to ~360px wide with no horizontal scroll.
