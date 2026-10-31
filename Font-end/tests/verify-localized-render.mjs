import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { localizedFixtureWorker } from './localized-fixture-worker.mjs';
import { productEnglishTranslations } from '../src/storefront/productEnglish.generated.js';
import { productEditorialEntries } from '../src/storefront/productEditorialData.js';
import { preparedEnglishGuides } from '../src/storefront/guidesEnglish.generated.js';
import { seoFamilies, familyPath } from '../src/storefront/seoFamilies.js';
import { pageMetadata } from '../src/storefront/routeMetadata.js';
import { productGuides, selectionGuides } from '../src/storefront/editorialLinks.js';
import { adaptProduct } from '../src/storefront/productData.js';
import { editorialBasePath } from '../src/storefront/editorialRoutes.js';
const out = process.env.OUT ? resolve(process.env.OUT) : null;
if (out) await mkdir(out, { recursive: true });
const report = { at: new Date().toISOString(), status: 'running', writes: 0,
  data: 'Reviewed identity fixtures, fictional local commerce; compiled backend and actual Worker. No production API or deployment.', checks: [] };
const fixture = await localizedFixtureWorker();
const documents = new Map();
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function read(path, type) {
  const result = await fixture.request(path);
  assert.equal(result.status, 200, path);
  const html = await result.text(), meta = pageMetadata(path);
  documents.set(path, html);
  assert(html.includes('lang="en"'), path);
  assert(html.includes(`rel="canonical" href="https://newoteg.com${path}"`), path);
  for (const entry of meta.alternates) assert(html.includes(`hreflang="${entry.lang}" href="${entry.href}"`), entry.href);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, path);
  assert(!html.includes('/en/en/'), path);
  report.checks.push({ path, type, status: 'passed', bytes: Buffer.byteLength(html) });
  if (out) await writeFile(join(out, (path.slice(1).replaceAll('/', '-') || 'home') + '.html'), html);
  return html;
}
try {
  for (const entry of productEnglishTranslations) {
    const path = '/en/product/' + entry.id, html = await read(path, 'compiled-English-product');
    assert(html.includes('data-initial-product="en"'), path);
    assert(decode(html).includes(entry.en.summary), path);
    const french = productEditorialEntries.find(item => item.id === entry.id);
    assert(!decode(html).includes(french.fr.summary), path);
    const schema = JSON.parse(html.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@graph'][0].name, entry.en.name);
    assert.equal(schema['@graph'][0].url, 'https://newoteg.com' + path);
    const raw = fixture.rows.find(row => row.id === entry.id);
    for (const guide of productGuides(adaptProduct(raw, value => value), 'en'))
      assert(html.includes('href="/en' + editorialBasePath(guide) + '"'), path + ' related guide');
    if (raw.prixPublic === null) assert.equal(schema['@graph'][0].offers, undefined);
    else assert.equal(schema['@graph'][0].offers.price, raw.prixPublic);
    const boot = JSON.parse(html.match(/id="initial-product-data">([\s\S]*?)<\/script>/)[1]);
    assert.equal(boot.url, path); assert(boot.resources['/produits/' + entry.id]);
    const fr = await fixture.request('/product/' + entry.id), body = await fr.text();
    documents.set('/product/' + entry.id, body);
    assert.equal(fr.status, 200); assert(decode(body).includes(french.fr.summary));
    for (const guide of productGuides(adaptProduct(raw, value => value), 'fr'))
      assert(body.includes('href="' + editorialBasePath(guide) + '"'), 'French related guide');
    assert(body.includes(`hreflang="en" href="https://newoteg.com${path}"`));
  }
  for (const family of seoFamilies) {
    const path = '/en' + familyPath(family), html = await read(path, 'compiled-English-family');
    assert(html.includes('data-initial-catalogue="en"')); assert(decode(html).includes(family.en));
    assert(html.includes('What to check before choosing'));
    for (const guide of preparedEnglishGuides.filter(entry => entry.families.includes(family.slug))) {
      assert(html.includes('href="/en/guides/' + guide.slug + '"')); assert(decode(html).includes(guide.title));
    }
  }
  for (const guide of preparedEnglishGuides) {
    const path = '/en/guides/' + guide.slug, html = await read(path, 'compiled-English-guide');
    assert(html.includes('data-initial-editorial="en"')); assert(decode(html).includes(guide.summary));
    assert(html.includes('Scope and limitations')); assert(html.includes('Reviewed on'));
    for (const section of guide.sections) { assert(html.includes('id="' + section.id + '"')); assert(decode(html).includes(section.title)); }
    for (const source of guide.sources) assert(html.includes(source.url));
  }
  const home = await read('/en/', 'build-generated-English-home');
  assert(home.includes('data-initial-home="en"')); assert(home.includes('href="/en/catalogue"'));
  const frenchHome = await (await fixture.request('/')).text();
  documents.set('/', frenchHome);
  for (const lang of ['fr', 'en']) {
    const body = lang === 'en' ? home : frenchHome, prefix = lang === 'en' ? '/en' : '';
    for (const guide of selectionGuides(lang)) assert(body.includes('href="' + prefix + editorialBasePath(guide) + '"'), 'Home guide link');
    for (const family of seoFamilies) assert(body.includes('href="' + prefix + familyPath(family) + '"'), 'Home family link');
  }
  const index = await read('/en/guides', 'compiled-English-library');
  for (const guide of preparedEnglishGuides) assert(index.includes('href="/en/guides/' + guide.slug + '"'));
  const graphs = [];
  for (const lang of ['fr', 'en']) {
    const prefix = lang === 'en' ? '/en' : '', start = prefix + '/';
    const paths = [start, prefix + '/guides', ...seoFamilies.map(family => prefix + familyPath(family)),
      ...selectionGuides(lang).map(guide => prefix + editorialBasePath(guide)),
      ...fixture.rows.map(row => prefix + '/product/' + row.id)];
    for (const path of paths) {
      if (documents.has(path)) continue;
      const result = await fixture.request(path); assert.equal(result.status, 200);
      documents.set(path, await result.text());
    }
    const allowed = new Set(paths), edges = [];
    for (const path of paths) {
      for (const match of documents.get(path).matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
        const target = new URL(decode(match[1]), 'https://newoteg.com' + path);
        const destination = target.pathname === '/en' ? '/en/' : target.pathname;
        if (target.origin === 'https://newoteg.com' && !target.search && allowed.has(destination)) edges.push({ from: path, to: destination });
      }
    }
    const reached = new Set([start]), queue = [start];
    while (queue.length) {
      const from = queue.shift();
      for (const edge of edges.filter(edge => edge.from === from)) if (!reached.has(edge.to)) { reached.add(edge.to); queue.push(edge.to); }
    }
    for (const path of paths) assert(reached.has(path), 'Orphan fixture destination: ' + path);
    graphs.push({ lang, start, nodes: paths, edges, reachable: reached.size });
  }
  report.linkGraph = graphs.map(({ lang, nodes, reachable }) => ({ lang, nodes: nodes.length, reachable }));
  if (out) await writeFile(join(out, 'link-graph.json'), JSON.stringify({ scope: 'Actual compiled fixture HTML; not the deployed catalogue', graphs }, null, 2));
  const xml = await (await fixture.request('/sitemap.xml')).text();
  for (const row of fixture.rows) assert(xml.includes('<loc>https://newoteg.com/en/product/' + row.id + '</loc>'));
  // Fill the first page with declared local fixtures, forcing a reviewed real
  // identity onto page 2. This checks emitted navigation, not just a URL helper.
  const target = fixture.rows[0], pagination = [];
  for (let index = 0; index < 24; index++) pagination.push({ ...target,
    id: '00000000-0000-4000-8000-' + String(index).padStart(12, '0'),
    nomProduit: 'Fictional local pagination reference ' + index });
  fixture.rows.unshift(...pagination);
  for (const prefix of ['', '/en']) {
    const base = prefix + '/catalogue/condensateurs';
    const first = await (await fixture.request(base)).text();
    assert(first.includes('href="' + base + '?page=2"'), 'Next page available in HTML');
    assert(!first.includes('href="' + prefix + '/product/' + target.id + '"'), 'Target is beyond page 1');
    const second = await (await fixture.request(base + '?page=2')).text();
    assert(second.includes('href="' + prefix + '/product/' + target.id + '"'), 'Target discovered through page 2');
    assert(second.includes('rel="canonical" href="https://newoteg.com' + base + '?page=2"'));
  }
  fixture.rows.splice(0, pagination.length);
  report.checks.push({ type: 'home-guide-family-links-product-guide-links-and-page-2-discovery', status: 'passed' });
  const row = fixture.rows[0], original = row.description;
  row.description += ' Changed after review';
  const stale = await fixture.request('/en/product/' + row.id);
  assert.equal(stale.status, 404); assert(!(await stale.text()).includes('data-initial-product="en"'));
  assert(!(await (await fixture.request('/sitemap.xml')).text()).includes('/en/product/' + row.id));
  row.description = original;
  const refused = await fixture.request('/api/commandes/checkout', { method: 'POST', body: '{}' });
  assert.equal(refused.status, 405);
  report.checks.push({ type: 'stale-identity-withdrawal-and-local-write-refusal', status: 'passed' });
  report.rendererId = fixture.manifest.rendererId;
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error); process.exitCode = 1; }
finally {
  fixture.restore();
  if (out) await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
