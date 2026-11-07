// Exercise the emitted React renderer and real Worker with isolated public
// fixtures. No browser automation, production requests or business writes.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import worker from '../worker.js';
const require = createRequire(import.meta.url);
const runtime = require('../.catalogue-backend/renderer.cjs');
const manifest = JSON.parse(await readFile(new URL('../.catalogue-backend/manifest.json', import.meta.url), 'utf8'));
const document = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const report = { at: new Date().toISOString(), status: 'running', writes: 0, network: 'local fixture only', rendererId: manifest.rendererId, checks: [] };
const oldFetch = globalThis.fetch;
const cases = [
  { path: '/catalogue?page=9999', status: 404, total: 25 },
  { path: '/catalogue/condensateurs?page=9999', status: 404, total: 93 },
  { path: '/catalogue/condensateurs?page=2', status: 200, total: 25, row: true },
  { path: '/catalogue/condensateurs?page=2&instock=true', status: 404, total: 0 },
  { path: '/catalogue?search=local-fixture-no-match', status: 200, total: 0 },
  ...['0', '-1', '1.5', '2&page=3', '1000001'].map(page => ({ path: '/catalogue?page=' + page, status: 404, invalid: true })),
  { path: '/catalogue/condensateurs?page=9999', status: 200, outage: true },
];
cases.push(...cases.map(item => ({ ...item, path: '/en' + item.path })));
try {
  for (const item of cases) for (const method of ['GET', 'HEAD']) {
    let reads = 0;
    globalThis.fetch = async request => {
      reads++;
      assert(!item.invalid, 'invalid syntax needs no API/renderer request');
      const endpoint = new URL(request.url);
      assert.equal(endpoint.origin, 'https://api.newoteg.com');
      assert.equal(endpoint.pathname, '/api/storefront/catalogue');
      assert.equal(endpoint.searchParams.get('url'), item.path);
      assert.equal(endpoint.searchParams.get('renderer'), manifest.rendererId);
      assert(!request.headers.has('cookie')); assert(!request.headers.has('authorization'));
      if (item.outage) return new Response('Unavailable', { status: 503 });
      const result = { data: item.row ? [{ id: 'local-page-2', nomProduit: 'Pagination fixture', estActif: true, prixPublic: null, quantiteStock: 0 }] : [],
        meta: { total: item.total, lastPage: Math.ceil(item.total / 24) } };
      return new Response(runtime.renderCatalogueResponse(item.path, result, [], Date.now()), {
        headers: { 'content-type': 'text/html', 'x-catalogue-renderer': manifest.rendererId },
      });
    };
    const response = await worker.fetch(new Request('https://newoteg.com' + item.path, { method }), {
      backendCatalogue: manifest, catalogueStyles: ['/assets/Catalogue.css'],
      ASSETS: { fetch: async () => new Response(document, { headers: { 'content-type': 'text/html', ETag: 'shared' } }) },
    });
    assert.equal(response.status, item.status, item.path);
    assert.equal(reads, item.invalid ? 0 : 1);
    const html = await response.text();
    if (method === 'HEAD') assert.equal(html, '');
    if (item.status === 404) {
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert(!html.includes('rel="canonical"'));
      if (method === 'GET') assert(html.includes('name="robots" content="noindex, follow"'));
    }
    if (method === 'GET' && item.row) {
      assert(html.includes('Pagination fixture'));
      assert(html.includes(`data-initial-catalogue="${item.path.startsWith('/en/') ? 'en' : 'fr'}"`));
      assert(html.includes('rel="canonical" href="https://newoteg.com' + item.path + '"'));
      assert(!html.includes('name="robots" content="noindex'));
    }
    if (method === 'GET') assert.equal((html.match(/<script type="application\/ld\+json" data-newoteg-organization>/g) || []).length, 1);
    report.checks.push({ path: item.path, method, status: response.status, reads, outage: Boolean(item.outage) });
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
finally { globalThis.fetch = oldFetch; }
if (process.env.OUT) { await mkdir(process.env.OUT, { recursive: true }); await writeFile(process.env.OUT + '/report.json', JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report));
