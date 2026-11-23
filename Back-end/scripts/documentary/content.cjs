'use strict';
const { createHash } = require('node:crypto');
const families = [
  'passifs',
  'semiconducteurs',
  'alimentations',
  'modules',
  'connectique',
  'mesure-outillage',
  'equipement',
];
function object(value, keys) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw Error('INVALID_CONTENT_FIELDS');
}
function text(value, max = 2000) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /<[^>]*>|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw Error('INVALID_CONTENT_TEXT');
  return value.trim();
}
function list(value, max, clean) {
  if (!Array.isArray(value) || value.length > max)
    throw Error('INVALID_CONTENT_LIST');
  return value.map(clean);
}
function publicUrl(value) {
  let u;
  try {
    u = new URL(text(value, 2048));
  } catch {
    throw Error('INVALID_CONTENT_URL');
  }
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    /^(localhost|.*\.local|.*\.internal)$/.test(u.hostname) ||
    /^[\d.:[\]]+$/.test(u.hostname) ||
    /[?&](token|key|signature|password|auth)=/i.test(u.search)
  )
    throw Error('INVALID_CONTENT_URL');
  return u.href;
}
function normalizeContent(value) {
  object(value, ['schemaVersion', 'family', 'locales']);
  if (value.schemaVersion !== 1 || !families.includes(value.family))
    throw Error('INVALID_CONTENT_VERSION');
  object(value.locales, ['fr', 'en']);
  if (!value.locales.fr) throw Error('INVALID_CONTENT_FRENCH_REQUIRED');
  const locales = {};
  for (const lang of ['fr', 'en']) {
    const c = value.locales[lang];
    if (!c) continue;
    object(c, [
      'summary',
      'paragraphs',
      'applications',
      'integration',
      'replacement',
      'missing',
      'faq',
      'documents',
    ]);
    locales[lang] = {
      summary: text(c.summary, 700),
      paragraphs: list(c.paragraphs, 8, (p) => text(p, 2500)),
      applications: list(c.applications, 8, (p) => text(p, 500)),
      integration: list(c.integration, 8, (p) => text(p, 1000)),
      replacement: list(c.replacement, 8, (p) => text(p, 700)),
      missing: list(c.missing, 12, (p) => text(p, 300)),
      faq: list(c.faq, 8, (q) => {
        object(q, ['question', 'answer']);
        return {
          question: text(q.question, 200),
          answer: text(q.answer, 1500),
        };
      }),
      documents: list(c.documents, 12, (d) => {
        object(d, ['label', 'url', 'scope']);
        if (!['product', 'family'].includes(d.scope))
          throw Error('INVALID_CONTENT_SCOPE');
        return {
          label: text(d.label, 180),
          url: publicUrl(d.url),
          scope: d.scope,
        };
      }),
    };
    if (!locales[lang].paragraphs.length)
      throw Error('INVALID_CONTENT_DESCRIPTION_REQUIRED');
  }
  if (JSON.stringify(locales).length > 60000)
    throw Error('INVALID_CONTENT_SIZE');
  return { schemaVersion: 1, family: value.family, locales };
}
const fingerprint = (p) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        id: p.id,
        title: p.nomProduit ?? p.nom_produit,
        description: p.description ?? null,
        brand: p.marque ?? null,
        reference: p.referenceFabricant ?? p.reference_fabricant ?? null,
      }),
    )
    .digest('hex');
function publicContent(raw, product) {
  if (!raw || raw.productFingerprint !== fingerprint(product)) return null;
  try {
    return normalizeContent({
      schemaVersion: raw.schemaVersion,
      family: raw.family,
      locales: raw.locales,
    });
  } catch {
    return null;
  }
}
module.exports = { normalizeContent, publicContent, fingerprint, families };
