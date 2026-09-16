# YAAS site — reduce load weight, change nothing visually

## Hard constraint (read first, applies to every step below)

Nothing on the live site may look or behave differently after this work: same layout, same colors, same animation timing/easing, same image content and crop, same text. This is a weight-reduction pass, not a redesign. Where a step below carries any risk of a visible difference, it says so explicitly and gives you a way to verify before/after — don't skip that check.

Two independent workstreams: (1) swap in already-compressed images the client prepared herself and delete confirmed-dead image files, (2) fix a few structural things that make the site heavier or slower to load than it needs to be, unrelated to image weight. Do them in order — part 1 is the highest-value, lowest-risk work.

---

## Part 1 — Replace images with the client's compressed versions

The client compressed these herself and placed them in `банки газировки -v2/`, next to (not inside) `yaas-site/`. Each one replaces a same-purpose file currently in `yaas-site/public/`. File **names** don't always match 1:1 (her export tool appended things like ` (1)` or ` 1 (1)`) — match by **flavor/scenario identity**, confirmed below, not literal filename.

### 1a. Flavor label textures — `банки газировки -v2/этикетки/` → `public/textures/labels/`

| Source (in `этикетки/`) | Replaces | Old size | New size | Reduction |
|---|---|---|---|---|
| `apple.jpg` | `public/textures/labels/apple.jpg` | 1,770,139 B | 145,523 B | ~92% |
| `blueberry.jpg` | `public/textures/labels/blueberry.jpg` | 1,160,502 B | 146,282 B | ~87% |
| `lemon (1).jpg` | `public/textures/labels/lemon.jpg` | 1,197,640 B | 139,261 B | ~88% |
| `orange.jpg` | `public/textures/labels/orange.jpg` | 1,375,574 B | 152,763 B | ~89% |
| `strawberry (1).jpg` | `public/textures/labels/strawberry.jpg` | 1,260,044 B | 153,821 B | ~88% |

Same filenames on the destination side, same `.jpg` extension — straight overwrite, no code changes needed (`src/data/flavors.js` already points at these exact paths).

### 1b. Scenario photos — `банки газировки -v2/фото сценариев/` → `public/photos/scenarios/`

| Source (in `фото сценариев/`) | Replaces | Old | New | Note |
|---|---|---|---|---|
| `party.jpg` | `public/photos/scenarios/party.jpg` | 514,159 B | 433,118 B | same extension, overwrite |
| `road.jpg` | `public/photos/scenarios/road.jpg` | 403,620 B | 295,125 B | same extension, overwrite |
| `univer 1 (1).jpg` | `public/photos/scenarios/univer.jpg` | 505,902 B | 242,666 B | same extension, overwrite |
| `game.jpg` | `public/photos/scenarios/game.png` | 6,110,795 B | 247,383 B | **extension changes .png → .jpg** |
| `sport 1 (1).jpg` | `public/photos/scenarios/sport.png` | 8,320,865 B | 304,114 B | **extension changes .png → .jpg** |

