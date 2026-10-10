import { catalogueQuery, canRenderCatalogue } from './catalogueQuery.js';
import { readOffer } from './offerData.js';

const productFields = ['id', 'nomProduit', 'designationEn', 'code', 'marque', 'prixPublic', 'prixDetail',
  'prixGros', 'quantiteGros', 'quantiteStock', 'seuilAlerte', 'categorieId', 'imageUrl', 'imageUrl2', 'imageUrl3', 'estActif'];
const pick = (object, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(object, key)).map(key => [key, object[key]]));

export function publicCatalogueData(data) {
  if (!Array.isArray(data?.data) || data.data.length > 24 ||
      !Number.isSafeInteger(data.meta?.total) || data.meta.total < data.data.length ||
      !Number.isSafeInteger(data.meta?.lastPage) || data.meta.lastPage < 0) throw Error('Invalid catalogue response');
  const rows = data.data.map(raw => {
    if (!raw || typeof raw.id !== 'string' || !raw.id || typeof raw.nomProduit !== 'string' ||
        !raw.nomProduit || raw.estActif === false) throw Error('Invalid public product');
    const product = pick(raw, productFields);
    if (Object.values(product).some(value => value != null && !['string', 'number', 'boolean'].includes(typeof value)))
      throw Error('Invalid public product field');
    if (raw.categorie && typeof raw.categorie === 'object') {
      product.categorie = pick(raw.categorie, ['id', 'nom', 'quantiteGros']);
      if (Object.values(product.categorie).some(value => value != null && !['string', 'number'].includes(typeof value)))
        throw Error('Invalid public product category');
    }
    if (raw.offre) {
      readOffer(raw);
      product.offre = pick(raw.offre, ['prixCatalogue', 'prixOffre', 'fin']);
    }
    return product;
  });
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw Error('Duplicate public product');
  const meta = pick(data.meta, ['total', 'lastPage', 'currentPage', 'perPage']);
  if (Object.values(meta).some(value => !Number.isSafeInteger(value) || value < 0)) throw Error('Invalid catalogue pagination');
  return { data: rows, meta };
}

export function publicCategories(data) {
  const rows = Array.isArray(data) ? data : data?.data;
  if (!Array.isArray(rows) || rows.length > 500) throw Error('Invalid categories response');
  return rows.map(raw => {
    if (!raw || typeof raw.id !== 'string' || !raw.id || typeof raw.nom !== 'string') throw Error('Invalid public category');
    const category = pick(raw, ['id', 'nom', 'description']);
    if (Object.values(category).some(value => value != null && typeof value !== 'string')) throw Error('Invalid public category field');
    return category;
  });
}

async function readJSON(response, maxBytes) {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    await response.body?.cancel();
    throw Error('Catalogue API unavailable');
  }
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw Error('Catalogue response too large');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel(); throw error; }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(buffer));
}

export async function catalogueSnapshot(url, fetcher = fetch, timeoutMs = 2000) {
  if (!canRenderCatalogue(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const path = catalogueQuery(url.searchParams).path;
  // Only public reads. Incoming cookies, auth headers and unrelated parameters
  // never cross this boundary, even for a signed-in browser.
  const read = async (route, max) => readJSON(await fetcher(new Request('https://api.newoteg.com/api' + route,
    // Workers support manual redirects, not redirect:'error'. readJSON rejects
    // every 3xx response, so no redirected origin receives this public request.
    { signal: controller.signal, headers: { Accept: 'application/json' }, redirect: 'manual' })), max);
  try {
    const [products, categories] = await Promise.all([read(path, 512 * 1024), read('/categories', 128 * 1024)]);
    return { version: 1, url: url.pathname + url.search, at: Date.now(),
      resources: { [path]: publicCatalogueData(products), '/categories': publicCategories(categories) } };
  } finally { clearTimeout(timer); controller.abort(); }
}

export function catalogueBootJSON(snapshot) {
  return JSON.stringify(snapshot).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function readCatalogueBoot(text, url) {
  try {
    const snapshot = JSON.parse(text);
    if (!canRenderCatalogue(url) || snapshot?.version !== 1 || snapshot.url !== url.pathname + url.search ||
        !Number.isSafeInteger(snapshot.at) || snapshot.at < 0 || snapshot.at > Date.now() + 60000) return null;
    const path = catalogueQuery(url.searchParams).path;
    return { version: 1, url: snapshot.url, at: snapshot.at, resources: {
      [path]: publicCatalogueData(snapshot.resources[path]), '/categories': publicCategories(snapshot.resources['/categories']),
    } };
  } catch { return null; }
}

export function injectInitialCatalogue(document, html, snapshot, css) {
  if (!html.startsWith('<div class="app">') || /<script\b/i.test(html) ||
      !Array.isArray(css) || !css.length || !css.every(path => /^\/assets\/[\w.-]+\.css$/.test(path)) ||
      !document.includes('<div id="root"></div>')) throw Error('Invalid catalogue document');
  const styles = css.filter(path => !document.includes(`href="${path}"`))
    .map(path => `<link rel="stylesheet" href="${path}" />`).join('');
  return document.replace('</head>', styles + '</head>')
    .replace('<div id="root"></div>', `<div id="root" data-initial-catalogue="fr">${html}</div>`)
    .replace('</body>', `<script type="application/json" id="initial-catalogue-data">${catalogueBootJSON(snapshot)}</script></body>`);
}
