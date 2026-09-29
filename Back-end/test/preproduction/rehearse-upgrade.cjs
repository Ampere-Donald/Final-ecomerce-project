// Isolate the two release migrations from the separately tested historical chain.
// Baseline is the repository HEAD datamodel, not a production snapshot.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync, execFileSync } = require('node:child_process');
const { Client } = require('pg');
const { configure, root, runtime } = require('../sandbox/config.cjs');
configure();
async function main() {
  const database = `newoteg_refonte_e_migrations_upgrade_${Date.now()}`;
  const dir = path.join(runtime, 'migrations', database);
  fs.mkdirSync(dir, { recursive: true });
  const baseline = path.join(dir, 'baseline.prisma');
  fs.writeFileSync(
    baseline,
    execFileSync('git', ['show', 'HEAD:Back-end/prisma/schema.prisma'], {
      cwd: root,
    }),
  );
  const env = { ...process.env, REFONTE_MIGRATION_DB: database };
  function prisma(args) {
    return spawnSync(
      process.execPath,
      [
        path.join(root, 'Back-end/node_modules/prisma/build/index.js'),
        ...args,
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
  }
  const schemaSql = path.join(dir, 'baseline.sql');
  const generated = prisma([
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema',
    baseline,
    '--script',
    '--output',
    schemaSql,
  ]);
  assert.equal(generated.status, 0, generated.stderr);
  const admin = new Client({
    connectionString: 'postgresql://refonte_test@127.0.0.1:55439/postgres',
  });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }
  const db = new Client({
    connectionString: `postgresql://refonte_test@127.0.0.1:55439/${database}`,
  });
  await db.connect();
  const checks = [];
  try {
    await db.query(fs.readFileSync(schemaSql, 'utf8'));
    await db.query(
      "INSERT INTO categorie(id,nom) VALUES('upgrade-category','Upgrade fixture')",
    );
    await db.query(
      "INSERT INTO produit(id,id_categorie,nom_produit,quantite_stock,prix_detail) VALUES('upgrade-product','upgrade-category','Existing product',9,1234)",
    );
    for (const migration of [
      '20260910150000_archive_inactive_products',
      '20260924100000_order_request_idempotency',
    ]) {
      await db.query('BEGIN');
      try {
        await db.query(
          fs.readFileSync(
            path.join(
              root,
              'Back-end/prisma/migrations',
              migration,
              'migration.sql',
            ),
            'utf8',
          ),
        );
        await db.query('COMMIT');
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }
      checks.push(`Applied ${migration}`);
    }
    const p = (
      await db.query(
        "SELECT nom_produit,quantite_stock,prix_detail,est_actif,desactive_le FROM produit WHERE id='upgrade-product'",
      )
    ).rows[0];
    assert.deepEqual(p, {
      nom_produit: 'Existing product',
      quantite_stock: 9,
      prix_detail: 1234,
      est_actif: true,
      desactive_le: null,
    });
    checks.push('Existing product values preserved; active by default');
    assert.equal(
      (await db.query('SELECT COUNT(*)::int AS count FROM commande_request'))
        .rows[0].count,
      0,
    );
    checks.push('New order request table empty and available');
  } finally {
    await db.end();
  }
  const diff = prisma([
    'migrate',
    'diff',
    '--from-config-datasource',
    '--to-schema',
    path.join(root, 'Back-end/prisma/schema.prisma'),
    '--exit-code',
  ]);
  fs.writeFileSync(
    path.join(dir, 'schema-diff.log'),
    diff.stdout + '\n' + diff.stderr,
  );
  // Test the release guard against real PostgreSQL, using a synthetic history
  // only in this disposable database. This is not a migration baseline.
  const guardDb = new Client({connectionString:`postgresql://refonte_test@127.0.0.1:55439/${database}`});
  await guardDb.connect();
  try {
    const {verifyReleaseSchema}=require('../../scripts/verify-release-schema.cjs');
    await guardDb.query('CREATE TABLE _prisma_migrations (finished_at timestamptz, rolled_back_at timestamptz)');
    await verifyReleaseSchema(guardDb);
    checks.push('Release guard accepts expected schema');
    await guardDb.query('INSERT INTO _prisma_migrations VALUES (NULL,NULL)');
    await assert.rejects(()=>verifyReleaseSchema(guardDb),/no_failed_migration/);
    checks.push('Release guard refuses unresolved migration');
    await guardDb.query('UPDATE _prisma_migrations SET rolled_back_at=NOW()');
    await guardDb.query('BEGIN');
    await guardDb.query('DROP TABLE commande_request');
    await assert.rejects(()=>verifyReleaseSchema(guardDb),/request_table/);
    await guardDb.query('ROLLBACK');
    checks.push('Release guard refuses missing request table');
  } finally { await guardDb.end(); }
  const report = {
    date: new Date().toISOString(),
    database,
    productionTouched: false,
    baseline: 'repository HEAD datamodel; not production',
    historicalChainValidated: false,
    checks,
    schemaDiffExitCode: diff.status,
    schemaMatches: diff.status === 0,
  };
  fs.writeFileSync(
    path.join(
      root,
      'docs/refonte-e/captures/verification-upgrade-preproduction.json',
    ),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  assert.equal(diff.status, 0, diff.stdout + '\n' + diff.stderr);
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
