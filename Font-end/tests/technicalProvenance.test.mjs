import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptProduct } from '../src/storefront/productData.js';
import { readTechnicalSource } from '../src/storefront/technicalProvenance.js';
import { comparisonRows } from '../src/storefront/comparisonRows.js';

const product = (source, value = '0') => adaptProduct({ id: 'demo', nomProduit: 'Recette', attributs: [{ nomAttribut: 'Résistance', valeurs: [{ valeur: value, documentation: source }] }] }, () => '');
test('Old catalogue data remains visible, including zero, without becoming reviewed', () => {
  const p = product(null);
  assert.deepEqual(p.attributes, [['Résistance', '0']]);
  assert.deepEqual(p.technicalAttributes, [{ label: 'Résistance', values: [{ value: '0', source: { etat: 'A_VERIFIER', obsolete: false } }] }]);
});
test('A stale source hides its old evidence and normalization', () => {
  const p = product({ etat: 'DOCUMENTE', obsolete: true, reluLe: '2026-10-10', sourceUrl: 'https://example.com/old', valeurNormalisee: '10', uniteNormalisee: 'V' });
  assert.deepEqual(p.technicalAttributes[0].values[0].source, { etat: 'A_VERIFIER', obsolete: true });
});
test('A review date is required and only allowed public source fields are retained', () => {
  const source = { etat: 'DOCUMENTE', sourceUrl: 'https://example.com/data', sourceRepere: 'Table 2', reluParId: 'private', valeurSource: 'private-copy' };
  assert.equal(readTechnicalSource(source).etat, 'A_VERIFIER');
  const d = readTechnicalSource({ ...source, reluLe: '2026-10-10T12:00:00Z', conditions: '25 °C' });
  assert.equal(d.etat, 'DOCUMENTE'); assert.equal(d.conditions, '25 °C'); assert.equal(d.sourceRepere, 'Table 2');
  assert.equal('reluParId' in d, false); assert.equal('valeurSource' in d, false);
});
test('Unsafe and credential-bearing source URLs never become links', () => {
  for (const sourceUrl of ['javascript:alert(1)', 'http://example.com', 'https://user:secret@example.com', '/relative']) assert.equal(readTechnicalSource({ etat: 'A_VERIFIER', sourceUrl }).sourceUrl, null);
});
test('Unknown, contradictory and not-applicable states remain distinct', () => {
  for (const etat of ['INCONNU', 'CONTRADICTOIRE', 'NON_APPLICABLE']) assert.equal(product({ etat }).technicalAttributes[0].values[0].source.etat, etat);
});
test('Unit equality does not promote either product source', () => {
  const a = product(null, '1 kΩ'), b = product({ etat: 'CONTRADICTOIRE', motif: 'Documents en désaccord' }, '1000 Ω');
  assert.equal(comparisonRows([a, b])[0].unitEquivalent, true);
  assert.equal(a.technicalAttributes[0].values[0].source.etat, 'A_VERIFIER');
  assert.equal(b.technicalAttributes[0].values[0].source.etat, 'CONTRADICTOIRE');
});
