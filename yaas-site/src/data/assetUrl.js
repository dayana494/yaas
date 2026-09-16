// Prefixes a path in `public/` with the app's deploy base.
//
// Vite rewrites asset URLs for you in two places only: `url()` inside CSS, and
// the attributes it parses in index.html. It cannot rewrite a path that is just
// a string in a module — `'/models/can.glb'` handed to useGLTF, or a `photo:`
// field read into an inline style — because at build time those are opaque
// strings. With `base: '/'` that costs nothing and the difference never shows.
// Under a sub-path deploy it is the whole ballgame: every one of them resolves
// against the domain root instead of the app root and 404s (measured with
// base '/yaas/': the can model plus 18 other assets, and the homepage crashed
// on the missing model).
//
// import.meta.env.BASE_URL is Vite's own resolved base, always with a trailing
// slash, and '/' when no base is configured — so this is a no-op for a root
// deploy and stays correct if the base changes later.
export function asset(path) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
