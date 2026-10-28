import { productEditorialEntries } from './productEditorialData.js';

export function validEditorialSource(source) {
  if (!source || typeof source.label !== 'string' || !source.label.trim()) return false;
  if (/^\/product-reference-images\/[a-z0-9-]+\.jpg$/.test(source.url)) return true;
  try {
    const url = new URL(source.url);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

// An administrator can change the catalogue independently of this publication.
// Do not keep displaying a review against a different product or new evidence.
export function getProductEditorial(product, lang = 'fr', entries = productEditorialEntries) {
  const entry = entries.find(item => item.id === product.id);
  if (!entry || entry.status !== 'published' || !entry[lang]) return null;
  const expected = entry.expected;
  if (!expected || ['model', 'image', 'description', 'brand', 'urlDatasheet'].some(key =>
    (product[key] || '') !== (expected[key] || ''))) return null;
  if (product.technicalAttributes?.length || product.attributes?.length) return null;
  return entry;
}

export function validateProductEditorial(entries = productEditorialEntries) {
  const ids = new Set();
  for (const entry of entries) {
    if (!/^[0-9a-f-]{36}$/.test(entry.id) || ids.has(entry.id)) throw Error('Invalid or duplicate editorial product id');
    ids.add(entry.id);
    if (!['draft', 'published'].includes(entry.status)) throw Error('Invalid editorial publication state');
    if (entry.status === 'draft') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewedAt) || !Number.isFinite(Date.parse(entry.reviewedAt))) throw Error('Editorial review date required');
    if (!entry.expected?.model || !entry.expected.image || !entry.fr) throw Error('Editorial product identity required');
    for (const lang of ['fr', 'en']) {
      const copy = entry[lang];
      if (!copy) continue;
      if (!copy.title?.trim() || !copy.summary?.trim() || !copy.checks?.length ||
        copy.checks.some(text => typeof text !== 'string' || !text.trim()) ||
        !copy.sources?.length || copy.sources.some(source => !validEditorialSource(source))) throw Error('Incomplete editorial content or unsafe source');
    }
  }
}

export function isWebsiteHomepage(value) {
  try { const url = new URL(value); return url.pathname === '/' && !url.search && !url.hash; }
  catch { return false; }
}
