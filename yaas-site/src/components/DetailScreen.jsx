import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FLAVORS, FLAVOR_COUNT } from '../data/flavors';
import { asset } from '../data/assetUrl';
import FlavorSwitcher from './FlavorSwitcher';
import DropText from './DropText';

// The gap between the card's items below 1024 (layout.css).
const DETAIL_GAP_PX = 30;

// Below 1024 the card's description and CTA sit exactly where they would if
// all four items — title, can, copy, button — were stacked 30px apart and
// centred on the screen, while the title itself goes back up to the top of the
// column and the can sits halfway between the two. Where the bottom pair lands
// depends on how tall all four are (a two-line title, a five-line
// description), which CSS cannot sum, so it is measured here and handed to
// layout.css as --detail-bottom: the distance from the column's bottom edge to
// the button's. Re-measured whenever the column or anything in it resizes.
//
// `flavorId` is the column's own React key, and this hook is useless without
// it. .detail-copy is remounted per flavor (see the `key` below), so the node
// this was measuring is thrown away and replaced on every switch — but with
// only the ref object in the dependency list, which never changes identity,
// the effect never re-ran: the ResizeObserver went on watching a detached
// element and the new one was handed no --detail-bottom at all. It fell back
// to --detail-pad, and every flavor but the one the card is first entered on
// laid out against a number meant for a different column.
function useCentredBottom(ref, flavorId) {
  useLayoutEffect(() => {
    const copy = ref.current;
    if (!copy) return undefined;
    const measure = () => {
      const items = Array.from(copy.children);
      const itemsH = items.reduce((sum, el) => sum + el.offsetHeight, 0);
      const groupH = itemsH + DETAIL_GAP_PX * (items.length - 1);
      const bottom = Math.max(0, (copy.clientHeight - groupH) / 2);
      copy.style.setProperty('--detail-bottom', `${bottom}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(copy);
    Array.from(copy.children).forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [ref, flavorId]);
}

export default function DetailScreen({ activeFlavor, onPickFlavor, textVisible }) {
  const flavor = FLAVORS[activeFlavor];
  const copyRef = useRef(null);
  useCentredBottom(copyRef, flavor.id);

  // The gallery screen's own prev/next, wrapping the same way (SliderScreen).
  function goPrev() {
    onPickFlavor((activeFlavor - 1 + FLAVOR_COUNT) % FLAVOR_COUNT);
  }
  function goNext() {
    onPickFlavor((activeFlavor + 1) % FLAVOR_COUNT);
  }

  return (
    <div className="detail-screen">
      <div className={`detail-copy ${textVisible ? 'is-visible' : ''}`} key={flavor.id} ref={copyRef}>
        {/* Not scroll-triggered — this whole block remounts (via the `key`
            above) every time the flavor changes, which is exactly the cue
            DropText should replay on. It can't just play on mount, though:
            .detail-copy sits at opacity: 0 (not unmounted) until textVisible
            flips true once the 3D can-spin finishes, so `play` gates it to
            that same moment instead of dropping in while still invisible. */}
        <DropText as="h1" className="detail-title" text={flavor.title} animateOnScroll={false} play={textVisible} />
        {/* Stands in for the can, which is drawn in the 3D canvas behind this
            layer and so has no box of its own here. Giving it one lets the
            column space the four things — title, can, copy, button — by
            itself, and CanRig centres the real can on it. Its height is the
            can's own on-screen height, so the gaps either side of it are real.
            Mobile and tablet-portrait only; display: none elsewhere, which is
            also what takes the arrows below away where they don't belong.

            It is also what the arrows are centred on — they are its children
            rather than the card's, so "level with the can" needs no second
            copy of the maths that places it. They are out of flow, so the
            measurement above still reads this box as the can's height, and
            they mount with the copy rather than before it: the column is laid
            out and scrubbed into place at opacity 0, and an invisible arrow is
            still a clickable one. */}
        <div className="detail-can-space">
          {textVisible ? (
            <>
              <button
                type="button"
                className="arrow arrow-left detail-arrow"
                data-interactive
                aria-label="Previous flavor"
                onClick={goPrev}
              >
                <img src={asset('/icons/arrow-left.svg')} alt="" />
              </button>
              <button
                type="button"
                className="arrow arrow-right detail-arrow"
                data-interactive
                aria-label="Next flavor"
                onClick={goNext}
              >
                <img src={asset('/icons/arrow-right.svg')} alt="" />
              </button>
            </>
          ) : null}
        </div>
        <p className="detail-description">{flavor.description}</p>
        <Link className="detail-cta" to={`/flavors/${flavor.id}`} data-interactive>
          Learn more →
        </Link>
      </div>

      <div className={`detail-switcher-wrap ${textVisible ? 'is-visible' : ''}`}>
        <p className="choose-label">Choose the flavor</p>
        <FlavorSwitcher activeFlavor={activeFlavor} onPickFlavor={onPickFlavor} />
      </div>
    </div>
  );
}
