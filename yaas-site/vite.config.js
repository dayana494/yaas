import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  },
});
