// Rebuild audited table metadata locally; never connects to the remote database.
// This is not a production backup: no business data, privileges or functions copied.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { configure, root, runtime } = require('../sandbox/config.cjs');
const { snapshot } = require('./audit-schema-readonly.cjs');
const {
  verifyReleaseSchema,
} = require('../../scripts/verify-release-schema.cjs');
configure();
const identifier = (name) => '"' + name.replace(/"/g, '""') + '"';
const literal = (value) => "'" + value.replace(/'/g, "''") + "'";
function columnType(c) {
  if (c.data_type === 'USER-DEFINED') return identifier(c.udt_name);
  if (c.data_type === 'character varying')
    return `varchar(${c.character_maximum_length})`;
  if (c.data_type === 'numeric')
    return `numeric(${c.numeric_precision},${c.numeric_scale})`;
  if (c.data_type === 'timestamp without time zone')
    return `timestamp(${c.datetime_precision})`;
  if (c.data_type === 'ARRAY' && c.udt_name === '_int4') return 'integer[]';
  assert.ok(
    [
      'text',
      'integer',
      'double precision',
      'jsonb',
      'boolean',
      'date',
    ].includes(c.data_type),
    'Unsupported audited type',
  );
  return c.data_type;
}
function comparable(data, excludeRequest = false) {
  const selected = (row) =>
    !excludeRequest || row.table_name !== 'commande_request';
  return {
    columns: data.columns.filter(selected),
    constraints: data.constraints.filter(
      (row) => selected(row) && row.type !== 'n',
    ),
    indexes: data.indexes.filter(selected),
    enums: data.enums,
    triggers: data.triggers,
  };
}
async function main() {
  const args = process.argv.slice(2);
  assert.ok(
    args.length === 0 ||
      (args[0] === '--pg18' &&
        (args.length === 1 ||
          (args.length === 2 && args[1] === '--schema-dump'))),
    'Use no arguments, --pg18, or --pg18 --schema-dump',
  );
  const fromDump = args.includes('--schema-dump');
  const major = args.length ? '18' : '17';
  const port = major === '18' ? 55440 : 55439;
  const auditPath = path.join(
    root,
    'docs/refonte-e/captures/audit-schema-distant.json',
  );
  const bytes = fs.readFileSync(auditPath);
  const audited = JSON.parse(bytes);
  assert.equal(audited.readOnly, true);
  assert.deepEqual(
    audited.triggers,
    [],
    'Trigger-bearing databases require a fuller rehearsal',
  );
  assert.ok(!audited.columns.some((c) => c.table_name === 'commande_request'));
  assert.ok(
    !audited.migrations.some((m) => !m.finished_at && !m.rolled_back_at),
  );
  const database = `newoteg_refonte_e_migrations_deployed_pg${major}_${Date.now()}`;
  const dir = path.join(runtime, 'migrations', database);
  fs.mkdirSync(dir, { recursive: true });
  const admin = new Client({
    connectionString: `postgresql://refonte_test@127.0.0.1:${port}/postgres`,
  });
  await admin.connect();
  try {
    const version = (await admin.query('SHOW server_version_num')).rows[0]
      .server_version_num;
    assert.equal(Math.floor(Number(version) / 10000), Number(major));
    if (major === '18')
      assert.equal(
        version,
        audited.serverVersion,
        'PostgreSQL 18 patch must match the audited Railway version',
      );
    await admin.query(`CREATE DATABASE ${identifier(database)}`);
  } finally {
    await admin.end();
  }
  const db = new Client({
    connectionString: `postgresql://refonte_test@127.0.0.1:${port}/${database}`,
  });
  await db.connect();
  const report = {
    date: new Date().toISOString(),
    database,
    sourceAuditDate: audited.date,
    auditSha256: createHash('sha256').update(bytes).digest('hex'),
    productionTouched: false,
    remoteBusinessRowsRead: false,
    sourceServerVersion: audited.serverVersion,
    scope:
      'Audited table metadata reconstructed locally; synthetic business fixtures and migration-history identifiers',
    checks: [],
  };
  const checks = report.checks;
  function prisma(label) {
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
        env: {
          ...process.env,
          REFONTE_MIGRATION_DB: database,
          REFONTE_REHEARSAL_PG_MAJOR: major,
        },
        encoding: 'utf8',
        timeout: 120000,
      },
    );
    fs.writeFileSync(
      path.join(dir, label + '.log'),
      (result.stdout || '') + '\n' + (result.stderr || ''),
    );
    assert.equal(
      result.status,
      0,
      'Migration failed; inspect local rehearsal log',
    );
  }
  try {
    if (fromDump) {
      const directory = path.join(runtime, 'schema-snapshots');
      const manifest = JSON.parse(
        fs.readFileSync(path.join(directory, 'latest.json')),
      );
      assert.equal(manifest.schemaOnly, true);
      assert.equal(manifest.businessRowsIncluded, false);
      assert.match(manifest.fileName, /^railway-schema-[0-9]+\.dump$/);
      const file = path.join(directory, manifest.fileName);
      assert.equal(
        createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
        manifest.sha256,
      );
      const executable = path.join(
        runtime,
        'tooling/postgresql-18.6-3/pgsql/bin/pg_restore.exe',
      );
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith('PG')),
      );
      const restored = spawnSync(
        executable,
        [
          '--host=127.0.0.1',
          `--port=${port}`,
          '--username=refonte_test',
          `--dbname=${database}`,
          '--no-owner',
          '--no-privileges',
          '--exit-on-error',
          '--single-transaction',
          file,
        ],
        { env, encoding: 'utf8', timeout: 120000 },
      );
      fs.writeFileSync(
        path.join(dir, 'restore.log'),
        (restored.stdout || '') + '\n' + (restored.stderr || ''),
      );
      assert.equal(
        restored.status,
        0,
        'Schema archive restoration failed; see local log',
      );
      report.schemaSnapshot = manifest;
      report.scope =
        'Actual schema-only pg_dump restored locally on PostgreSQL 18.6; synthetic fixtures and migration-history identifiers';
      checks.push(
        'Actual schema-only archive restored transactionally into a new local PostgreSQL 18.6 database',
      );
    } else {
      await db.query('CREATE EXTENSION pg_trgm');
      const enums = new Map();
      for (const e of audited.enums)
        enums.set(e.name, [...(enums.get(e.name) || []), e.value]);
      for (const [name, values] of enums)
        await db.query(
          `CREATE TYPE ${identifier(name)} AS ENUM (${values.map(literal).join(',')})`,
        );
      const tables = new Map();
      for (const c of audited.columns)
        tables.set(c.table_name, [...(tables.get(c.table_name) || []), c]);
      for (const [table, columns] of tables) {
        const definitions = columns.map(
          (c) =>
            `${identifier(c.column_name)} ${columnType(c)}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default !== null ? ' DEFAULT ' + c.column_default : ''}`,
        );
        await db.query(
          `CREATE TABLE ${identifier(table)} (${definitions.join(',')})`,
        );
      }
      for (const c of audited.constraints.filter((c) => c.type === 'p'))
        await db.query(
          `ALTER TABLE ${identifier(c.table_name)} ADD CONSTRAINT ${identifier(c.name)} ${c.definition}`,
        );
      const primaryNames = new Set(
        audited.constraints.filter((c) => c.type === 'p').map((c) => c.name),
      );
      for (const i of audited.indexes.filter((i) => !primaryNames.has(i.name)))
        await db.query(i.definition);
      for (const c of audited.constraints.filter((c) => c.type === 'f'))
        await db.query(
          `ALTER TABLE ${identifier(c.table_name)} ADD CONSTRAINT ${identifier(c.name)} ${c.definition}`,
        );
      assert.ok(
        audited.constraints.every((c) => ['n', 'p', 'f'].includes(c.type)),
        'Unsupported constraint',
      );
    }
    // Reproduce audited history semantics ONLY in this new local database.
    await db.query(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL, finished_at timestamptz,
      migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz,
      started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)`);
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM _prisma_migrations'))
        .rows[0].count,
      0,
    );
    for (const [i, m] of audited.migrations.entries())
      await db.query(
        `INSERT INTO _prisma_migrations
      (id,checksum,finished_at,migration_name,rolled_back_at,started_at,applied_steps_count) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          randomUUID(),
          m.checksum,
          m.finished_at,
          m.migration_name,
          m.rolled_back_at,
          new Date(946684800000 + i * 1000),
          m.applied_steps_count,
        ],
      );
    const before = await snapshot(db);
    assert.deepEqual(comparable(before), comparable(audited));
    report.localServerVersion = before.serverVersion;
    checks.push(
      'All 52 audited tables, columns, defaults, nullability, enums, indexes and foreign keys reproduced',
    );
    await db.query(`INSERT INTO categorie(id,nom) VALUES ('deployed-category','TEST Rehearsal');
      INSERT INTO produit(id,id_categorie,nom_produit,quantite_stock,prix_detail) VALUES ('deployed-product','deployed-category','TEST Product',9,1234);
      INSERT INTO client(id,nom,email) VALUES ('deployed-client','TEST Client','rehearsal@example.invalid');
      INSERT INTO commande(id,numero_suivi,nom_client,telephone,adresse_livraison,montant_total,client_id)
        VALUES ('deployed-order','TEST-REHEARSAL','TEST Client','000000000','TEST Pickup',1234,'deployed-client');
      INSERT INTO ligne_commande(id,id_commande,id_produit,nom_produit,quantite,prix_unitaire,sous_total)
        VALUES ('deployed-line','deployed-order','deployed-product','TEST Product',1,1234,1234);`);
    const fixtures = async () => {
      const result = {};
      for (const name of [
        'categorie',
        'produit',
        'client',
        'commande',
        'ligne_commande',
      ]) {
        result[name] = (
          await db.query(
            `SELECT row_to_json(t) AS value FROM ${identifier(name)} t ORDER BY id`,
          )
        ).rows;
      }
      return result;
    };
    const priorRows = await fixtures();
    const priorHistory = (
      await db.query('SELECT * FROM _prisma_migrations ORDER BY started_at')
    ).rows;
    prisma('upgrade');
    const after = await snapshot(db);
    assert.deepEqual(comparable(after, true), comparable(before));
    checks.push(
      'Upgrade adds commande_request without changing existing audited structures',
    );
    assert.deepEqual(await fixtures(), priorRows);
    checks.push(
      'Existing synthetic customer, order, line, product price and stock remain identical',
    );
    const currentHistory = (
      await db.query('SELECT * FROM _prisma_migrations ORDER BY started_at')
    ).rows;
    assert.deepEqual(
      currentHistory.slice(0, priorHistory.length),
      priorHistory,
    );
    assert.equal(currentHistory.length, priorHistory.length + 1);
    assert.equal(
      currentHistory.at(-1).migration_name,
      '20260924100000_order_request_idempotency',
    );
    checks.push(
      'Only the pending order-recovery migration runs; existing checksums and statuses unchanged',
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS count FROM commande_request'))
        .rows[0].count,
      0,
    );
    await verifyReleaseSchema(db);
    checks.push('New request table is empty and release-schema guard passes');
    const requestId = randomUUID();
    await db.query(
      'INSERT INTO commande_request(request_id,fingerprint,commande_id) VALUES ($1,$2,$3)',
      [requestId, 'a'.repeat(64), 'deployed-order'],
    );
    await assert.rejects(
      db.query(
        'INSERT INTO commande_request(request_id,fingerprint) VALUES ($1,$2)',
        [requestId, 'b'.repeat(64)],
      ),
      (e) => e.code === '23505',
    );
    checks.push('A duplicate request identifier is rejected by the database');
    await assert.rejects(
      db.query(
        'INSERT INTO commande_request(request_id,fingerprint,commande_id) VALUES ($1,$2,$3)',
        [randomUUID(), 'b'.repeat(64), 'missing-order'],
      ),
      (e) => e.code === '23503',
    );
    checks.push('A request cannot point to a nonexistent order');
    await db.query("DELETE FROM commande WHERE id='deployed-order'");
    const retained = (
      await db.query(
        'SELECT commande_id,fingerprint FROM commande_request WHERE request_id=$1',
        [requestId],
      )
    ).rows[0];
    assert.deepEqual(retained, {
      commande_id: null,
      fingerprint: 'a'.repeat(64),
    });
    checks.push(
      'Deleting a synthetic order retains the request fingerprint as a tombstone',
    );
    prisma('second-deploy');
    assert.deepEqual(
      (await db.query('SELECT * FROM _prisma_migrations ORDER BY started_at'))
        .rows,
      currentHistory,
    );
    checks.push(
      'Second deployment is a no-op with unchanged migration history',
    );
    report.success = true;
  } catch (error) {
    report.success = false;
    report.error = error.message;
    throw error;
  } finally {
    await db.end();
    fs.writeFileSync(
      path.join(
        root,
        `docs/refonte-e/captures/verification-deployed-upgrade${major === '18' ? '-pg18' : ''}${fromDump ? '-schema' : ''}.json`,
      ),
      JSON.stringify(report, null, 2) + '\n',
    );
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
