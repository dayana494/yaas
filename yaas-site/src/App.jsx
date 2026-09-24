import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';

// One chunk per route rather than one bundle for the whole site. Without this,
// landing straight on /contacts downloads and parses the homepage's
// entire three.js + GSAP scroll machinery before rendering anything, none of
// which that route needs.
//
// It also moves the module-level useGLTF.preload() / useTexture.preload() calls
// in three/useCanGeometry.js and three/useCanMaterials.js — the can model and
// every label texture — behind the same split: they fire on import, so today
// they fire on every route. After this they only fire on the routes that
// actually pull in a Canvas.
//
// fallback={null}, deliberately: a spinner or skeleton here would be a visible
// change, and the brief is weight reduction with nothing looking different. The
// lazy DetailScreen split inside HomePage already uses the same empty fallback.
const HomePage = lazy(() => import('./pages/HomePage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const FlavorDetailPage = lazy(() => import('./pages/FlavorDetailPage'));

export default function App() {
  return (
    // basename tracks vite.config.js's `base`. Without it a build served from a
    // sub-path renders a blank page: the router matches "/" against the full
    // "/yaas/" URL, no route matches, and <Routes> renders nothing. BASE_URL is
    // "/" when base is unset, so this is a no-op for a root deploy.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          {/* The flavor listing page is gone — its gallery is the homepage's
              own, which is where both menus now point. The URL was public, so
              it redirects rather than 404s. */}
          <Route path="/flavors" element={<Navigate to="/" replace />} />
          <Route path="/flavors/:slug" element={<FlavorDetailPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
