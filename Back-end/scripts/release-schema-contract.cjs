// Metadata only: no customer rows, repair, migration resolve or checksum rewrite.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
// Contract identity is portable across Windows/Linux checkouts. The migration
// ledger is checked separately against the EXACT bytes packaged for deployment.
const textHash = (bytes) => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));

function sourceIdentity(exactBytes = false) {
  const directory = path.join(root, 'prisma/migrations');
  return {
    schemaSha256: textHash(
      fs.readFileSync(path.join(root, 'prisma/schema.prisma')),
    ),
    migrations: fs
      .readdirSync(directory)
      .sort()
      .filter((name) =>
        fs.existsSync(path.join(directory, name, 'migration.sql')),
      )
      .map((name) => ({
        name,
        sha256: (exactBytes ? hash : textHash)(
          fs.readFileSync(path.join(directory, name, 'migration.sql')),
        ),
      })),
  };
}

async function readStructure(db) {
  const columns = (
    await db.query(`SELECT table_name, column_name,
    udt_name AS type, udt_schema AS type_schema, is_nullable, column_default,
    character_maximum_length, numeric_precision, numeric_scale, datetime_precision
    FROM information_schema.columns WHERE table_schema='public'
    AND table_name <> '_prisma_migrations' ORDER BY table_name,column_name`)
  ).rows;
  const constraints = (
    await db.query(`SELECT c.relname AS table_name,
    p.conname AS name, p.contype AS type, pg_get_constraintdef(p.oid) AS definition,
    p.convalidated AS validated, p.condeferrable AS deferrable, p.condeferred AS deferred
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname <> '_prisma_migrations'
    AND p.contype IN ('p','f','u','c') ORDER BY c.relname,p.conname`)
  ).rows;
  const indexes = (
    await db.query(`SELECT c.relname AS table_name, i.relname AS name,
    pg_get_indexdef(x.indexrelid) AS definition, x.indisvalid AS valid,
    x.indisready AS ready FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid
    JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname <> '_prisma_migrations'
    ORDER BY c.relname,i.relname`)
  ).rows;
  const enums = (
    await db.query(`SELECT t.typname AS name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public'
    GROUP BY t.typname ORDER BY t.typname`)
  ).rows;
  return { columns, constraints, indexes, enums };
}

function compareStructure(expected, actual) {
  const differences = [];
  for (const kind of ['columns', 'constraints', 'indexes', 'enums']) {
    const key = (row) =>
      kind === 'columns'
        ? `${row.table_name}.${row.column_name}`
        : kind === 'enums'
          ? row.name
          : `${row.table_name}.${row.name}`;
    const found = new Map(actual[kind].map((row) => [key(row), row]));
    for (const row of expected[kind]) {
      const observed = found.get(key(row));
      if (
        !observed ||
        Object.keys(row).some(
          (field) =>
            !(
              kind === 'enums' &&
              field === 'values' &&
              JSON.stringify(enumLabels(row[field])) ===
                JSON.stringify(enumLabels(observed[field]))
            ) &&
            !(
              kind === 'constraints' &&
              row.type === 'c' &&
              field === 'definition' &&
              expected.checkRestoreDefinitions?.[key(row)] === observed[field]
            ) &&
            JSON.stringify(row[field]) !== JSON.stringify(observed[field]),
        )
      )
        differences.push(`${kind}:${key(row)}`);
    }
  }
  // Extra historical columns/indexes are preserved. They do not prove compatibility
  // of triggers, policies, privileges or data; those require a separate rehearsal.
  return differences;
}

// These application enums are identifiers, never ordinal ranges. PostgreSQL's
// historical ADD VALUE order can differ without changing supported values.
function enumLabels(value) {
  if (Array.isArray(value)) return [...value].sort();
  if (typeof value === 'string' && /^\{[A-Z0-9_,]+\}$/.test(value))
    return value.slice(1, -1).split(',').sort();
  return value;
}

function assertFreshContract(contract) {
  if (
    contract.version !== 1 ||
    JSON.stringify(contract.sources) !== JSON.stringify(sourceIdentity())
  )
    throw new Error(
      'Release schema contract stale; rebuild and review it before release.',
    );
  return contract;
}
function readReleaseContract() {
  return assertFreshContract(
    JSON.parse(
      fs.readFileSync(path.join(__dirname, 'release-schema.json'), 'utf8'),
    ),
  );
}
module.exports = {
  sourceIdentity,
  readStructure,
  compareStructure,
  assertFreshContract,
  readReleaseContract,
};
