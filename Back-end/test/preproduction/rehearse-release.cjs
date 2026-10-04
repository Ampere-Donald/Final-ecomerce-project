// Local-only rehearsal. Baseline comes from a pinned source datamodel, not Railway.
// Historical ledger is explicitly synthetic; no resolve, production access or .env.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');
const { Client } = require('pg');
const {
  sourceIdentity,
  readStructure,
  compareStructure,
} = require('../../scripts/release-schema-contract.cjs');
const {
  verifyReleaseSchema,
  verifyMigrationHistory,
} = require('../../scripts/verify-release-schema.cjs');
const root = path.resolve(__dirname, '../..');
const baselineCommit = '79f606ec';
const sourceUrl = process.env.NEWOTEG_RELEASE_TEST_DATABASE_URL;
const target = sourceUrl ? new URL(sourceUrl) : null;
if (
  !target ||
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/postgres' ||
  target.username !== 'quote_test'
)
  throw Error(
    'Explicit local quote_test cluster on 127.0.0.1:55439/postgres required.',
  );
const writeContract = process.argv.slice(2).join(' ') === '--write-contract';
assert.ok(
  process.argv.length === 2 || writeContract,
  'Use no arguments or --write-contract',
);
const runId = randomUUID().replaceAll('-', '');
const names = [`newoteg_release_${runId}`, `newoteg_restore_${runId}`];
const output = path.resolve(
  process.env.NEWOTEG_RELEASE_TEST_OUTPUT ||
    path.join(root, '.local-postgres/release', runId),
);
fs.mkdirSync(output, { recursive: true });
const env = { ...process.env };
for (const key of Object.keys(env))
  if (
    /^(DATABASE_URL|DIRECT_URL|SMTP_|CLOUDINARY_|GEMINI_|GOOGLE_|JWT_SECRET|PG)/.test(
      key,
    )
  )
    delete env[key];
