import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ADVANTAGES } from '../data/advantages';

// Flat 3-slot resting layout (center / left / right), matching the two
// approved Figma frames (node 92:85, node 140:74) exactly:
//   delta 0            -> centered, upright, 100% opacity, y = 0 (top of arc)
//   delta -1 (left)     -> rotate(-8.22deg), 70% opacity, y = ARC_DROP (down)
//   delta +1 (right)    -> rotate(+8.32deg), 70% opacity, y = ARC_DROP (down)
//   |delta| >= ~1.5     -> fully hidden (opacity 0), never just faded
// x is *exactly* linear in delta (x = delta * slotOffset) — every pair of
// adjacent cards is the same slotOffset apart at every instant of the
// scroll, not just at rest, which is what "equidistant while scrolling"
// requires. y is exactly quadratic in delta (a plain parabola, not a piecewise
// eased curve) — smooth and monotonic everywhere with no seam at the
// neighbor slot, tracing the rim of one circle centered under the middle
// card: 0 at the center, ARC_DROP at delta ±1, still climbing symmetrically
// beyond that as a card drifts fully off-stage. Rotation is linear the same
// way. Only opacity is piecewise (it has to reach exactly 0 and stay there).
const ROTATE_LEFT_DEG = -8.22;
const ROTATE_RIGHT_DEG = 8.32;
const NEIGHBOR_OPACITY = 0.7;
const HIDE_START = 1; // opacity starts dropping past the neighbor slot...
const HIDE_END = 1.5; // ...and hits exactly 0 by here.
// Flat px gap kept between a card's edge and its neighbor's nearest edge, so
// the 3 slots never overlap regardless of measured card width.
const CARD_GAP_PX = 40;
// How far below the centered card the resting left/right neighbors sit —
// the "depth" of the circular arc they travel along.
const ARC_DROP = 56;
// Card's natural aspect ratio (see .advantage-card's mobile aspect-ratio in
// advantages.css) minus a flat trim off the height — see measure() below.
const CARD_ASPECT_RATIO = 385 / 352;
const CARD_HEIGHT_TRIM = 25;

function cardStyleForDelta(delta, slotOffset) {
  const abs = Math.abs(delta);
  const x = delta * slotOffset;
  const y = ARC_DROP * delta * delta;
  const rot = delta <= 0 ? delta * -ROTATE_LEFT_DEG : delta * ROTATE_RIGHT_DEG;
  let opacity;
  if (abs <= HIDE_START) {
    opacity = 1 - (1 - NEIGHBOR_OPACITY) * abs;
  } else {
    const hideT = Math.min(1, (abs - HIDE_START) / (HIDE_END - HIDE_START));
    opacity = NEIGHBOR_OPACITY * (1 - hideT);
  }
  return { rot, x, y, opacity: Math.max(0, Math.min(1, opacity)) };
}

const ArcCards = forwardRef(function ArcCards({ active }, ref) {
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  cardRefs.current = [];

  const slotOffsetRef = useRef(0);
  const lastProgressRef = useRef(0);
  const activeRef = useRef(active);
  activeRef.current = active;

  function applyProgress(progress) {
    // Inactive (mobile/simple mode) — cards render as a plain horizontal
    // scroll-snap row instead (see advantages.css); never touch their
    // inline style so nothing fights that layout.
    if (!activeRef.current) return;
    lastProgressRef.current = progress;
    const n = ADVANTAGES.length;
    const activeContinuous = progress * (n - 1);
    const slotOffset = slotOffsetRef.current;

    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const delta = i - activeContinuous;
      const { rot, x, y, opacity } = cardStyleForDelta(delta, slotOffset);
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg)`;
      el.style.opacity = String(opacity);
      // Fully hidden cards would otherwise still sit in the hit-test tree
      // (invisible but hoverable/focusable) — drop them from it entirely.
      el.style.pointerEvents = opacity < 0.05 ? 'none' : 'auto';
    });
  }

  useImperativeHandle(ref, () => ({ applyProgress }));

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    function measure() {
      const firstCard = cardRefs.current.find(Boolean);
      const cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 352;
      slotOffsetRef.current = cardWidth + CARD_GAP_PX;

      // Desktop cards are sized by width alone in CSS (see advantages.css);
      // height there is this same width's natural aspect ratio minus a flat
      // trim, set here (not in CSS) because a CSS custom property carrying a
      // width-relative % would get re-resolved against the wrong axis if
      // reused inside a height calc(). Mobile/simple mode leaves the CSS
      // aspect-ratio alone (no side-peek carousel to size there).
      const desktopHeight = activeRef.current ? `${cardWidth * CARD_ASPECT_RATIO - CARD_HEIGHT_TRIM}px` : '';
      cardRefs.current.forEach((el) => {
        if (el) el.style.height = desktopHeight;
      });

      applyProgress(lastProgressRef.current);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`advantages-arc-cards ${active ? 'is-arc-active' : ''}`.trim()} ref={stageRef}>
      {ADVANTAGES.map((adv, i) => (
        <article
          className="advantage-card"
          key={adv.id}
          ref={(el) => (cardRefs.current[i] = el)}
          style={{ '--card-color': adv.color }}
        >
          <span className="advantage-card-number">{adv.number}</span>
          <h3 className="advantage-card-title">{adv.title}</h3>
          <p className="advantage-card-description">{adv.description}</p>
        </article>
      ))}
    </div>
  );
});

export default ArcCards;
