// Integration contract for the actual compiled renderer, without a database or
// network writes. Run after build:catalogue-package and the backend build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { loadCatalogueRuntime } = require(path.join(root, 'Back-end/dist/src/storefront-rendering/catalogue-runtime.js'));
const runtime = loadCatalogueRuntime(path.join(root, 'Back-end/.storefront-renderer'));
const products = { data: [{ id: 'p1', nomProduit: 'Câble </script><script>attack</script> $&',
  code: 'C1', prixPublic: null, prixDetail: null, quantiteStock: 0, estActif: true,
  coutRevient: 999, categorie: { id: 'cat', nom: 'Câbles', margeInterne: 20 } }], meta: { total: 1, lastPage: 1 } };
const url = '/catalogue?search=c%C3%A2ble&sort=price-desc&instock=true';
const parsed = runtime.parseCatalogueRequest(url);
assert.equal(new URLSearchParams(parsed.path.split('?')[1]).get('search'), 'câble');
assert.equal(new URLSearchParams(parsed.path.split('?')[1]).get('sort'), 'price_desc');
for (const unsupported of ['https://other.example/catalogue', '//other.example', '/catalogue#private',
  '/catalogue?includeInactive=true', '/catalogue?token=private', '/catalogue?sort=private'])
  assert.throws(() => runtime.parseCatalogueRequest(unsupported));
const html = runtime.renderCatalogueResponse(url, products, [{ id: 'cat', nom: 'Câbles', privateNote: 'secret' }], Date.now());
assert(html.startsWith('<div id="root" data-initial-catalogue="fr"><div class="app">'));
assert.equal((html.match(/<script\b/gi) || []).length, 1);
assert(!html.includes('coutRevient')); assert(!html.includes('margeInterne')); assert(!html.includes('privateNote'));
assert(!html.includes('<script>attack</script>'));
const boot = JSON.parse(html.match(/id="initial-catalogue-data">([\s\S]*)<\/script>$/)[1]);
const product = boot.resources[parsed.path].data[0];
assert.equal(product.prixPublic, null); assert.equal(product.quantiteStock, 0);
assert.equal(product.nomProduit, products.data[0].nomProduit);
assert.throws(() => runtime.renderCatalogueResponse('/catalogue', { unexpected: [] }, [], Date.now()));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'Font-end/.catalogue-backend/manifest.json'), 'utf8'));
assert.equal(runtime.rendererId, manifest.rendererId, 'Independent package and frontend build must select the same renderer');
const productId = '13d2ff99-cd90-430d-b713-be98828f51cd';
assert.equal(runtime.parseProductRequest('/product/' + productId).id, productId);
for (const invalid of ['/product/not-an-id', '/product/' + productId + '/extra', 'https://other.example/product/' + productId])
  assert.throws(() => runtime.parseProductRequest(invalid));
const detail = runtime.renderProductResponse('/product/' + productId,
  { ...products.data[0], id: productId, description: 'Public detail', prixPublic: 1500 }, Date.now());
assert(detail.startsWith('<div id="root" data-initial-product="fr"><div class="app">'));
assert.equal((detail.match(/<script\b/g) || []).length, 2);
assert(!detail.includes('<script>attack</script>')); assert(!detail.includes('coutRevient'));
const structured = JSON.parse(detail.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1]);
assert.equal(structured['@graph'][0].offers.price, 1500);
assert.equal(structured['@graph'][0].offers.availability, 'https://schema.org/OutOfStock');
const sitemap = runtime.renderSitemapResponse([{ id: productId, nomProduit: 'Public' }]);
assert(sitemap.includes('https://newoteg.com/product/' + productId));
assert(!sitemap.includes('/mes-devis')); assert(!sitemap.includes('<lastmod>'));
console.log(JSON.stringify({ status: 'passed', rendererId: runtime.rendererId,
  checks: ['real compiled CJS package loaded with verified hash', 'canonical URL/filter contract',
    'anonymous allowlist and script escaping', 'zero stock and missing price preserved',
    'malformed API response rejected', 'independent builds produce identical renderer identity',
    'compiled product rendering, anonymous boot, safe JSON-LD and public sitemap'] }));
