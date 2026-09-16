import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { asset } from '../data/assetUrl';

export const MODEL_URL = asset('/models/can.glb');

// The two material slots the returned geometry is grouped into. Every call site
// renders it with a two-entry material array in this order: the flavor's label
// on the barrel, bare metal on the lid and base.
export const CAN_LABEL_SLOT = 0;
export const CAN_CAP_SLOT = 1;

// The can as every screen on this site expects it: one geometry, standing on
// +Y, centred on the origin, exactly CAN_HEIGHT tall, smooth-shaded, with a
// clean cylindrical UV on the barrel and a separate material group for the caps.
//
// The source file is none of those things. It is a real 330ml can authored in
// Blender: three separate meshes (barrel, lid, base) in millimetres, 66mm across
// and 114mm end to end. Normalising it here rather than at the call sites is
// what keeps every position, scale and margin already tuned across CanRig,
// ContactCanRig and FlavorStoryCanRig working untouched — the model it replaced
// was 1.0011 units tall with a diameter/height ratio of 0.583, and this one
// comes out at 1.0 and 0.579, so the two are interchangeable to within half a
// percent.
const CAN_HEIGHT = 1;

// One mesh of the file is the barrel and the rest are caps, and which is which
// decides both the shading and the material split below. Picked by geometry
// rather than by node name: the names in this export are
// "Aluminum_Standard_Can_330ml_v_2" / "_21" / "_22", which say nothing about
// what each part is. The barrel is simply the part spanning the most of the
// can's axis — 103 units of 114 here, against 10.5 and 6.3 for the base and lid
// — and that stays true of any can-shaped model, which a name match would not.
function pickBarrel(parts) {
  let index = 0;
  let longest = -Infinity;
  parts.forEach((part, i) => {
    const span = part.boundingBox.max.y - part.boundingBox.min.y;
    if (span > longest) {
      longest = span;
      index = i;
    }
  });
  return index;
}

// Position only, baked through the node's own world matrix.
//
// Everything else is dropped on purpose. mergeVertices() treats two vertices as
// the same point only if *every* attribute matches, and this export carries
// split normals — so leaving the file's own normals on would stop coincident
// vertices from welding at all, which is the whole point of smoothPart below.
// The original UVs are a Blender unwrap with no relation to a printable label
// and get rebuilt regardless.
function preparePart(mesh) {
  const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', source.attributes.position.clone());
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingBox();
  return geometry;
}

// Weld, compute normals, un-weld — in that order, and the order is the fix.
//
// computeVertexNormals() averages the face normals meeting at a vertex, and on a
// NON-indexed geometry no two triangles ever share a vertex: each owns three
// private copies, so there is nothing to average and every vertex gets its own
// flat face normal back. That is not a subtle difference — it is the faceted,
// low-poly look the can had, with the smoothing pass running and mathematically
// unable to do anything. The model this replaced was a single indexed mesh with
// shared vertices, so the same code smoothed it fine and the assumption went
// unnoticed.
//
// So: weld coincident positions into an indexed geometry, average the normals
// there, then expand back out. The duplicated vertices each carry the correct
// smoothed normal afterwards. The rest of this file wants the non-indexed layout
// back because its UV and seam loops both read "three consecutive vertices =
// one triangle".
//
// Per part, not across the whole can: the barrel meets the lid and base at a
// crimped rim, which is a genuine hard edge and should not be averaged away.
function smoothPart(geometry) {
  const welded = mergeVertices(geometry);
  welded.computeVertexNormals();
  return welded.toNonIndexed();
}

