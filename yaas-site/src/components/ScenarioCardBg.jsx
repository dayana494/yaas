import { useEffect, useRef } from 'react';
import { FLAVORS } from '../data/flavors';
import { lazyPhotoBackground } from '../data/scenarioPhoto';

const flavorById = Object.fromEntries(FLAVORS.map((f) => [f.id, f]));

// The photo layer of a scenario card, shared by the two places that draw one:
// the arc gallery's moving strip (Screen 2) and the isometric stack that takes
// over from it. Both used to set `backgroundImage` inline at render time, which
// fetched all five photos — 1.2MB — while the visitor was still looking at the
// hero four viewports above. See data/scenarioPhoto.js for what replaces that.
//
// The gradient below is the exact placeholder ScenarioCardsIsometric already
// used for a scenario with no photo yet, so a card waiting on its photo looks
// the way a card without one always has.
function fallbackFor(scenario) {
  const flavor = flavorById[scenario.flavor];
  return `linear-gradient(160deg, ${flavor.color} 0%, ${flavor.colorDark} 100%)`;
}

export default function ScenarioCardBg({ scenario }) {
  const ref = useRef(null);
  const photo = scenario.photo;
  const fallback = fallbackFor(scenario);

  useEffect(() => lazyPhotoBackground(ref.current, photo, fallback), [photo, fallback]);

  return <div className="scenario-card-bg" ref={ref} />;
}
