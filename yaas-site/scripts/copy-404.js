// GitHub Pages has no server-side rewrite: a direct hit or a refresh on
// /contacts, /flavors, or /flavors/:slug requests a file that doesn't exist
// and gets Pages' actual 404 page. Serving the app shell there instead lets
// BrowserRouter read the real URL client-side and render the right route.
import { copyFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
