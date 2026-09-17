import { Link } from 'react-router-dom';
import { FLAVORS } from '../data/flavors';
import FlavorSwitcher from './FlavorSwitcher';
import DropText from './DropText';

export default function DetailScreen({ activeFlavor, onPickFlavor, textVisible }) {
  const flavor = FLAVORS[activeFlavor];

  return (
    <div className="detail-screen">
      <div className={`detail-copy ${textVisible ? 'is-visible' : ''}`} key={flavor.id}>
        {/* Not scroll-triggered — this whole block remounts (via the `key`
            above) every time the flavor changes, which is exactly the cue
            DropText should replay on. It can't just play on mount, though:
            .detail-copy sits at opacity: 0 (not unmounted) until textVisible
            flips true once the 3D can-spin finishes, so `play` gates it to
            that same moment instead of dropping in while still invisible. */}
        <DropText as="h1" className="detail-title" text={flavor.title} animateOnScroll={false} play={textVisible} />
        {/* Stands in for the can, which is drawn in the 3D canvas behind this
            layer and so has no box of its own here. Giving it one lets the
            column space the four things — title, can, copy, button — evenly by
            itself, instead of the copy being pushed to the bottom and the can
            landing whereever its anchor happened to put it. Its height is the
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
