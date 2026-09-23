import { useCallback, useEffect, useRef, useState } from 'react';
import DropText from './DropText';
import FlavorStripCard from './FlavorStripCard';
import { FLAVORS } from '../data/flavors';
import { GALLERY_HEADING } from '../data/flavorStories';
import { asset } from '../data/assetUrl';
import { onRealResize } from '../scroll/onRealResize';

// "Try the Other Flavors" — the block that climbs up over the story section
// above it. The climb itself is the site's shared rise transition: this
// section carries margin-top: -100dvh and a --rise-radius written per frame
// by scroll/riseTransition.js (see FlavorDetailPage, which attaches the
// driver), exactly as .screen2 and .advantages already do on the homepage.
export default function FlavorGallery({ activeFlavorId, simpleMode }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setAtStart(track.scrollLeft <= 1);
    // A 1px slack on both ends: sub-pixel card widths mean scrollLeft rarely
    // lands exactly on 0 or on max, which would leave both arrows permanently
    // enabled at the ends.
    setAtEnd(max <= 1 || track.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    syncEdges();
    track.addEventListener('scroll', syncEdges, { passive: true });
    const offSyncEdges = onRealResize(syncEdges);
    return () => {
      track.removeEventListener('scroll', syncEdges);
      offSyncEdges();
    };
  }, [syncEdges]);

  const scrollByCard = useCallback((direction) => {
    const track = trackRef.current;
    const card = track?.firstElementChild;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: (card.getBoundingClientRect().width + gap) * direction, behavior: 'smooth' });
  }, []);

  return (
    <section className={`flavor-gallery${simpleMode ? ' is-simple' : ''}`}>
      {/* The same ground the homepage's About the Brand block stands on: white,
          with the outline wordmark filling it behind the content. Same asset,
          same sizing rules (see .about-brand-bg in brand-teaser.css). */}
      <div className="flavor-gallery-bg" aria-hidden="true">
        <img src={asset('/images/about-brand-wordmark.svg')} alt="" />
      </div>

      <div className="site-container">
        <DropText as="h2" className="flavor-gallery-heading" text={GALLERY_HEADING} />

        {/* The arrows are row items flanking the track, not overlays on top of
            it: sitting over the cards they covered the outer two at rest and
            clipped the raised can on hover. Flanking means they cannot overlap
            a card in any state or at any width. */}
        <div className="flavor-gallery-viewport">
          <button
            type="button"
            className={`arrow arrow-gallery arrow-gallery-prev${atStart ? ' is-disabled' : ''}`}
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label="Previous flavors"
          >
            <img src={asset('/icons/arrow-left.svg')} alt="" />
          </button>

          <div className="flavor-gallery-track" ref={trackRef}>
            {FLAVORS.map((flavor) => (
              <FlavorStripCard key={flavor.id} flavor={flavor} isActive={flavor.id === activeFlavorId} />
            ))}
          </div>

          <button
            type="button"
            className={`arrow arrow-gallery arrow-gallery-next${atEnd ? ' is-disabled' : ''}`}
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label="Next flavors"
          >
            <img src={asset('/icons/arrow-right.svg')} alt="" />
          </button>
        </div>
      </div>
    </section>
  );
}
