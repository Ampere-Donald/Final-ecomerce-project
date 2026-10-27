import test from 'node:test';
import assert from 'node:assert/strict';
import { productDocumentId, publicProductData, productSnapshot, readProductBoot, injectProductFragment } from '../src/storefront/initialProduct.js';
import { productSchema, productSchemaJSON } from '../src/storefront/productSchema.js';
import { catalogueBootJSON } from '../src/storefront/initialCatalogue.js';
import { adaptProduct } from '../src/storefront/productData.js';
import { productBackendFragment } from '../src/storefront/backendProduct.js';
import worker from '../worker.js';

const id = '13d2ff99-cd90-430d-b713-be98828f51cd';
const raw = { id, estActif: true, nomProduit: 'TDA </script><script>attack</script>', description: 'Source <test>',
  prixPublic: 1500, quantiteStock: 0, code: 'NWT-1', marque: 'Manufacturer', cmupActuel: 9, dernierFournisseurId: 'secret',
  imageUrl: '/uploads/item.webp', categorieId: '69e8ab9e-bf6a-41de-9093-028170405f55', sousCategorieId: '4aab0f26-c07a-4102-bc78-82fe24ba5e02',
  categorie: { id: '69e8ab9e-bf6a-41de-9093-028170405f55', nom: 'Audio', privateNote: 'secret' },
  sousCategorie: { id: '4aab0f26-c07a-4102-bc78-82fe24ba5e02', nom: 'Circuits intégrés audio', privateNote: 'secret' },
  attributs: [{ nomAttribut: 'Voltage', privateNote: 'secret', valeurs: [{ valeur: '12 V', privateNote: 'secret', documentation: {
    etat: 'DOCUMENTE', reluLe: '2026-10-27T00:00:00Z', sourceUrl: 'https://manufacturer.example/datasheet', privateNote: 'secret',
  } }] }],
};
const url = new URL('https://newoteg.com/product/' + id);

test('product hydration uses an explicit nested public projection and preserves real unknown and zero values', () => {
  const product = publicProductData(raw, id);
  assert(!JSON.stringify(product).match(/cmupActuel|dernierFournisseurId|privateNote|secret/));
  assert.equal(product.quantiteStock, 0);
  assert.equal(product.sousCategorie.nom, raw.sousCategorie.nom);
  assert.equal(product.attributs[0].valeurs[0].documentation.sourceUrl, raw.attributs[0].valeurs[0].documentation.sourceUrl);
  assert.equal(publicProductData({ ...raw, prixPublic: null, quantiteStock: null }, id).prixPublic, null);
  for (const invalid of [{ ...raw, estActif: false }, { ...raw, id: 'other' }, { ...raw, description: {} }, { ...raw, attributs: [{ nomAttribut: 'x', valeurs: [{ valeur: {} }] }] }]) {
    assert.throws(() => publicProductData(invalid, id));
  }
});

test('product boot cannot escape its script, cross product paths or restore a future snapshot', () => {
  const snapshot = productSnapshot(url, raw);
  const text = catalogueBootJSON(snapshot);
  assert(!text.includes('</script>'));
  assert.ok(readProductBoot(text, url));
  assert.equal(readProductBoot(text, new URL('https://newoteg.com/product/02d5805f-7f51-4574-938d-d8cfe8c09487')), null);
  assert.equal(readProductBoot(text, new URL(url + '?other=true')), null);
  assert.equal(readProductBoot(catalogueBootJSON({ ...snapshot, at: Date.now() + 120000 }), url), null);
  assert.equal(productDocumentId('/product/not-an-id'), null);
  assert.equal(productDocumentId('/product/' + id + '/extra'), null);
  assert.throws(() => productSnapshot(new URL(url + '?token=private'), raw));
});

