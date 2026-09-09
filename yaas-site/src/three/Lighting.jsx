// Minimal lighting rig — no shadows, no postprocessing, per the perf brief.
// A near-even 3-point spread (instead of one strong key) reads as a soft
// studio lightbox: no hard shadow side, colors stay saturated since there's
// no environment map tinting things gray.
export default function Lighting() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#e4e4e8', 1.0]} />
      <directionalLight position={[2.2, 2, 3.2]} intensity={0.55} />
      <directionalLight position={[-2.4, 1, 2.8]} intensity={0.5} />
      <directionalLight position={[0, 3.5, 1]} intensity={0.3} />
    </>
  );
}
