import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';
import YaasWordmarkSvg from './YaasWordmarkSvg';
import { onRealResize } from '../scroll/onRealResize';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// Sizes the wordmark so its INK — not its box — spans the container exactly:
// flush to the left and right edges, nothing running off either, and its own
// proportions intact.
//
// The desktop wordmark is a fixed 539px string centred in the 1200-wide stage,
// and at that size the glyphs are wider than the stage: measured at 1920x920,
// 1742px of ink in a 1698px container, so 22px of the Y and the final S were
// being cut off by .hero-logo-giant's overflow. Width-fitting its box cannot fix
// it — that element is position:absolute with an explicit width, so its own
// getBoundingClientRect is the container's width and the ratio comes out 1.
//
// Canvas measureText is what actually knows: actualBoundingBoxLeft/Right are
// the inked extents of the string, independent of the advance width the layout
// engine reports. The ratio of container to ink is applied as a scaleX about
// the centre, so the wordmark still starts and ends flush with the stage.
function useInkFitWidth(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;

    function fit() {
      const row = el.parentElement;
      if (!row) return;
      el.style.transform = 'none';
      const style = getComputedStyle(el);
      const context = fit.ctx || (fit.ctx = document.createElement('canvas').getContext('2d'));
      context.font = `${style.fontWeight} ${parseFloat(style.fontSize)}px ${style.fontFamily}`;
      const metrics = context.measureText(el.textContent.trim());
      // All of this is unscaled CSS px — the stage's own scale() multiplies
      // both the box and the ink, so it cancels out and never enters here.
      const boxWidth = parseFloat(style.width) || row.getBoundingClientRect().width;
      // The element is text-align: center, so the string's origin sits half
      // the leftover width in; the ink then runs from there by its own
      // asymmetric side bearings, which is why the two edges need solving
      // separately rather than assuming the ink is centred in the box.
      const origin = (boxWidth - metrics.width) / 2;
      const inkLeft = origin - metrics.actualBoundingBoxLeft;
      const inkRight = origin + metrics.actualBoundingBoxRight;
      const ink = inkRight - inkLeft;
      if (!(ink > 0) || !(boxWidth > 0)) return;

      // A UNIFORM scale, not a scaleX: squashing one axis to fit the width
      // narrows the letterforms, which is exactly the "off the grid" look this
      // is meant to remove. The wordmark keeps its proportions and simply sits
      // a little smaller.
      const scale = boxWidth / ink;
      // With transform-origin at the centre, x maps to W/2 + t + (x - W/2)*s.
      // Solving that for "ink's left edge lands on 0" gives this t, and the
      // right edge then lands on exactly W — flush to both, clipped by
      // neither.
      const shift = -(boxWidth / 2 + (inkLeft - boxWidth / 2) * scale);
      el.style.transform = `translateX(${shift}px) scale(${scale})`;
    }

    let cancelled = false;
    const fonts = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    fonts.finally(() => {
      if (!cancelled) fit();
    });
    const offFit = onRealResize(fit);
    return () => {
      cancelled = true;
      offFit();
      if (el) el.style.transform = '';
    };
  }, [ref, enabled]);
}

// The giant background wordmark from the hero — split out of HeroScreen so
// it can render *inside* .app-root, between the flavor background and the
// can canvas (see App.jsx), preserving the original stack (logo behind the
// cans, nav/copy in front of them) now that hero and gallery share one
// Canvas. Still just a DOM layer; .hero-stage/-back (hero.css) own its
// sizing, fade/blur-on-scroll and z-index exactly as before.
//
// Below the mobile breakpoint (matches the rest of the site's own mobile
// composition — .hero-mobile-banner in hero.css) this switches to a
// contained, fully-on-screen wordmark instead of the desktop's deliberate
// edge-bleed: the reference for the mobile hero (kisadrink.ru) shows the
// logo sitting whole, at the top, not cropped — a directly opposite intent
// from the desktop giant-wordmark treatment, not just a smaller version of
// it.
// `fitToContainer` is the flavor detail pages' variant: there the wordmark is
// the page's own masthead with the flavor name set directly under it, so the
// desktop edge-bleed reads as a mistake rather than a treatment — it is fitted
// to the stage instead. The homepage passes nothing and keeps the bleed it was
// designed with.
export default function HeroWordmark({ fitToContainer = false }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const desktopLogoRef = useRef(null);
  useInkFitWidth(desktopLogoRef, fitToContainer && !isMobile);

  if (isMobile) {
    return (
      <div className="hero-mobile-banner-logo-row" aria-hidden="true">
        {/* Vector outlines rather than live text — see YaasWordmarkSvg. */}
        <YaasWordmarkSvg className="hero-mobile-banner-logo" />
      </div>
    );
  }

  return (
    <div className="hero-stage hero-stage-back" aria-hidden="true">
      <div className="hero-logo-giant">
        <Logo ref={desktopLogoRef} />
      </div>
    </div>
  );
}
