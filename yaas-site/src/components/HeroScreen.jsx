import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { HERO } from '../data/homepageCopy';
import {
  FLAVORS_ROUTE,
  SECTION_ABOUT,
  SECTION_CONTACT,
  SECTION_FAQ,
  SECTION_FLAVORS,
} from '../data/navLinks';
import { scrollToSection, useSectionNav } from '../scroll/sectionNav';

gsap.registerPlugin(ScrollToPlugin);

// scrollToSection now lives in scroll/sectionNav.js, shared with the footer:
// the two surfaces had their own copies and had drifted apart. The eased-jump
// and pin-spacer reasoning that used to be written out here is in that file.

function handleFlavorsCtaClick(event) {
  if (scrollToSection(SECTION_FLAVORS)) event.preventDefault();
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
// the right edge.
//
// Flavors is a route, not an anchor: the gallery has its own page, and the
// footer has always linked there while this menu scrolled to the homepage's
// copy of it instead. Both go to the page now. The rest are sections of this
// page, eased to by useSectionNav — which also handles being clicked from
// another page, where they previously did nothing at all.
const NAV_LINKS_LEFT = [
  { label: 'About us', href: SECTION_ABOUT },
  { label: 'FAQ', href: SECTION_FAQ },
];
const NAV_LINK_RIGHT = { label: 'Contacts', href: SECTION_CONTACT };

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
  const handleNavClick = useSectionNav();

  return (
    <div className="hero-screen">
      <div className="hero-stage hero-stage-front">
        <nav className="hero-nav">
          <div className="hero-nav-left">
            <Link className="hero-pill" to={FLAVORS_ROUTE} data-interactive>
              Flavors
            </Link>
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
