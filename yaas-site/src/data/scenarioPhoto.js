// Scenario photos: which size to fetch, and when to fetch it at all.
//
// The five photos are the heaviest thing on the homepage by a wide margin —
// 1.2MB of the page's 2.7MB — and not one of them is on screen when the page
// loads: the nearest is a full intro (four viewports of scroll) down. They were
// being fetched at full size the moment the section rendered, which is to say
// immediately, competing with the can model, the label textures and the
// bundle for the same connection.
//
// Two things happen here. The photo is only fetched once its card is within
// about a viewport of being seen, and the size fetched is the one that card
// actually needs.

// Each source now has two files beside it, written by hand from the original
// (see the note in the build log): `-2560` is a byte copy of the original, so
// the large variant is pixel-identical to what shipped before, and `-1280` is
// a Lanczos downsample re-encoded once.
//
// The originals themselves are left in place and untouched.
function variant(photo, suffix) {
  return photo.replace(/\.webp$/, `${suffix}.webp`);
}

// The widest the small variant can serve without ever being upscaled.
const SMALL_WIDTH = 1280;

// Every scenario photo's own width:height — measured off the five source
// files directly (2560x1446 for three of them, ~1920x1072/2560x1429 for the
// other two, all within a percent of each other), so one shared constant
// stands in for all of them rather than fetching each one's real metadata
// before the first request can even go out.
//
// This is what turns cssWidth alone into the wrong number below: a card
// taller (relative to its width) than this ratio forces `background-size:
// cover` to scale the photo up to the card's HEIGHT, not its width — cropping
// the sides rather than the top/bottom — and the resolution that scale
// actually consumes is driven by whichever edge is doing the stretching.
const PHOTO_ASPECT = 1.78;

// Picks by the device pixels `cover` will actually stretch the photo to fill,
// rather than by a media query on viewport width or the card's width alone.
//
// A query on width alone gets both ends wrong: a 390px phone at a device pixel
// ratio of 3 needs ~990px of image for a card that is nearly screen-wide, and
// a 1280px laptop at 1x needs ~1220px for one that is not. Measuring the box
// and multiplying by the pixel ratio is the same number the browser itself
// would compute from `sizes` — for a card whose own aspect ratio is close to
// the photo's. It stops being exact the moment it isn't: `cover` fits the
// LARGER of a width-driven and a height-driven scale, and width alone only
// ever checks the first of those. The isometric stack's mobile cards are
// tall and narrow (roughly 330 x 764 at 390px wide, since the card runs
// nearly the full viewport height less its own inset) against photos shot
// landcape — cover has to blow the image up to cover 764px of HEIGHT there,
// which at a real phone's pixel ratio calls for well over 1280px of source
// width even though the card's own CSS width is under 400 — and the
// width-only formula picked the small variant every time, which is what
// actually read as blurry.
//
// Both edges are converted to the same unit — the source pixels `cover`
// would need along the photo's own width to satisfy THAT edge — and the
// larger of the two wins, same as `cover` itself does.
//
// The rule only ever rounds UP to the larger file, so no card is ever handed
// an image smaller than the pixels it has to fill — the one exception being a
// full-width card on a 2x screen (2800 device px), which asks for more than
// 2560 and gets the same 2560 it got before this change.
export function photoForBox(photo, cssWidth, cssHeight = 0) {
  const dpr = window.devicePixelRatio || 1;
  const widthNeed = cssWidth * dpr;
  const heightNeed = cssHeight * dpr * PHOTO_ASPECT;
  const needed = Math.max(widthNeed, heightNeed);
  return variant(photo, needed > SMALL_WIDTH ? '-2560' : '-1280');
}

// A viewport of lookahead in every direction. rootMargin percentages resolve
// against the root's own box, which for the implicit root is the viewport, so
// '100%' is one viewport — the photo starts downloading a full screen of
// scrolling before the card can be seen.
const LOOKAHEAD = '100% 0px';

// Sets `el`'s background photo once it comes within LOOKAHEAD, and not before.
// Returns the teardown.
//
// `fallback` is whatever the card should show until then and underneath the
// photo afterwards — the flavor gradient these cards already fell back to when
// a scenario had no photo yet. It stays as the bottom background layer for
// good: the photo is only added on top once it has actually decoded, so the
// card is never briefly empty while the bytes are in flight, and a photo that
// fails to load leaves the card looking exactly like the old placeholder
// instead of blank.
// Everything below writes `backgroundImage` and never the `background`
// shorthand. The shorthand resets every background sub-property it does not
// mention, and it writes them INLINE, where they beat the stylesheet — so
// `background: <gradient>` here silently overrode .scenario-card-bg's own
// `background-size: cover; background-position: center` with `auto` and
// `0% 0%`, and the photo was drawn at its natural pixel size instead of
// covering the card. On the arc's 382px cards that is a 1280px-wide image
// showing about a third of the scene.
export function lazyPhotoBackground(el, photo, fallback) {
  if (!el) return () => {};
  el.style.backgroundImage = fallback;
  if (!photo) return () => {};

  // No IntersectionObserver (or no layout to measure yet): fetch it the old
  // way rather than leave the card on its placeholder forever.
  if (typeof IntersectionObserver === 'undefined') {
    el.style.backgroundImage = `url(${photoForBox(photo, el.clientWidth || window.innerWidth, el.clientHeight)}), ${fallback}`;
    return () => {};
  }

  let cancelled = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const url = photoForBox(photo, el.clientWidth || window.innerWidth, el.clientHeight);
      // Decode first, then swap. Assigning the url straight to backgroundImage
      // would replace the gradient with an image that has not arrived yet, and
      // the card would show through to whatever is behind it until it did.
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (!cancelled) el.style.backgroundImage = `url(${url}), ${fallback}`;
      };
      img.src = url;
    },
    { rootMargin: LOOKAHEAD }
  );
  observer.observe(el);

  return () => {
    cancelled = true;
    observer.disconnect();
  };
}
