import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Third-party code into chunks of its own, keyed by library.
//
// Without this, Rollup puts every shared dependency into whichever chunk first
// needs it — which here meant three.js and GSAP landing inside the Footer chunk,
// because Footer is the one component all four routes import. That built fine
// but cached badly: the "Footer" chunk was 1,034 kB, and any change to the
// footer's own markup invalidated all of three.js along with it.
//
// Splitting by library means the big, almost-never-changing dependencies keep
// their URLs across deploys, so a returning visitor re-downloads only the app
// code that actually changed. It has no effect on a first visit's total bytes
// and none at all on what renders.
function vendorChunk(id) {
  const path = id.replace(/\\/g, '/');
  if (!path.includes('/node_modules/')) return undefined;
  // @react-three/* is meaningless without three and always loads with it.
  if (path.includes('/node_modules/three/') || path.includes('/node_modules/@react-three/')) {
    return 'vendor-three';
  }
  if (path.includes('/node_modules/gsap/')) return 'vendor-gsap';
  if (
    path.includes('/node_modules/react/') ||
    path.includes('/node_modules/react-dom/') ||
    path.includes('/node_modules/react-router') ||
    path.includes('/node_modules/scheduler/')
  ) {
    return 'vendor-react';
  }
  return 'vendor';
}

export default defineConfig({
  // '/' for Vercel (served from the domain root); the GitHub Pages workflow
  // overrides this to '/yaas/' via VITE_BASE_PATH since that deploy lives at
  // a sub-path. Every asset path in the app already resolves against
  // import.meta.env.BASE_URL (see src/data/assetUrl.js and App.jsx's
  // BrowserRouter basename), so this one value drives both deploys.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
});
