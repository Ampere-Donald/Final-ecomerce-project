import test from 'node:test';
import assert from 'node:assert/strict';

test('FCFA prices preserve rounding, separators and absent values while reusing locale initialization', async () => {
  const NativeNumberFormat = Intl.NumberFormat;
  const expected = new NativeNumberFormat('fr-FR', {
    style: 'currency', currency: 'XAF', minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
  let constructions = 0;
  try {
    Intl.NumberFormat = class extends NativeNumberFormat {
      constructor(...args) { super(...args); constructions++; }
    };
    const { formatFCFA } = await import('../src/utils/formatFCFA.js');
    for (const value of [null, undefined, NaN, 'invalid']) assert.equal(formatFCFA(value), '—');
    assert.equal(constructions, 0, 'Missing prices do not initialize a formatter');
    for (let render = 0; render < 10; render++)
      for (const value of [0, 1500, 1250000, 1.5, -99, '3500', Infinity])
        assert.equal(formatFCFA(value), expected.format(value));
    assert.equal(constructions, 1, 'Repeated cards and renders share one formatter');
  } finally { Intl.NumberFormat = NativeNumberFormat; }
});
