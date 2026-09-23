import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FLAVORS } from '../data/flavors';
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
function useCentredBottom(ref) {
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
  }, [ref]);
}

export default function DetailScreen({ activeFlavor, onPickFlavor, textVisible }) {
  const flavor = FLAVORS[activeFlavor];
  const copyRef = useRef(null);
  useCentredBottom(copyRef);

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
            Mobile/tablet only; display: none above 1023. */}
        <div className="detail-can-space" aria-hidden="true" />
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
