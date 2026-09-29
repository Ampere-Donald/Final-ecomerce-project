// Candidate migrations are copied ONLY into a disposable local rehearsal tree.
// No dotenv, remote connections, applied-history edits, or migration resolve.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { configure, root, runtime } = require('../sandbox/config.cjs');
configure();
const hash = (file) =>
  crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
  const database = `newoteg_refonte_e_migrations_repair_${Date.now()}`;
  const dir = path.join(runtime, 'migrations', database);
  const source = path.join(root, 'Back-end/prisma/migrations');
  const copy = path.join(dir, 'migrations');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(copy);
  fs.copyFileSync(
    path.join(source, 'migration_lock.toml'),
    path.join(copy, 'migration_lock.toml'),
  );
  const original = fs
    .readdirSync(source)
    .filter((n) => fs.existsSync(path.join(source, n, 'migration.sql')))
    .map((name) => ({
      name,
      sha256: hash(path.join(source, name, 'migration.sql')),
    }));
  const candidateName = '20260607190000_restore_sales_prerequisites';
  for (const item of original.filter((item) => item.name < candidateName)) {
    fs.cpSync(path.join(source, item.name), path.join(copy, item.name), {
      recursive: true,
    });
  }
  fs.mkdirSync(path.join(copy, candidateName));
  fs.copyFileSync(
    path.join(__dirname, 'candidates/sales-prerequisites.sql'),
    path.join(copy, candidateName, 'migration.sql'),
  );
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
  function prisma(label, args) {
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, 'Back-end/node_modules/prisma/build/index.js'),
        ...args,
        '--config',
        path.join(__dirname, 'repair.config.ts'),
      ],
      {
        cwd: path.join(root, 'Back-end'),
        env,
        encoding: 'utf8',
        timeout: 120000,
      },
    );
    fs.writeFileSync(
      path.join(dir, label + '.log'),
      (result.stdout || '') + '\n' + (result.stderr || ''),
    );
    return result;
  }
  const first = prisma('prerequisites', ['migrate', 'deploy']);
  assert.equal(first.status, 0, 'Prerequisite rehearsal failed; see local log');
  const db = new Client({
    connectionString: `postgresql://refonte_test@127.0.0.1:55439/${database}`,
  });
  await db.connect();
  const report = {
    date: new Date().toISOString(),
    database,
    productionTouched: false,
    candidatesActivated: false,
    originalMigrationHashes: original,
    checks: [],
  };
  let deploy;
  try {
    await db.query(`
      INSERT INTO admin_user(id, nom, username, role) VALUES ('repair-seller', 'TEST Seller', 'repair_seller', 'VENDEUR');
      INSERT INTO categorie(id, nom) VALUES ('repair-category', 'TEST Rehearsal');
      INSERT INTO produit(id, id_categorie, nom_produit, quantite_stock, prix_detail)
        VALUES ('repair-product', 'repair-category', 'TEST Product', 9, 1234);
      INSERT INTO facture(id, numero, type, vendeur_id, date_emission, total_ht, tva, total_ttc, methode_paiement)
        VALUES ('repair-invoice', 'FAC-2026-000007', 'FACTURE', 'repair-seller', '2026-09-01', 1000, 0, 1000, 'ESPECES');
      INSERT INTO prime_vendeur(id, vendeur_id, periode) VALUES ('repair-prime', 'repair-seller', '2026-09');
    `);
    for (const item of original.filter((item) => item.name > candidateName)) {
      fs.cpSync(path.join(source, item.name), path.join(copy, item.name), {
        recursive: true,
      });
    }
    const alignmentName = '20260927000000_align_sales_schema';
    fs.mkdirSync(path.join(copy, alignmentName));
    fs.copyFileSync(
      path.join(__dirname, 'candidates/align-sales-schema.sql'),
      path.join(copy, alignmentName, 'migration.sql'),
    );
    deploy = prisma('deploy', ['migrate', 'deploy']);
    report.deployExitCode = deploy.status;
    const exists = (
      await db.query("SELECT to_regclass('public._prisma_migrations') AS name")
    ).rows[0].name;
    const rows = exists
      ? (
          await db.query(
            'SELECT migration_name, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at',
          )
        ).rows
      : [];
    report.applied = rows
      .filter((m) => m.finished_at)
      .map((m) => m.migration_name);
    report.failures = rows.filter((m) => !m.finished_at && !m.rolled_back_at);
    if (deploy.status === 0) {
      const diff = prisma('diff', [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        path.join(root, 'Back-end/prisma/schema.prisma'),
        '--script',
        '--exit-code',
        '--output',
        path.join(dir, 'remaining-drift.sql'),
      ]);
      report.schemaDiffExitCode = diff.status;
      report.schemaMatches = diff.status === 0;
      // The application model currently omits five SQL-managed search indexes.
      // Compare against an augmented COPY, keeping their real definitions instead of dropping them.
      const indexes = [
        ['nomProduit', 'idx_produit_nom_trgm'],
        ['designationEn', 'idx_produit_designation_en_trgm'],
        ['marque', 'idx_produit_marque_trgm'],
        ['code', 'idx_produit_code_trgm'],
        ['codeFamille', 'idx_produit_code_famille_trgm'],
      ];
      const schema = fs.readFileSync(
        path.join(root, 'Back-end/prisma/schema.prisma'),
        'utf8',
      );
      const augmented = schema.replace(
        '  @@map("produit")',
        indexes
          .map(
            ([field, name]) =>
              `  @@index([${field}(ops: raw("gin_trgm_ops"))], type: Gin, map: "${name}")`,
          )
          .join('\n') + '\n  @@map("produit")',
      );
      const target = path.join(dir, 'schema-with-search-indexes.prisma');
      fs.writeFileSync(target, augmented);
      const full = prisma('diff-with-search-indexes', [
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        target,
        '--exit-code',
      ]);
      report.schemaWithSearchIndexesMatches = full.status === 0;
      report.retainedSearchIndexes = indexes.map(([, name]) => name);
      assert.equal(full.status, 0, 'Unexpected schema drift remains');
      report.checks.push(
        'Completed schema matches application model plus five retained GIN search indexes',
      );
      const product = (
        await db.query(
          "SELECT nom_produit, quantite_stock, prix_detail, est_actif FROM produit WHERE id='repair-product'",
        )
      ).rows[0];
      assert.deepEqual(product, {
        nom_produit: 'TEST Product',
        quantite_stock: 9,
        prix_detail: 1234,
        est_actif: true,
      });
      report.checks.push(
        'Existing product name, price and stock preserved; active by default',
      );
      assert.equal(
        (
          await db.query(
            "SELECT montant_total::text AS total FROM prime_vendeur WHERE id='repair-prime'",
          )
        ).rows[0].total,
        '1000.00',
      );
      report.checks.push(
        'Historical seller bonus backfill executes against seeded invoice',
      );
      assert.equal(
        (
          await db.query(
            "SELECT next_value FROM document_sequence WHERE type='FACTURE' AND period='2026'",
          )
        ).rows[0].next_value,
        7,
      );
      report.checks.push(
        'Invoice numbering sequence resumes from existing invoice',
      );
      const before = rows.map((m) => m.migration_name);
      assert.equal(prisma('second-deploy', ['migrate', 'deploy']).status, 0);
      const after = (
        await db.query(
          'SELECT migration_name FROM _prisma_migrations ORDER BY started_at',
        )
      ).rows.map((m) => m.migration_name);
      assert.deepEqual(after, before);
      report.checks.push(
        'Second deploy is a no-op with unchanged migration history',
      );
      await require('../../scripts/verify-release-schema.cjs').verifyReleaseSchema(
        db,
      );
      report.checks.push('Release schema guard passes');
    }
    for (const item of original) {
      assert.equal(
        hash(path.join(source, item.name, 'migration.sql')),
        item.sha256,
      );
      assert.equal(
        hash(path.join(copy, item.name, 'migration.sql')),
        item.sha256,
      );
    }
    report.originalMigrationsUnchanged = true;
  } finally {
    await db.end();
  }
  fs.writeFileSync(
    path.join(root, 'docs/refonte-e/captures/verification-history-repair.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      {
        database,
        deployExitCode: deploy.status,
        applied: report.applied?.length,
        failures: report.failures?.map((m) => ({
          name: m.migration_name,
          error: m.logs,
        })),
        schemaWithSearchIndexesMatches: report.schemaWithSearchIndexesMatches,
        checks: report.checks,
      },
      null,
      2,
    ),
  );
  if (deploy.status !== 0 || !report.schemaWithSearchIndexesMatches)
    process.exitCode = 1;
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
