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

// Picks by the device pixels the card will actually cover, rather than by a
// media query on viewport width.
//
// A query on width alone gets both ends wrong: a 390px phone at a device pixel
// ratio of 3 needs ~990px of image for a card that is nearly screen-wide, and
// a 1280px laptop at 1x needs ~1220px for one that is not. Measuring the box
// and multiplying by the pixel ratio is the same number the browser itself
// would compute from `sizes`, and it is exact here because the card is laid
// out by the time this runs.
//
// The rule only ever rounds UP to the larger file, so no card is ever handed
// an image smaller than the pixels it has to fill — the one exception being a
// full-width card on a 2x screen (2800 device px), which asks for more than
// 2560 and gets the same 2560 it got before this change.
export function photoForBox(photo, cssWidth) {
  const needed = cssWidth * (window.devicePixelRatio || 1);
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
    el.style.backgroundImage = `url(${photoForBox(photo, el.clientWidth || window.innerWidth)}), ${fallback}`;
    return () => {};
  }

  let cancelled = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const url = photoForBox(photo, el.clientWidth || window.innerWidth);
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
