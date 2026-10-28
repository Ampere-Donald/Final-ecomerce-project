import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSitemapResponse, sitemapResponse, publicStaticPaths } from '../src/storefront/publicSitemap.js';
import { seoFamilies } from '../src/storefront/seoFamilies.js';
const id = '13d2ff99-cd90-430d-b713-be98828f51cd';
const family = seoFamilies[0];
const row = { id, nomProduit: 'Real reference', categorieId: family.category, sousCategorieId: family.subcategory };

test('sitemap contains only stable public routes, actual nonempty families and validated unique references', () => {
  const xml = renderSitemapResponse([row]);
  assert.equal((xml.match(/<loc>/g) || []).length, publicStaticPaths.length + 2);
  assert(xml.includes('https://newoteg.com/product/' + id));
  assert(xml.includes('https://newoteg.com/catalogue/condensateurs'));
  assert(!xml.includes('https://newoteg.com/catalogue/transistors'));
  for (const privateText of ['lastmod', '/checkout', '/mes-devis', '/login', 'prix']) assert(!xml.includes(privateText));
  for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) assert.equal(new URL(match[1]).search, '');
  for (const rows of [[row, row], [{ ...row, estActif: false }], [{ ...row, id: '</loc>' }], [{ ...row, nomProduit: ' ' }]]) assert.throws(() => renderSitemapResponse(rows));
  assert.throws(() => renderSitemapResponse(Array(49001).fill(row)));
});

test('sitemap fetch never forwards visitor credentials and failure returns retryable 503 instead of a truncated sitemap', async () => {
  const descriptor = { rendererId: 'a'.repeat(64) };
  const request = new Request('https://newoteg.com/sitemap.xml', { headers: { Cookie: 'private', Authorization: 'private' } });
  const response = await sitemapResponse(request, descriptor, async upstream => {
    const url = new URL(upstream.url);
    assert.equal(url.origin, 'https://api.newoteg.com');
    assert.equal(url.pathname, '/api/storefront/sitemap.xml');
    assert.equal(url.searchParams.get('renderer'), descriptor.rendererId);
    assert.equal(upstream.headers.get('Cookie'), null); assert.equal(upstream.headers.get('Authorization'), null);
    assert.equal(upstream.redirect, 'manual');
    return new Response(renderSitemapResponse([row]), { headers: { 'content-type': 'application/xml', 'X-Catalogue-Renderer': descriptor.rendererId } });
  });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert((await response.text()).includes('/product/' + id));
  for (const mock of [() => new Response('down', { status: 503 }), () => new Response('', { status: 302 }), () => new Response('invalid', { headers: { 'content-type': 'application/xml' } }), () => { throw Error('timeout'); }]) {
    const failed = await sitemapResponse(request, descriptor, mock);
    assert.equal(failed.status, 503); assert.equal(failed.headers.get('cache-control'), 'no-store');
    assert(!(await failed.text()).includes('<urlset'));
  }
});
