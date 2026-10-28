import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { seoFamilies, seoFamily, familyPath, familyParameters } from '../src/storefront/seoFamilies.js';
import { pageMetadata } from '../src/storefront/routeMetadata.js';
import { staticPublicMetadata } from '../src/storefront/serverMetadata.js';
import { isApplicationDocument } from '../src/storefront/documentRoutes.js';
import { catalogueQuery } from '../src/storefront/catalogueQuery.js';
import { catalogueSnapshot, readCatalogueBoot, catalogueBootJSON } from '../src/storefront/initialCatalogue.js';
import { runInNewContext } from 'node:vm';
import prefetchCatalogue from '../tooling/prefetchCatalogue.js';

test('dedicated families share their real catalogue selection and indexable metadata', () => {
  assert.equal(seoFamilies.length, 5);
  assert.equal(new Set(seoFamilies.map(familyPath)).size, 5);
  for (const family of seoFamilies) {
    const path = familyPath(family);
    assert.equal(seoFamily(path.toUpperCase() + '/'), family);
    assert.equal(isApplicationDocument(path), true);
    const query = catalogueQuery(familyParameters(new URLSearchParams('page=2'), family));
    assert.equal(query.category, family.category);
    assert.equal(query.subcategory, family.subcategory);
    assert.equal(query.page, 2);
    assert.equal(pageMetadata(path).robots, 'index, follow');
    assert.equal(pageMetadata(path, '?page=2').canonical, 'https://newoteg.com' + path + '?page=2');
    assert.equal(staticPublicMetadata(new URL('https://newoteg.com' + path)).title, pageMetadata(path).title);
  }
  assert.equal(seoFamily('/catalogue/extra'), null);
  assert.equal(isApplicationDocument('/catalogue/extra'), false);
});

test('family refinements, conflicting selectors and malformed pagination stay outside the index', () => {
  for (const family of seoFamilies) {
    for (const query of ['?search=x', '?sort=price-asc', '?instock=true', '?page=0', '?page=-1', '?page=1.2', '?page=2&page=3', '?page=9007199254740992', '?category=other', '?sub=other']) {
      assert.equal(pageMetadata(familyPath(family), query).robots, 'noindex, follow', query);
    }
    const selectors = new URLSearchParams({ category: family.category, sub: family.subcategory });
    assert.equal(pageMetadata(familyPath(family), '?' + selectors).robots, 'index, follow');
    assert.equal(familyParameters(new URLSearchParams('category=other&sub=other'), family).get('sub'), family.subcategory);
  }
});

test('edge serves family metadata, while unknown family slugs remain 404', async () => {
  const env = { ASSETS: { fetch: async () => new Response('<html><head></head><body><div id="root"></div></body></html>', { headers: { 'content-type': 'text/html' } }) } };
  for (const family of seoFamilies) {
    const response = await worker.fetch(new Request('https://newoteg.com' + familyPath(family)), env);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(family.fr));
    assert.ok(html.includes('content="index, follow"'));
    assert.ok(html.includes('href="https://newoteg.com' + familyPath(family) + '"'));
  }
  const response = await worker.fetch(new Request('https://newoteg.com/catalogue/not-a-family'), env);
  assert.equal(response.status, 404);
});

test('family server snapshot and browser boot read the identical subcategory with public data only', async () => {
  const family = seoFamilies[0];
  const url = new URL('https://newoteg.com' + familyPath(family) + '?page=2');
  const requests = [];
  const snapshot = await catalogueSnapshot(url, async request => {
    requests.push(request);
    return Response.json(request.url.endsWith('/categories') ? [{ id: family.category, nom: 'Composants' }] : {
      data: [{ id: 'p1', nomProduit: 'Example', estActif: true, coutRevient: 99 }], meta: { total: 30, lastPage: 2 },
    });
  });
  const productRequest = requests.find(r => new URL(r.url).pathname === '/api/produits');
  assert.equal(new URL(productRequest.url).searchParams.get('sousCategorieId'), family.subcategory);
  const boot = readCatalogueBoot(catalogueBootJSON(snapshot), url);
  assert.ok(boot);
  assert.equal(boot.resources[catalogueQuery(url.searchParams, url.pathname).path].data[0].coutRevient, undefined);
});

test('the actual emitted inline prefetch runs without module imports on dedicated families', async () => {
  const plugin = prefetchCatalogue();
  plugin.configResolved({ env: { VITE_API_URL: '/api' } });
  const html = await plugin.transformIndexHtml.handler('<html><head><meta charset="utf-8"></head></html>', {
    bundle: { 'assets/Catalogue.js': { type: 'chunk', isDynamicEntry: true, facadeModuleId: '/src/storefront/Catalogue.jsx', fileName: 'assets/Catalogue.js', imports: [], isEntry: false } },
  });
  const code = html.match(/<script data-catalogue-prefetch>([\s\S]*?)<\/script>/)[1];
  const calls = [];
  const window = { URL, URLSearchParams, AbortController,
    location: new URL('https://newoteg.com/catalogue/transistors?page=2'),
    document: { getElementById: () => null }, setTimeout, clearTimeout,
    fetch: async (url) => { calls.push(url); return Response.json({ data: [], meta: { total: 0, lastPage: 0 } }); },
  };
  runInNewContext(code, { window, URLSearchParams, setTimeout, clearTimeout });
  await Promise.all(Object.values(window.__newotegCataloguePrefetch.resources));
  const request = calls.find(url => url.includes('/produits?'));
  assert.equal(new URL(request, window.location).searchParams.get('sousCategorieId'), seoFamilies[1].subcategory);
  assert.equal(new URL(request, window.location).searchParams.get('page'), '2');
});
