import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroGradientBackground from './HeroGradientBackground';
import Logo from './Logo';
import { FOOTER_TRIGGER_ID } from '../data/layout';
import { RISE_UNITS, overlapEnabled, useOverlapEnabled } from '../scroll/riseTransition';
import {
  FLAVORS_ROUTE,
  SECTION_ABOUT,
  SECTION_CONTACT,
  SECTION_FAQ,
  SECTION_WHY_YAAS,
  sectionHref,
} from '../data/navLinks';
import { useSectionNav } from '../scroll/sectionNav';
import { onRealResize } from '../scroll/onRealResize';

gsap.registerPlugin(ScrollTrigger);

// The wordmark's own box in Figma node 309:231: 1820 x 594.046 inside a
// 1920-wide frame — 94.8% of the block's width, and 0.3264 as tall as it is
// wide. Both numbers are the point of the fit below.
const WORDMARK_WIDTH_RATIO = 1820 / 1920;
const WORDMARK_ASPECT = 594.046 / 1820;
// And how much of the block's own height it is allowed to take (594 of 951 in
// the mock). The width alone cannot decide this: on a wide, short window the
// width-derived height overruns the block and the wordmark's box swallows the
// nav row underneath it — which is exactly what made the footer feel like
// nothing on it was clickable.
const WORDMARK_MAX_HEIGHT_RATIO = 594.046 / 951;

// Fits "YAAS" to the mock's own box rather than to whatever a font-size happens
// to produce.
//
// Two steps, because the two dimensions are set by different things. font-size
// controls the natural height, so it is solved for the target height; the
// natural WIDTH that comes with it is whatever the glyphs give (a fixed
// four-character string's advance width does not track font-size the way a
// percentage would), so a scaleX finishes the job. Doing only the scaleX — the
// previous version — left the height at the mercy of a clamp() and the wordmark
// a different shape at every width; doing only the font-size leaves it short of
// the edges. Together they reproduce the mock's rectangle at any width, which
// is what the spec asks for.
function useWordmarkFit(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    function fit() {
      // The row, not el.parentElement — the wordmark is wrapped in the home
      // link now, and that link is inline-block, so its width is the wordmark's
      // own rather than the full-bleed row this is supposed to be measured
      // against.
      const row = el.closest('.site-footer-logo-row');
      if (!row) return;
      el.style.transform = 'none';

      const block = el.closest('.site-footer');
      const blockHeight = block ? block.getBoundingClientRect().height : 0;
      let targetWidth = row.getBoundingClientRect().width * WORDMARK_WIDTH_RATIO;
      let targetHeight = targetWidth * WORDMARK_ASPECT;
      // Keep the mock's aspect, give up some width if the height would not fit.
      const maxHeight = blockHeight * WORDMARK_MAX_HEIGHT_RATIO;
      if (maxHeight > 0 && targetHeight > maxHeight) {
        targetHeight = maxHeight;
        targetWidth = targetHeight / WORDMARK_ASPECT;
      }

      // Solve for the font-size that gives the target height. One probe at a
      // known size is enough — glyph height is linear in font-size.
      const PROBE = 200;
      el.style.fontSize = `${PROBE}px`;
      const probeHeight = el.getBoundingClientRect().height;
      if (!probeHeight) return;
      const heightFit = (PROBE * targetHeight) / probeHeight;
      el.style.fontSize = `${heightFit}px`;

      const naturalWidth = el.getBoundingClientRect().width;
      if (!(naturalWidth > 0)) return;
      // Below 1024 the width is met with font-size too, never a scaleX: a
      // non-uniform transform on text is resampled after rasterisation and
      // reads soft on a phone screen — the same fix as the hero's wordmark
      // (HeroWordmark.jsx). Whichever of the two sizes is smaller wins, so the
      // wordmark keeps its own proportions and stays inside both limits.
      if (!overlapEnabled()) {
        el.style.fontSize = `${Math.min(heightFit, (heightFit * targetWidth) / naturalWidth)}px`;
        return;
      }
      el.style.transform = `scaleX(${targetWidth / naturalWidth})`;
    }

    fit();
    const offFit = onRealResize(fit);
    // The wordmark is set in Soledago, which loads with font-display: swap — the
    // first fit above runs against the fallback's metrics and would otherwise
    // stand.
    document.fonts?.ready.then(fit).catch(() => {});
    return () => offFit();
  }, [ref]);
}

