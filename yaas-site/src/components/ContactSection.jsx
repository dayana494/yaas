import { useRef } from 'react';
import SectionHeading from './SectionHeading';
import HeroGradientBackground from './HeroGradientBackground';
import ContactCansScene from '../three/ContactCansScene';
import { CONTACT } from '../data/homepageCopy';

// Screen 7 — Contact. Figma node 309:195: a rounded gradient panel inset from
// the section's own edges, the heading centred on it at the site's shared block
// scale, two outline pills below it, and an Orange can and a Blueberry can
// tilted +-15deg overlapping the panel's corners.
//
// The cans are the site's existing 3D model with its existing label materials
// (three/ContactCanRig.jsx), not flat renders — the same can.glb the hero
// cluster, the gallery and Screen 2 all use. They float on an endless sine
// yoyo.
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

        {/* Over the whole section, not just the panel: in the mock both cans
            cross the panel's edge, and a WebGL canvas clips to its own box. */}
        <ContactCansScene panelRef={panelRef} />
      </div>
    </section>
  );
}
