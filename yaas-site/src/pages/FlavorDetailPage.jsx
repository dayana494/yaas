import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Footer from '../components/Footer';
import FlavorStorySection from '../components/FlavorStorySection';
import FlavorGallery from '../components/FlavorGallery';
import { FLAVORS } from '../data/flavors';
import { getFlavorStory } from '../data/flavorStories';
import { attachRiseDriver, createRiseDriver } from '../scroll/riseTransition';
import { enableTouchScrollNormalizer } from '../scroll/normalizeScroll';

gsap.registerPlugin(ScrollTrigger);
// Before any trigger is created — see scroll/normalizeScroll.js.
enableTouchScrollNormalizer();

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// /flavors/:slug — the per-flavor page. Two sections above the site footer:
// a scroll-pinned story where the can tumbles through its copy, then the
// "Try the Other Flavors" gallery that climbs up and covers it.
//
// Keyed entirely off the `slug` param and the shared FLAVORS registry, so the
// same page serves all five; only the rotation-story copy is per-flavor, and
// getFlavorStory falls back to that flavor's own flavors.js title/description
// for the four that don't have theirs written yet.
export default function FlavorDetailPage() {
  const { slug } = useParams();
  const flavor = FLAVORS.find((f) => f.id === slug);
  // Memoized because the story section keys its scroll timeline off
  // rotationBlocks' identity: for the four flavors without an entry of their
  // own, getFlavorStory builds a fresh fallback object on every call, which
  // would tear the timeline down and rebuild it on every single render.
  const story = useMemo(() => (flavor ? getFlavorStory(flavor) : null), [flavor]);

  // The pinned/scrubbed story runs at every width — phone and tablet included,
  // where an earlier version of this page dropped it for a plain stacked
  // fallback. Only an explicit prefers-reduced-motion still degrades to that
  // fallback, which is what the setting is actually asking for; a narrow
  // screen is not. The type and the composition adapt at the breakpoints
  // instead (see styles/flavor-detail.css), the animation does not.
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const simpleMode = reducedMotion;

  // Arriving from another flavor's gallery card keeps the router's scroll
  // position, which on this page means landing halfway through the previous
  // page's tumble. Reset it, then let ScrollTrigger remeasure the sections it
  // just scrolled past.
  useEffect(() => {
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [slug]);

  // Rounds the gallery's top corners into a dome while it climbs over the
  // story section and flattens them as it finishes covering — the shared
  // driver from scroll/riseTransition.js, the same one the homepage runs for
  // .screen2 and .advantages, not a second copy of the effect.
  //
  // allWidths, unlike the homepage's: there every overlapping handover flattens
  // into plain flow below 1024, and attachRiseDriver would take this one off
  // the ticker with them. This page keeps its climb on a phone, so the driver
  // has to keep writing --rise-radius there. Only simple mode has nothing to
  // drive, because nothing is pinned for the gallery to climb over.
  useEffect(() => {
    if (!flavor || simpleMode) return undefined;
    const driveRise = createRiseDriver(['.flavor-gallery']);
    return attachRiseDriver(gsap.ticker, driveRise, { allWidths: true });
  }, [flavor, simpleMode]);

  if (!flavor) {
    return (
      <div className="page">
        <section className="flavor-detail-placeholder">
          <div className="site-container">
            <h1 className="flavor-detail-heading">Flavor Not Found</h1>
            <p className="flavor-detail-copy">
              We couldn&rsquo;t find that one — check out the full lineup instead.
            </p>
            <Link className="flavor-detail-back" to="/flavors">
              ← Back to Flavors
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page flavor-detail-page">
      <FlavorStorySection flavor={flavor} story={story} simpleMode={simpleMode} />
      <FlavorGallery activeFlavorId={flavor.id} simpleMode={simpleMode} />
      <Footer />
    </div>
  );
}
