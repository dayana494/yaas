import { useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { FLAVORS } from '../data/flavors';

const TEXTURE_URLS = FLAVORS.map((f) => f.texture);

// Preloads every label texture up front (per the perf brief) so switching
// flavors never causes a decode/upload stall, then builds one memoized
// MeshStandardMaterial per flavor, shared by every mesh that needs it.
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
