// Actual compiled React renderer + production Worker; isolated public identity
// fixtures with synthetic commerce. No browser or network requests are allowed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import worker from '../worker.js';
import { productEditorialEntries } from '../src/storefront/productEditorialData.js';
const require = createRequire(import.meta.url);
const runtime = require('../.catalogue-backend/renderer.cjs');
const manifest = JSON.parse(await readFile(new URL('../.catalogue-backend/manifest.json', import.meta.url), 'utf8'));
const document = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const fixtures = JSON.parse(await readFile(new URL('./fixtures/product-editorial-wave-2026-11-01.json', import.meta.url), 'utf8'));
const report = { at: new Date().toISOString(), status: 'running', writes: 0,
  data: fixtures.scope, rendererId: manifest.rendererId, checks: [] };
const decode = text => text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const previousFetch = globalThis.fetch;
let raw, apiFailure = false, reads = 0;
const env = { backendCatalogue: manifest, catalogueStyles: ['/assets/Product.css'],
  ASSETS: { fetch: async () => new Response(document, { headers: { 'content-type': 'text/html', ETag: 'shared' } }) } };
try {
  assert(fixtures.scope.includes('synthetic'));
  assert.equal(new Set(fixtures.products.map(item => item.product.id)).size, fixtures.products.length);
  assert.equal(productEditorialEntries.length, 20 + fixtures.products.length, 'pilot plus selected extension');
  for (const entry of productEditorialEntries) assert(Object.keys(entry).every(key => ['id', 'status', 'reviewedAt', 'expected', 'fr', 'en'].includes(key)), 'research-only fields must not enter runtime data');
  globalThis.fetch = async (input, options) => {
    const request = input instanceof Request ? input : new Request(input, options);
    const url = new URL(request.url);
    assert.equal(url.origin, 'https://api.newoteg.com'); assert.equal(request.method, 'GET');
    assert(!request.headers.has('cookie')); assert(!request.headers.has('authorization'));
    reads++;
    if (apiFailure) return new Response('Isolated API outage', { status: 503 });
    if (url.pathname === '/api/produits/' + raw.id) return Response.json(raw);
    assert.equal(url.pathname, '/api/storefront/product');
    assert.equal(url.searchParams.get('renderer'), manifest.rendererId);
    assert.equal(url.searchParams.get('url'), '/product/' + raw.id);
    if (raw.estActif === false) return new Response('Inactive', { status: 404 });
    return new Response(runtime.renderProductResponse('/product/' + raw.id, raw, Date.now()), {
      headers: { 'content-type': 'text/html', 'x-catalogue-renderer': manifest.rendererId },
    });
  };
  async function read(item, kind, expectNote = true, status = 200) {
    const response = await worker.fetch(new Request('https://newoteg.com/product/' + item.product.id,
      { headers: { Cookie: 'isolated-fixture-session', Authorization: 'Bearer isolated-fixture' } }), env);
    const html = await response.text(), text = decode(html);
    assert.equal(response.status, status, item.reference + ': ' + kind);
    assert.match(response.headers.get('cache-control'), /no-store/);
    const entry = productEditorialEntries.find(entry => entry.id === item.product.id);
    assert(entry && !entry.en, 'this extension does not silently create English notes');
    if (status === 200) {
      assert(html.includes('data-initial-product="fr"'));
      assert(html.includes('rel="canonical" href="https://newoteg.com/product/' + raw.id + '"'));
      assert.equal(html.includes('id="product-editorial-title"'), expectNote, kind);
      if (expectNote) {
        for (const value of [entry.fr.title, entry.fr.summary, ...entry.fr.checks]) assert(text.includes(value), kind + ': missing reviewed text');
        const pricePosition = html.indexOf('class="e-product-price"');
        assert(pricePosition >= 0 && html.indexOf('id="product-editorial-title"') > pricePosition);
        for (const source of entry.fr.sources) assert(html.includes(source.url), 'missing public source');
      }
      const graph = JSON.parse(html.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1])['@graph'];
      const product = graph.find(node => node['@type'] === 'Product'); assert.equal(product.name, raw.nomProduit);
      if (raw.prixPublic === null) assert.equal(product.offers, undefined);
      else { assert.equal(Number(product.offers.price), 1000); assert.equal(product.offers.availability, raw.quantiteStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'); }
    } else {
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
      assert(!html.includes('data-initial-product="fr"')); assert(!html.includes('rel="canonical"'));
      if (status === 503) assert.equal(response.headers.get('retry-after'), '60');
    }
    assert(!html.includes('isolated-private-wave-marker')); assert(!html.includes('publicationGate'));
    assert.equal((html.match(/<script type="application\/ld\+json" data-newoteg-organization>/g) || []).length, 1);
    report.checks.push({ reference: item.reference, kind, status: response.status, note: status === 200 && expectNote });
  }
  for (const item of fixtures.products) {
    assert.equal(item.product.prixPublic, 1000); assert.equal(item.product.quantiteStock, 3);
    const base = { ...item.product, coutRevient: 999, fournisseurInterne: 'isolated-private-wave-marker' };
    raw = { ...base }; await read(item, 'reviewed-identity');
    raw = { ...base, quantiteStock: 0 }; await read(item, 'zero-stock-keeps-note-and-out-of-stock-offer');
    raw = { ...base, prixPublic: null }; await read(item, 'unknown-price-keeps-note-without-offer');
    for (const [key, value] of Object.entries({ nomProduit: 'Isolated changed name', imageUrl: 'https://example.com/changed.webp',
      description: 'Isolated changed description', marque: 'Isolated changed brand', urlDatasheet: 'https://example.com/changed.pdf' })) {
      raw = { ...base, [key]: value }; await read(item, 'identity-drift-' + key, false);
    }
    raw = { ...base, attributs: [{ nomAttribut: 'Isolated new evidence', valeurs: [{ valeur: 'recorded' }] }] };
    await read(item, 'new-technical-evidence-withdraws-note', false);
  }
  const first = fixtures.products[0];
  raw = { ...first.product, estActif: false }; await read(first, 'inactive-product', false, 404);
  raw = { ...first.product }; apiFailure = true; await read(first, 'temporary-api-failure', false, 503);
  report.anonymousReads = reads; report.selectedNotes = productEditorialEntries.length; report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
finally { globalThis.fetch = previousFetch; }
if (process.env.OUT) { await mkdir(process.env.OUT, { recursive: true }); await writeFile(process.env.OUT + '/report.json', JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, notes: report.selectedNotes, rendererId: report.rendererId, error: report.error, writes: 0 }));