For the two extension changes: delete the old `.png`, add the new file as `game.jpg` / `sport.jpg` (drop the source's own suffix), and update `src/data/scenarios.js` — the `sport` entry's `photo: '/photos/scenarios/sport.png'` → `'/photos/scenarios/sport.jpg'`, and the `gaming` entry's `photo: '/photos/scenarios/game.png'` → `'/photos/scenarios/game.jpg'`. These two files alone are ~14.4MB → ~550KB.

### 1c. About-the-brand photos — `банки газировки -v2/о бренде/` → `public/images/`

| Source (in `о бренде/`) | Replaces | Old | New |
|---|---|---|---|
| `composite 1 (1).jpg` | `public/images/about-brand-1.jpg` | 139,601 B | 229,630 B |
| `composite (1) 1 (1).jpg` | `public/images/about-brand-2.jpg` | 136,785 B | 237,008 B |

Matched by content, not name: `composite 1 (1).jpg` shows two hands holding Blueberry + Orange cans on a blue background — that's `about-brand-1.jpg`'s current content. `composite (1) 1 (1).jpg` shows a top-down shot of a woman drinking a Strawberry can on a pink background — that's `about-brand-2.jpg`'s current content. (`src/data/aboutBrand.js` references both paths twice each, for the 4-card stack — same two files, no other paths to update.)

**Flag this one before overwriting:** unlike every other pair above, these two new files are *larger* than what they replace (+64% and +73%), not smaller. They're very likely a higher-quality/different source export rather than a straight recompression of the exact same file — the visual content matches, but pixel-for-pixel they may not be identical to what's live now. Open both old/new pairs side by side (crop, framing, color) before overwriting. If anything looks meaningfully different from what's live today, stop and flag it back rather than shipping a silent content change — the brief is "smaller file, same picture," not "new photo." If they check out, replace as planned.

### 1d. Delete confirmed-unused images — no replacement, just remove

`public/images/brand-teaser-drinking.png` (4,142,749 B) and `public/images/brand-teaser-fan.png` (7,375,342 B) are not referenced anywhere in `src/` (verified via `grep -rn "brand-teaser-drinking\|brand-teaser-fan" src/` — zero matches; `BrandTeaserScreen.jsx` doesn't use them). Because everything in Vite's `public/` folder ships into the production build regardless of whether code references it, these two are pure dead weight — 11.5MB shipped to every visitor for nothing. Re-run that grep yourself before deleting, as a safety check, then delete both files.

Do **not** touch anything in `public/textures/thumbnails/` — the client didn't provide compressed versions of those (they're still the original PNGs, ~3.4MB total across 5 files), so leave them as-is for now. Worth a follow-up pass later (PNG→WebP or a manual recompression), just not part of this one since there's nothing to swap in yet.

### Expected result of Part 1

Roughly 36MB of image weight down to somewhere around 2–3MB, with zero code/behavior changes outside the two `scenarios.js` path edits and the two dead-file deletions.

---

## Part 2 — Structural fixes (audited separately, not related to images)

### 2a. Preload `Bounded-Medium.otf` (safe, do this)

`index.html` already preloads `Soledago.ttf`:
```html
<link rel="preload" href="/fonts/Soledago.ttf" as="font" type="font/ttf" crossorigin />
```
`Bounded-Medium.otf` (151KB, declared in `src/styles/index.css` via `@font-face` with `font-display: swap`) has no matching preload — it only starts downloading once the CSS is parsed and something on the page actually needs it, so it swaps in later than it has to. `font-display: swap` already means nothing is render-blocked on it, so this is a pure "starts loading earlier" win with no visual mechanism to regress. Add the matching preload line next to the existing one:
```html
<link rel="preload" href="/fonts/Bounded-Medium.otf" as="font" type="font/otf" crossorigin />
```

### 2b. Route-level code splitting (safe if verified, moderate effort)

`src/App.jsx` currently statically imports all four pages:
```jsx
import HomePage from './pages/HomePage';
import ContactsPage from './pages/ContactsPage';
import FlavorsPage from './pages/FlavorsPage';
import FlavorDetailPage from './pages/FlavorDetailPage';
```
There's no route splitting at all right now, so anyone landing directly on `/contacts` or `/flavors` downloads and parses the entire bundle — including the homepage's three.js/GSAP scroll machinery it doesn't need yet. Convert each page import to `React.lazy()` and wrap `<Routes>` in a `<Suspense>`:
```jsx
import { lazy, Suspense } from 'react';
const HomePage = lazy(() => import('./pages/HomePage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const FlavorsPage = lazy(() => import('./pages/FlavorsPage'));
const FlavorDetailPage = lazy(() => import('./pages/FlavorDetailPage'));
// ...
<Suspense fallback={null}>
  <Routes>...</Routes>
</Suspense>
```
`fallback={null}` keeps this invisible on a fast connection (matches how `DetailScreen`'s existing lazy split is already handled elsewhere in the codebase) — don't add a spinner or skeleton, that would be a visible change. After this, verify: every route still renders correctly on a hard refresh (not just client-side nav), and the Network tab shows separate chunks per route instead of one bundle.

Note this also means `useGLTF.preload()` / `useTexture.preload()` calls inside `useCanGeometry.js` / `useCanMaterials.js` (currently module-level, so they fire immediately on any page that transitively imports them) will now only fire for routes that actually import a `Canvas`-using component — a secondary win from the same change, not something to implement separately.

### 2c. Idle 3D canvases keep rendering every frame (optional — real savings, real risk, do only if you can verify it)

None of the four `<Canvas>` mounts (`src/three/Scene.jsx`, `src/three/ContactCansScene.jsx`, `src/three/FlavorStoryScene.jsx`, `src/components/ThumbnailShot.jsx`) set `frameloop`, so react-three-fiber defaults to `frameloop="always"` — a continuous `requestAnimationFrame` render loop for every mounted canvas, forever, even when it's scrolled fully off-screen or sitting idle between GSAP scroll-scrub updates. This is real, ongoing CPU/GPU cost, not a one-time load-weight cost — but every rotation/position on these cans is driven by scroll (GSAP tweening `canRigRef.current.group.rotation` etc.), not by continuous internal animation, so R3F's `frameloop="demand"` mode (render only when explicitly told to) is a legitimate fit in principle.

This is the one item in this list that can visibly break something if done carelessly: switching to `demand` mode means a frame that isn't explicitly invalidated just doesn't render, so any GSAP update that doesn't call the R3F `invalidate()` function afterward would silently freeze that can instead of animating it. If you take this on:
- Do it one canvas at a time, not all four at once.
- Every place that mutates the rig via a ref (rotation, position, material swap) needs a paired `invalidate()` call from `useThree()` in that same update.
- After each canvas, scroll through its entire section slowly and confirm the can tracks the scroll position exactly as smoothly as before — no stutter, no stale frame, no pop.
- If any canvas can't be verified clean, leave that one on `frameloop="always"` rather than shipping a maybe-broken animation — this is explicitly optional, do the safe parts (1, 2a, 2b) regardless of whether you take this on.

---

## Verification checklist before calling this done

- Visually diff every changed page against the current live site (hero, flavor gallery cards, scenario cards, about-the-brand stack, contacts) — nothing should look different.
- Confirm `src/data/scenarios.js`'s `sport` and `gaming` entries point at `.jpg`, not `.png`.
- Confirm the two `brand-teaser-*.png` deletions don't produce any console 404s anywhere on the site (re-confirms they were truly unused).
- Run a production build (`npm run build`) and compare total `dist/` size before/after — should drop from ~40MB to roughly 5–8MB depending on how much of Part 2 you take on.
- If you did 2c, scroll-test every section with a can in it at normal speed and at a deliberately slow/fast scroll to catch any missed `invalidate()` call.
