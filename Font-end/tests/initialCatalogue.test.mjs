import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueQuery, canRenderCatalogue } from '../src/storefront/catalogueQuery.js';
import { catalogueSnapshot, publicCatalogueData, catalogueBootJSON, readCatalogueBoot, injectInitialCatalogue } from '../src/storefront/initialCatalogue.js';

const product = { id: 'p1', nomProduit: 'Condensateur', code: 'C1', prixPublic: null, quantiteStock: 0,
  estActif: true, coutRevient: 999, categorie: { id: 'cat', nom: 'Composants', margeInterne: 20 } };
const response = { data: [product], meta: { total: 1, lastPage: 1 } };
const url = new URL('https://newoteg.com/catalogue?search=c%C3%A2ble&category=cat&instock=true&sort=price-desc&page=2&minPrice=1000&maxPrice=9000');

test('server and browser catalogue queries keep filters, accents, sort and pagination identical', () => {
  const query = catalogueQuery(url.searchParams), api = new URLSearchParams(query.path.split('?')[1]);
  assert.equal(query.query, 'câble'); assert.equal(query.page, 2);
  assert.equal(api.get('sort'), 'price_desc'); assert.equal(api.get('categoryId'), 'cat');
  assert.equal(api.get('inStock'), 'true'); assert.equal(api.get('limit'), '24');
  assert.equal(api.get('minPrice'), '1000'); assert.equal(api.get('maxPrice'), '9000');
  assert(canRenderCatalogue(url));
  for (const suffix of ['?page=Infinity', '?page=1.5', '?sort=private', '?minPrice=NaN', '?token=private'])
    assert.equal(canRenderCatalogue(new URL('https://newoteg.com/catalogue' + suffix)), false);
  assert.equal(canRenderCatalogue(new URL('https://newoteg.com/profile')), false);
});

test('initial catalogue reads only the public fixed API and omits internal costs', async () => {
  const requests = [];
  const snapshot = await catalogueSnapshot(url, async request => {
    requests.push(request);
    return Response.json(request.url.endsWith('/categories') ? [{ id: 'cat', nom: 'Composants', privateNote: 'secret' }] : response);
  });
  assert.equal(requests.length, 2);
  assert(requests.every(r => r.method === 'GET' && new URL(r.url).origin === 'https://api.newoteg.com'));
  assert(requests.every(r => !r.headers.has('Cookie') && !r.headers.has('Authorization') && r.redirect === 'manual'));
  assert.equal(snapshot.resources[catalogueQuery(url.searchParams).path].data[0].quantiteStock, 0);
  const json = catalogueBootJSON(snapshot);
  assert(!json.includes('coutRevient')); assert(!json.includes('margeInterne')); assert(!json.includes('privateNote'));
  assert(readCatalogueBoot(json, url));
  assert.equal(readCatalogueBoot(json, new URL('https://newoteg.com/catalogue')), null);
});

test('missing, malformed or unavailable public data never becomes a false empty catalogue', async () => {
  assert.throws(() => publicCatalogueData({ data: [], meta: { total: '0', lastPage: 0 } }));
  assert.throws(() => publicCatalogueData({ data: [product, product], meta: { total: 2, lastPage: 1 } }));
  assert.throws(() => publicCatalogueData({ ...response, data: [{ ...product, estActif: false }] }));
  await assert.rejects(catalogueSnapshot(url, async () => new Response('Unavailable', { status: 503 })));
  await assert.rejects(catalogueSnapshot(url, async () => new Response('', { status: 302, headers: { Location: 'https://other.example' } })));
  await assert.rejects(catalogueSnapshot(url, async () => Response.json({ unexpected: [] })));
  await assert.rejects(catalogueSnapshot(url, request => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(new Error('timeout')));
  }), 5));
});

test('snapshot JSON cannot terminate its script or hydrate another document', () => {
  const path = catalogueQuery(url.searchParams).path;
  const snapshot = { version: 1, at: Date.now(), url: url.pathname + url.search, resources: {
    [path]: { ...response, data: [{ ...product, nomProduit: '</script><script>attack</script>\u2028' }] }, '/categories': [],
  } };
  const json = catalogueBootJSON(snapshot);
  assert(!json.includes('</script>')); assert(!json.includes('\u2028'));
  assert.equal(readCatalogueBoot(json, url).resources[path].data[0].nomProduit, snapshot.resources[path].data[0].nomProduit);
  assert.equal(readCatalogueBoot('{', url), null);
  const document = '<html><head></head><body><div id="root"></div></body></html>';
  const html = injectInitialCatalogue(document, '<div class="app"><p>Product</p></div>', snapshot, ['/assets/Catalogue.css']);
  assert(html.includes('data-initial-catalogue="fr"')); assert(html.includes('id="initial-catalogue-data"'));
  assert.throws(() => injectInitialCatalogue(document, '<div class="app"><script>attack</script></div>', snapshot, ['/assets/Catalogue.css']));
});
