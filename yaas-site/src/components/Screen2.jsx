import ScenarioArcGallery from './ScenarioArcGallery';
import ScenarioCardsIsometric from './ScenarioCardsIsometric';

// Homepage screen 2 — a pinned stage holding the headline, the concave-arc
// scenario gallery and its expand (Figma node 258:208), handing straight
// over to the existing scroll-pinned scenario card stack. The two pins sit
// back to back: the arc's last frame leaves the party photo at exactly the
// geometry .scenario-card-iso uses, so the stack's own first card takes over
// in place rather than sliding in. Background (white + a faint texture) is
// one layer behind both halves.
export default function Screen2() {
  return (
    <section className="screen2">
      <div className="screen2-bg-fixed" aria-hidden="true" />
      <div className="screen2-bg-texture" aria-hidden="true" />
      <ScenarioArcGallery />
      <ScenarioCardsIsometric />
    </section>
  );
}
