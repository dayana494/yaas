import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ships dist/404.html as a byte copy of dist/index.html.
//
// GitHub Pages is a static file server with no rewrite rule: it resolves a URL
// to a real file, so '/yaas/' finds index.html but '/yaas/flavors/strawberry'
// finds nothing and 404s. Every route except the homepage was unreachable on a
// direct load or a refresh -- following a link inside the app worked, because
// React Router never asked the server for it.
//
// 404.html is what Pages serves for an unmatched path, and it serves it WITHOUT
// redirecting, so the address bar still holds the real URL when this document
// boots and React Router reads the route it was always meant to render. The
// copy is emitted here rather than in the deploy workflow so `npm run build`
// reproduces it locally, and after the html plugin has run so %BASE_URL% is
// already substituted.
//
// Harmless anywhere else: hosts with their own SPA fallback (the dev server,
// Vercel's Vite preset) never reach for this file.
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index) return;
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source });
    },
  };
}

export default defineConfig({
  // '/' for Vercel (served from the domain root); the GitHub Pages workflow
  // overrides this to '/yaas/' via VITE_BASE_PATH since that deploy lives at
  // a sub-path. Every asset path in the app already resolves against
  // import.meta.env.BASE_URL (see src/data/assetUrl.js and App.jsx's
  // BrowserRouter basename), so this one value drives both deploys.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), spaFallback()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
