// Create a fresh disposable database, apply the actual migration chain, report.
// Never read .env or connect to the production database. Never drop a database.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { configure, root, runtime } = require('../sandbox/config.cjs');
configure();
async function main() {
  const database = `newoteg_refonte_e_migrations_${Date.now()}`;
  const admin = new Client({
    connectionString: 'postgresql://refonte_test@127.0.0.1:55439/postgres',
  });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }
  const env = { ...process.env, REFONTE_MIGRATION_DB: database };
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'Back-end/node_modules/prisma/build/index.js'),
      'migrate',
      'deploy',
      '--config',
      path.join(__dirname, 'prisma.config.ts'),
    ],
    {
      cwd: path.join(root, 'Back-end'),
      env,
      encoding: 'utf8',
      timeout: 120000,
    },
  );
  const output = (result.stdout || '') + '\n' + (result.stderr || '');
  fs.mkdirSync(path.join(runtime, 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(runtime, 'migrations', database + '.log'), output);
  const db = new Client({
    connectionString: `postgresql://refonte_test@127.0.0.1:55439/${database}`,
  });
  await db.connect();
  let migrations = [];
  try {
    const exists = await db.query(
      "SELECT to_regclass('public._prisma_migrations') AS name",
    );
    if (exists.rows[0].name)
      migrations = (
        await db.query(
          'SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at',
        )
      ).rows;
  } finally {
    await db.end();
  }
  const report = {
    date: new Date().toISOString(),
    database,
    productionTouched: false,
    exitCode: result.status,
    applied: migrations
      .filter((m) => m.finished_at)
      .map((m) => m.migration_name),
    failures: migrations.filter((m) => !m.finished_at && !m.rolled_back_at),
    schemaDriftChecked: false,
  };
  fs.writeFileSync(
    path.join(
      root,
      'docs/refonte-e/captures/verification-migrations-preproduction.json',
    ),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        database,
        exitCode: result.status,
        applied: report.applied.length,
        failures: report.failures.map((m) => ({
          migration: m.migration_name,
          error: m.logs?.split('\n').slice(0, 12).join('\n'),
        })),
      },
      null,
      2,
    ),
  );
  if (result.status !== 0) process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
