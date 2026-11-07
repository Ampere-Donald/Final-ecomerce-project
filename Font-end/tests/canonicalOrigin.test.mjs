import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalDocumentRedirect } from '../src/storefront/canonicalOrigin.js';
import worker from '../worker.js';
const product = '/product/02d5805f-7f51-4574-938d-d8cfe8c09487';

test('HTTP and www public documents converge directly on the preferred HTTPS origin without losing path or query', async () => {
  for (const origin of ['http://newoteg.com', 'http://www.newoteg.com', 'https://www.newoteg.com']) {
    for (const path of ['/', '/catalogue/condensateurs?page=2', '/catalogue?search=c%C3%A2ble&instock=true', product, '/guides',
      '/en/', '/en/catalogue/condensateurs?page=2', '/en/guides', '/en' + product]) {
      for (const method of ['GET', 'HEAD']) {
        const result = canonicalDocumentRedirect(new Request(origin + path, { method }));
        assert.equal(result.status, 308);
        assert.equal(result.headers.get('location'), 'https://newoteg.com' + path);
        assert.equal(result.headers.get('cache-control'), 'public, max-age=300');
        assert.equal(await result.text(), '');
        assert.equal(canonicalDocumentRedirect(new Request(result.headers.get('location'), { method })), null, 'No redirect loop');
      }
    }
  }
});

test('private routes, unknown pages, media, API and writes retain their existing origin and handling', () => {
  for (const path of ['/login', '/LOGIN?returnTo=%2Fcheckout', '/checkout', '/panier', '/suivi-invite',
    '/mes-devis/fixture/imprimer', '/commandes/fixture', '/profile', '/favourites', '/en/checkout', '/en/mes-devis/fixture/imprimer',
    '/api/produits', '/api/commandes/checkout', '/uploads/photo.jpg', '/assets/index.js', '/sitemap.xml', '/unknown-public-path']) {
    assert.equal(canonicalDocumentRedirect(new Request('http://www.newoteg.com' + path)), null, path);
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    assert.equal(canonicalDocumentRedirect(new Request('http://www.newoteg.com/catalogue', { method })), null);
  }
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:8877', 'https://preview.example', 'https://newoteg.com.evil.example'])
    assert.equal(canonicalDocumentRedirect(new Request(origin + '/catalogue')), null);
});

test('request headers and redirect-like query values cannot change the fixed destination', () => {
  const request = new Request('http://www.newoteg.com/catalogue?next=https%3A%2F%2Fevil.example', {
    headers: { Host: 'evil.example', 'X-Forwarded-Host': 'evil.example', 'X-Forwarded-Proto': 'ftp' },
  });
  const result = canonicalDocumentRedirect(request);
  const target = new URL(result.headers.get('location'));
  assert.equal(target.origin, 'https://newoteg.com');
  assert.equal(target.pathname, '/catalogue');
  assert.equal(target.searchParams.get('next'), 'https://evil.example');
  assert.equal(canonicalDocumentRedirect(new Request('https://www.newoteg.com//evil.example/catalogue')), null);
});

test('the actual Worker redirects before assets, API reads or rendering, and retains private protections', async () => {
  const redirect = await worker.fetch(new Request('http://www.newoteg.com' + product), {
    ASSETS: { fetch: () => { throw Error('Redirect must precede assets and rendering'); } },
  });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), 'https://newoteg.com' + product);
  let requested;
  const privatePage = await worker.fetch(new Request('https://www.newoteg.com/checkout'), {
    ASSETS: { fetch: request => { requested = request.url; return new Response('<div id="root"></div>', { headers: { 'content-type': 'text/html' } }); } },
  });
  assert.equal(requested, 'https://www.newoteg.com/checkout');
  assert.equal(privatePage.status, 200);
  assert.equal(privatePage.headers.get('cache-control'), 'private, no-store');
  assert.equal(privatePage.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal(privatePage.headers.get('referrer-policy'), 'no-referrer');
});
