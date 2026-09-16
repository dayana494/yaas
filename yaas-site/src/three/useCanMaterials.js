import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { FLAVORS } from '../data/flavors';

const TEXTURE_URLS = FLAVORS.map((f) => f.texture);

// Preloads every label texture up front (per the perf brief) so switching
// flavors never causes a decode/upload stall, then builds one memoized
// MeshStandardMaterial per flavor, shared by every mesh that needs it.
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

export function useCanMaterials() {
  const textures = useTexture(TEXTURE_URLS);

  return useMemo(
    () =>
      FLAVORS.map((flavor, i) => {
        const texture = textures[i];
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        return new THREE.MeshStandardMaterial({
          map: texture,
          metalness: 0.35,
          roughness: 0.4,
        });
      }),
    [textures]
  );
}

useTexture.preload(TEXTURE_URLS);
