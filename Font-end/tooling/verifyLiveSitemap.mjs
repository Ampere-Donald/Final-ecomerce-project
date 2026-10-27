import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const runtime = createRequire(import.meta.url)(resolve('.catalogue-backend/renderer.cjs'));
const output = process.argv[2];
if (!output) throw Error('Evidence output required');
await mkdir(output, { recursive: true });
let expected, pages;
const identities = [];
for (let page = 1; page <= (pages || 1); page++) {
  const response = await fetch('https://newoteg.com/api/produits?' + new URLSearchParams({ page: String(page), limit: '500', sort: 'name_asc' }), { signal: AbortSignal.timeout(20000) });
  assert(response.ok);
  const body = await response.json();
  assert(Number.isSafeInteger(body.meta.total) && Number.isSafeInteger(body.meta.lastPage));
  if (page === 1) { expected = body.meta.total; pages = body.meta.lastPage; }
  assert.equal(body.meta.total, expected, 'Catalogue changed during read: retry rather than publish a partial result');
  assert.equal(body.meta.lastPage, pages);
  assert(pages <= 100);
  for (const row of body.data) {
    assert.equal(row.estActif, true);
    identities.push({ id: row.id, nomProduit: row.nomProduit, categorieId: row.categorieId, sousCategorieId: row.sousCategorieId });
  }
}
assert.equal(identities.length, expected);
assert.equal(new Set(identities.map(row => row.id)).size, expected);
const xml = runtime.renderSitemapResponse(identities);
await writeFile(output + '/sitemap-preview.xml', xml);
const report = { at: new Date().toISOString(), writes: 0, products: expected, publicApiPages: pages,
  urls: (xml.match(/<loc>/g) || []).length, fabricatedModificationDates: false, status: 'passed',
  scope: 'Compiled release renderer and live anonymous product identities. Backend database projection has separate unit tests; production not activated.' };
await writeFile(output + '/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
