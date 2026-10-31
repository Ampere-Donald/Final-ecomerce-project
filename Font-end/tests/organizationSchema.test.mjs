import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { organizationData, organizationJSON } from '../src/storefront/organizationData.js';
import { shopContact } from '../src/storefront/shopContact.js';
import organizationSchema from '../tooling/organizationSchema.js';
import { renderFallbackMetadata, staticPublicMetadata } from '../src/storefront/serverMetadata.js';
import { injectInitialHome } from '../src/storefront/initialHome.js';

test('organization identity reuses visible public contact details and makes no unsupported business claims', () => {
  const data = organizationData();
  assert.equal(data['@type'], 'Organization');
  assert.equal(data['@id'], 'https://newoteg.com/#organization');
  assert.equal(data.name, 'NEWOTEG');
  assert.deepEqual(data.brand, { '@type': 'Brand', name: 'X-Electronic' });
  assert.equal(data.email, shopContact.email);
  assert.equal(data.telephone, shopContact.phone);
  for (const key of ['legalName', 'address', 'geo', 'openingHours', 'openingHoursSpecification', 'areaServed',
    'hasMerchantReturnPolicy', 'hasShippingService', 'aggregateRating', 'review', 'taxID', 'vatID', 'sameAs'])
    assert.equal(Object.hasOwn(data, key), false, key);
});

test('the referenced logo is a real PNG with valid image dimensions', async () => {
  const png = await readFile(new URL('../public/logo.png', import.meta.url));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert(png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0);
});

test('JSON-LD escapes closing tags and separators while preserving its data', () => {
  const value = { name: '</script><script>unsafe</script>&\u2028\u2029' };
  const text = organizationJSON(value);
  assert(!text.includes('<') && !text.includes('>') && !text.includes('&'));
  assert.deepEqual(JSON.parse(text), value);
});

test('build metadata contains one independent identity and retains it through public metadata and home injection', () => {
  const plugin = organizationSchema();
  const other = '<script type="application/ld+json" data-newoteg-organization-other>{"other":true}</script>';
  const source = '<html><head><title data-newoteg-fallback>Fallback</title>' + other + '</head><body><div id="root"></div></body></html>';
  const generated = plugin.transformIndexHtml.handler(source);
  const repeated = plugin.transformIndexHtml.handler(generated);
  assert.equal((repeated.match(/\sdata-newoteg-organization(?=[\s=>])/g) || []).length, 1);
  assert(repeated.includes(other), 'Unrelated schema owner must remain untouched');
  const html = renderFallbackMetadata(repeated, staticPublicMetadata(new URL('https://newoteg.com/')));
  const rendered = injectInitialHome(html, { version: 1, language: 'fr', html: '<div class="app">Visible public home</div>', css: ['/assets/home.css'] });
  const match = rendered.match(/<script type="application\/ld\+json" data-newoteg-organization>([\s\S]*?)<\/script>/);
  assert.deepEqual(JSON.parse(match[1]), organizationData());
  assert(rendered.includes('data-initial-home="fr"'));
  assert(!rendered.includes('data-newoteg-fallback data-newoteg-organization'));
});
