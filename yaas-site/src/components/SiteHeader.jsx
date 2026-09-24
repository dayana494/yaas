import {
  SECTION_ABOUT,
  SECTION_CONTACT,
  SECTION_FAQ,
  SECTION_FLAVORS,
  sectionHref,
} from '../data/navLinks';
import { useSectionNav } from '../scroll/sectionNav';

// The site menu — one component for every surface that shows it.
//
// Figma node 270:174: three pills together at the left, one on its own at the
// right edge. It used to be written out inline in HeroScreen, which meant the
// flavor pages either went without a menu or would have grown a second copy of
// this markup to drift out of sync with the first. It renders identically on
// both because both put it inside the same fixed 1200x650 hero stage (see
// hooks/useHeroScale) — the pills' sizing in hero.css is unchanged and still
// keyed off .hero-nav/.hero-pill.
//
// Every item is a section of the homepage, eased to by useSectionNav — which
// also handles being clicked from another page (the flavor pages included),
// where a bare fragment would otherwise do nothing at all. Flavors used to be
// the exception, pointing at a page of its own; that page is gone and it now
// goes to the gallery the page was built from. The hrefs come from
// data/navLinks so this menu and the footer's can never disagree about where a
// label points.
const NAV_LINKS_LEFT = [
  { label: 'Flavors', href: sectionHref(SECTION_FLAVORS) },
  { label: 'About us', href: sectionHref(SECTION_ABOUT) },
  { label: 'FAQ', href: sectionHref(SECTION_FAQ) },
];
const NAV_LINK_RIGHT = { label: 'Contacts', href: sectionHref(SECTION_CONTACT) };

export default function SiteHeader() {
  const handleNavClick = useSectionNav();

  return (
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
  );
}
