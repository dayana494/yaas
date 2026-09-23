import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { FLAVORS, DEFAULT_FLAVOR_INDEX } from '../data/flavors';
import { getHeroCans } from './heroLayout';

const TEXTURE_URLS = FLAVORS.map((f) => f.texture);

// The lid and base. One instance shared by every can on the site — it is the
// same bare aluminium on all of them, and it carries no map, which is the point:
// it is what the caps get instead of the label (see the material groups in
// useCanGeometry).
//
// Deliberately NOT a high-metalness metal. A physically-metallic material has no
// diffuse term at all and shows only what it reflects, so with this project's
// lighting rig — a hemisphere plus three directional lights, no environment map
// (three/Lighting.jsx) — metalness near 1 renders close to black. The label
// material next to it works for the same reason in reverse: at 0.35 most of its
// response is diffuse. So the cap sits in the same family and gets its brighter,
// harder read from a lower roughness instead, which tightens the highlight the
// directional lights leave on it.
export const CAN_CAP_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#dcdce1',
  metalness: 0.45,
  roughness: 0.26,
});

function configureTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

const textureLoader = new THREE.TextureLoader();
const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb) => setTimeout(cb, 1);
const cancelIdle = typeof cancelIdleCallback === 'function' ? cancelIdleCallback : clearTimeout;

// Resolves once flavor i's material has its real label map. The preloader
// (index.html) stays up until the hero cluster's three labels are in, so the
// cans never fly in as flat brand-color placeholders — see CanRig's onReady.
const textureLoaded = FLAVORS.map(() => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
});
textureLoaded[DEFAULT_FLAVOR_INDEX].resolve();

export function whenTexturesLoaded(indices) {
  return Promise.all(indices.map((i) => textureLoaded[i].promise));
}

// The deferred queue starts with the hero cluster's two other flavors, since
// they are on screen from the first frame; the rest keep registry order.
const HERO_INDICES = getHeroCans(false).map((can) => can.flavorIndex);

// Loads only the on-screen (DEFAULT_FLAVOR_INDEX) flavor's label texture up
// front — via useTexture, so it still suspends the can mesh until that one
// decode/upload finishes, same as before, just for one texture instead of
// five — and defers the other four to idle time after the page has settled,
// one at a time, so they never bunch into a single long main-thread task the
// way loading all five synchronously used to (measured as one ~1.5s task on
// load in PageSpeed's trace, the single biggest contributor to this page's
// Total Blocking Time).
//
// Material OBJECT IDENTITY is kept stable across this whole process on
// purpose: CanRig.jsx holds onto `materials[i]` across frames and mutates
// `.color` on it directly for the hover/settle tint (see its own
// `.color.copy()`/`.color.lerp()` calls). So a deferred texture is applied by
// mutating that SAME material's `.map` in place once it arrives, never by
// swapping in a new material object — swapping would silently detach every
// reference CanRig already took. Until its real texture lands, a non-default
// flavor's can renders as a flat fill in the flavor's own brand color
// (already in FLAVORS) rather than blank/white, so the placeholder reads as
// "still loading", not "broken".
export function useCanMaterials() {
  const defaultTexture = useTexture(TEXTURE_URLS[DEFAULT_FLAVOR_INDEX]);

  const materials = useMemo(
    () =>
      FLAVORS.map((flavor, i) =>
        i === DEFAULT_FLAVOR_INDEX
          ? new THREE.MeshStandardMaterial({
              map: configureTexture(defaultTexture),
              metalness: 0.35,
              roughness: 0.4,
            })
          : new THREE.MeshStandardMaterial({ color: flavor.color, metalness: 0.35, roughness: 0.4 })
      ),
    // defaultTexture is a stable, drei-cached object for the life of this
    // component — this only ever needs to build the five materials once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    let cancelled = false;
    let handle;
    const pending = FLAVORS.map((_, i) => i)
      .filter((i) => i !== DEFAULT_FLAVOR_INDEX)
      .sort((a, b) => HERO_INDICES.includes(b) - HERO_INDICES.includes(a));

    function loadNext() {
      if (cancelled) return;
      const i = pending.shift();
      if (i === undefined) return;
      textureLoader.load(TEXTURE_URLS[i], (texture) => {
        if (cancelled) return;
        materials[i].map = configureTexture(texture);
        materials[i].color.set('#ffffff');
        materials[i].needsUpdate = true;
        textureLoaded[i].resolve();
        handle = idle(loadNext);
      });
    }
    handle = idle(loadNext);

    return () => {
      cancelled = true;
      cancelIdle(handle);
    };
  }, [materials]);

  return materials;
}

// Only the default (on-screen) flavor is preloaded eagerly now — see the
// hook above for why the other four are deferred instead of all five
// loading through this at once.
useTexture.preload(TEXTURE_URLS[DEFAULT_FLAVOR_INDEX]);
