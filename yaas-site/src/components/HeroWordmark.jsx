import { useEffect, useRef, useState } from 'react';
import Logo from './Logo';

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

// Same edge-to-edge scaleX-fit technique as the footer's own wordmark (see
// Footer.jsx's useFillWidth) — no font-size alone lands a fixed 4-character
// string exactly on a container's own width.
//
// fit() used to run synchronously in the mount effect: write transform:none,
// then immediately read back two getBoundingClientRect()s to compute the
// ratio. That read-right-after-write is a forced reflow, and PageSpeed's own
// "Forced reflow" audit named this exact call — 108ms of it — as the single
// most expensive one on the page, sitting directly in front of the page's
// own LCP candidate (this row's span.logo-text): the browser had to flush
// layout synchronously, mid-mount, before it could paint that text at all.
// Confirmed directly, not just from the audit's minified stack: intercepting
// every getBoundingClientRect() call during a real page load showed this
// exact element pair as the very first reads after the page's own initial
// content, ~150ms into the load.
//
// The mount call needs no reset-to-none at all — there is no prior
// transform to undo yet, so skipping the write there removes half the
// problem for free. A resize re-fit does have one to undo, so that call
// still writes it, but the read is deferred a frame: requestAnimationFrame
// between the write and the read lets the browser fold the resulting layout
// pass into its own next-frame work instead of forcing it synchronously
// inside this handler.
function useFillWidth(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;

    function measure() {
      const rowWidth = el.parentElement.getBoundingClientRect().width;
      const naturalWidth = el.getBoundingClientRect().width;
      if (naturalWidth > 0) {
        el.style.transform = `scaleX(${rowWidth / naturalWidth})`;
      }
    }

    function refit() {
      el.style.transform = 'none';
      requestAnimationFrame(measure);
    }

    // Deferred a frame here too: the very first measure() still reads
    // geometry right after React's own initial commit just wrote this
    // element (and the rest of the page) into the DOM, which forced-reflow
    // flagged the same way — first geometry read after a pending layout
    // invalidation, regardless of which code did the invalidating. This
    // doesn't delay the wordmark's own text from painting: that happens on
    // React's normal commit, independent of when this scale correction
    // runs. Worst case is one frame at the CSS-only (close, not pixel-exact
    // — see useFillWidth's own comment above) size before the fit snaps in.
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', refit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', refit);
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
export default function HeroWordmark() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const mobileLogoRef = useRef(null);
  useFillWidth(mobileLogoRef, isMobile);

  if (isMobile) {
    return (
      <div className="hero-mobile-banner-logo-row" aria-hidden="true">
        <Logo ref={mobileLogoRef} className="hero-mobile-banner-logo" />
      </div>
    );
  }

  return (
    <div className="hero-stage hero-stage-back" aria-hidden="true">
      <div className="hero-logo-giant">
        <Logo />
      </div>
    </div>
  );
}
