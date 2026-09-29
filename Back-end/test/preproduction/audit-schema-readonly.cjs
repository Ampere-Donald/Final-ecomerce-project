// Metadata only. Does not read customer/product rows or execute repair SQL.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const { root } = require('../sandbox/config.cjs');

async function snapshot(db) {
  await db.query('BEGIN READ ONLY');
  try {
    await db.query("SET LOCAL statement_timeout = '8s'");
    const readOnly = (await db.query('SHOW transaction_read_only')).rows[0]
      .transaction_read_only;
    if (readOnly !== 'on') throw new Error('Read-only transaction required');
    const columns = (
      await db.query(`SELECT table_name, column_name, data_type, udt_name,
      is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale, datetime_precision
      FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations'
      ORDER BY table_name, ordinal_position`)
    ).rows;
    const constraints = (
      await db.query(`SELECT c.relname AS table_name, p.conname AS name,
      p.contype AS type, pg_get_constraintdef(p.oid) AS definition
      FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname <> '_prisma_migrations' ORDER BY c.relname,p.conname`)
    ).rows;
    const indexes = (
      await db.query(`SELECT tablename AS table_name,indexname AS name,indexdef AS definition
      FROM pg_indexes WHERE schemaname='public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename,indexname`)
    ).rows;
    const enums = (
      await db.query(`SELECT t.typname AS name,e.enumlabel AS value
      FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`)
    ).rows;
    const exists = (
      await db.query("SELECT to_regclass('public._prisma_migrations') AS name")
    ).rows[0].name;
    const serverVersion = (await db.query('SHOW server_version_num')).rows[0]
      .server_version_num;
    const triggers = (
      await db.query(`SELECT c.relname AS table_name,t.tgname AS name
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname`)
    ).rows;
    const migrations = exists
      ? (
          await db.query(`SELECT migration_name,checksum,finished_at,rolled_back_at,
      applied_steps_count FROM public._prisma_migrations ORDER BY started_at`)
        ).rows
      : [];
    await db.query('COMMIT');
    return {
      readOnly: true,
      historyTableExists: Boolean(exists),
      serverVersion,
      triggers,
      columns,
      constraints,
      indexes,
      enums,
      migrations,
    };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
function compareHistory(migrations) {
  const dir = path.join(root, 'Back-end/prisma/migrations');
  const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
  return fs
    .readdirSync(dir)
    .filter((name) => fs.existsSync(path.join(dir, name, 'migration.sql')))
    .map((name) => {
      const file = fs.readFileSync(path.join(dir, name, 'migration.sql'));
      const rows = migrations.filter(
        (m) => m.migration_name === name && m.finished_at && !m.rolled_back_at,
      );
      const variants = [
        hash(file),
        hash(file.toString('utf8').replace(/\r\n/g, '\n')),
        hash(file.toString('utf8').replace(/\r?\n/g, '\r\n')),
      ];
      return {
        name,
        status: !rows.length
          ? 'not-recorded-applied'
          : rows.some((m) => m.checksum === variants[0])
            ? 'checksum-match'
            : rows.some((m) => variants.includes(m.checksum))
              ? 'line-ending-only-match'
              : 'checksum-mismatch',
      };
    });
}
async function main() {
  const args = process.argv.slice(2);
  let connectionString, label;
  if (
    args.length === 2 &&
    args[0] === '--local-rehearsal' &&
    /^newoteg_refonte_e_migrations_repair_[0-9]+$/.test(args[1])
  ) {
    connectionString = `postgresql://refonte_test@127.0.0.1:55439/${args[1]}`;
    label = 'local';
  } else if (args.length === 2 && args[0] === '--env-file') {
    // Parse only the database URL; never load general app configuration.
    connectionString = require('dotenv').parse(
      fs.readFileSync(path.resolve(args[1])),
    ).DATABASE_URL;
    if (
      !connectionString ||
      !['postgresql:', 'postgres:'].includes(new URL(connectionString).protocol)
    )
      throw new Error('A PostgreSQL URL is required');
    label = 'distant';
  } else
    throw new Error(
      'Use --local-rehearsal <test database> or --env-file <configuration file>',
    );
  const db = new Client({
    connectionString,
    connectionTimeoutMillis: 8000,
    query_timeout: 10000,
    options: '-c default_transaction_read_only=on -c statement_timeout=8000',
    application_name: 'newoteg-schema-audit-readonly',
  });
  try {
    await db.connect();
    const data = await snapshot(db);
    const historyComparison = compareHistory(data.migrations);
    const report = {
      date: new Date().toISOString(),
      target: label,
      productionWrites: false,
      ...data,
      historyComparison,
    };
    fs.writeFileSync(
      path.join(root, `docs/refonte-e/captures/audit-schema-${label}.json`),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify(
        {
          target: label,
          readOnly: data.readOnly,
          tables: new Set(data.columns.map((c) => c.table_name)).size,
          migrationRecords: data.migrations.length,
          unresolved: data.migrations
            .filter((m) => !m.finished_at && !m.rolled_back_at)
            .map((m) => m.migration_name),
          historyDifferences: historyComparison.filter(
            (m) => m.status !== 'checksum-match',
          ),
        },
        null,
        2,
      ),
    );
  } finally {
    await db.end();
  }
}
module.exports = { snapshot, compareHistory };
if (require.main === module)
  main().catch(() => {
    // Do not expose connection strings or driver errors containing credentials.
    console.error('Read-only schema audit failed; no repair attempted.');
    process.exitCode = 1;
  });
