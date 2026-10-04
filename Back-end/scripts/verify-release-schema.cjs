const { Client } = require('pg');
const {
  sourceIdentity,
  readStructure,
  compareStructure,
  assertFreshContract,
  readReleaseContract,
} = require('./release-schema-contract.cjs');

async function verifyMigrationHistory(db, allowPending = false) {
  const exists = (
    await db.query(
      "SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present",
    )
  ).rows[0].present;
  if (!exists) {
    if (allowPending) return { pending: sourceIdentity().migrations.length };
    throw Error('Release schema incomplete: migration history absent');
  }
  const history = (
    await db.query(`SELECT migration_name,checksum,finished_at,rolled_back_at
    FROM public._prisma_migrations`)
  ).rows;
  if (history.some((row) => !row.finished_at && !row.rolled_back_at))
    throw Error('Release schema incomplete: no_failed_migration');
  const sources = sourceIdentity(true).migrations;
  const applied = history.filter(
    (row) => row.finished_at && !row.rolled_back_at,
  );
  const differences = [];
  const names = new Set();
  for (const row of applied) {
    const source = sources.find(
      (migration) => migration.name === row.migration_name,
    );
    if (!source) differences.push(`unexpected-migration:${row.migration_name}`);
    else if (row.checksum !== source.sha256)
      differences.push(`migration:${row.migration_name}`);
    if (names.has(row.migration_name))
      differences.push(`duplicate-migration:${row.migration_name}`);
    names.add(row.migration_name);
  }
  let pending = 0;
  for (const migration of sources) {
    if (!names.has(migration.name)) {
      pending++;
      if (!allowPending) differences.push(`migration:${migration.name}`);
    } else if (allowPending && pending)
      differences.push(`migration-history-gap:${migration.name}`);
  }
  if (differences.length)
    throw Error(`Release schema incomplete: ${differences.join(', ')}`);
  return { pending };
}

async function verifyReleaseSchema(db, contract = readReleaseContract()) {
  assertFreshContract(contract);
  const result = await db.query(`
    SELECT
      to_regclass('public.commande_request') IS NOT NULL AS request_table,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='produit' AND column_name='est_actif' AND data_type='boolean' AND is_nullable='NO') AS active_flag,
      EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.commande_request')
        AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (request_id)') AS request_primary_key,
      EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.commande_request')
        AND contype='f' AND confrelid=to_regclass('public.commande') AND confdeltype='n') AS retained_request,
      NOT EXISTS (SELECT 1 FROM public._prisma_migrations
        WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS no_failed_migration
  `);
  const missing = Object.entries(result.rows[0])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (missing.length)
    throw new Error(`Release schema incomplete: ${missing.join(', ')}`);
  const differences = compareStructure(
    contract.structure,
    await readStructure(db),
  );
  await verifyMigrationHistory(db);
  if (differences.length)
    throw new Error(`Release schema incomplete: ${differences.join(', ')}`);
  return { ...result.rows[0], release_contract: true };
}
module.exports = { verifyReleaseSchema, verifyMigrationHistory };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 1 || args[0] !== '--history-only'))
    throw Error('Use no arguments or --history-only');
  readReleaseContract();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 8000,
    query_timeout: 15000,
    options: '-c default_transaction_read_only=on -c statement_timeout=12000',
    application_name: 'newoteg-release-schema-readonly',
  });
  (async () => {
    try {
      await db.connect();
      await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      if (args[0] === '--history-only') await verifyMigrationHistory(db, true);
      else await verifyReleaseSchema(db);
      await db.query('COMMIT');
      console.log(
        args[0] === '--history-only'
          ? 'Release migration history checks passed; pending migrations allowed.'
          : 'Release schema checks passed.',
      );
    } finally {
      await db.end();
    }
  })().catch(() => {
    console.error('Release schema validation failed. Application not started.');
    process.exitCode = 1;
  });
}
