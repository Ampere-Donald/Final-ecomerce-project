import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueBackendFragment, injectBackendCatalogue } from '../src/storefront/backendCatalogue.js';
const descriptor = { rendererId: 'a'.repeat(64) };
const url = new URL('https://newoteg.com/catalogue?search=c%C3%A2ble&sort=price-desc');
const fragment = '<div id="root" data-initial-catalogue="fr"><div class="app"><p>câble $&</p></div></div>' +
  '<script type="application/json" id="initial-catalogue-data">{}</script>';
function response(body = fragment, headers = {}) {
  return new Response(body, { headers: { 'Content-Type': 'text/html', 'X-Catalogue-Renderer': descriptor.rendererId, ...headers } });
}
test('backend transport uses only a fixed public GET and keeps accents and matching version', async () => {
  const result = await catalogueBackendFragment(url, descriptor, async request => {
    const endpoint = new URL(request.url);
    assert.equal(endpoint.origin, 'https://api.newoteg.com'); assert.equal(endpoint.pathname, '/api/storefront/catalogue');
    assert.equal(endpoint.searchParams.get('url'), url.pathname + url.search);
    assert.equal(endpoint.searchParams.get('renderer'), descriptor.rendererId);
    assert.equal(request.method, 'GET'); assert.equal(request.redirect, 'manual');
    assert(!request.headers.has('Authorization')); assert(!request.headers.has('Cookie'));
    return response();
  });
  assert.equal(result, fragment);
  const html = injectBackendCatalogue('<html><head></head><body><div id="root"></div></body></html>', result, ['/assets/Catalogue.css']);
  assert(html.includes('câble $&')); assert(html.includes('href="/assets/Catalogue.css"'));
});
test('mismatch, redirect, oversized HTML, injected executable script and timeouts are rejected', async () => {
  for (const fetcher of [() => response(fragment, { 'X-Catalogue-Renderer': 'b'.repeat(64) }),
    () => new Response(null, { status: 302 }), () => response('x'.repeat(512 * 1024 + 1)),
    () => response(fragment.replace('<p>', '<script>attack</script><p>')),
    () => response('<div id="root"></div>')]) await assert.rejects(catalogueBackendFragment(url, descriptor, fetcher));
  await assert.rejects(catalogueBackendFragment(url, descriptor, request => new Promise((resolve, reject) => {
    request.signal.addEventListener('abort', () => reject(Error('Timeout')));
  }), 5));
  assert.equal(await catalogueBackendFragment(new URL('https://newoteg.com/catalogue?token=private'), descriptor,
    () => { throw Error('Should not fetch'); }), null);
});
