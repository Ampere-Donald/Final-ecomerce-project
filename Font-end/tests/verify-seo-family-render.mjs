// Integration check of the shared React renderer with anonymous live catalogue
// reads. All HTTP operations are public GETs; no database writes are made.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { seoFamilies, familyPath } from '../src/storefront/seoFamilies.js';
import { catalogueSnapshot } from '../src/storefront/initialCatalogue.js';

const output = process.argv[2];
if (!output) throw Error('Evidence directory required');
await mkdir(output, { recursive: true });
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') } });
const report = { checkedAt: new Date().toISOString(), writes: 0, checks: [] };
try {
  const { renderCatalogueResponse } = await server.ssrLoadModule('/src/storefront/serverCataloguePackage.jsx');
  for (const family of seoFamilies) {
    const url = new URL('https://newoteg.com' + familyPath(family));
    const snapshot = await catalogueSnapshot(url, fetch, 15000);
    const productKey = Object.keys(snapshot.resources).find(key => key.startsWith('/produits?'));
    const rows = snapshot.resources[productKey];
    assert(rows.data.length > 0);
    const html = renderCatalogueResponse(snapshot.url, rows, snapshot.resources['/categories'], snapshot.at);
    assert(html.includes('<h1>' + family.fr + '</h1>'));
    assert(html.includes('data-initial-catalogue="fr"'));
    assert(!html.includes('<!--$!-->'), 'React server rendering must not suspend');
    assert(!/coutRevient|margeInterne|privateNote/.test(html));
    for (const product of rows.data) assert(html.includes('/product/' + product.id));
    if (rows.meta.lastPage > 1) assert(html.includes(familyPath(family) + '?page=2'));
    await writeFile(output + '/' + family.slug + '.html', html);
    report.checks.push({ family: family.slug, productsInHtml: rows.data.length, total: rows.meta.total, paginationLink: rows.meta.lastPage > 1 });
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
finally { await server.close(); await writeFile(output + '/render-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
