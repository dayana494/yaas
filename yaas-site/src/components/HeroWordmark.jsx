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
function useFillWidth(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return undefined;

    function fit() {
      el.style.transform = 'none';
      const rowWidth = el.parentElement.getBoundingClientRect().width;
      const naturalWidth = el.getBoundingClientRect().width;
      if (naturalWidth > 0) {
        el.style.transform = `scaleX(${rowWidth / naturalWidth})`;
      }
    }

    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
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
