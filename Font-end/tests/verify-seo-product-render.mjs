import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { injectProductFragment, readProductBoot } from '../src/storefront/initialProduct.js';

const output = process.argv[2];
if (!output) throw Error('Absolute evidence output required');
await mkdir(output, { recursive: true });
const baseline = JSON.parse(await readFile(process.argv[3], 'utf8'));
const server = await createServer({ configFile: false, plugins: [react()], optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true }, appType: 'custom', define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') } });
const report = { at: new Date().toISOString(), writes: 0, checks: [] };
try {
  const { renderProductResponse } = await server.ssrLoadModule('/src/storefront/serverProduct.jsx');
  // Exercise all 20 actual pilot products, including their distinct attributes.
  for (const candidate of baseline.products) {
    const response = await fetch('https://newoteg.com/api/produits/' + candidate.id, { signal: AbortSignal.timeout(15000) });
    assert(response.ok);
    const raw = await response.json();
    const url = new URL(candidate.url);
    const fragment = renderProductResponse(url.pathname, raw, Date.now());
    assert(!fragment.includes('<!--$!-->'));
    const bootText = fragment.match(/id="initial-product-data">([\s\S]*)<\/script>$/)[1];
    assert(readProductBoot(bootText, url));
    const schema = JSON.parse(fragment.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@graph'][0].name, raw.nomProduit);
    const expectedPrice = raw.prixPublic === undefined ? raw.prixDetail : raw.prixPublic;
    if (schema['@graph'][0].offers) assert.equal(schema['@graph'][0].offers.price, Number(expectedPrice));
    assert(!/cmupActuel|dernierFournisseurId|quantiteReservee/.test(fragment));
    const html = injectProductFragment('<html><head></head><body><div id="root"></div></body></html>', fragment, ['/assets/Product.css']);
    assert(html.includes('<h1>'));
    await writeFile(output + '/' + candidate.id + '.html', html);
    report.checks.push({ id: candidate.id, name: raw.nomProduit, schemaPrice: schema['@graph'][0].offers?.price ?? null, status: 'passed' });
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
finally { await server.close(); await writeFile(output + '/report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
// Vite's development dependency optimizer may retain a background worker even
// after middleware shutdown. This CLI has finished writing all evidence.
process.exit(process.exitCode || 0);
