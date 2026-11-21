import { SITE_ORIGIN } from './routeMetadata.js';
import { basePath, pathLanguage, localizedPath } from './localePath.js';
import { hasEnglishRoute, languageAlternates } from './localeRoutes.js';
import { getRawProductTranslation } from './productTranslation.js';

export function publicRecord(pathname) {
  const lang = pathLanguage(pathname);
  const match = /^\/(product|projets)\/([^/]+)\/*$/i.exec(basePath(pathname));
  if (!match) return null;
  const type = match[1].toLowerCase(), key = match[2];
  const valid = type === 'product'
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    : key.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
  return { type, key, valid: valid && (lang !== 'en' || hasEnglishRoute(basePath(pathname))), lang };
}

const failed = status => ({ status, metadata: {
  title: status === 404 ? 'Référence introuvable — X-Electronic' : 'Vérification temporairement indisponible — X-Electronic',
  description: 'Retrouvez votre référence dans le catalogue X-Electronic ou demandez conseil à la boutique.',
  canonical: null, robots: 'noindex, follow',
} });

export async function recordMetadata(record, fetchPublic = fetch) {
  const lang = record.lang || 'fr';
  const failure = status => {
    const result = failed(status);
    result.metadata.lang = lang;
    if (lang === 'en') {
      result.metadata.title = (status === 404 ? 'Reference not found' : 'Verification temporarily unavailable') + ' — X-Electronic';
      result.metadata.description = "Find your reference in X-Electronic's catalogue or ask the shop for advice.";
    }
    return result;
  };
  if (!record.valid) return failure(404);
  try {
    // Fixed public origin, no cookies, credentials or request headers forwarded.
    const path = record.type === 'product' ? '/api/produits/' : '/api/projets/public/';
    const response = await fetchPublic('https://api.newoteg.com' + path + encodeURIComponent(record.key), {
      headers: { Accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(2500),
    });
    if (response.status === 404 || response.status === 410) return failure(404);
    if (!response.ok) return failure(503);
    const value = await response.json();
    const product = record.type === 'product';
    if (product && value.estActif === false) return failure(404);
    const translation = product ? getRawProductTranslation(value) : null;
    if (lang === 'en' && !translation) return failure(404);
    const title = product ? (lang === 'en' ? translation.en.name : value.nomProduit) : value.titre;
    if ((product ? value.id?.toLowerCase() !== record.key.toLowerCase() || value.estActif !== true : value.slug !== record.key) ||
        typeof title !== 'string' || !title.trim()) return failure(503);
    const description = product ? (lang === 'en' ? translation.en.description : value.description) : value.resume;
    const documentPath = '/' + record.type + '/' + encodeURIComponent(product ? value.id : value.slug);
    return { status: 200, metadata: {
      title: title.trim().slice(0, 160) + ' — X-Electronic',
      description: typeof description === 'string' && description.trim()
        ? description.replace(/\s+/g, ' ').trim().slice(0, 200)
        : title.trim().slice(0, 120) + ' — X-Electronic, la boutique électronique de NEWOTEG.',
      canonical: SITE_ORIGIN + localizedPath(documentPath, lang), lang,
      alternates: translation ? languageAlternates(documentPath) : [], robots: 'index, follow',
    } };
  } catch { return failure(503); }
}

