import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { SECTION_ABOUT, SECTION_FLAVORS } from '../data/navLinks';
import { ENTRANCE_UNITS, introUnitsPx } from '../data/layout';
import { overlapEnabled } from './riseTransition';

// Sections whose document top is not where they visually begin, in pixels.
//
// #about is a case of this page's handover pattern, where a section is pulled
// up by a viewport (margin-top: -100dvh) so the block above can travel across
// it and uncover it. Aiming at its real top therefore lands a full screen
// early, inside the previous block: measured at 1440, the element under the
// middle of the screen at #about's own top is .faq-list, and only one viewport
// further down does it become .about-brand-deck. Desktop only: below 1024
// there is no handover and no negative margin, so its top is its top.
//
// #flavors is the gallery, which sits at the end of the intro's scroll-scrubbed
// entrance rather than at its start. That entrance is shorter below 1024
// (introUnitsPx), and a short dead gap after it leads into the flavor card's
// own scrubbed flight — so it is aimed at exactly the end of the entrance.
function sectionOffsetPx(hash) {
  if (hash === SECTION_FLAVORS) return introUnitsPx(ENTRANCE_UNITS);
  if (hash === SECTION_ABOUT) return overlapEnabled() ? window.innerHeight : 0;
  return 0;
}

// Smooth-scrolls the homepage to a section, and reports whether it could.
//
// Moved here from HeroScreen so the footer can use the same one — the two used
// to behave differently for identically-labelled links.
//
// Measures the pin-spacer rather than the section when there is one: every
// pinned section on this page sits inside a GSAP spacer, and the section's own
// box is the wrong thing to aim at once it is pinned (it reports where it is
// parked on screen, not where its scroll window begins).
export function scrollToSection(hash) {
  const el = document.querySelector(hash);
  if (!el) return false;
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  let y = box.getBoundingClientRect().top + window.scrollY;
  y += sectionOffsetPx(hash);
  gsap.to(window, { duration: 1, ease: 'power2.inOut', scrollTo: { y } });
  return true;
}

// Router state key carrying "scroll here once the homepage is laid out". Read
// by HomePage, which is the only place that knows when its pinned sections have
// finished measuring — a scroll fired any earlier lands at a position that is
// about to be recomputed. See its own comment by the consumer.
export const SCROLL_TO_STATE = 'scrollTo';

// Click handler for a section link, wherever it is rendered.
//
// On the homepage it takes over the anchor and scrolls. Anywhere else the
// target does not exist in the DOM at all, so the plain hash did nothing but
// put '#faq' in the address bar and leave the reader where they were — the
// behaviour this hook exists to fix. There it routes to the homepage and hands
// the hash along for HomePage to act on after it has measured itself.
export function useSectionNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return useCallback(
    (event) => {
      // The href is a real, base-resolved URL ('/yaas/#faq'), not a bare '#faq'
      // — so opening it in a new tab, or landing on it with JS not yet running,
      // still goes to the homepage and that section rather than bolting the
      // hash onto whatever page the reader is on. Only the fragment matters
      // here, so take it off the end.
      const href = event.currentTarget.getAttribute('href') || '';
      const at = href.indexOf('#');
      if (at === -1) return;
      const hash = href.slice(at);
      // Let the browser handle anything the reader means to open elsewhere.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      if (pathname === '/') {
        scrollToSection(hash);
        return;
      }
      navigate('/', { state: { [SCROLL_TO_STATE]: hash } });
    },
    [navigate, pathname]
  );
}
