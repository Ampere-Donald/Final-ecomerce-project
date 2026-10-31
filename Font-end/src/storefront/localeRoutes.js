import { basePath, localizedPath } from './localePath.js';
import { seoFamily } from './seoFamilies.js';
import { englishProductIds, englishGuideIndex } from './englishRoutes.generated.js';

const staticEnglish = new Set(['/', '/catalogue', '/comparer', '/projets', '/offres', '/arrivages',
  '/equivalences', '/guides', '/faq', '/livraison', '/about', '/contact', '/terms', '/privacy', '/devis']);
export const privateRoute = pathname => /^\/(?:panier|checkout|suivi-invite|mes-devis|commandes|profile|favourites|login|signup|forgot-password)(?:\/|$)/i.test(basePath(pathname));
export function hasEnglishRoute(pathname) {
  const path = basePath(pathname);
  return staticEnglish.has(path) || Boolean(seoFamily(path)) || privateRoute(path) ||
    englishProductIds.some(id => path === '/product/' + id) ||
    englishGuideIndex.some(entry => path === '/guides/' + entry.slug);
}
export function languageDestination(pathname, search = '', hash = '', lang = 'fr') {
  const path = basePath(pathname);
  if (lang === 'en' && !hasEnglishRoute(path)) return '/en/';
  return localizedPath(path, lang) + search + hash;
}
export function languageAlternates(pathname, search = '') {
  const path = basePath(pathname);
  if (privateRoute(path) || !hasEnglishRoute(path)) return [];
  return ['fr', 'en'].map(lang => ({ lang, href: 'https://newoteg.com' + localizedPath(path, lang) + search }));
}
