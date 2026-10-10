import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';
import { injectInitialHome, initialHomeStyles } from '../src/storefront/initialHome.js';

const document = '<html><head><link rel="stylesheet" href="/assets/main.css"></head><body><div id="root"></div></body></html>';
const snapshot = { version: 1, language: 'fr', css: ['/assets/main.css', '/assets/home.css'], html: '<div class="app"><h1>Public home</h1></div>' };

test('public root receives shared HTML and only missing same-origin styles', () => {
  const html = injectInitialHome(document, snapshot);
  assert.match(html, /data-initial-home="fr"><div class="app">/);
  assert.equal(html.match(/href="\/assets\/main.css"/g).length, 1);
  assert.match(html, /data-initial-home-css rel="stylesheet" href="\/assets\/home.css"/);
  for (const bad of [{ ...snapshot, version: 2 }, { ...snapshot, css: ['https://other.test/a.css'] },
    { ...snapshot, html: '<script>bad()</script>' }, { ...snapshot, css: [] }, null])
    assert.equal(injectInitialHome(document, bad), document);
  assert.equal(injectInitialHome('<div id="root">existing</div>', snapshot), '<div id="root">existing</div>');
});

test('CSS follows static client imports only and fails for a stale manifest', () => {
  const manifest = {
    'index.html': { css: ['assets/main.css'], imports: ['shared'], dynamicImports: ['private'] },
    'src/storefront/Home.jsx': { css: ['assets/home.css'], imports: ['shared'] },
    shared: { css: ['assets/shared.css'], imports: ['index.html'] },
    private: { css: ['assets/private.css'] },
  };
  assert.deepEqual(initialHomeStyles(manifest), ['/assets/main.css', '/assets/shared.css', '/assets/home.css']);
  assert.throws(() => initialHomeStyles({}), /Missing client manifest entry/);
});

test('worker injects only the home GET and never forwards identity to the snapshot asset', async () => {
  const reads = [];
  const env = { ASSETS: { async fetch(request) {
    reads.push(request);
    return new URL(request.url).pathname === '/__public-home.json'
      ? new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json' } })
      : new Response(document, { headers: { 'Content-Type': 'text/html', 'ETag': 'asset' } });
  } } };
  const response = await worker.fetch(new Request('https://newoteg.com/?private=do-not-copy', {
    headers: { Authorization: 'test-secret', Cookie: 'session=test-secret' },
  }), env);
  const body = await response.text();
  assert.match(body, /Public home/);
  assert.ok(!body.includes('test-secret') && !body.includes('do-not-copy'));
  const internal = reads.find(r => new URL(r.url).pathname === '/__public-home.json');
  assert.equal(internal.headers.get('authorization'), null);
  assert.equal(internal.headers.get('cookie'), null);
  assert.equal(new URL(internal.url).search, '');
  assert.equal(response.headers.get('etag'), null);
  for (const route of ['/catalogue', '/checkout', '/profile', '/unknown']) {
    reads.length = 0;
    const result = await worker.fetch(new Request('https://newoteg.com' + route), env);
    assert.ok(!(await result.text()).includes('data-initial-home="fr"'));
    assert.equal(reads.length, 1);
    if (route === '/profile') assert.equal(result.headers.get('cache-control'), 'private, no-store');
  }
});

test('an older asset release stays client-rendered if the snapshot is unavailable', async () => {
  const env = { ASSETS: { fetch: async () => new Response(document, { headers: { 'Content-Type': 'text/html' } }) } };
  const result = await worker.fetch(new Request('https://newoteg.com/'), env);
  assert.match(await result.text(), /<div id="root"><\/div>/);
});
