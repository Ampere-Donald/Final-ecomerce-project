import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAcquisition, createAcquisitionReader } from '../src/storefront/acquisition.js';
test('Source classification avoids false search attribution and paid campaigns take priority', () => {
  const page = 'https://newoteg.com/catalogue';
  assert.equal(classifyAcquisition(page, 'https://www.google.cm/search?q=private'), 'RECHERCHE_NATURELLE');
  assert.equal(classifyAcquisition(page, 'https://google.com.evil.invalid/search'), 'SITE_REFERENT');
  assert.equal(classifyAcquisition(page + '?gclid=secret', 'https://www.google.com/search'), 'CAMPAGNE_PAYANTE');
  assert.equal(classifyAcquisition(page + '?utm_medium=CPC', ''), 'CAMPAGNE_PAYANTE');
  assert.equal(classifyAcquisition(page + '?fbclid=organic-share', 'https://m.facebook.com/'), 'SOCIAL');
  assert.equal(classifyAcquisition(page, 'https://newoteg.com/product/x'), 'DIRECT_OU_INCONNU');
  for (const referrer of ['', 'invalid', 'file:///private']) assert.equal(classifyAcquisition(page, referrer), 'DIRECT_OU_INCONNU');
});
test('Only an enum and a bounded timestamp survive navigation; no URL or campaign value is stored', () => {
  let saved, href = 'https://newoteg.com/?gclid=private&utm_source=private', now = 100000;
  const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const read = () => createAcquisitionReader({ storage, now: () => now, href: () => href, referrer: () => 'https://www.google.fr/search?q=private' });
  assert.equal(read()(), 'CAMPAGNE_PAYANTE');
  assert.deepEqual(JSON.parse(saved), { at: now, channel: 'CAMPAGNE_PAYANTE' });
  assert(!/private|https|gclid/.test(saved));
  href = 'https://newoteg.com/product/x';
  assert.equal(read()(), 'CAMPAGNE_PAYANTE');
  now += 1800001;
  assert.equal(read()(), 'RECHERCHE_NATURELLE');
});
test('Denied or corrupted storage cannot break shopping or retain free fields', () => {
  const denied = { getItem: () => { throw Error(); }, setItem: () => { throw Error(); } };
  const reader = createAcquisitionReader({ storage: denied, href: () => 'https://newoteg.com', referrer: () => '' });
  assert.equal(reader(), 'DIRECT_OU_INCONNU');
  for (const saved of ['broken', '{"channel":"RECHERCHE_NATURELLE","at":1,"url":"private"}', '{"channel":"FAKE","at":1}']) {
    assert.equal(createAcquisitionReader({ storage: { getItem: () => saved }, now: () => 2, href: () => 'https://newoteg.com', referrer: () => '' })(), 'DIRECT_OU_INCONNU');
  }
});
