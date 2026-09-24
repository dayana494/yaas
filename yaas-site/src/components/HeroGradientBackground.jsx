import { asset } from '../data/assetUrl';

// Used to be a thin wrapper around a live WebGL shader (gradient/
// createGradient.js) below 1024px only, falling back to a static image
// above it. Now static everywhere, at every width.
//
// This component renders in four places — the hero, the advantages/FAQ
// block, contacts and the footer — and each one
// used to be its own WebGL context compiling its own shader and running its
// own render loop from the moment it mounted, regardless of whether it was
// ever on screen. There's a pause-when-off-screen guard inside
// createGradient() itself (an IntersectionObserver), but it can only fire
// once the main thread has a spare moment — and with everything else this
// page is doing at load, several instances kept actually computing and
// drawing frames for real seconds before that ever happened. Measured on
// PageSpeed: of ~14s of total main-thread work on a full load, ~11.7s of it
// was CPU time inside the bundle chunk this component's code lived in —
// by far the single largest cost on the page, well past the 3D can
// rendering or anything else here.
//
// The static image was already proven safe for this: it's the design's own
// gradient.jpg, re-encoded to WebP (1920x980, 23KB), and it was already the
// mobile fallback below 1024px, verified visually indistinguishable from the
// live shader (mean difference under 1 of 255 per channel across the full
// frame, worst pixel 6). This just makes that the only version, everywhere.
const STILL_URL = asset('/images/gradient-still.webp');

export default function HeroGradientBackground() {
  return (
    <div
      className="hero-gradient-wrap is-static"
      aria-hidden="true"
      style={{ backgroundImage: `url(${STILL_URL})` }}
    />
  );
}
