import test from 'node:test';
import assert from 'node:assert/strict';
import { publicRecord, recordMetadata } from '../src/storefront/recordMetadata.js';
import { renderFallbackMetadata } from '../src/storefront/serverMetadata.js';
const id = 'ee76f44c-97f3-487c-8b7b-b53801c851e4';
const product = { id, estActif: true, nomProduit: 'Pièce <script>test</script>', description: 'Détails & usage' };
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('Record lookup stays on fixed anonymous public API and escapes catalogue text', async () => {
  const result = await recordMetadata(publicRecord('/product/' + id), async (url, options) => {
    assert.equal(url, 'https://api.newoteg.com/api/produits/' + id);
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    assert.equal(options.redirect, 'manual');
    return json(product);
  });
  assert.equal(result.status, 200);
  const html = renderFallbackMetadata('<head></head>', result.metadata);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>test'));
});

test('Absent, invalid and inactive records are 404; upstream failures are temporary 503', async () => {
  let calls = 0;
  const invalid = await recordMetadata(publicRecord('/product/not-an-id'), async () => { calls++; });
  assert.equal(invalid.status, 404); assert.equal(calls, 0);
  for (const status of [404, 410]) assert.equal((await recordMetadata(publicRecord('/product/' + id), async () => new Response('', { status }))).status, 404);
  assert.equal((await recordMetadata(publicRecord('/product/' + id), async () => json({ ...product, estActif: false }))).status, 404);
  for (const response of [() => new Response('', { status: 500 }), () => json({ ...product, id: 'wrong' }), () => { throw Error('timeout'); }]) {
    const result = await recordMetadata(publicRecord('/product/' + id), async () => response());
    assert.equal(result.status, 503); assert.equal(result.metadata.canonical, null);
  }
});

test('Projects use the public slug endpoint; private documents never qualify', async () => {
  const result = await recordMetadata(publicRecord('/projets/premier-montage'), async url => {
    assert.equal(url, 'https://api.newoteg.com/api/projets/public/premier-montage');
    return json({ slug: 'premier-montage', titre: 'Premier montage', resume: 'Matériel requis' });
  });
  assert.equal(result.status, 200);
  assert.equal(publicRecord('/mes-devis/private'), null);
  assert.equal(publicRecord('/product/id/extra'), null);
  assert.equal(publicRecord('/projets/%2f%2fhost').valid, false);
});