// Figma node 309:231's own row, in its own order, pointing at the same targets
// as the header menu and from the same module — see data/navLinks.js for how
// the two had drifted apart.
//
// "Flavors" is the one real route: a standalone page built from the homepage's
// own gallery and flavor cards (pages/FlavorsPage.jsx). The rest are sections
// of the homepage, and sectionHref resolves each against BASE_URL so the link
// is a correct URL on its own — '/yaas/#faq' under GitHub Pages, where the
// hand-written '/#faq' these used to carry walked off the deploy root.
// useSectionNav then takes over an ordinary click for the smooth version.
const FOOTER_LINKS = [
  { label: 'Flavors', href: FLAVORS_ROUTE, isRoute: true },
  { label: 'Why YAAS', href: sectionHref(SECTION_WHY_YAAS) },
  { label: 'About Us', href: sectionHref(SECTION_ABOUT) },
  { label: 'FAQ', href: sectionHref(SECTION_FAQ) },
  { label: 'Contacts', href: sectionHref(SECTION_CONTACT) },
];

// Site-wide footer — Figma node 309:231: the wordmark filling the block, the
// nav row beneath it, a hairline, then the copyright and the credit. One
// viewport tall, on the same animated gradient as the hero.
//
// `reveal` is only set on the homepage. There it underlaps the About the
// Brand + Contacts section by a viewport and holds still for one, so that
// section's bottom edge travels up across it and uncovers it — the same
// handover, and the same rounding, that Advantages/FAQ makes onto About the
// Brand. Every other page renders the footer in plain flow.
export default function Footer({ reveal = false }) {
  const year = new Date().getFullYear();
  const logoRef = useRef(null);
  const footerRef = useRef(null);
  const handleNavClick = useSectionNav();
  useWordmarkFit(logoRef);
  const overlap = useOverlapEnabled();

  useEffect(() => {
    if (!reveal) return undefined;
    // No pinned rise below 1024. The block is sized by its content there rather
    // than held for a viewport while the section above travels off it, so there
    // is nothing for this trigger to drive — and leaving it in would reserve a
    // viewport of scroll for a handover that no longer happens. Read through
    // the shared breakpoint hook, so crossing it (a rotation) creates or removes
    // the trigger without a reload, matching the media query in footer.css that
    // drops the negative margin with it.
    if (!overlap) return undefined;
    const ctx = gsap.context(() => {
      // 'top top' is a placeholder, corrected once from HomePage after mount —
      // same chained-after-a-pin situation as every other pin on this page.
      ScrollTrigger.create({
        id: FOOTER_TRIGGER_ID,
        trigger: footerRef.current,
        start: 'top top',
        end: () => `+=${RISE_UNITS * window.innerHeight}`,
        pin: true,
        invalidateOnRefresh: true,
      });
    }, footerRef);
    return () => {
      // HomePage's correction pass replaces this trigger with one created
      // outside this context, which ctx.revert() would not reach.
      ScrollTrigger.getById(FOOTER_TRIGGER_ID)?.kill(true);
      ctx.revert();
    };
  }, [reveal, overlap]);

  return (
    <footer className={`site-footer ${reveal ? 'is-reveal' : ''}`} ref={footerRef}>
      <HeroGradientBackground />

      <div className="site-footer-inner">
        <div className="site-footer-logo-row">
          <Link className="site-footer-logo-link" to="/" aria-label="YAAS — home">
            <Logo ref={logoRef} className="site-footer-logo-giant" />
          </Link>
        </div>

        <nav className="site-footer-nav" aria-label="Site">
          {FOOTER_LINKS.map((link) =>
            link.isRoute ? (
              <Link key={link.label} className="hero-pill site-footer-pill" to={link.href}>
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                className="hero-pill site-footer-pill"
                href={link.href}
                onClick={handleNavClick}
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="site-footer-bottom">
          <span>© {year} YAAS. All rights reserved.</span>
          <span>Website design DVIGA</span>
        </div>
      </div>
    </footer>
  );
}
