const fs = require('node:fs');
const path = require('node:path');
const { root } = require('../sandbox/config.cjs');
const dir = path.join(root, 'docs/refonte-e/captures');
const local = JSON.parse(
  fs.readFileSync(path.join(dir, 'audit-schema-local.json')),
);
const distant = JSON.parse(
  fs.readFileSync(path.join(dir, 'audit-schema-distant.json')),
);
function compare(section, keys) {
  // NOT NULL is compared through column.is_nullable. PostgreSQL versions differ
  // in whether they also expose these as named pg_constraint records.
  const select = (data) =>
    data[section].filter(
      (row) => section !== 'constraints' || row.type !== 'n',
    );
  const key = (row) => keys.map((k) => row[k]).join('.');
  const expected = new Map(select(local).map((row) => [key(row), row]));
  const deployed = new Map(select(distant).map((row) => [key(row), row]));
  return {
    missingOnDistant: [...expected]
      .filter(([k]) => !deployed.has(k))
      .map(([, row]) => row),
    extraOnDistant: [...deployed]
      .filter(([k]) => !expected.has(k))
      .map(([, row]) => row),
    changed: [...expected]
      .filter(
        ([k, row]) =>
          deployed.has(k) &&
          JSON.stringify(row) !== JSON.stringify(deployed.get(k)),
      )
      .map(([key, expected]) => ({
        key,
        distant: deployed.get(key),
        expected,
      })),
  };
}
const differences = Object.fromEntries(
  [
    ['columns', ['table_name', 'column_name']],
    ['constraints', ['table_name', 'name']],
    ['indexes', ['table_name', 'name']],
    ['enums', ['name', 'value']],
  ].map(([section, keys]) => [section, compare(section, keys)]),
);
const report = {
  date: new Date().toISOString(),
  remoteAuditDate: distant.date,
  localAuditDate: local.date,
  productionWrites: false,
  businessRowsRead: false,
  expected:
    'Local historical replay with two candidates, not a production migration plan',
  distantTables: new Set(distant.columns.map((c) => c.table_name)).size,
  appliedMigrationNames: new Set(
    distant.migrations
      .filter((m) => m.finished_at && !m.rolled_back_at)
      .map((m) => m.migration_name),
  ).size,
  unresolvedMigrations: distant.migrations
    .filter((m) => !m.finished_at && !m.rolled_back_at)
    .map((m) => m.migration_name),
  missingReleaseTables: ['commande_request'].filter(
    (name) => !distant.columns.some((c) => c.table_name === name),
  ),
  historicalSalesTablesPresent: [
    'facture',
    'facture_ligne',
    'prime_vendeur',
  ].every((name) => distant.columns.some((c) => c.table_name === name)),
  checksumMismatches: distant.historyComparison
    .filter((m) => m.status === 'checksum-mismatch')
    .map((m) => m.name),
  lineEndingOnlyMatches: distant.historyComparison.filter(
    (m) => m.status === 'line-ending-only-match',
  ).length,
  notRecordedApplied: distant.historyComparison
    .filter((m) => m.status === 'not-recorded-applied')
    .map((m) => m.name),
  differences,
};
fs.writeFileSync(
  path.join(dir, 'comparaison-schema-preproduction.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      distantTables: report.distantTables,
      appliedMigrationNames: report.appliedMigrationNames,
      unresolvedMigrations: report.unresolvedMigrations,
      missingReleaseTables: report.missingReleaseTables,
      historicalSalesTablesPresent: report.historicalSalesTablesPresent,
      checksumMismatches: report.checksumMismatches,
      lineEndingOnlyMatches: report.lineEndingOnlyMatches,
    },
    null,
    2,
  ),
);
