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
  const path = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return staticRoutes.has(path) ||
    /^\/(?:product|projets|commandes)\/[^/]+$/.test(path) ||
    /^\/mes-devis\/[^/]+(?:\/imprimer)?$/.test(path);
}