const safeName = (name) => {
  assert.ok(
    names.includes(name) &&
      /^newoteg_(release|restore)_[a-f0-9]{32}$/.test(name),
  );
  return '"' + name + '"';
};
function url(name) {
  const u = new URL(sourceUrl);
  u.pathname = '/' + name;
  return u.toString();
}
function run(file, args, runEnv = env) {
  const result = spawnSync(file, args, {
    cwd: root,
    env: runEnv,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.error || result.status !== 0)
    throw Error(`Local tool failed: ${path.basename(file)}`);
  return result;
}
async function digestRows(db) {
  const tables = (
    await db.query(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
    )
  ).rows;
  const values = [];
  for (const { tablename } of tables) {
    assert.match(tablename, /^[a-zA-Z_][a-zA-Z0-9_]*$/);
    const rows = (
      await db.query(
        `SELECT to_jsonb(t) AS value FROM public."${tablename}" t ORDER BY to_jsonb(t)::text`,
      )
    ).rows;
    values.push({
      table: tablename,
      count: rows.length,
      sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
    });
  }
  return values;
}
async function main() {
  const admin = new Client({ connectionString: sourceUrl });
  await admin.connect();
  const owned = new Set();
  let db, restored;
  const checks = [];
  const sources = sourceIdentity();
  const migrations = sources.migrations.filter(
    (m) => m.name >= '20260929113000_quote_requests',
  );
  assert.equal(
    migrations.length,
    12,
    'Review the rehearsal scope when new migrations are added.',
  );
  try {
    for (const name of names) {
      await admin.query(`CREATE DATABASE ${safeName(name)}`);
      owned.add(name);
    }
    db = new Client({ connectionString: url(names[0]) });
    await db.connect();
    const baseline = path.join(output, 'baseline.prisma');
    fs.writeFileSync(
      baseline,
      execFileSync(
        'git',
        ['show', baselineCommit + ':Back-end/prisma/schema.prisma'],
        { cwd: root },
      ),
    );
    const config = path.join(output, 'prisma.config.ts');
    fs.writeFileSync(
      config,
      'export default ' +
        JSON.stringify({
          schema: path.join(root, 'prisma/schema.prisma'),
          datasource: { url: url(names[0]) },
        }) +
        ';\n',
    );
    const cli = path.join(root, 'node_modules/prisma/build/index.js');
    const baselineSql = path.join(output, 'baseline.sql');
    run(process.execPath, [
      cli,
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema',
      baseline,
      '--script',
      '--output',
      baselineSql,
      '--config',
      config,
    ]);
    await db.query(fs.readFileSync(baselineSql, 'utf8'));
    assert.deepEqual(await verifyMigrationHistory(db, true), {
      pending: sources.migrations.length,
    });
    checks.push(
      'Fresh database without historical ledger allowed before migration only',
    );
    await db.query(`INSERT INTO categorie(id,nom) VALUES('release-category','Synthetic release category');
      INSERT INTO produit(id,id_categorie,nom_produit,quantite_stock,prix_detail) VALUES('release-product','release-category','Synthetic release product',7,1234);
      INSERT INTO client(id,nom,email) VALUES('release-client','Synthetic customer','synthetic@example.invalid');
      INSERT INTO commande(id,numero_suivi,nom_client,telephone,adresse_livraison,montant_total,client_id,statut,date_livraison)
        VALUES('release-order','RELEASE-SYNTHETIC','Synthetic customer','000000000','Synthetic Akwa',1234,'release-client','LIVREE',CURRENT_TIMESTAMP);
      INSERT INTO ligne_commande(id,id_commande,id_produit,nom_produit,quantite,prix_unitaire,sous_total)
        VALUES('release-line','release-order','release-product','Synthetic release product',1,1234,1234);
      INSERT INTO commande_request(request_id,fingerprint,commande_id) VALUES('${randomUUID()}','${'a'.repeat(64)}','release-order')`);
    const before = await digestRows(db);
    const oldStructure = await readStructure(db);
    for (const migration of migrations) {
      await db.query('BEGIN');
      try {
        await db.query(
          fs.readFileSync(
            path.join(
              root,
              'prisma/migrations',
              migration.name,
              'migration.sql',
            ),
            'utf8',
          ),
        );
        await db.query('COMMIT');
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    }
    const after = await digestRows(db);
    assert.deepEqual(
      compareStructure(oldStructure, await readStructure(db)),
      [],
    );
    assert.deepEqual(
      after.filter((row) => before.some((old) => old.table === row.table)),
      before,
    );
    checks.push(
      'Twelve additive migrations preserve every pre-existing synthetic row and stock value',
    );
    // Check the new migration result against a separately generated current datamodel.
    const diff = spawnSync(
      process.execPath,
      [
        cli,
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        path.join(root, 'prisma/schema.prisma'),
        '--exit-code',
        '--config',
        config,
      ],
      { cwd: root, env, encoding: 'utf8', timeout: 120000 },
    );
    fs.writeFileSync(
      path.join(output, 'schema-diff.log'),
      (diff.stdout || '') + '\n' + (diff.stderr || ''),
    );
    assert.equal(
      diff.status,
      0,
      'Migrated schema differs from the current Prisma datamodel; inspect local schema-diff.log',
    );
    checks.push(
      'Result matches current Prisma datamodel; custom SQL CHECK constraints also captured',
    );
    const candidate = {
      version: 1,
      sources,
      structure: await readStructure(db),
    };
    const file = path.join(root, 'scripts/release-schema.json');
    // Synthetic history only allows the guard to be exercised. It is NEVER a
    // claimed execution of the historical migrations or a deployable baseline.
    await db.query(`CREATE TABLE _prisma_migrations(id VARCHAR(36) PRIMARY KEY,checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL,logs TEXT,rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,applied_steps_count INTEGER NOT NULL DEFAULT 0)`);
    for (const migration of sourceIdentity(true).migrations)
      await db.query(
        'INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,NOW(),$3,1)',
        [randomUUID(), migration.sha256, migration.name],
      );
    await verifyReleaseSchema(db, candidate);
    checks.push(
      'Complete release schema and exact local checksums accepted against explicitly synthetic history',
    );
    async function historyCase(label, sql, expectedError) {
      await db.query('BEGIN');
      try {
        await db.query(sql);
        if (expectedError)
          await assert.rejects(
            () => verifyMigrationHistory(db, true),
            expectedError,
          );
        else
          assert.deepEqual(await verifyMigrationHistory(db, true), {
            pending: 12,
          });
        checks.push(label);
      } finally {
        await db.query('ROLLBACK');
      }
    }
    await historyCase(
      'Pending twelve-migration suffix accepted by pre-migration history guard',
      `DELETE FROM _prisma_migrations WHERE migration_name >= '20260929113000_quote_requests'`,
    );
    await historyCase(
      'Historical checksum mismatch refused even with pending new migrations',
      `DELETE FROM _prisma_migrations WHERE migration_name >= '20260929113000_quote_requests';
      UPDATE _prisma_migrations SET checksum=repeat('0',64) WHERE migration_name='20260615000000_add_demi_gros'`,
      /migration:20260615000000_add_demi_gros/,
    );
    await historyCase(
      'Gap before an applied migration refused before migration',
      `DELETE FROM _prisma_migrations WHERE migration_name='20260615000000_add_demi_gros'`,
      /migration-history-gap:/,
    );
    await historyCase(
      'Duplicate applied migration refused before migration',
      `INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name)
      SELECT '${randomUUID()}',checksum,NOW(),migration_name FROM _prisma_migrations WHERE migration_name='20261004140000_incompatibilites'`,
      /duplicate-migration:/,
    );
    async function rejected(label, sql, pattern) {
      await db.query('BEGIN');
      try {
        await db.query(sql);
        await assert.rejects(() => verifyReleaseSchema(db, candidate), pattern);
        checks.push(label);
      } finally {
        await db.query('ROLLBACK');
      }
    }
    await rejected(
      'Missing guest receipt column refused',
      'ALTER TABLE commande_guest_challenge DROP COLUMN action_result',
      /columns:commande_guest_challenge.action_result/,
    );
    await rejected(
      'Review uniqueness removal refused',
      'DROP INDEX avis_produit_ligne_commande_id_key',
      /indexes:avis_produit.avis_produit_ligne_commande_id_key/,
    );
    await rejected(
      'Photo coherence CHECK removal refused',
      'ALTER TABLE avis_produit DROP CONSTRAINT avis_photo_bounded',
      /constraints:avis_produit.avis_photo_bounded/,
    );
    await rejected(
      'Confirmed return integrity CHECK removal refused',
      'ALTER TABLE dossier_incompatibilite DROP CONSTRAINT incompatibilite_return_complete',
      /constraints:dossier_incompatibilite.incompatibilite_return_complete/,
    );
    await rejected(
      'Weakened return CHECK refused',
      `ALTER TABLE dossier_incompatibilite DROP CONSTRAINT incompatibilite_return_complete;
      ALTER TABLE dossier_incompatibilite ADD CONSTRAINT incompatibilite_return_complete CHECK(true)`,
      /constraints:dossier_incompatibilite.incompatibilite_return_complete/,
    );
    await rejected(
      'Unvalidated CHECK refused',
      `ALTER TABLE avis_produit DROP CONSTRAINT avis_photo_bounded;
      ALTER TABLE avis_produit ADD CONSTRAINT avis_photo_bounded ${candidate.structure.constraints.find((row) => row.name === 'avis_photo_bounded').definition} NOT VALID`,
      /constraints:avis_produit.avis_photo_bounded/,
    );
    await rejected(
      'Missing project table refused',
      'DROP TABLE projet_event',
      /columns:projet_event/,
    );
    await rejected(
      'Changed foreign-key delete behavior refused',
      `ALTER TABLE incompatibilite_decision DROP CONSTRAINT incompatibilite_decision_dossier_id_fkey;
      ALTER TABLE incompatibilite_decision ADD CONSTRAINT incompatibilite_decision_dossier_id_fkey FOREIGN KEY(dossier_id) REFERENCES dossier_incompatibilite(id) ON DELETE CASCADE ON UPDATE CASCADE`,
      /constraints:incompatibilite_decision/,
    );
    await rejected(
      'Incorrect numeric precision refused',
      'ALTER TABLE ligne_commande ALTER COLUMN prix_unitaire TYPE NUMERIC(12,3)',
      /columns:ligne_commande.prix_unitaire/,
    );
    await rejected(
      'Nullable required field refused',
      'ALTER TABLE avis_produit ALTER COLUMN texte DROP NOT NULL',
      /columns:avis_produit.texte/,
    );
    await rejected(
      'Wrong default refused',
      'ALTER TABLE commande_guest_challenge ALTER COLUMN attempts SET DEFAULT 10',
      /columns:commande_guest_challenge.attempts/,
    );
    await rejected(
      'Missing review enum value refused',
      `ALTER TYPE "StatutAvis" RENAME VALUE 'REFUSE' TO 'REFUSE_TEST'`,
      /enums:StatutAvis/,
    );
    await rejected(
      'Unresolved migration refused',
      `UPDATE _prisma_migrations SET finished_at=NULL WHERE migration_name='20261004140000_incompatibilites'`,
      /no_failed_migration/,
    );
    await rejected(
      'Absent applied migration refused',
      `DELETE FROM _prisma_migrations WHERE migration_name='20261004140000_incompatibilites'`,
      /migration:20261004140000/,
    );
    await rejected(
      'Checksum mismatch refused without repair',
      `UPDATE _prisma_migrations SET checksum=repeat('0',64) WHERE migration_name='20260615000000_add_demi_gros'`,
      /migration:20260615000000_add_demi_gros/,
    );
    await rejected(
      'Unknown applied migration refused',
      `INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name) VALUES('${randomUUID()}',repeat('0',64),NOW(),'unexpected_release_migration')`,
      /unexpected-migration:unexpected_release_migration/,
    );
    await db.query('BEGIN');
    try {
      await db.query(
        "CREATE INDEX preserved_history_extra ON produit USING gin(to_tsvector('simple',nom_produit))",
      );
      await verifyReleaseSchema(db, candidate);
      checks.push(
        'Extra historical search index preserved and accepted without repair',
      );
    } finally {
      await db.query('ROLLBACK');
    }
    const stale = JSON.parse(JSON.stringify(candidate));
    stale.sources.schemaSha256 = '0'.repeat(64);
    await assert.rejects(
      () => verifyReleaseSchema(db, stale),
      /contract stale/,
    );
    checks.push('Stale generated contract refused');
    // Confirm metadata verifier can run with PostgreSQL enforcing read-only.
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      await verifyReleaseSchema(db, candidate);
    } finally {
      await db.query('ROLLBACK');
    }
    checks.push('Verifier passes in enforced read-only transaction');
    await db.query(`INSERT INTO commande_guest_access(commande_id,token_hash,expires_at) VALUES('release-order','${'b'.repeat(64)}',NOW()+INTERVAL '1 day');
      INSERT INTO commande_guest_challenge(id,commande_id,code_hash,expires_at,purpose,completed_at,action_result)
        VALUES('${randomUUID()}','release-order','${'c'.repeat(64)}',NOW(),'RECEIVE',NOW(),'{"operation":"synthetic-receipt"}');
      INSERT INTO avis_produit(id,ligne_commande_id,request_id,fingerprint,note,texte,pseudonyme,statut,photo_data,photo_input_hash,photo_width,photo_height,photo_statut)
        VALUES('${randomUUID()}','release-line','${randomUUID()}','${'d'.repeat(64)}',1,'Synthetic compliant negative review','Synthetic','PUBLIE',decode(repeat('00',32),'hex'),'${'e'.repeat(64)}',1,1,'EN_ATTENTE');
      INSERT INTO dossier_incompatibilite(id,ligne_commande_id,request_id,fingerprint,quantite,motif,description)
        VALUES('${randomUUID()}','release-line','${randomUUID()}','${'f'.repeat(64)}',1,'TENSION','Synthetic technical report');
      INSERT INTO parcours_jour(jour,evenement,langue,appareil,reception) VALUES(CURRENT_DATE,'FICHE_OUVERTE','fr','mobile','GENERAL')`);
    const originalRows = await digestRows(db);
    const originalStructure = await readStructure(db);
    const pgDir =
      process.env.NEWOTEG_RELEASE_PG_BIN ||
      'C:/Program Files/PostgreSQL/17/bin';
    const pgEnv = {
      ...env,
      PGHOST: '127.0.0.1',
      PGPORT: '55439',
      PGUSER: 'quote_test',
      PGPASSWORD: decodeURIComponent(target.password),
    };
    const dump = path.join(output, 'synthetic-release.dump');
    run(
      path.join(pgDir, 'pg_dump.exe'),
      [
        '--format=custom',
        '--file',
        dump,
        '--no-owner',
        '--no-acl',
        '--dbname',
        names[0],
      ],
      pgEnv,
    );
    run(
      path.join(pgDir, 'pg_restore.exe'),
      [
        '--exit-on-error',
        '--single-transaction',
        '--no-owner',
        '--no-acl',
        '--dbname',
        names[1],
        dump,
      ],
      pgEnv,
    );
    restored = new Client({ connectionString: url(names[1]) });
    await restored.connect();
    assert.deepEqual(await digestRows(restored), originalRows);
    const restoredStructure = await readStructure(restored);
    fs.writeFileSync(
      path.join(output, 'restore-structure.json'),
      JSON.stringify(
        { original: originalStructure, restored: restoredStructure },
        null,
        2,
      ),
    );
    // pg_dump/reparse may change casts and AND grouping in CHECK deparsing.
    // Accept ONLY the exact alternative produced by this source-derived restore;
    // never strip casts/operators or normalize arbitrary SQL expressions.
    const alternatives = {};
    for (const constraint of originalStructure.constraints) {
      const observed = restoredStructure.constraints.find(
        (row) =>
          row.table_name === constraint.table_name &&
          row.name === constraint.name,
      );
      if (observed?.definition !== constraint.definition) {
        assert.equal(
          constraint.type,
          'c',
          'Only source-derived CHECK deparsing alternatives allowed',
        );
        const withoutDefinition = ({ definition, ...rest }) => rest;
        assert.deepEqual(
          withoutDefinition(observed),
          withoutDefinition(constraint),
        );
        alternatives[`${constraint.table_name}.${constraint.name}`] =
          observed.definition;
      }
    }
    candidate.structure.checkRestoreDefinitions = alternatives;
    originalStructure.checkRestoreDefinitions = alternatives;
    assert.deepEqual(
      compareStructure(originalStructure, restoredStructure),
      [],
    );
    if (writeContract)
      fs.writeFileSync(file, JSON.stringify(candidate, null, 2) + '\n');
    else
      assert.deepEqual(
        candidate,
        JSON.parse(fs.readFileSync(file, 'utf8')),
        'Reviewed release contract differs from local rehearsal',
      );
    run(
      process.execPath,
      [path.join(root, 'scripts/verify-release-schema.cjs')],
      { ...env, DATABASE_URL: url(names[1]) },
    );
    checks.push(
      'Packaged CLI verifies restored database with enforced read-only settings',
    );
    run(
      process.execPath,
      [path.join(root, 'scripts/verify-release-schema.cjs'), '--history-only'],
      { ...env, DATABASE_URL: url(names[1]) },
    );
    checks.push(
      'Pre-migration history CLI verifies restored ledger in read-only mode',
    );
    await verifyReleaseSchema(restored, candidate);
    checks.push(
      'Custom-format backup restored with identical rows, binary photo, stock, private access and durable receipts',
    );
    checks.push(
      'Restored schema and exact migration ledger pass the release guard',
    );
    const report = {
      date: new Date().toISOString(),
      baselineCommit,
      historicalBaseline: 'source datamodel, not deployed database',
      historicalLedgerSynthetic: true,
      historicalChainValidated: false,
      remoteAccess: false,
      customerDataRead: false,
      migrationsApplied: migrations.map((m) => m.name),
      tables: new Set(candidate.structure.columns.map((c) => c.table_name))
        .size,
      columns: candidate.structure.columns.length,
      constraints: candidate.structure.constraints.length,
      indexes: candidate.structure.indexes.length,
      enums: candidate.structure.enums.length,
      checks,
      restoredData: originalRows.filter((row) => row.count > 0),
      cleanup: 'pending',
    };
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    return report;
  } finally {
    await db?.end();
    await restored?.end();
    try {
      for (const name of owned)
        await admin.query(`DROP DATABASE ${safeName(name)}`);
    } finally {
      await admin.end();
    }
  }
}
main()
  .then((report) => {
    report.cleanup =
      'Both databases created by this exact execution dropped after connections closed';
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        passed: report.checks.length,
        tables: report.tables,
        cleanup: true,
        report: path.join(output, 'result.json'),
      }),
    );
  })
  .catch((error) => {
    console.error(error.message);
    console.error(
      'Local release rehearsal failed; inspect its synthetic artifacts. No remote database accessed.',
    );
    process.exitCode = 1;
  });
