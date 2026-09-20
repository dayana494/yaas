import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Gives every client route a real file in dist, so GitHub Pages can answer it
// with a 200.
//
// Pages is a static file server with no rewrite rule: it resolves a URL to a
// file on disk. '/yaas/' finds index.html, but '/yaas/flavors/strawberry' found
// nothing, so every route except the homepage 404'd on a direct load or a
// refresh. Following a link inside the app always worked -- React Router never
// asks the server for those -- which is why it went unnoticed, and the dev
// server's own SPA fallback hid it locally.
//
// Emitting 404.html alone is the usual trick and does render the right page,
// but the response keeps its 404 status: fine for a person looking at it, wrong
// for anything reading the status code, and it means the site reports failure
// for pages that exist. So each known route gets its own index.html instead --
// a real file at flavors/strawberry/index.html is a plain 200. Every route this
// app serves is enumerable at build time, so there is nothing dynamic to miss.
//
// The slugs are parsed out of the flavor registry rather than listed here, so
// adding a flavor ships its page automatically instead of silently 404ing. A
// regex rather than an import because that module pulls in assetUrl.js, which
// reads import.meta.env -- not available while the config is being evaluated.
//
// 404.html is still emitted, now only as the catch-all for URLs that genuinely
// do not exist.
function staticRoutes() {
  let root = process.cwd();
  return {
    name: 'static-route-pages',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index) return;

      // index.html's own <body> carries a static pre-mount snapshot of the
      // HOMEPAGE's mobile hero wordmark (see its own LCP-SHELL comment) so
      // PageSpeed's LCP text paints before any JS runs, instead of waiting
      // on the whole app to load. That snapshot is only ever a genuine match
      // for '/' — every other route below reuses this same bundled HTML
      // purely as a React Router fallback shell (so a direct load/refresh of
      // e.g. /flavors gets a real 200 instead of 404, per the file's own
      // top comment), and none of them render that mobile banner at all, so
      // shipping it there would just be a wrong flash of "YAAS" before the
      // real page underneath took over. Stripped back out for those routes,
      // between its own start/end markers.
      const shellPattern = /\s*<!-- LCP-SHELL:START[\s\S]*?LCP-SHELL:END -->/;
      const indexSource = typeof index.source === 'string' ? index.source : index.source.toString();
      if (!shellPattern.test(indexSource)) {
        this.warn('LCP-SHELL markers not found in index.html — check it still matches vite.config.js');
      }
      const routeSource = indexSource.replace(shellPattern, '');

      const registry = readFileSync(resolve(root, 'src/data/flavors.js'), 'utf8');
      const slugs = [...registry.matchAll(/^\s*id:\s*'([^']+)'/gm)].map((m) => m[1]);
      if (!slugs.length) {
        this.warn('no flavor ids found in src/data/flavors.js — per-flavor pages not emitted');
      }

      // Mirrors the <Route path> list in src/App.jsx, minus '/' (index.html
      // itself). A route added there but not here still works; it just falls
      // back to 404.html and answers with a 404 status.
      const routes = ['flavors', 'contacts', ...slugs.map((s) => `flavors/${s}`)];

      for (const route of routes) {
        this.emitFile({ type: 'asset', fileName: `${route}/index.html`, source: routeSource });
      }
      this.emitFile({ type: 'asset', fileName: '404.html', source: routeSource });
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
  plugins: [react(), staticRoutes()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
