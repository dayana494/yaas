import { lazy, Suspense, useRef } from 'react';
import SectionHeading from './SectionHeading';
import HeroGradientBackground from './HeroGradientBackground';
import { useLazyOnVisible } from '../three/deferredLoad';
import { CONTACT } from '../data/homepageCopy';

// A dynamic import(), not the static one this replaced: three.js,
// @react-three/fiber and ContactCanRig only enter the bundle through this
// call, in their own chunk, and useLazyOnVisible below decides when that
// chunk actually gets requested — see its comment in deferredLoad.js.
// Rendered from BOTH this route's own page AND, embedded via
// BrandTeaserScreen, deep inside the homepage: on /contacts the section is
// visible immediately, so the fetch starts right on mount same as before; on
// the homepage it sits well below the fold, so this is where the split
// actually earns its keep — the chunk isn't requested until the user has
// scrolled most of the way there.
const ContactCansScene = lazy(() => import('../three/ContactCansScene'));

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
  const sectionRef = useRef(null);
  const cansVisible = useLazyOnVisible(sectionRef);

  return (
    <section className="contact" id="contact" ref={sectionRef}>
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
        {cansVisible && (
          <Suspense fallback={null}>
            <ContactCansScene panelRef={panelRef} />
          </Suspense>
        )}
      </div>
    </section>
  );
}
