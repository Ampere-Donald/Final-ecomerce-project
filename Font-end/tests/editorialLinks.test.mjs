import test from 'node:test';
import assert from 'node:assert/strict';
import { selectionGuides, productGuides } from '../src/storefront/editorialLinks.js';
import { editorialIndex } from '../src/storefront/editorialIndex.generated.js';
import { englishGuideIndex } from '../src/storefront/englishRoutes.generated.js';
import { publishedEditorial } from '../src/storefront/publishedEditorial.generated.js';
import { seoFamilies } from '../src/storefront/seoFamilies.js';

test('navigation indexes inherit real related products without loading guide bodies or drafts', () => {
  for (const source of publishedEditorial) {
    const french = editorialIndex.find(entry => entry.id === source.id);
    const english = englishGuideIndex.find(entry => entry.sourceId === source.id);
    assert.deepEqual(french.productIds, source.products.map(product => product.id));
    assert.deepEqual(english.productIds, french.productIds);
    for (const entry of [french, english]) {
      assert.equal(entry.sections, undefined);
      assert.equal(entry.publicationBlockers, undefined);
      assert.equal(entry.replacement, undefined);
    }
  }
});

test('guide suggestions use exact family identity or an explicitly selected product in the current language', () => {
  const capacitor = seoFamilies.find(family => family.slug === 'condensateurs');
  const supply = seoFamilies.find(family => family.slug === 'alimentations-stabilisees');
  for (const lang of ['fr', 'en']) {
    assert.equal(selectionGuides(lang).length, 4);
    assert(selectionGuides(lang).every(entry => entry.language === lang));
    const matches = productGuides({ id: 'unknown', categoryId: capacitor.category, subcategoryId: capacitor.subcategory }, lang);
    assert.deepEqual(matches.map(entry => entry.slug), ['choisir-condensateur-electrolytique']);
    assert.deepEqual(productGuides({ id: 'unknown', categoryId: supply.category, subcategoryId: supply.subcategory }, lang), []);
    assert.deepEqual(productGuides({ id: 'unknown', categoryId: capacitor.category, subcategoryId: 'different' }, lang), []);
    const guide = selectionGuides(lang).find(entry => entry.productIds.length > 0);
    assert(productGuides({ id: guide.productIds[0] }, lang).some(entry => entry.id === guide.id));
  }
});
