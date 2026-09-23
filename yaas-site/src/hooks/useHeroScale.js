import { useEffect } from 'react';
import { onRealResize } from '../scroll/onRealResize';

// The hero's fixed stage, shared by the homepage hero and every flavor detail
// page's first screen.
//
// Matches the Figma frame exactly (node 47:21, Frame 40: 1200x650) so every
// position inside it can be lifted straight from a design instead of
// re-derived. CSS can't turn a viewport length into the unitless number
// scale() needs (calc() only divides length-by-number, never
// length-by-length), so the ratio is computed here and mirrored into a
// --hero-scale custom property; the desktop rules in hero.css just do
// scale(var(--hero-scale)). Using min(width-ratio, height-ratio) — a
// "contain" fit — instead of width alone is what keeps the whole stage
// inside the viewport on short/wide windows instead of overflowing top and
// bottom.
//
// The width ratio is computed against (viewport width - 2*SIDE_MARGIN)
// instead of the raw viewport width, and the stage itself stays centered
// in the *full* viewport — so once width is the binding constraint, the
// scaled 1200-wide stage is exactly viewportWidth - 2*SIDE_MARGIN wide,
// leaving a fixed SIDE_MARGIN gutter on each side at any screen size (never
// scaled away). Nav/logo are laid out edge-to-edge within the 1200 stage
// (see hero.css) so that gutter is the only margin they get.
//
// Lives here rather than in HeroScreen because the flavor pages now build
// their own first screen on this same stage: same scale, same grid, so a
// flavor page's wordmark and menu land pixel-for-pixel where the homepage's
// do instead of being a second, drifting approximation of them.
export const STAGE_WIDTH = 1200;
export const STAGE_HEIGHT = 650;
export const SIDE_MARGIN = 30;

export function useHeroScale() {
  useEffect(() => {
    const root = document.documentElement;
    function update() {
      const scale = Math.min(
        (window.innerWidth - SIDE_MARGIN * 2) / STAGE_WIDTH,
        window.innerHeight / STAGE_HEIGHT
      );
      root.style.setProperty('--hero-scale', String(scale));
    }
    update();
    const offUpdate = onRealResize(update);
    return () => offUpdate();
  }, []);
}

export default useHeroScale;
