// Synthetic local upgrade and real transaction rehearsal. No .env is read.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { execFileSync, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw Error('Evidence directory required');
const database = process.env.SEO_REHEARSAL_DATABASE || 'seo_acquisition_upgrade';
if (!/^seo_acquisition_upgrade(?:_[a-z0-9]+)?$/.test(database)) throw Error('Owned synthetic database required');
const port = process.env.SEO_REHEARSAL_PORT || '55447';
if (!['55447', '55448'].includes(port)) throw Error('Owned local rehearsal port required');
const connectionString = 'postgresql://seo_rehearsal@127.0.0.1:' + port + '/' + database;
const migration = '20261028170000_add_acquisition_channels';
const { readStructure, compareStructure, sourceIdentity } = require('../../scripts/release-schema-contract.cjs');
const report = { checkedAt: new Date().toISOString(), productionTouched: false, checks: [] };
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const baselineRef = process.argv[3];
  const prismaCommand = args => spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), ...args], { cwd: root, env: { ...process.env, DATABASE_URL: connectionString }, encoding: 'utf8', timeout: 120000 });
  if (baselineRef) {
    if (!/^[a-z0-9][a-z0-9/._-]*$/i.test(baselineRef)) throw Error('Explicit baseline git ref required');
    const admin = new Client({ connectionString: 'postgresql://seo_rehearsal@127.0.0.1:' + port + '/postgres' });
    await admin.connect();
    try { await admin.query(`CREATE DATABASE "${database}"`); } finally { await admin.end(); }
    for (const [target, source] of [['schema-before.prisma', 'Back-end/prisma/schema.prisma'], ['release-contract-before.json', 'Back-end/scripts/release-schema.json']]) {
      fs.writeFileSync(path.join(output, target), execFileSync('git', ['show', baselineRef + ':' + source], { cwd: root }));
    }
    const result = prismaCommand(['migrate', 'diff', '--from-empty', '--to-schema', path.join(output, 'schema-before.prisma'), '--script', '--output', path.join(output, 'baseline.sql')]);
    assert.equal(result.status, 0, result.stderr);
  }
  const db = new Client({ connectionString });
  await db.connect();
  let prisma;
  try {
    const before = JSON.parse(fs.readFileSync(path.join(output, 'release-contract-before.json')));
    if (baselineRef) {
      await db.query(fs.readFileSync(path.join(output, 'baseline.sql'), 'utf8'));
      for (const row of before.structure.constraints.filter(item => item.type === 'c')) await db.query(`ALTER TABLE "${row.table_name}" ADD CONSTRAINT "${row.name}" ${row.definition}`);
    }
    // Prisma emits these as unique indexes. Recreate the reviewed constraints
    // as well, exclusively in this disposable projected baseline.
    let structure = await readStructure(db);
    for (const item of before.structure.constraints.filter(row => row.type === 'u')) {
      if (!structure.constraints.some(row => row.table_name === item.table_name && row.name === item.name))
        await db.query(`ALTER TABLE "${item.table_name}" ADD CONSTRAINT "${item.name}" UNIQUE USING INDEX "${item.name}"`);
    }
    structure = await readStructure(db);
    assert.deepEqual(compareStructure(before.structure, structure), [], 'Baseline must satisfy every reviewed schema requirement');
    report.checks.push('Projected baseline satisfies the complete previous release schema contract');
    await db.query("INSERT INTO categorie(id,nom) VALUES('seo-category','Synthetic')");
    await db.query("INSERT INTO produit(id,id_categorie,nom_produit,quantite_stock,prix_detail) VALUES('seo-product','seo-category','Synthetic',9,1234)");
    await db.query("INSERT INTO client(id,nom) VALUES('seo-client','Synthetic')");
    await db.query("INSERT INTO commande(id,numero_suivi,nom_client,telephone,adresse_livraison,montant_total,date_commande) VALUES('seo-order','SEO-FIXTURE','Synthetic','000000','Fixture',0,'2026-10-28T12:00:00Z')");
    await db.query("INSERT INTO commande_request(request_id,fingerprint,commande_id) VALUES('00000000-0000-4000-8000-000000000010',repeat('0',64),'seo-order')");
    await db.query("INSERT INTO demande_devis(id,request_id,fingerprint,client_id,nom_client,telephone,mode_reception,created_at,updated_at) VALUES('seo-devis','00000000-0000-4000-8000-000000000011',repeat('0',64),'seo-client','Synthetic','000000','RETRAIT_MAGASIN','2026-10-28T12:00:00Z','2026-10-28T12:00:00Z')");
    const stockBefore = (await db.query("SELECT quantite_stock,prix_detail FROM produit WHERE id='seo-product'")).rows;
    // This ledger belongs only to the synthetic projected baseline. No existing
    // database history is repaired or rewritten, and no migrate resolve is used.
    await db.query('CREATE TABLE _prisma_migrations (id VARCHAR(36) PRIMARY KEY, checksum VARCHAR(64) NOT NULL, finished_at TIMESTAMPTZ, migration_name VARCHAR(255) NOT NULL, logs TEXT, rolled_back_at TIMESTAMPTZ, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), applied_steps_count INTEGER NOT NULL DEFAULT 0)');
    for (const item of sourceIdentity(true).migrations.filter(item => item.name !== migration)) {
      await db.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count) VALUES($1,$2,now(),$3,1)', [randomUUID(), item.sha256, item.name]);
    }
    const deployed = prismaCommand(['migrate', 'deploy']);
    fs.writeFileSync(path.join(output, 'prisma-upgrade.log'), (deployed.stdout || '') + (deployed.stderr || ''));
    assert.equal(deployed.status, 0, deployed.stderr);
    const after = await readStructure(db);
    assert.deepEqual(compareStructure(before.structure, after), []);
    assert.deepEqual((await db.query("SELECT quantite_stock,prix_detail FROM produit WHERE id='seo-product'")).rows, stockBefore);
    assert.equal((await db.query("SELECT canal_entree FROM commande WHERE id='seo-order'")).rows[0].canal_entree, null);
    assert.equal((await db.query("SELECT canal_entree FROM demande_devis WHERE id='seo-devis'")).rows[0].canal_entree, null);
    await assert.rejects(db.query("UPDATE commande SET canal_entree='https://private.invalid' WHERE id='seo-order'"), error => error.code === '23514');
    report.checks.push('Additive migration preserves prior schema, stock, price and unknown historical sources; SQL rejects free-form sources');
    const candidate = structuredClone(before);
    candidate.sources = sourceIdentity();
    for (const kind of ['columns', 'constraints', 'indexes']) {
      const delta = after[kind].filter(row => row.table_name === 'parcours_acquisition_jour' ||
        (['commande', 'demande_devis'].includes(row.table_name) && (row.column_name === 'canal_entree' || row.name?.endsWith('_canal_entree_check'))));
      candidate.structure[kind].push(...delta);
    }
    assert.deepEqual(compareStructure(candidate.structure, after), []);
    await require('../../scripts/verify-release-schema.cjs').verifyReleaseSchema(db, candidate);
    report.checks.push('Actual Prisma migrate deploy and complete startup schema/history verification succeed on the isolated projected baseline');
    fs.writeFileSync(path.join(output, 'candidate-release-schema.json'), JSON.stringify(candidate, null, 2) + '\n');
    report.checks.push('Candidate release contract retains every prior requirement and adds observed attribution metadata; previous backend remains schema-compatible');
    process.env.DATABASE_URL = connectionString;
    process.env.PARCOURS_METRICS_ENABLED = 'true';
    const { DatabaseService } = require('../../dist/src/database/database.service.js');
    const { ParcoursService } = require('../../dist/src/parcours/parcours.service.js');
    prisma = new DatabaseService();
    await prisma.$connect();
    const service = new ParcoursService(prisma), now = new Date('2026-10-28T12:00:00Z');
    const event = (suffix, canalEntree) => ({ id: `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`, jour: '2026-10-28', evenement: 'CONSEIL_OUVERT', langue: 'fr', appareil: 'mobile', reception: 'GENERAL', ...(canalEntree ? { canalEntree } : {}) });
    const first = event(1, 'RECHERCHE_NATURELLE');
    await service.ingest({ evenements: [first] }, now);
    await service.ingest({ evenements: [first, event(2, 'SOCIAL')] }, now);
    await Promise.all([service.ingest({ evenements: [event(3, 'SOCIAL')] }, now), service.ingest({ evenements: [event(3, 'SOCIAL')] }, now)]);
    assert.equal((await db.query('SELECT coalesce(sum(nombre),0)::int AS n FROM parcours_jour')).rows[0].n, 0);
    assert.equal((await db.query('SELECT sum(nombre)::int AS n FROM parcours_acquisition_jour')).rows[0].n, 3);
    await assert.rejects(service.ingest({ evenements: [event(0, 'SOCIAL'), { ...first, canalEntree: 'SOCIAL' }] }, now));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM parcours_recu')).rows[0].n, 3, 'Conflicting batch must roll back its preceding receipt');
    await service.ingest({ evenements: [{ ...event(4), evenement: 'FICHE_OUVERTE' }] }, now);
    assert.equal((await db.query('SELECT sum(nombre)::int AS n FROM parcours_jour')).rows[0].n, 1);
    assert.equal((await db.query('SELECT sum(nombre)::int AS n FROM parcours_acquisition_jour')).rows[0].n, 3);
    report.checks.push('Real PostgreSQL transactions deduplicate overlapping concurrent batches, roll back conflicts and accept legacy observations without inventing a source');
    const legacy = await service.report('2026-10-28', '2026-10-28', now);
    const extended = await service.report('2026-10-28', '2026-10-28', now, true);
    assert.equal(legacy.observations.length, 1);
    assert.equal(extended.observations.find(row => row.evenement === 'CONSEIL_OUVERT').nombre, 3);
    report.checks.push('Version 1 report keeps the prior event vocabulary; version 2 combines new source aggregates without duplicate counts');
    const acquisition = await service.acquisitionReport('2026-10-28', '2026-10-28', now);
    const unknown = acquisition.canaux.find(row => row.canalEntree === null);
    assert.equal(unknown.commandesEnregistrees, 1);
    assert.equal(unknown.devisDemandes, 1);
    assert.equal(acquisition.canaux.find(row => row.canalEntree === 'RECHERCHE_NATURELLE').commandesEnregistrees, 0);
    assert(!/telephone|fingerprint|nom_client|seo-order/.test(JSON.stringify(acquisition)));
    report.checks.push('Private report keeps historical business records unassigned and excludes customer fields and transaction identifiers');
    report.status = 'passed';
  } finally {
    if (prisma) await prisma.onModuleDestroy();
    await db.end();
  }
}
main().catch(error => { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }).finally(() => {
  fs.writeFileSync(path.join(output, 'upgrade-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
});
