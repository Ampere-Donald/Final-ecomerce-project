// Public post-release acceptance. Anonymous GETs only; never creates orders,
// messages or analytics events. A failed check leaves a dated report to inspect.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { seoFamilies, familyPath } from '../src/storefront/seoFamilies.js';

const output = process.argv[2];
if (!output) throw Error('Evidence directory required');
await mkdir(output, { recursive: true });
const origin = 'https://newoteg.com';
const report = { at: new Date().toISOString(), writes: 0, checks: [] };
async function read(path) {
  const response = await fetch(origin + path, { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return { response, text: await response.text() };
}
function publicDocument(path, response, text) {
  assert(!/noindex/i.test(response.headers.get('x-robots-tag') || ''), `${path}: HTTP noindex`);
  assert(!/<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(text), `${path}: meta noindex`);
  assert(text.includes(`rel="canonical" href="${origin + path}"`) ||
    text.includes(`href="${origin + path}" rel="canonical"`), `${path}: missing canonical`);
  assert(!/<div id="root"[^>]*>\s*<\/div>/.test(text), `${path}: empty root`);
}
try {
  await read('/api/health');
  report.checks.push({ type: 'backend-health', status: 'passed' });
  for (const family of seoFamilies) {
    const path = familyPath(family), { response, text } = await read(path);
    publicDocument(path, response, text);
    assert(text.includes('data-initial-catalogue="fr"'));
    assert(text.includes('<h1>' + family.fr + '</h1>'));
    const count = (text.match(/<article class="[^"]*e-product-card/g) || []).length;
    assert(count > 0, `${path}: no product cards`);
    report.checks.push({ path, type: 'family-html', products: count, status: 'passed' });
  }
  for (const id of ['02d5805f-7f51-4574-938d-d8cfe8c09487', '0f776e03-7dd5-4346-97f0-2881154110bd',
    'e2eb7c63-9e35-4888-bd3f-cb940fbd8c0c', '7a4a260b-35bd-40ce-b246-d548a553432f', '01c4196c-5e44-47bf-8061-cdc06ef6ae9b']) {
    const path = '/product/' + id, { response, text } = await read(path);
    publicDocument(path, response, text);
    assert(text.includes('data-initial-product="fr"'));
    const boot = JSON.parse(text.match(/id="initial-product-data">([\s\S]*?)<\/script>/)[1]);
    const product = boot.resources['/produits/' + id];
    assert.equal(product.id, id);
    assert(!/"(?:cmupActuel|coutRevient|fournisseur|margeInterne)"\s*:/.test(JSON.stringify(boot)));
    const graph = JSON.parse(text.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1])['@graph'];
    const schema = graph.find(node => node['@type'] === 'Product');
    assert.equal(schema.name, product.nomProduit);
    if (schema.offers) {
      assert.equal(schema.offers.priceCurrency, 'XAF');
      assert.equal(Number(schema.offers.price), Number(product.prixPublic));
      assert.equal(schema.offers.availability, Number(product.quantiteStock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock');
    }
    report.checks.push({ path, type: 'product-html-and-schema', status: 'passed' });
  }
  const { text: sitemap, response } = await read('/sitemap.xml');
  assert(response.headers.get('content-type')?.includes('application/xml'));
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length);
  assert(!sitemap.includes('<lastmod>'), 'No reliable public modification dates exist yet');
  assert(urls.every(url => url.startsWith(origin + '/') && !/[?#]/.test(url)));
  for (const family of seoFamilies) assert(urls.includes(origin + familyPath(family)));
  const { text: catalogueJSON } = await read('/api/produits?page=1&limit=1');
  const total = JSON.parse(catalogueJSON).meta.total;
  const products = urls.filter(url => url.startsWith(origin + '/product/')).length;
  assert.equal(products, total, 'Sitemap products must match the current active catalogue');
  assert(!urls.some(url => /\/(?:admin|mes-devis|mes-commandes|panier|compte)(?:\/|$)/.test(url)));
  await writeFile(output + '/sitemap.xml', sitemap);
  report.checks.push({ type: 'sitemap', urls: urls.length, products, status: 'passed' });
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
await writeFile(output + '/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