test('schema uses displayed public price, XAF, real stock and stable category links without manufacturing identifiers or reviews', () => {
  const product = adaptProduct(publicProductData(raw, id), value => value);
  const graph = productSchema(product)['@graph'];
  assert.equal(graph[0].offers.price, 1500);
  assert.equal(graph[0].offers.priceCurrency, 'XAF');
  assert.equal(graph[0].offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(graph[0].image[0], 'https://newoteg.com/uploads/item.webp');
  assert.equal(graph[0].sku, 'NWT-1');
  for (const key of ['mpn', 'gtin', 'aggregateRating', 'review']) assert.equal(graph[0][key], undefined);
  assert(graph[1].itemListElement.some(item => item.item === 'https://newoteg.com/catalogue/circuits-integres-audio'));
  assert.equal(productSchema({ ...product, retailPrice: null })['@graph'][0].offers, undefined);
  assert.equal(productSchema({ ...product, stock: null })['@graph'][0].offers, undefined);
  assert.equal(productSchema({ ...product, stock: 2 })['@graph'][0].offers.availability, 'https://schema.org/InStock');
  assert(!productSchemaJSON(product).includes('</script>'));
});

const descriptor = { rendererId: 'a'.repeat(64) };
const fragment = '<div id="root" data-initial-product="fr"><div class="app"><script type="application/ld+json" data-product-schema="true">{}</script><h1>Product</h1></div></div><script type="application/json" id="initial-product-data">{}</script>';
const response = () => new Response(fragment, { headers: { 'content-type': 'text/html', 'X-Catalogue-Renderer': descriptor.rendererId } });
test('product transport is anonymous, versioned and bounded; only expected JSON scripts may enter the document', async () => {
  const html = await productBackendFragment(url, descriptor, async request => {
    const target = new URL(request.url);
    assert.equal(target.origin, 'https://api.newoteg.com');
    assert.equal(target.pathname, '/api/storefront/product');
    assert.equal(target.searchParams.get('url'), url.pathname);
    assert.equal(request.method, 'GET'); assert.equal(request.redirect, 'manual');
    assert.equal(request.headers.get('Authorization'), null); assert.equal(request.headers.get('Cookie'), null);
    return response();
  });
  assert.equal(html, fragment);
  assert.equal(await productBackendFragment(new URL(url + '?token=private'), descriptor, () => { throw Error('Must not fetch'); }), null);
  const document = '<head></head><body><div id="root"></div></body>';
  assert(injectProductFragment(document, html, ['/assets/Product.css']).includes('<h1>Product</h1>'));
  for (const bad of [fragment + '<script>attack()</script>', fragment.replace('application/ld+json', 'text/javascript'), fragment.replace('data-initial-product="fr"', '')]) {
    assert.throws(() => injectProductFragment(document, bad, ['/assets/Product.css']));
  }
  await assert.rejects(productBackendFragment(url, descriptor, async () => new Response('', { status: 302 })));
  await assert.rejects(productBackendFragment(url, descriptor, async () => new Response('x'.repeat(512 * 1024 + 1), { headers: { 'content-type': 'text/html', 'X-Catalogue-Renderer': descriptor.rendererId } })));
  await assert.rejects(productBackendFragment(url, descriptor, async () => new Response(fragment, { headers: { 'content-type': 'text/html', 'X-Catalogue-Renderer': 'b'.repeat(64) } })));
});

test('edge attaches product HTML only after public record validation and keeps HEAD/404/503 semantics', async () => {
  const previous = globalThis.fetch;
  const calls = [];
  const env = { backendCatalogue: descriptor, catalogueStyles: ['/assets/Product.css'],
    ASSETS: { fetch: async () => new Response('<html><head></head><body><div id="root"></div></body></html>', { headers: { 'content-type': 'text/html', ETag: 'shared' } }) } };
  let active = true, failure = false;
  try {
    globalThis.fetch = async (input, options) => {
      const url = typeof input === 'string' ? new URL(input) : new URL(input.url);
      calls.push(url.pathname);
      if (url.pathname === '/api/storefront/product') return response();
      assert.equal(options.headers.Cookie, undefined); assert.equal(options.headers.Authorization, undefined);
      return failure ? new Response('down', { status: 503 }) : Response.json({ ...raw, estActif: active });
    };
    const result = await worker.fetch(new Request(url, { headers: { Cookie: 'private', Authorization: 'private' } }), env);
    assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.headers.get('etag'), null); assert((await result.text()).includes('data-initial-product="fr"'));
    calls.length = 0;
    const head = await worker.fetch(new Request(url, { method: 'HEAD' }), env);
    assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert(!calls.includes('/api/storefront/product'));
    active = false; calls.length = 0;
    const missing = await worker.fetch(new Request(url), env);
    assert.equal(missing.status, 404); assert(!calls.includes('/api/storefront/product'));
    failure = true;
    const unavailable = await worker.fetch(new Request(url), env);
    assert.equal(unavailable.status, 503); assert.equal(unavailable.headers.get('retry-after'), '60');
  } finally { globalThis.fetch = previous; }
});
