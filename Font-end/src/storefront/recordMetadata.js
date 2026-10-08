import { SITE_ORIGIN } from './routeMetadata.js';

export function publicRecord(pathname) {
  const match = /^\/(product|projets)\/([^/]+)\/*$/i.exec(pathname);
  if (!match) return null;
  const type = match[1].toLowerCase(), key = match[2];
  const valid = type === 'product'
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    : key.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
  return { type, key, valid };
}

const failed = status => ({ status, metadata: {
  title: status === 404 ? 'Référence introuvable — X-Electronic' : 'Vérification temporairement indisponible — X-Electronic',
  description: 'Retrouvez votre référence dans le catalogue X-Electronic ou demandez conseil à la boutique.',
  canonical: null, robots: 'noindex, follow',
} });

export async function recordMetadata(record, fetchPublic = fetch) {
  if (!record.valid) return failed(404);
  try {
    // Fixed public origin, no cookies, credentials or request headers forwarded.
    const path = record.type === 'product' ? '/api/produits/' : '/api/projets/public/';
    const response = await fetchPublic('https://api.newoteg.com' + path + encodeURIComponent(record.key), {
      headers: { Accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(2500),
    });
    if (response.status === 404 || response.status === 410) return failed(404);
    if (!response.ok) return failed(503);
    const value = await response.json();
    const product = record.type === 'product';
    if (product && value.estActif === false) return failed(404);
    const title = product ? value.nomProduit : value.titre;
    if ((product ? value.id?.toLowerCase() !== record.key.toLowerCase() || value.estActif !== true : value.slug !== record.key) ||
        typeof title !== 'string' || !title.trim()) return failed(503);
    const description = product ? value.description : value.resume;
    return { status: 200, metadata: {
      title: title.trim().slice(0, 160) + ' — X-Electronic',
      description: typeof description === 'string' && description.trim()
        ? description.replace(/\s+/g, ' ').trim().slice(0, 200)
        : title.trim().slice(0, 120) + ' — X-Electronic, la boutique électronique de NEWOTEG.',
      canonical: SITE_ORIGIN + '/' + record.type + '/' + encodeURIComponent(product ? value.id : value.slug),
      robots: 'index, follow',
    } };
  } catch { return failed(503); }
}

