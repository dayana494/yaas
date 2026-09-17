import { useRef } from 'react';
import SectionHeading from './SectionHeading';
import HeroGradientBackground from './HeroGradientBackground';
import ContactCans from './ContactCans';
import { CONTACT } from '../data/homepageCopy';

// The cans used to be a third WebGL canvas here, lazily imported so three.js
// and @react-three/fiber only arrived once the section neared the viewport.
// They are flat renders of the same model now (ContactCans.jsx), so there is
// no chunk to defer and nothing to gate on visibility — two images the browser
// lazy-loads by itself.

// Screen 7 — Contact. Figma node 309:195: a rounded gradient panel inset from
// the section's own edges, the heading centred on it at the site's shared block
// scale, two outline pills below it, and an Orange can and a Blueberry can
// tilted +-15deg overlapping the panel's corners.
//
// The cans are flat renders OF that same model (ContactCans.jsx), captured
// through the app's own ?shot= route at the exact poses the 3D rig used to
// draw them at — same can.glb, same label materials, same endless sine yoyo,
// one fewer WebGL context on the page. The hero, the gallery and Screen 2
// still run the live model.
//
// Rendered inside the About the Brand section (BrandTeaserScreen.jsx) rather
// than as a sibling of it, so the two share one background layer and the join
// between them has no seam — the same arrangement the FAQ has inside the
// Advantages section.
export default function ContactSection() {
  const panelRef = useRef(null);
  return (
    <section className="contact" id="contact">
      <div className="contact-frame">
        <div className="contact-panel" ref={panelRef}>
          <HeroGradientBackground />

          <div className="contact-content">
            <SectionHeading as="h2" className="contact-heading" text={CONTACT.h2} />

            <div className="contact-actions">
              {/* A real control either way. With an address it is a link; until
                  there is one it is a button — which still hovers, still takes
                  the pointer cursor and still takes keyboard focus, where the
                  <span> it used to be did none of those and read as dead. Adding
                  the href later switches this branch and nothing else. */}
              {CONTACT.actions.map((action) =>
                action.href ? (
                  <a key={action.label} className="hero-pill contact-pill" href={action.href}>
                    {action.label}
                    <span className="contact-pill-arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                ) : (
                  <button key={action.label} className="hero-pill contact-pill" type="button">
                    {action.label}
                    <span className="contact-pill-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Outside the panel, not inside it: in the mock both cans cross the
            panel's edge, and the panel clips (overflow: hidden, for its own
            rounded corners). */}
        <ContactCans panelRef={panelRef} />
      </div>
    </section>
  );
}
