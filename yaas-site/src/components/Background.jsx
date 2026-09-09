// Flat brand color crossfades via a CSS transition (cheap, GPU-composited),
// with the brand's groovy line-art texture layered on top at low opacity so
// it never competes with the can or the type.
export default function Background({ color }) {
  return (
    <div className="background-layer" style={{ backgroundColor: color }}>
      <div className="background-texture" />
    </div>
  );
}
