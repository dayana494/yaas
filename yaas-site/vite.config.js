import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Edits to the critical path that belong to the built HTML rather than to the
// template. index.html is a source file — `%BASE_URL%` is still a placeholder
// there — so this runs in generateBundle, after Vite has written the real one.
// Listed BEFORE staticRoutes so its work is already in `index.html` when that
// plugin copies the file out to every route folder.
//
// It does not run under `vite dev`: there is no bundle, and the font falls
// back to the plain url() in the template. Dev paints the preloader's title a
// little later than production does; nothing else differs.
//
// The second thing this was going to do — make the main stylesheet
// non-blocking — is deliberately not here. See the note further down.
function criticalPath() {
  // Everything the preloader's one line of text can render. It is
  // `text-transform: uppercase`, so the uppercase forms are what the browser
  // actually asks the font for; the lowercase ones are carried too because
  // they cost 0.4KB and they are what the markup literally contains.
  const PRELOADER_GLYPHS = 'LOADING ENERGYloading energy';
  // Matches the @font-face the preloader's title uses, and nothing else — the
  // site's own Soledago face is a separate rule in styles/index.css and must
  // keep its full file and its font-display: swap.
  const PRELOADER_FACE = /(@font-face\{font-family:'Soledago PL';src:)url\([^)]*\)(\s*format\('woff2'\))/;

  let root = process.cwd();
  return {
    name: 'critical-path',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
    },
    async generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (!index) return;
      let html = index.source.toString();

      // 1. The preloader's title is the LCP element on a phone, and its face
      //    is font-display: block — the browser paints nothing at all until
      //    the font is in. Inlining a subset makes "until the font is in" mean
      //    "immediately": no request, no connection to be slow.
      if (!PRELOADER_FACE.test(html)) {
        this.warn(
          "preloader @font-face not found in index.html — its title still waits on a network font. Check the 'Soledago PL' rule."
        );
      } else {
        const subsetFont = (await import('subset-font')).default;
        const full = readFileSync(resolve(root, 'public/fonts/Soledago.woff2'));
        const subset = await subsetFont(full, PRELOADER_GLYPHS, { targetFormat: 'woff2' });
        html = html.replace(PRELOADER_FACE, `$1url(data:font/woff2;base64,${subset.toString('base64')})$2`);
        this.info(`preloader font subset inlined: ${(subset.length / 1024).toFixed(1)}KB for ${PRELOADER_GLYPHS.length} glyphs`);
      }

      // The main stylesheet is deliberately left BLOCKING. Lighthouse offers
      // 150ms for making it async, and the usual argument applies here even
      // better than most — the preloader covers the screen from its own inline
      // <style> and needs nothing from that file. It was tried, and it is a
      // bad trade on a slow connection: a pending stylesheet also holds back
      // the module script, and releasing it lets the whole app — React, GSAP,
      // three.js — start executing against a page that has no layout yet.
      // Measured on a real 400kbps/400ms link (not Lantern, which cannot see
      // this), TBT went 747ms -> 7706ms and the score 77 -> 62: the pin
      // correction chain's tasks alone grew from ~250ms to ~1375ms, because
      // every measurement it takes is against unstyled layout and has to be
      // redone once the stylesheet lands. Style+layout time roughly doubled.
      // Not worth 150ms of first paint, and measuring pins against unstyled
      // layout is a correctness risk on top.

      index.source = html;
    },
  };
}

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

      const registry = readFileSync(resolve(root, 'src/data/flavors.js'), 'utf8');
      const slugs = [...registry.matchAll(/^\s*id:\s*'([^']+)'/gm)].map((m) => m[1]);
      if (!slugs.length) {
        this.warn('no flavor ids found in src/data/flavors.js — per-flavor pages not emitted');
      }

      // Mirrors the <Route path> list in src/App.jsx, minus '/' (index.html
      // itself). A route added there but not here still works; it just falls
      // back to 404.html and answers with a 404 status.
      // 'flavors' is still here with no page behind it: App.jsx redirects it to
      // the homepage, and that only runs if Pages serves the app at all.
      const routes = ['flavors', 'contacts', ...slugs.map((s) => `flavors/${s}`)];

      for (const route of routes) {
        this.emitFile({ type: 'asset', fileName: `${route}/index.html`, source: index.source });
      }
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
  // criticalPath before staticRoutes: both edit the built index.html in
  // generateBundle, and staticRoutes copies that file to every route folder,
  // so it has to see the finished version.
  plugins: [react(), criticalPath(), staticRoutes()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
