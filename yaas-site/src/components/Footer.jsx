import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import HeroGradientBackground from './HeroGradientBackground';
import Logo from './Logo';
import { FLAVORS } from '../data/flavors';
import { CONTACT } from '../data/homepageCopy';

// No font-size alone reliably fills an exact container width with a fixed
// 4-character string ("YAAS") — glyph metrics don't scale linearly with
// vw the way a percentage width would. Measuring the text's own natural
// (unscaled) width and stretching it horizontally with scaleX to match the
// row's real width is the standard fix for a "wordmark spans edge-to-edge"
// layout; re-measured on resize since the row's width and the text's own
// wrapped/natural width both change independently across breakpoints.
function useFillWidth(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

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
  }, [ref]);
}

// Site-wide footer — links to every homepage block (mirroring the header
// nav's Flavors/About us/Contacts/Collaboration set, plus the sections the
// header doesn't cover: Why YAAS, FAQ) and every flavor's own page. Two
// links are real standalone routes rather than same-page anchors —
// "Flavors" (/flavors) and "Contacts" (/contacts) — per spec; everything
// else jumps to its section on the homepage, using a plain `/#id` href
// (not a router Link) so it still resolves correctly from another page,
// not just from `/` itself.
const SITE_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Flavors', href: '/flavors', isRoute: true },
  { label: 'Why YAAS', href: '/#why-yaas' },
  { label: 'About', href: '/#about' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contacts', href: '/contacts', isRoute: true },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const logoRef = useRef(null);
  useFillWidth(logoRef);

  return (
    <footer className="site-footer">
      <HeroGradientBackground />
      <div className="site-container site-footer-inner">
        <div className="site-footer-logo-row">
          <Logo ref={logoRef} className="site-footer-logo-giant" />
        </div>
        <p className="site-footer-tagline">Zero-sugar energy for people who move at their own speed.</p>

        <div className="site-footer-grid">
          <nav className="site-footer-col" aria-label="Site">
            <span className="site-footer-col-title">Site</span>
            <ul className="site-footer-links">
              {SITE_LINKS.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link to={link.href}>{link.label}</Link>
                  ) : (
                    <a href={link.href}>{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav className="site-footer-col" aria-label="Flavors">
            <span className="site-footer-col-title">Flavors</span>
            <ul className="site-footer-links">
              {FLAVORS.map((flavor) => (
                <li key={flavor.id}>
                  <Link to={`/flavors/${flavor.id}`}>{flavor.title}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-footer-col" aria-label="Contact">
            <span className="site-footer-col-title">Contact</span>
            <ul className="site-footer-links">
              {CONTACT.channels.map((channel) => (
                <li key={channel.label}>
                  {channel.href ? (
                    <a href={channel.href}>{channel.label}</a>
                  ) : (
                    <span className="site-footer-static">{channel.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>© {year} YAAS. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
