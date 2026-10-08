import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../worker.js';
import { isApplicationDocument } from '../src/storefront/documentRoutes.js';

test('Every explicit React route remains available through the edge classifier', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const paths = [...app.matchAll(/path="([^"]+)"/g)].map(m => m[1]).filter(p => p !== '*');
  assert.ok(paths.length > 20);
  for (const path of paths) {
    const concrete = path.replace(/:[^/]+/g, 'example');
    assert.equal(isApplicationDocument(concrete), true, concrete);
    assert.equal(isApplicationDocument(concrete.toUpperCase() + '/'), true, concrete);
  }
});

test('Unknown HTML fallback is 404 without losing the application error page', async () => {
  const env = { ASSETS: { fetch: async () => new Response('<html>app</html>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ETag: 'home', 'Cache-Control': 'public' },
  }) } };
  for (const path of ['/missing-page', '/catalogue/extra', '/assets/missing.js', '/product/a/b']) {
    const result = await worker.fetch(new Request('https://example.invalid' + path), env);
    assert.equal(result.status, 404);
    assert.equal(result.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.equal(result.headers.get('etag'), null);
    assert.equal(await result.text(), '<html>app</html>');
  }
  const head = await worker.fetch(new Request('https://example.invalid/missing', { method: 'HEAD' }), env);
  assert.equal(head.status, 404); assert.equal(await head.text(), '');
  const privateUnknown = await worker.fetch(new Request('https://example.invalid/checkout/extra'), env);
  assert.equal(privateUnknown.status, 404);
  assert.equal(privateUnknown.headers.get('cache-control'), 'private, no-store');
  assert.equal(privateUnknown.headers.get('referrer-policy'), 'no-referrer');
  const publicPage = await worker.fetch(new Request('https://example.invalid/catalogue?search=cable'), env);
  assert.equal(publicPage.status, 200);
});

test('Real assets and upstream errors keep their status and contents', async () => {
  for (const [status, type] of [[200, 'image/webp'], [301, 'text/html'], [503, 'text/html']]) {
    const env = { ASSETS: { fetch: async () => new Response('payload', { status, headers: { 'Content-Type': type } }) } };
    const result = await worker.fetch(new Request('https://example.invalid/asset'), env);
    assert.equal(result.status, status); assert.equal(await result.text(), 'payload');
  }
});
