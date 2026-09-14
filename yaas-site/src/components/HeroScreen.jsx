import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { HERO } from '../data/homepageCopy';

gsap.registerPlugin(ScrollToPlugin);

// Every in-page jump on this screen — eased instead of an instant native
// jump. Anything already pinned by GSAP is wrapped in a pin-spacer by then,
// and it's the spacer that holds the section's real document slot (the
// section itself is position:fixed while pinned, so its own rect reports
// where it's stuck on screen instead), so the scroll target is read off
// whichever of the two is actually in normal flow.
//
// #flavors (the merged hero+gallery section) is the one special case: its
// own top is scrollY 0, so jumping straight there would be a no-op. The real
// destination is one viewport further down, exactly where the hero->gallery
// entrance ScrollTrigger's own `end` sits — i.e. past the entrance, with the
// gallery cans already settled.
function scrollToSection(hash) {
  const el = document.querySelector(hash);
  if (!el) return false;
  const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
  let y = box.getBoundingClientRect().top + window.scrollY;
  if (hash === '#flavors') y += window.innerHeight;
  gsap.to(window, { duration: 1, ease: 'power2.inOut', scrollTo: { y } });
  return true;
}

function handleNavClick(event) {
  const hash = event.currentTarget.getAttribute('href');
  if (!hash?.startsWith('#')) return;
  // Only take over once the target actually exists on this page; otherwise
  // the plain anchor keeps working.
  if (scrollToSection(hash)) event.preventDefault();
}

function handleFlavorsCtaClick(event) {
  if (scrollToSection('#flavors')) event.preventDefault();
}

// Matches the Figma frame exactly (node 47:21, Frame 40: 1200x650) so every
// position below can be lifted straight from the design instead of
// re-derived. CSS can't turn a viewport length into the unitless number
// scale() needs (calc() only divides length-by-number, never
// length-by-length), so the ratio is computed here and mirrored into a
// --hero-scale custom property; the desktop rule in hero.css just does
// scale(var(--hero-scale)). Using min(width-ratio, height-ratio) — a
// "contain" fit — instead of width alone is what keeps the whole stage
// inside the viewport on short/wide windows instead of overflowing top and
// bottom.
//
// The width ratio is computed against (viewport width - 2*SIDE_MARGIN)
// instead of the raw viewport width, and the stage itself stays centered
// in the *full* viewport — so once width is the binding constraint, the
// scaled 1200-wide stage is exactly viewportWidth - 2*SIDE_MARGIN wide,
// leaving a fixed SIDE_MARGIN gutter on each side at any screen size (never
// scaled away). Nav/logo are laid out edge-to-edge within the 1200 stage
// (see hero.css) so that gutter is the only margin they get.
const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 650;
const SIDE_MARGIN = 30;

function useHeroScale() {
  useEffect(() => {
    const root = document.documentElement;
    function update() {
      const scale = Math.min(
        (window.innerWidth - SIDE_MARGIN * 2) / STAGE_WIDTH,
        window.innerHeight / STAGE_HEIGHT
      );
      root.style.setProperty('--hero-scale', String(scale));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
}

// Figma node 270:174: three pills together at the left, one on its own at
// the right edge. Each points at a real section of this page, so the click
// handler above can ease the scroll to it.
const NAV_LINKS_LEFT = [
  { label: 'Flavors', href: '#flavors' },
  { label: 'About us', href: '#about' },
  { label: 'FAQ', href: '#faq' },
];
const NAV_LINK_RIGHT = { label: 'Contacts', href: '#contact' };

// DOM layer for the hero's nav/headline/copy (the "front" stage — see
// .hero-stage in hero.css for the fixed-canvas + scale-transform sizing).
// The giant background wordmark used to live here too; it's now
// HeroWordmark, rendered separately inside .app-root (App.jsx) so it can
// sit behind the can canvas instead of in front of it, now that hero and
// gallery share one Canvas. Both still scale together pixel-for-pixel via
// the same --hero-scale custom property.
// `textVisible` is flipped by CanRig's onEntranceStart callback, right as
// the cluster cans start flying — so the text fades/slides in alongside the
// can animation instead of after it.
export default function HeroScreen({ textVisible }) {
  useHeroScale();

  return (
    <div className="hero-screen">
      <div className="hero-stage hero-stage-front">
        <nav className="hero-nav">
          <div className="hero-nav-left">
            {NAV_LINKS_LEFT.map((link) => (
              <a key={link.label} className="hero-pill" href={link.href} data-interactive onClick={handleNavClick}>
                {link.label}
              </a>
            ))}
          </div>

          <a className="hero-pill hero-nav-right" href={NAV_LINK_RIGHT.href} data-interactive onClick={handleNavClick}>
            {NAV_LINK_RIGHT.label}
          </a>
        </nav>

        <div className={`hero-copy ${textVisible ? 'is-visible' : ''}`}>
          <div className="hero-copy-row">
            <p className="hero-subhead">{HERO.subhead}</p>
            <a className="hero-cta" href="#flavors" data-interactive onClick={handleFlavorsCtaClick}>
              {HERO.cta}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
