import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { SECTION_FLAVORS } from '../data/navLinks';

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
  // The gallery is the second screen of the intro pin, not its start, so its
  // anchor is one viewport into that pin's own scroll window.
  if (hash === SECTION_FLAVORS) y += window.innerHeight;
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
      const hash = event.currentTarget.getAttribute('href');
      if (!hash?.startsWith('#')) return;
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
