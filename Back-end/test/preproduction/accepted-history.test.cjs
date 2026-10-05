const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  accepted,
  isAcceptedHistoricalMigration: matches,
} = require('../../scripts/accepted-migration-history.cjs');
const {
  compareStructure,
} = require('../../scripts/release-schema-contract.cjs');
test('only the exact authorized historical pair is accepted', () => {
  const row = { migration_name: accepted.name, checksum: accepted.recorded };
  const source = { name: accepted.name, sha256: accepted.source };
  assert.equal(matches(row, source), true);
  assert.equal(matches({ ...row, checksum: 'different' }, source), false);
  assert.equal(matches(row, { ...source, sha256: 'different' }), false);
  assert.equal(matches({ ...row, migration_name: 'other' }, source), false);
  assert.equal(matches(row, { ...source, name: 'other' }), false);
});
test('enum ordering may differ but missing or extra labels fail', () => {
  const empty = { columns: [], constraints: [], indexes: [] };
  const expected = {
    ...empty,
    enums: [{ name: 'Status', values: '{ONE,TWO}' }],
  };
  assert.deepEqual(
    compareStructure(expected, {
      ...empty,
      enums: [{ name: 'Status', values: '{TWO,ONE}' }],
    }),
    [],
  );
  for (const values of ['{ONE}', '{ONE,TWO,THREE}']) {
    assert.deepEqual(
      compareStructure(expected, {
        ...empty,
        enums: [{ name: 'Status', values }],
      }),
      ['enums:Status'],
    );
  }
});
