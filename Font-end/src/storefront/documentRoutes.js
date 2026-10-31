import { seoFamily } from './seoFamilies.js';
import { isEditorialDocument } from './editorialRoutes.js';
import { basePath, pathLanguage } from './localePath.js';
import { hasEnglishRoute } from './localeRoutes.js';
// Keep aligned with App.jsx. Dynamic records are validated by their page/API;
// this list only establishes whether the application defines the route.
const staticRoutes = new Set([
  '/', '/index.html', '/catalogue', '/comparer', '/projets', '/offres',
  '/arrivages', '/panier', '/equivalences', '/guides', '/faq', '/livraison',
  '/checkout', '/suivi-invite', '/devis', '/mes-devis', '/about', '/contact',
  '/terms', '/privacy', '/login', '/signup', '/forgot-password', '/commandes',
  '/profile', '/favourites',
]);

export function isApplicationDocument(pathname) {
  if (pathLanguage(pathname) === 'en' && !hasEnglishRoute(pathname)) return false;
  const path = basePath(pathname).toLowerCase().replace(/\/+$/, '') || '/';
  return staticRoutes.has(path) || Boolean(seoFamily(path)) || isEditorialDocument(path) ||
    /^\/(?:product|projets|commandes)\/[^/]+$/.test(path) ||
    /^\/mes-devis\/[^/]+(?:\/imprimer)?$/.test(path);
}
