import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../worker.js';
import { staticPublicMetadata, renderFallbackMetadata } from '../src/storefront/serverMetadata.js';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Public HTML has route-specific metadata before JavaScript, with one owner', () => {
  for (const path of ['/catalogue', '/contact', '/guides', '/livraison', '/projets']) {
    const meta = staticPublicMetadata(new URL('https://newoteg.com' + path));
    const output = renderFallbackMetadata(html, meta);
    assert.equal((output.match(/<title\b/g) || []).length, 1);
    assert.equal((output.match(/name="description"/g) || []).length, 1);
    assert.equal((output.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(output.includes(meta.title));
    assert.ok(output.includes('href="https://newoteg.com' + path + '"'));
    assert.ok(output.includes('<div id="root"></div>'));
    const repeated = renderFallbackMetadata(output, meta);
    assert.equal((repeated.match(/<title\b/g) || []).length, 1);
    assert.equal((repeated.match(/name="description"/g) || []).length, 1);
  }
});

test('Private and dynamic records are excluded; search input is never reflected', () => {
  for (const path of ['/suivi-invite', '/checkout', '/product/id', '/projets/slug', '/missing'])
    assert.equal(staticPublicMetadata(new URL('https://newoteg.com' + path)), null);
  const url = new URL('https://newoteg.com/catalogue?search=%22%3E%3Cscript%3Esecret');
  const output = renderFallbackMetadata(html, staticPublicMetadata(url));
  assert.ok(output.includes('content="noindex, follow"'));
  assert.ok(!output.includes('secret'));
  const page = renderFallbackMetadata(html, staticPublicMetadata(new URL('https://newoteg.com/catalogue?page=2')));
  assert.ok(page.includes('href="https://newoteg.com/catalogue?page=2"'));
});

test('Edge discards shared asset validators before transforming a public page', async () => {
  let seen;
  const env = { ASSETS: { fetch: async request => {
    seen = request;
    return new Response(html, { headers: { 'Content-Type': 'text/html', ETag: 'shared', 'Content-Length': '999' } });
  } } };
  const r = await worker.fetch(new Request('https://newoteg.com/contact', { headers: { 'If-None-Match': 'shared' } }), env);
  assert.equal(seen.headers.get('if-none-match'), null);
  assert.equal(r.headers.get('etag'), null);
  assert.equal(r.headers.get('content-length'), null);
  assert.ok((await r.text()).includes('Contact et conseil'));
});