function concatParts(parts) {
  let vertexCount = 0;
  for (const part of parts) vertexCount += part.attributes.position.count;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  let offset = 0;
  for (const part of parts) {
    positions.set(part.attributes.position.array, offset);
    normals.set(part.attributes.normal.array, offset);
    offset += part.attributes.position.array.length;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}

function buildGeometry(scene) {
  scene.updateMatrixWorld(true);

  const parts = [];
  scene.traverse((child) => {
    if (child.isMesh && child.geometry) parts.push(preparePart(child));
  });
  if (!parts.length) return new THREE.BufferGeometry();

  // One shared transform for every part, derived from the whole can's box, so
  // they stay assembled.
  const bounds = new THREE.Box3();
  for (const part of parts) bounds.union(part.boundingBox);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const scale = size.y > 0 ? CAN_HEIGHT / size.y : 1;

  for (const part of parts) {
    part.translate(-center.x, -center.y, -center.z);
    part.scale(scale, scale, scale);
  }

  // No rotation anywhere here on purpose. The file's own vertex data runs along
  // Z — a 66 x 66 x 114 box — but glTF is a Y-up format and the scene graph
  // carries the transform that stands it up, which the world matrices above have
  // already baked in. Rotating again laid it back down: measured, the geometry
  // came out 1 x 1 x 1.727 (height on Z) instead of 0.579 x 1 x 0.579.

  const barrelIndex = pickBarrel(parts);
  const barrel = smoothPart(parts[barrelIndex]);
  const caps = parts.filter((_, i) => i !== barrelIndex).map(smoothPart);

  // Barrel first, then every cap, so the two material groups are each one
  // contiguous run.
  const geometry = concatParts([barrel, ...caps]);
  const barrelCount = barrel.attributes.position.count;
  const capCount = geometry.attributes.position.count - barrelCount;

  // ---- UV ----------------------------------------------------------------
  // Cylindrical: U is the angle around the axis, V the height. Measured over the
  // BARREL's own box rather than the whole can's, so the label fills the printed
  // surface exactly instead of being squeezed by however much of the height the
  // caps happen to take.
  //
  // Cap vertices get the same math and it does not matter what it produces: they
  // are in their own material group now and never sample the label. That is the
  // real fix for the smeared artwork on the top and bottom. A flat disc has a
  // full sweep of atan2(x, z) across it but almost no change in height, so an
  // angle/height mapping fans one thin strip of the texture radially over it — a
  // pinwheel of label art on what should be plain aluminium. No choice of V
  // range avoids that; the surface simply should not be carrying the label,
  // which is what the group split settles.
  barrel.computeBoundingBox();
  const yMin = barrel.boundingBox.min.y;
  const yRange = barrel.boundingBox.max.y - yMin || 1;

  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    uv[i * 2] = Math.atan2(x, z) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = (y - yMin) / yRange;
  }

  // Seam fix, barrel only: any triangle whose 3 vertices straddle the U=0/1
  // wraparound gets its low-side U values pushed past 1, so the triangle
  // interpolates across a continuous range instead of tearing across the whole
  // texture.
  for (let t = 0; t < barrelCount; t += 3) {
    const idx = [t, t + 1, t + 2].map((v) => v * 2);
    const us = idx.map((k) => uv[k]);
    if (Math.max(...us) - Math.min(...us) > 0.5) {
      idx.forEach((k, n) => {
        if (us[n] < 0.5) uv[k] += 1;
      });
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // ---- Material groups ---------------------------------------------------
  // Vertex counts, not triangle counts: for a non-indexed geometry addGroup's
  // start/count are positions in the draw range.
  geometry.addGroup(0, barrelCount, CAN_LABEL_SLOT);
  // A single-mesh model (the one this replaced) has no caps to split off, and a
  // zero-length group would just be a draw call rendering nothing.
  if (capCount > 0) geometry.addGroup(barrelCount, capCount, CAN_CAP_SLOT);

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

let cachedGeometry = null;

export function useCanGeometry() {
  const { scene } = useGLTF(MODEL_URL);
  return useMemo(() => {
    if (cachedGeometry) return cachedGeometry;
    cachedGeometry = buildGeometry(scene);
    return cachedGeometry;
  }, [scene]);
}

useGLTF.preload(MODEL_URL);
