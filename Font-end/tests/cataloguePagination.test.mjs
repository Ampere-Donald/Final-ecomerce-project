import test from 'node:test';
import assert from 'node:assert/strict';
import { invalidCataloguePage, missingCataloguePage } from '../src/storefront/cataloguePagination.js';
import { catalogueFragmentPageMissing } from '../src/storefront/backendCatalogue.js';
import { catalogueQuery } from '../src/storefront/catalogueQuery.js';
import worker from '../worker.js';

const params = text => new URLSearchParams(text);
const url = new URL('https://newoteg.com/catalogue/condensateurs?page=9999');
const descriptor = { rendererId: 'a'.repeat(64) };
const document = '<html><head></head><body><div id="root"></div></body></html>';
const data = { data: [], meta: { total: 93, lastPage: 4 } };
function fragment(target = url, result = data) {
  const snapshot = { version: 1, url: target.pathname + target.search, at: Date.now(), resources: {
    [catalogueQuery(target.searchParams, target.pathname).path]: result, '/categories': [],
  } };
  return `<div id="root" data-initial-catalogue="${target.pathname.startsWith('/en/') ? 'en' : 'fr'}"><div class="app"><p>No results</p></div></div>` +
    '<script type="application/json" id="initial-catalogue-data">' + JSON.stringify(snapshot) + '</script>';
}
const env = { backendCatalogue: descriptor, catalogueStyles: ['/assets/Catalogue.css'], ASSETS: {
  fetch: async request => {
    // HEAD must make its decision from the same document as GET, then omit it.
    assert.equal(request.method, 'GET');
    return new Response(document, { headers: { 'content-type': 'text/html', ETag: 'shared' } });
  },
} };

test('invalid page numbers cannot create unlimited indexable aliases', () => {
  for (const value of ['0', '-1', '1.5', '01', 'Infinity', 'NaN', '', '1000001', '9007199254740992', '2&page=3'])
    assert(invalidCataloguePage(params('page=' + value)), value);
  for (const value of ['', 'page=1', 'page=2', 'page=1000000', 'page=2&sort=price-asc'])
    assert.equal(invalidCataloguePage(params(value)), false, value);
});

test('absence requires an empty successful page and consistent real totals', () => {
  assert(missingCataloguePage(params('page=5'), data));
  assert.equal(missingCataloguePage(params('page=4'), data), false);
  assert.equal(missingCataloguePage(params('page=1'), { data: [], meta: { total: 0, lastPage: 0 } }), false);
  assert(missingCataloguePage(params('page=2'), { data: [], meta: { total: 0, lastPage: 0 } }));
  for (const result of [null, {}, { data: [] }, { data: [], meta: { total: '93', lastPage: 4 } },
    { data: [], meta: { total: 93, lastPage: 3 } }, { data: [{}], meta: { total: 93, lastPage: 4 } }])
    assert.equal(missingCataloguePage(params('page=9999'), result), false);
});

test('a fragment for another request, malformed JSON or missing boot cannot prove absence', () => {
  assert(catalogueFragmentPageMissing(url, fragment()));
  assert.equal(catalogueFragmentPageMissing(new URL('https://newoteg.com/catalogue?page=9999'), fragment()), false);
  assert.equal(catalogueFragmentPageMissing(url, '<div>Unavailable</div>'), false);
  assert.equal(catalogueFragmentPageMissing(url, fragment().replace('"version":1', '"version":2')), false);
});

test('GET and HEAD return 404/noindex/no-store without canonical only for proven missing pages', async () => {
  const previous = globalThis.fetch;
  try {
    let reads = 0;
    globalThis.fetch = async request => {
      reads++;
      assert.equal(request.method, 'GET'); assert(!request.headers.has('Cookie')); assert(!request.headers.has('Authorization'));
      const target = new URL(new URL(request.url).searchParams.get('url'), 'https://newoteg.com');
      return new Response(fragment(target), { headers: { 'content-type': 'text/html', 'x-catalogue-renderer': descriptor.rendererId } });
    };
    for (const language of ['fr', 'en']) for (const method of ['GET', 'HEAD']) {
      const target = language === 'en' ? new URL('/en' + url.pathname + url.search, url.origin) : url;
      const r = await worker.fetch(new Request(target, { method, headers: { Cookie: 'private', Authorization: 'private' } }), env);
      assert.equal(r.status, 404); assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-robots-tag'), 'noindex, follow'); assert.equal(r.headers.get('etag'), null);
      const html = await r.text();
      if (method === 'HEAD') assert.equal(html, '');
      else { assert(html.includes(`data-initial-catalogue="${language}"`)); assert(html.includes('noindex, follow')); assert(!html.includes('rel="canonical"')); assert(!html.includes('hreflang=')); }
    }
    assert.equal(reads, 4, 'one existing renderer read per request, no pagination API call added');
  } finally { globalThis.fetch = previous; }
});

test('invalid page syntax is 404 without asking the API or the renderer', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = () => { throw Error('Unexpected read'); };
    for (const path of ['/catalogue?page=-1', '/catalogue/condensateurs?page=1000001', '/catalogue?page=2&page=3']) {
      const r = await worker.fetch(new Request('https://newoteg.com' + path), env);
      assert.equal(r.status, 404); assert.equal(r.headers.get('x-robots-tag'), 'noindex, follow');
      assert(!(await r.text()).includes('rel="canonical"'));
    }
  } finally { globalThis.fetch = previous; }
});

test('renderer outages never become a missing page and real page 2 retains its canonical', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('Temporary failure', { status: 503 });
    const unavailable = await worker.fetch(new Request(url), env);
    assert.equal(unavailable.status, 200, 'existing client recovery path retained');
    assert.notEqual(unavailable.headers.get('x-robots-tag'), 'noindex, follow');
    const valid = new URL('https://newoteg.com/catalogue/condensateurs?page=2');
    const available = { data: [{ id: 'p2', nomProduit: 'Live page 2', estActif: true, prixPublic: null, quantiteStock: 0 }],
      meta: { total: 93, lastPage: 4 } };
    globalThis.fetch = async () => new Response(fragment(valid, available), {
      headers: { 'content-type': 'text/html', 'x-catalogue-renderer': descriptor.rendererId },
    });
    const response = await worker.fetch(new Request(valid), env);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert((await response.text()).includes('href="' + valid.href + '"'));
  } finally { globalThis.fetch = previous; }
});
