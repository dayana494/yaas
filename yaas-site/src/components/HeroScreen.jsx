import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import SiteHeader from './SiteHeader';
import { HERO } from '../data/homepageCopy';
import { SECTION_FLAVORS } from '../data/navLinks';
import { scrollToSection } from '../scroll/sectionNav';
import { useHeroScale } from '../hooks/useHeroScale';

gsap.registerPlugin(ScrollToPlugin);

// scrollToSection now lives in scroll/sectionNav.js, shared with the footer:
// the two surfaces had their own copies and had drifted apart. The eased-jump
// and pin-spacer reasoning that used to be written out here is in that file.
//
// The menu itself is now SiteHeader, and the 1200x650 stage maths is now
// hooks/useHeroScale — both moved out verbatim so the flavor detail pages can
// build their own first screen on exactly this grid instead of approximating
// it. Nothing about this screen's own markup or sizing changed in the move.

function handleFlavorsCtaClick(event) {
  if (scrollToSection(SECTION_FLAVORS)) event.preventDefault();
}

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
        <SiteHeader />

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
