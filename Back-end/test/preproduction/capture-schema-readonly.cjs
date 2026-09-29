// Export DDL only with PostgreSQL 18.6. No business rows or sequence values.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { root, runtime } = require('../sandbox/config.cjs');
function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--env-file')
    throw new Error('Use --env-file <configuration>');
  const source = require('dotenv').parse(
    fs.readFileSync(path.resolve(args[1])),
  ).DATABASE_URL;
  const url = new URL(source);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('PostgreSQL URL required');
  const executable = path.join(
    runtime,
    'tooling/postgresql-18.6-3/pgsql/bin/pg_dump.exe',
  );
  const directory = path.join(runtime, 'schema-snapshots');
  fs.mkdirSync(directory, { recursive: true });
  const fileName = `railway-schema-${Date.now()}.dump`;
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('PG')),
  );
  Object.assign(env, {
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE: url.searchParams.get('sslmode') || 'prefer',
    PGCONNECT_TIMEOUT: '10',
    PGAPPNAME: 'newoteg-schema-export-readonly',
    PGOPTIONS: '-c default_transaction_read_only=on -c statement_timeout=30000',
  });
  const result = spawnSync(
    executable,
    [
      '--schema-only',
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--no-comments',
      '--no-security-labels',
      '--no-publications',
      '--no-subscriptions',
      '--no-tablespaces',
      '--lock-wait-timeout=10000',
      '--file',
      path.join(directory, fileName),
    ],
    { env, encoding: 'utf8', timeout: 120000 },
  );
  if (result.status !== 0)
    throw new Error('Schema-only export failed; no repair attempted');
  const bytes = fs.readFileSync(path.join(directory, fileName));
  const manifest = {
    date: new Date().toISOString(),
    fileName,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    schemaOnly: true,
    productionWrites: false,
    businessRowsIncluded: false,
    sequenceValuesIncluded: false,
    ownerAndPrivilegesIncluded: false,
  };
  fs.writeFileSync(
    path.join(directory, 'latest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(root, 'docs/refonte-e/captures/export-schema-readonly.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(JSON.stringify(manifest, null, 2));
}
try {
  main();
} catch {
  console.error('Schema-only export failed; no remote writes attempted.');
  process.exitCode = 1;
}
