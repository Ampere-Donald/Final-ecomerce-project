import { pageMetadata, SITE_ORIGIN } from './routeMetadata.js';
import { seoFamily } from './seoFamilies.js';
import { isEditorialDocument } from './editorialRoutes.js';
import { basePath, pathLanguage } from './localePath.js';
import { hasEnglishRoute } from './localeRoutes.js';

const publicPages = new Set(['/', '/catalogue', '/comparer', '/projets', '/offres',
  '/arrivages', '/equivalences', '/guides', '/faq', '/livraison', '/about',
  '/contact', '/terms', '/privacy', '/devis']);
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

export function staticPublicMetadata(url) {
  let path = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/index.html') path = '/';
  // No session, language cookie, private document or unverified dynamic record.
  if (pathLanguage(path) === 'en' && !hasEnglishRoute(path)) return null;
  return publicPages.has(basePath(path)) || seoFamily(path) || isEditorialDocument(path) ? pageMetadata(path, url.search) : null;
}

export function renderFallbackMetadata(html, meta) {
  if (!meta || !html.includes('</head>')) return html;
  // Only replace tags owned by our built index.html, never arbitrary page content.
  const clean = html
    .replace(/<title\b[^>]*\bdata-newoteg-fallback[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<(?:meta|link)\b[^>]*\bdata-newoteg-fallback[^>]*>/gi, '');
  const tag = (attribute, key, value) => `<meta data-newoteg-fallback ${attribute}="${key}" content="${escape(value)}" />`;
  const tags = [
    `<title data-newoteg-fallback>${escape(meta.title)}</title>`,
    tag('name', 'description', meta.description), tag('name', 'robots', meta.robots),
    tag('property', 'og:type', 'website'), tag('property', 'og:site_name', 'X-Electronic / NEWOTEG'),
    tag('property', 'og:locale', meta.lang === 'en' ? 'en_CM' : 'fr_CM'), tag('property', 'og:title', meta.title),
    tag('property', 'og:description', meta.description), tag('property', 'og:image', `${SITE_ORIGIN}/logo.png`),
    tag('name', 'twitter:card', 'summary'), tag('name', 'twitter:title', meta.title),
    tag('name', 'twitter:description', meta.description),
  ];
  if (meta.canonical) tags.push(
    `<link data-newoteg-fallback rel="canonical" href="${escape(meta.canonical)}" />`,
    tag('property', 'og:url', meta.canonical),
  );
  for (const entry of meta.alternates || []) tags.push(`<link data-newoteg-fallback rel="alternate" hreflang="${entry.lang}" href="${escape(entry.href)}" />`);
  return clean.replace(/<html\b[^>]*>/i, tag => tag.replace(/\s+lang=["'][^"']*["']/i, '').replace(/>$/, ` lang="${meta.lang === 'en' ? 'en' : 'fr'}">`))
    .replace('</head>', tags.join('\n') + '\n</head>');
}
