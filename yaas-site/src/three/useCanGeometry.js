import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

export const MODEL_URL = '/models/can.glb';

// The source scan has no normals and a photogrammetry-atlas UV layout that
// doesn't match a printable label. We rebuild a clean cylindrical UV (U =
// angle, V = normalized height) so flat label art wraps correctly, then fix
// the U=0/1 seam by un-sharing seam-triangle vertices.
function buildGeometry(sourceGeometry) {
  const geometry = sourceGeometry.clone();
  geometry.computeVertexNormals();

  const nonIndexed = geometry.toNonIndexed();
  nonIndexed.computeBoundingBox();
  const { min, max } = nonIndexed.boundingBox;
  const yMin = min.y;
  const yMax = max.y;
  const yRange = yMax - yMin || 1;

  const pos = nonIndexed.attributes.position;
  const uv = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(x, z);
    uv[i * 2] = angle / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = (y - yMin) / yRange;
  }

  // Seam fix: any triangle whose 3 vertices straddle the U=0/1 wraparound
  // gets its low-side U values pushed past 1 so the triangle interpolates
  // across a continuous range instead of tearing across the whole texture.
  for (let t = 0; t < pos.count; t += 3) {
    const idx = [t, t + 1, t + 2].map((v) => v * 2);
    const us = idx.map((k) => uv[k]);
    const spread = Math.max(...us) - Math.min(...us);
    if (spread > 0.5) {
      idx.forEach((k, n) => {
        if (us[n] < 0.5) uv[k] += 1;
      });
    }
  }

  nonIndexed.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  nonIndexed.computeBoundingSphere();
  return nonIndexed;
}

let cachedGeometry = null;

export function useCanGeometry() {
  const { scene } = useGLTF(MODEL_URL);
  return useMemo(() => {
    if (cachedGeometry) return cachedGeometry;
    let sourceGeometry = null;
    scene.traverse((child) => {
      if (!sourceGeometry && child.isMesh) sourceGeometry = child.geometry;
    });
    cachedGeometry = buildGeometry(sourceGeometry);
    return cachedGeometry;
  }, [scene]);
}

useGLTF.preload(MODEL_URL);
