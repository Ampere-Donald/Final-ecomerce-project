// Smoke contract for the actual Docker runtime, without network/database/startup
// migrations. Mount the compiled frontend manifest read-only as the argument.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
if (process.argv.length !== 3) throw Error('Expected matching frontend manifest path');
const { loadCatalogueRuntime } = require(path.join(process.cwd(), 'dist/src/storefront-rendering/catalogue-runtime.js'));
const runtime = loadCatalogueRuntime(path.join(process.cwd(), '.storefront-renderer'));
const frontend = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.equal(runtime.rendererId, frontend.rendererId, 'Docker backend and frontend renderer identities must match');
const product = { id: 'offline-fixture', nomProduit: 'Test </script> $&', quantiteStock: 0,
  prixPublic: null, estActif: true, cmupActuel: 99 };
const html = runtime.renderCatalogueResponse('/catalogue', { data: [product], meta: { total: 1, lastPage: 1 } }, [], Date.now());
assert(html.startsWith('<div id="root" data-initial-catalogue="fr"><div class="app">'));
assert.equal((html.match(/<script\b/gi) || []).length, 1);
assert(!html.includes('cmupActuel'));
const boot = JSON.parse(html.match(/id="initial-catalogue-data">([\s\S]*)<\/script>$/)[1]);
const page = Object.values(boot.resources).find(value => value?.meta);
assert.equal(page.data[0].nomProduit, product.nomProduit);
assert.equal(page.data[0].quantiteStock, 0); assert.equal(page.data[0].prixPublic, null);
// Verify the new SEO entry points inside the shipped image too. A passing
// catalogue render alone does not prove that product/sitemap exports survived
// packaging or that the product schema preserves the public data boundary.
const productId = '13d2ff99-cd90-430d-b713-be98828f51cd';
assert.equal(runtime.parseProductRequest('/product/' + productId).id, productId);
assert.throws(() => runtime.parseProductRequest('/product/' + productId + '?token=private'));
const detail = runtime.renderProductResponse('/product/' + productId,
  { ...product, id: productId, prixPublic: 1500, fournisseur: { nom: 'Private supplier' } }, Date.now());
assert(detail.startsWith('<div id="root" data-initial-product="fr"><div class="app">'));
assert.equal((detail.match(/<script\b/gi) || []).length, 2);
assert(!detail.includes('cmupActuel'));
assert(!detail.includes('Private supplier'));
const schema = JSON.parse(detail.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1]);
assert.equal(schema['@graph'][0].name, product.nomProduit);
assert.equal(schema['@graph'][0].offers.price, 1500);
assert.equal(schema['@graph'][0].offers.priceCurrency, 'XAF');
assert.equal(schema['@graph'][0].offers.availability, 'https://schema.org/OutOfStock');
const missingPrice = runtime.renderProductResponse('/product/' + productId,
  { ...product, id: productId }, Date.now());
const noOffer = JSON.parse(missingPrice.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1]);
assert.equal(noOffer['@graph'][0].offers, undefined);
const sitemap = runtime.renderSitemapResponse([{ id: productId, nomProduit: product.nomProduit }]);
assert(sitemap.includes('https://newoteg.com/product/' + productId));
assert(!sitemap.includes('/mes-devis'));
assert(!sitemap.includes('<lastmod>'));
console.log(JSON.stringify({ status: 'passed', rendererId: runtime.rendererId, checks: [
  'Compiled runtime hash and frontend identity', 'Real React render with escaped text',
  'Public fields only, zero stock and missing price preserved',
  'Packaged product renderer, escaped JSON-LD and no offer for missing price',
  'Packaged sitemap with real product URL and no invented modification date',
  'No database, network or migrations required' ] }));
