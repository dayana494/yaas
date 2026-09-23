import { useRef } from 'react';
import { useCarouselDrag } from '../hooks/useCarouselDrag';
import SectionHeading from './SectionHeading';
import { FLAVORS, FLAVOR_COUNT } from '../data/flavors';
import { SCREEN3_HEADING } from '../data/gallery';
import { asset } from '../data/assetUrl';
import { useOverlapEnabled } from '../scroll/riseTransition';

const TAP_THRESHOLD = 6;
// Fraction of the stage's half-width that counts as "the center can" —
// taps outside this band act like the left/right arrows instead.
const CENTER_ZONE_RATIO = 0.16;
// Below 1024 the side taps do nothing (see below), so the centre band can be
// as wide as the can itself there: at 390 the desktop ratio left a 62px strip
// down the middle of a can roughly three times that wide.
const CENTER_ZONE_RATIO_NARROW = 0.45;

export default function SliderScreen({ sceneRef, activeFlavor, onPickFlavor, onEnter, visible }) {
  // Below 1024 the flavors change on the arrows only. A finger on a phone is
  // almost never moving straight up: the sideways part of an ordinary scroll
  // gesture was read as a carousel drag and swapped the flavor under the
  // reader mid-scroll. So there the stage neither drags nor turns side taps
  // into prev/next — a tap on the centre can still opens its card.
  const desktop = useOverlapEnabled();
  const dragHandlers = useCarouselDrag(sceneRef, visible && desktop);
  const moved = useRef(0);

  function goPrev() {
    onPickFlavor((activeFlavor - 1 + FLAVOR_COUNT) % FLAVOR_COUNT);
  }
  function goNext() {
    onPickFlavor((activeFlavor + 1) % FLAVOR_COUNT);
  }

  const handlers = {
    onPointerDown: (e) => {
      moved.current = 0;
      dragHandlers.onPointerDown(e);
    },
    onPointerMove: (e) => {
      if (e.buttons === undefined || e.pressure > 0 || e.buttons > 0) {
        moved.current += Math.abs(e.movementX || 0);
      }
      dragHandlers.onPointerMove(e);
    },
    onPointerUp: (e) => {
      if (moved.current >= TAP_THRESHOLD) {
        dragHandlers.onPointerUp(e);
        return;
      }
      // A tap, not a drag — clear the drag state without committing an
      // inertia settle (that would fire ~0.4s later and override whatever
      // this tap navigates to).
      dragHandlers.cancelDrag();
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetFromCenter = e.clientX - (rect.left + rect.width / 2);
      const zoneWidth = (rect.width / 2) * (desktop ? CENTER_ZONE_RATIO : CENTER_ZONE_RATIO_NARROW);
      if (Math.abs(offsetFromCenter) < zoneWidth) onEnter();
      else if (!desktop) return;
      else if (offsetFromCenter < 0) goPrev();
      else goNext();
    },
    onPointerCancel: dragHandlers.onPointerCancel,
    onPointerLeave: dragHandlers.onPointerLeave,
  };

  const flavor = FLAVORS[activeFlavor];

  return (
    <div className={`slider-screen ${visible ? '' : 'is-hidden'}`}>
      <SectionHeading as="h2" className="slider-heading" text={SCREEN3_HEADING} />

      <div className="slider-stage" data-interactive {...handlers} />

      <button type="button" className="arrow arrow-left" data-interactive aria-label="Previous flavor" onClick={goPrev}>
        <img src={asset('/icons/arrow-left.svg')} alt="" />
      </button>
      <button type="button" className="arrow arrow-right" data-interactive aria-label="Next flavor" onClick={goNext}>
        <img src={asset('/icons/arrow-right.svg')} alt="" />
      </button>

      <div className="flavor-name" key={flavor.id}>
        {flavor.title}
      </div>
    </div>
  );
}
