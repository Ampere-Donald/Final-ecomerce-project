import test from 'node:test';
import assert from 'node:assert/strict';
import { simpleQuantityKey } from '../src/storefront/technicalUnits.js';
import { comparisonRows } from '../src/storefront/comparisonData.js';

test('Explicit SI values agree across scales without rewriting their source', () => {
  for (const values of [
    ['1 A', '1000 mA', '1000000 µA'],
    ['3.3 V', '3300 mV', '0.0033 kV'],
    ['4.7 µF', '4700 nF', '0.0000047 F'],
    ['0.1 µF', '100 nF', '100000 pF'],
    ['1 MHz', '1000 kHz', '1e6 Hz'],
    ['2 mm', '0.2 cm', '.002 m'],
    ['2.2 mH', '2200 μH', '0.0022 H'],
    ['-5 mV', '-0.005 V', '-5e-3 V'],
  ]) {
    assert.notEqual(simpleQuantityKey(values[0]), null);
    assert.equal(new Set(values.map(simpleQuantityKey)).size, 1);
    const row = comparisonRows(values.map(value => ({ attributes: [['Parameter', value]] })))[0];
    assert.equal(row.different, false);
    assert.equal(row.unitEquivalent, true);
    assert.deepEqual(row.values, values);
  }
});

test('Decimal precision, signs, dimensions and case-sensitive prefixes cannot collapse', () => {
  for (const [a, b] of [
    ['0.100000000000000001 A', '0.1 A'],
    ['1 mA', '1 MA'], ['1 MHz', '1 mHz'], ['1 mΩ', '1 MΩ'],
    ['0 A', '0 V'], ['-5 V', '5 V'], ['1 W', '1 V'],
  ]) assert.notEqual(simpleQuantityKey(a), simpleQuantityKey(b));
  assert.equal(simpleQuantityKey('-0 mA'), simpleQuantityKey('0 A'));
});

test('Unsupported, ambiguous or qualified ratings remain literal rather than guessed', () => {
  for (const value of [null, 5, '', '5', '1,000 A', '0,001 A', '1 000 mA',
    '5–12 V', '5-12 V', '5 V ±10%', '5 V DC', '5 V max', '≈ 5 V',
    '1 A ; 2 A', '1 A/V', '100 ohms', '1 khz', '1e99 A', 'NaN V', 'Infinity V'])
    assert.equal(simpleQuantityKey(value), null, String(value));
  const row = comparisonRows([
    { attributes: [['Voltage', '5 V']] },
    { attributes: [['Voltage', '5 V max']] },
  ])[0];
  assert.equal(row.different, true);
  assert.equal(row.unitEquivalent, false);
});

test('Missing values, different labels and multiple ratings never prove unit equivalence', () => {
  const rows = comparisonRows([
    { attributes: [['Courant', '1 A'], ['Tension', '5 V'], ['Plages', '1 A ; 2 A']] },
    { attributes: [['courant', '1000 mA'], ['Plages', '1000 mA ; 2000 mA']] },
  ]);
  for (const label of ['Courant', 'courant', 'Tension']) {
    const row = rows.find(value => value.label === label);
    assert.equal(row.incomplete, true);
    assert.equal(row.different, false);
    assert.equal(row.unitEquivalent, false);
  }
  assert.equal(rows.find(value => value.label === 'Plages').different, true);
});
