import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { asset } from '../data/assetUrl';
import {
  CAN_HEIGHT_MAX_PX,
  CAN_HEIGHT_MIN_PX,
  CAN_HEIGHT_RATIO,
  CAN_HEIGHT_RATIO_NARROW,
  CONTACT_CANS,
  CONTACT_CANS_NARROW,
  FLOAT_AMPLITUDE_PX,
  FLOAT_DURATION,
  FLOAT_STAGGER,
  NARROW_MAX_WIDTH,
} from '../data/contactLayout';

// The two cans beside the contact panel, as flat images rather than a third
// WebGL canvas.
//
// They are renders of the very same can.glb with the very same per-flavor
// materials, captured through the app's own ?shot= route at each can's exact
// pose (see ThumbnailShot.jsx) — so nothing about how they look is redrawn or
// re-approximated here, and the block loses a whole r3f canvas, its renderer
// and its ContactCansScene chunk. The hero and the gallery still run the real
// model; this section never needed a live one, since neither can ever moved
// except straight up and down.
//
// Placement is still measured rather than baked, and by exactly the arithmetic
// the 3D rig used: the mock's numbers are fractions of the PANEL's own box, so
// the panel's live rect is read against this layer's and the fractions applied
// to it. What changes is only the unit at the end — CSS pixels here, world
// units through a camera frustum before.
const SRC = {
  orange: asset('/images/cans/orange.webp'),
  blueberry: asset('/images/cans/blueberry.webp'),
};

// The captures' own pixel dimensions, so a can occupies its final box before
// the image has loaded — width is derived from height rather than left to the
// intrinsic ratio, which is not known until then.
//
// These are the capture's NATIVE crop, not a resampled version of it. The
// first pass downscaled 1583px to 1100 before saving, and a can is drawn at up
// to 543.5 CSS px tall — which on a 2x screen is 1087 device pixels, i.e. the
// softened image shown at essentially 1:1, and it read as blurry. Straight off
// the framebuffer with no resampling step at all, 1583 leaves 1.46x in hand
// there instead.
const NATURAL = {
  orange: { w: 1093, h: 1583 },
  blueberry: { w: 1092, h: 1583 },
};

// A capture frames the can's TILTED silhouette, which is taller than the
// upright model it was posed from — the rig's own heightPx describes the
// latter (scale = pxToWorld(heightPx) / the geometry's unrotated Y extent).
// Feeding heightPx straight to an image would therefore have drawn every can
// a little small. Measured from the same two shots: upright 1538px tall,
// tilted 15deg 1583px, in one capture frame.
const TILTED_HEIGHT_RATIO = 1583 / 1538;

export default function ContactCans({ panelRef }) {
  const layerRef = useRef(null);
  const canRefs = useMemo(() => CONTACT_CANS.map(() => ({ current: null })), []);
  const setCanRef = useMemo(() => canRefs.map((r) => (el) => (r.current = el)), [canRefs]);

  useEffect(() => {
    const layer = layerRef.current;
    const panel = panelRef.current;
    if (!layer || !panel) return undefined;

    const floats = [];
    let observer;

    const place = () => {
      const panelRect = panel.getBoundingClientRect();
      const layerRect = layer.getBoundingClientRect();
      if (!panelRect.width || !layerRect.width) return;

      const panelLeft = panelRect.left - layerRect.left;
      const panelTop = panelRect.top - layerRect.top;

      const narrow = layerRect.width < NARROW_MAX_WIDTH;
      const bodyHeight = narrow
        ? panelRect.height * CAN_HEIGHT_RATIO_NARROW
        : Math.max(
            CAN_HEIGHT_MIN_PX,
            Math.min(CAN_HEIGHT_MAX_PX, panelRect.height * CAN_HEIGHT_RATIO)
          );
      const height = bodyHeight * TILTED_HEIGHT_RATIO;

      floats.forEach((t) => t.kill());
      floats.length = 0;

      CONTACT_CANS.forEach((can, i) => {
        const el = canRefs[i].current;
        if (!el) return;
        const pose = narrow ? CONTACT_CANS_NARROW[i] : can;
        const natural = NATURAL[can.id];

        gsap.set(el, {
          left: panelLeft + panelRect.width * pose.x,
          top: panelTop + panelRect.height * pose.y,
          width: height * (natural.w / natural.h),
          height,
          // The fractions name each can's CENTRE, so the box is pulled back by
          // half itself. As GSAP percentages rather than a translate() of our
          // own, so the float's own y below composes with them instead of
          // overwriting the transform.
          xPercent: -50,
          yPercent: -50,
          y: 0,
        });

        // The same endless hover the rig ran: one sine-eased yoyo, staggered so
        // the pair doesn't pulse together. Negative because the rig raised the
        // can in world space, where +Y is up; on screen that is -y.
        floats.push(
          gsap.to(el, {
            y: -FLOAT_AMPLITUDE_PX,
            duration: FLOAT_DURATION,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: i * FLOAT_STAGGER,
          })
        );
      });
    };

    place();

    // Same reasoning the rig had for gating on visibility: repeat: -1 never
    // ends, so nothing would ever stop it on its own. Pausing holds the yoyo's
    // phase, so it resumes mid-float rather than snapping.
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        floats.forEach((f) => (visible ? f.play() : f.pause()));
      });
      observer.observe(layer);
    }

    const ro = new ResizeObserver(place);
    ro.observe(panel);

    return () => {
      observer?.disconnect();
      ro.disconnect();
      floats.forEach((t) => t.kill());
    };
  }, [panelRef, canRefs]);

  return (
    <div className="contact-cans" ref={layerRef} aria-hidden="true">
      {CONTACT_CANS.map((can, i) => (
        <img key={can.id} className="contact-can" ref={setCanRef[i]} src={SRC[can.id]} alt="" />
      ))}
    </div>
  );
}
