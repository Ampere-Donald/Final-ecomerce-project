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
console.log(JSON.stringify({ status: 'passed', rendererId: runtime.rendererId, checks: [
  'Compiled runtime hash and frontend identity', 'Real React render with escaped text',
  'Public fields only, zero stock and missing price preserved', 'No database, network or migrations required' ] }));
