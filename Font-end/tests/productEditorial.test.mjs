import test from 'node:test';
import assert from 'node:assert/strict';
import { productEditorialEntries } from '../src/storefront/productEditorialData.js';
import { getProductEditorial, validateProductEditorial, validEditorialSource, isWebsiteHomepage } from '../src/storefront/productEditorial.js';

const entry = productEditorialEntries.find(item => item.id === '7a4a260b-35bd-40ce-b246-d548a553432f');
const product = { ...entry.expected, id: entry.id, technicalAttributes: [], attributes: [] };

test('Reviewed content stays independent of live price and stock', () => {
  validateProductEditorial();
  assert.equal(getProductEditorial({ ...product, retailPrice: 5000, stock: 10 }), entry);
  assert.equal(getProductEditorial({ ...product, retailPrice: null, stock: 0 }), entry);
});

test('A catalogue identity change withdraws the stale review', () => {
  for (const key of ['model', 'image', 'description', 'brand', 'urlDatasheet'])
    assert.equal(getProductEditorial({ ...product, [key]: 'changed' }), null, key);
  assert.equal(getProductEditorial({ ...product, id: 'other' }), null);
});

test('New technical evidence, drafts and unreviewed languages do not inherit the review', () => {
  assert.equal(getProductEditorial({ ...product, technicalAttributes: [{ label: 'New evidence' }] }), null);
  assert.equal(getProductEditorial({ ...product, attributes: [['New', 'value']] }), null);
  assert.equal(getProductEditorial(product, 'fr', [{ ...entry, status: 'draft' }]), null);
  assert.equal(getProductEditorial(product, 'en'), null);
});

test('Publication rejects unsafe sources and incomplete reviews', () => {
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com', '//example.com', '/product-reference-images/../secret.jpg'])
    assert.equal(validEditorialSource({ label: 'Source', url }), false, url);
  assert.throws(() => validateProductEditorial([{ ...entry, reviewedAt: '' }]));
  assert.throws(() => validateProductEditorial([entry, entry]));
  assert.throws(() => validateProductEditorial([{ ...entry, fr: { ...entry.fr, sources: [] } }]));
  assert.throws(() => validateProductEditorial([{ ...entry, fr: { ...entry.fr, sources: [{ label: 'Unsafe', url: 'javascript:alert(1)' }] } }]));
});

test('A general website is not labelled as a product datasheet', () => {
  assert.equal(isWebsiteHomepage('https://www.epica-tools.com'), true);
  assert.equal(isWebsiteHomepage('https://www.epica-tools.com/'), true);
  assert.equal(isWebsiteHomepage('https://example.com/datasheet.pdf'), false);
  assert.equal(isWebsiteHomepage('https://example.com/?document=123'), false);
});
