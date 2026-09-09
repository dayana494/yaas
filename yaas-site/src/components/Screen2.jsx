import ScenarioHeadline from './ScenarioHeadline';
import ScenarioCardsIsometric from './ScenarioCardsIsometric';

// Homepage screen 2 — line-by-line headline, then the scroll-pinned
// scenario card stack. Pure composition; each half owns its own GSAP work.
// The background (brand pink + a faint texture) is fixed (position:fixed,
// see .screen2-bg-fixed/.screen2-bg-texture) so it stays put behind both
// halves instead of scrolling away with them.
export default function Screen2() {
  return (
    <section className="screen2">
      <div className="screen2-bg-fixed" aria-hidden="true" />
      <div className="screen2-bg-texture" aria-hidden="true" />
      <ScenarioHeadline />
      <ScenarioCardsIsometric />
    </section>
  );
}
