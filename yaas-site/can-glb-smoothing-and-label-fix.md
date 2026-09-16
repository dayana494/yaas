# can.glb switch — why the facets/label-smear are happening, and the fix

Diagnosed against the actual current `src/three/useCanGeometry.js` (just re-staged from your project — this already reflects Claude Code's first attempt at a fix, which is why it's more involved than a fresh model swap would be).

## Bug 1 — visible facets ("гладкой" not happening)

`buildGeometry()` merges the file's three meshes (body/lid/base) like this:

```js
scene.traverse((child) => {
  if (!child.isMesh || !child.geometry) return;
  const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
  ...
```

Every mesh is forced **non-indexed** before being concatenated — so the merged geometry has *no shared vertices at all*, each triangle owns three completely private ones. `computeVertexNormals()` is then called on that. For a non-indexed `BufferGeometry`, Three.js has no way to know two vertices from adjacent triangles are "the same point" (there's no index buffer connecting them), so it can't average their normals — each vertex just gets its own triangle's flat face normal back. That's the facets in your screenshot: `computeVertexNormals()` is running, it's just running on a geometry where it's mathematically unable to smooth anything.

This is a real regression from the old model: a photogrammetry scan typically already comes as one indexed mesh with shared vertices, so the exact same code smoothed it fine. The new Blender export, split into 3 separate meshes and flattened via `toNonIndexed()`, breaks that assumption.

**Fix:** weld coincident vertices into a shared, indexed geometry *before* computing normals, then convert back to non-indexed afterward (your UV-build loop and the seam-fix loop both assume "3 consecutive positions = 1 triangle," so they need the non-indexed layout — but each of those duplicated vertices will now carry the correct *smoothed* normal, not a flat one, since normals were computed while they were still welded).

Three ships exactly this utility already — `mergeVertices()` from `three/examples/jsm/utils/BufferGeometryUtils.js`. It's part of the `three` package you already depend on (`^0.169.0`), not a new install. The comment in the current code says it was avoided specifically "so this stays on the `three` package itself and pulls nothing in from examples/jsm" — that reasoning doesn't hold: `examples/jsm` ships inside the `three` npm package, so importing from it adds zero new dependencies.

```js
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ...after centering/scaling, before computeVertexNormals():
let welded = mergeVertices(geometry); // indexed, shared vertices
welded.computeVertexNormals();        // now actually smooths
const geometry2 = welded.toNonIndexed(); // back to the layout the rest of the function expects
```
(Rename to avoid clobbering; the point is: weld → compute normals → un-weld, in that order, then your existing UV-building and seam-fix code runs unchanged on `geometry2`.)

## Bug 2 — label smeared across the top/bottom (photos 3 & 4)

The UV is built with one formula for *every* vertex in the merged geometry, caps included:

```js
const angle = Math.atan2(x, z);
uv[i * 2] = angle / (Math.PI * 2) + 0.5;              // U = angle around the axis
uv[i * 2 + 1] = BARREL_V_PADDING + v * (1 - BARREL_V_PADDING * 2); // V = height
```

That's correct for the barrel (a cylinder's side really does unwrap to angle × height). It is *not* correct for the lid and base: those are flat disks, and every point on a flat disk still has a wide spread of `atan2(x, z)` values (it's still "all the way around" in angle), while its height barely changes. So the cap gets the *same full angular sweep* of the texture that the barrel gets — just squeezed into a thin band near the top/bottom edge (`BARREL_V_PADDING = 0.06`, added in the current code specifically to shrink that band). That padding was an attempt to fix this bug, but it only controls *which* thin strip of the texture the caps sample — it doesn't stop them from fanning that strip radially across a flat surface. If that strip contains any of the label's artwork (which it does — your label art isn't a plain color at the very top/bottom row), it shows up exactly like your screenshots: text and illustration bent into a pinwheel on the flat cap.

There's no `BARREL_V_PADDING` value that fixes this properly, because the real problem is structural: **a flat disk should never be angle-UV-mapped from a printed-label texture at all.** A real can's lid and base are bare aluminum — no label ink reaches them — which is exactly what your reference photo shows (plain smooth metal top, pull-tab, no artwork). The fix is to stop texturing the caps with the label and give them their own plain material instead.

**Fix:** since the source file already keeps body/lid/base as separate meshes, tag each vertex by which one it came from *while merging* (rather than discarding that after `mergePositions`), then split the final geometry into two material groups:

```js
// in mergePositions: track where the body block ends
let bodyVertexCount = 0;
scene.traverse((child) => {
  if (!child.isMesh || !child.geometry) return;
  const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
  geometry.applyMatrix4(child.matrixWorld);
  const array = geometry.attributes.position.array;
  chunks.push({ array, isCap: !/body/i.test(child.name) }); // adjust the match to your file's real node names
});
// push all body chunks first, then all cap (lid/base) chunks, and record
// bodyVertexCount = total length of the body chunks alone
```

Then after building the UV geometry:

```js
geometry.addGroup(0, bodyVertexCount / 3, 0);                       // barrel -> material 0 (the label)
geometry.addGroup(bodyVertexCount / 3, capVertexCount / 3, 1);      // caps -> material 1 (plain metal)
```

(Cap vertices' UVs don't matter at that point — they're not sampling the label texture — so the existing angle/height math can stay as-is for them, or you can skip computing it for that range entirely.)

Every call site that renders this geometry needs a **material array** instead of a single material, matched to those two groups — `CanRig.jsx`, `Screen2CanRig.jsx`, `ContactCanRig.jsx`, `ThumbnailShot.jsx`, and anywhere else `<mesh geometry={geometry} material={materials[i]} />` appears:

```jsx
<mesh geometry={geometry} material={[materials[i], capMaterial]} />
```

Add `capMaterial` once, shared across every flavor (it's the same plain metal on every can) — e.g. in `useCanMaterials.js`:

```js
export const CAN_CAP_MATERIAL = new THREE.MeshStandardMaterial({
  color: '#e9e9ec',
  metalness: 0.9,
  roughness: 0.2,
});
```

That also directly answers the "not as blown-out as the video" note: keep the barrel label material's existing `metalness: 0.35, roughness: 0.4` untouched (that's already fairly matte — it won't blow out under your studio 3-light rig, which has no environment map). Only the new cap material needs to be shiny; if it still reads too hot, drop `metalness` toward 0.7–0.8 or raise `roughness` slightly rather than touching the label material.

**Quicker stopgap**, if you want something working before the full material-split: keep everything on one material, but instead of the angle/height formula for cap vertices, pin their UV to one fixed coordinate sampled from a known-plain pixel in the label texture (e.g. a blank margin area) rather than letting it vary by angle. It'll read as a flat color cap rather than true brushed metal, but it removes the pinwheel-smear artifact immediately with a much smaller diff — worth doing only if the full fix above can't land right away.

## Order of operations for Claude Code

1. Fix the normals first (Bug 1) — small, self-contained, no call-site changes.
2. Reload and confirm the can is smooth (still label-smeared on the caps — expected, that's Bug 2).
3. Then do the material split (Bug 2) — touches `useCanGeometry.js` plus every `<mesh>` call site listed above.
