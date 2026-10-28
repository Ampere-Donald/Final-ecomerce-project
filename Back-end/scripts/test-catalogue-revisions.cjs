// Real PostgreSQL tests in a fresh local cluster. Never reads production .env.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const {
  CatalogueRevisionsService,
} = require('../dist/src/catalogue-revisions/catalogue-revisions.service');
const root = path.resolve(__dirname, '..');
const folder = path.join(
  root,
  '../tmp/catalogue-tests',
  new Date().toISOString().replace(/[:.]/g, '-'),
);
const bin = 'C:/Program Files/PostgreSQL/17/bin';
const port = 55487;
const cleanEnv = { ...process.env };
delete cleanEnv.DATABASE_URL;
for (const key of Object.keys(cleanEnv))
  if (key.startsWith('PG')) delete cleanEnv[key];
fs.mkdirSync(folder, { recursive: true });
function run(name, args) {
  const file = path.join(folder, `${name}.log`),
    fd = fs.openSync(file, 'w');
  const result = spawnSync(path.join(bin, `${name}.exe`), args, {
    env: cleanEnv,
    windowsHide: true,
    timeout: 60000,
    stdio: ['ignore', fd, fd],
  });
  fs.closeSync(fd);
  if (result.error || result.status !== 0)
    throw new Error(
      `${name}: ${result.error?.message || fs.readFileSync(file, 'utf8')}`,
    );
}
let db,
  pool,
  started = false;
async function main() {
  run('initdb', [
    '-D',
    path.join(folder, 'data'),
    '-U',
    'catalogue_test',
    '--auth=trust',
    '--encoding=UTF8',
    '--locale=C',
  ]);
  run('pg_ctl', [
    '-D',
    path.join(folder, 'data'),
    '-l',
    path.join(folder, 'server.log'),
    '-o',
    `-p ${port} -h 127.0.0.1`,
    '-w',
    'start',
  ]);
  started = true;
  const url = `postgresql://catalogue_test@127.0.0.1:${port}/postgres`;
  const schemaFile = path.join(folder, 'schema.sql');
  const schema = spawnSync(
    process.execPath,
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema',
      'prisma/schema.prisma',
      '--script',
    ],
    {
      cwd: root,
      env: { ...cleanEnv, DATABASE_URL: url },
      windowsHide: true,
      encoding: 'utf8',
      timeout: 60000,
    },
  );
  if (schema.status !== 0)
    throw new Error(schema.stderr || 'Prisma diff failed');
  fs.writeFileSync(schemaFile, schema.stdout);
  pool = new Pool({ connectionString: url, max: 5 });
  await pool.query(schema.stdout);
  const migration = fs.readFileSync(
    path.join(
      root,
      'prisma/migrations/20261024120000_catalogue_revision/migration.sql',
    ),
    'utf8',
  );
  await pool.query(migration);
  await pool.query(migration); // startup fallback is repeatable
  const workflow = fs.readFileSync(path.join(root, 'prisma/migrations/20261028150000_catalogue_review_workflow/migration.sql'), 'utf8');
  await pool.query(workflow); await pool.query(workflow);
  db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const service = new CatalogueRevisionsService(db);
  const category = await db.categorie.create({
    data: { nom: 'Composants Électroniques' },
  });
  const other = await db.categorie.create({ data: { nom: 'Outillage' } });
  const product = await db.produit.create({
    data: {
      categorieId: category.id,
      nomProduit: 'Test condensateur',
      prixDetail: 1500,
      prixDemiGros: 1200,
      prixGros: 1000,
      quantiteStock: 7,
    },
  });
  const actor = { id: randomUUID(), nom: 'Admin Test', role: 'ADMIN' };
  const employee = { id: randomUUID(), nom: 'Vendeur Test', role: 'VENDEUR' };
  const read = () =>
    db.produit.findUniqueOrThrow({ where: { id: product.id } });
  const req = (p, action, extra = {}) => ({
    operationId: randomUUID(),
    action,
    sujet: 'PRIX',
    prixRevision: p.prixRevision,
    classementRevision: p.classementRevision,
    commercialRevision: p.commercialRevision,
    identificationRevision: p.identificationRevision, photoRevision: p.photoRevision,
    ...extra,
  });
  const results = [];
  async function test(name, fn) {
    await fn();
    results.push(name);
    console.log(`PASS ${name}`);
  }
  await test('employee proposes without changing official price; staff cannot approve', async () => {
    const p = await read();
    const result = await service.mutate(
      p.id,
      req(p, 'PROPOSER', { changements: { prixDetail: 1400 } }),
      employee,
    );
    assert.equal((await read()).prixDetail, 1500);
    assert.equal((await service.list({ etat: 'PROPOSITIONS' })).total, 1);
    await assert.rejects(
      service.mutate(p.id, req(p, 'VALIDER'), employee),
      (e) => e.getStatus() === 403,
    );
    const op = req(p, 'ACCEPTER', { propositionId: result.propositionId });
    await service.mutate(p.id, op, actor);
    const changed = await read();
    assert.equal(changed.prixDetail, 1400);
    assert.equal(changed.prixVerifieRevision, changed.prixRevision);
    const replay = await service.mutate(p.id, op, actor);
    assert.equal(replay.operationId, op.operationId);
    assert.equal(
      await db.catalogueEvenement.count({
        where: { operationId: op.operationId },
      }),
      1,
    );
    await assert.rejects(
      service.mutate(p.id, { ...op, changements: { prixDetail: 1300 } }, actor),
      (e) => e.getStatus() === 409,
    );
    assert.equal((await service.list({ etat: 'VERIFIES' })).total, 0); // prices alone do not complete the sheet
  });
  await test('stock change does not conflict with price review; two price corrections cannot overwrite', async () => {
    const p = await read();
    await db.produit.update({
      where: { id: p.id },
      data: { quantiteStock: { increment: 1 }, version: { increment: 1 } },
    });
    const outcomes = await Promise.allSettled([
      service.mutate(
        p.id,
        req(p, 'VALIDER', { changements: { prixDetail: 1350 } }),
        actor,
      ),
      service.mutate(
        p.id,
        req(p, 'VALIDER', { changements: { prixDetail: 1300 } }),
        actor,
      ),
    ]);
    assert.equal(outcomes.filter((o) => o.status === 'fulfilled').length, 1);
    assert.equal(
      outcomes.find((o) => o.status === 'rejected').reason.getStatus(),
      409,
    );
    assert.equal((await read()).quantiteStock, 8);
  });
  await test('external SQL prices invalidate verification and pending proposals', async () => {
    const p = await read();
    await service.mutate(p.id, req(p, 'PROPOSER'), employee);
    await pool.query('UPDATE produit SET prix_detail=1600 WHERE id=$1', [p.id]);
    const changed = await read();
    assert.equal(changed.prixVerifieRevision, null);
    assert.equal(changed.prixRevision, p.prixRevision + 1);
    assert.equal(
      await db.catalogueProposition.count({
        where: { produitId: p.id, statut: 'EN_ATTENTE', sujet: 'PRIX' },
      }),
      0,
    );
  });
  await test('discussion and rejection preserve history and do not validate prices', async () => {
    const p = await read();
    const proposed = await service.mutate(
      p.id,
      req(p, 'DISCUTER', { commentaire: 'Prix inconnu' }),
      employee,
    );
    assert.equal((await service.list({ etat: 'A_DISCUTER' })).total, 1);
    await service.mutate(
      p.id,
      req(p, 'REFUSER', {
        propositionId: proposed.propositionId,
        commentaire: 'À vérifier en boutique',
      }),
      actor,
    );
    assert.equal((await read()).prixVerifieRevision, null);
    assert.equal((await service.list({ etat: 'A_VERIFIER' })).total, 1);
    assert.ok((await service.detail(p.id)).historique.length >= 5);
  });
  await test('classification is independent, enforces parent and prevents used subcategory deletion', async () => {
    const sub = await service.saveSubcategory(null, {
      categorieId: category.id,
      nom: 'Condensateurs',
    });
    const p = await read();
    await service.mutate(
      p.id,
      req(p, 'VALIDER', {
        sujet: 'CLASSEMENT',
        changements: { sousCategorieId: sub.id },
      }),
      actor,
    );
    const changed = await read();
    assert.equal(changed.prixRevision, p.prixRevision);
    assert.equal(changed.prixVerifieRevision, null);
    assert.equal(changed.classementVerifieRevision, changed.classementRevision);
    await assert.rejects(
      service.deleteSubcategory(sub.id),
      (e) => e.getStatus() === 409,
    );
    await assert.rejects(
      service.mutate(
        p.id,
        req(changed, 'VALIDER', {
          sujet: 'CLASSEMENT',
          changements: { categorieId: other.id },
        }),
        actor,
      ),
      (e) => e.getStatus() === 400,
    );
    await assert.rejects(
      pool.query('UPDATE produit SET id_categorie=$1 WHERE id=$2', [
        other.id,
        p.id,
      ]),
    );
    assert.equal((await service.list({ sousCategorieId: sub.id })).total, 1);
  });
  await test('public pricing SQL filters subcategories and keeps the parent category inclusive', async () => {
    const { publicCatalogue } = require('../dist/src/produit/public-catalogue');
    const p = await read();
    const sibling = await db.produit.create({ data: { categorieId: category.id, nomProduit: 'Autre composant de test', prixDetail: 2000 } });
    try {
      const filtered = await publicCatalogue(db, { categoryId: category.id, sousCategorieId: p.sousCategorieId }, new Date());
      assert.equal(filtered.meta.total, 1);
      assert.deepEqual(filtered.data.map(row => row.id), [p.id]);
      assert.equal(filtered.data[0].sousCategorie.nom, 'Condensateurs');
      const parent = await publicCatalogue(db, { categoryId: category.id }, new Date());
      assert.equal(parent.meta.total, 2);
      const wrongCandidate = await publicCatalogue(db, { sousCategorieId: p.sousCategorieId }, new Date(), [sibling.id]);
      assert.equal(wrongCandidate.meta.total, 0);
    } finally {
      await db.produit.delete({ where: { id: sibling.id } });
    }
  });
  await test('batch reports per-row conflict and validates successful row only', async () => {
    const p = await read();
    const items = [
      { ...req(p, 'VALIDER'), produitId: p.id },
      { ...req({ ...p, prixRevision: 1 }, 'VALIDER'), produitId: p.id },
    ];
    const result = await service.batch({ items }, actor);
    assert.equal(result.results[0].ok, true);
    assert.equal(result.results[1].ok, false);
    assert.equal(result.results[1].status, 409);
  });
  await test('HTTP authentication, role checks, DTO validation and no-store responses', async () => {
    require('tsconfig-paths').register({
      baseUrl: path.join(root, 'dist'),
      paths: { 'src/*': ['src/*'] },
    });
    const { Test } = require('@nestjs/testing');
    const { ValidationPipe } = require('@nestjs/common');
    const { ConfigService } = require('@nestjs/config');
    const { PassportModule } = require('@nestjs/passport');
    const { JwtService } = require('@nestjs/jwt');
    const request = require('supertest');
    const {
      DatabaseService,
    } = require('../dist/src/database/database.service');
    const {
      AdminJwtStrategy,
    } = require('../dist/src/admin-auth/admin-jwt.strategy');
    const {
      CatalogueRevisionsController,
    } = require('../dist/src/catalogue-revisions/catalogue-revisions.controller');
    const tokenService = new JwtService({
      secret: 'local-catalogue-tests-only',
    });
    const tokens = {};
    for (const role of [
      'ADMIN',
      'VENDEUR',
      'SUPER_ADMIN',
      'CAISSIER',
      'MANAGER',
    ]) {
      const account = await db.adminUser.create({
        data: { username: `test_${role}`, nom: role, role },
      });
      tokens[role] = tokenService.sign({
        sub: account.id,
        type: 'admin',
        sessionVersion: account.sessionVersion,
        role,
      });
    }
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({})],
      controllers: [CatalogueRevisionsController],
      providers: [
        { provide: require('../dist/src/cloudinary/cloudinary.service').CloudinaryService, useValue: { uploadBuffer: async () => 'https://example.com/uploaded.jpg' } },
        CatalogueRevisionsService,
        AdminJwtStrategy,
        { provide: DatabaseService, useValue: db },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_SECRET: 'local-catalogue-tests-only',
          }),
        },
      ],
    }).compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    try {
      await request(app.getHttpServer())
        .get('/catalogue-revisions')
        .expect(401);
      for (const role of Object.keys(tokens)) {
        const response = await request(app.getHttpServer())
          .get('/catalogue-revisions')
          .set('Authorization', `Bearer ${tokens[role]}`)
          .expect(200);
        assert.equal(response.headers['cache-control'], 'no-store');
      }
      await request(app.getHttpServer())
        .post('/catalogue-revisions/sous-categories')
        .set('Authorization', `Bearer ${tokens.VENDEUR}`)
        .send({ categorieId: category.id, nom: 'Interdit' })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/catalogue-revisions/produits/${product.id}/actions`)
        .set('Authorization', `Bearer ${tokens.ADMIN}`)
        .send({ action: 'VALIDER' })
        .expect(400);
      await request(app.getHttpServer())
        .post(`/catalogue-revisions/produits/${product.id}/actions`)
        .set('Authorization', `Bearer ${tokens.VENDEUR}`)
        .send(req(await read(), 'VALIDER'))
        .expect(403);
      const response = await request(app.getHttpServer())
        .post(`/catalogue-revisions/produits/${product.id}/actions`)
        .set('Authorization', `Bearer ${tokens.ADMIN}`)
        .send(req(await read(), 'VALIDER'))
        .expect(201);
      assert.equal(
        response.body.produit.prixVerifieRevision,
        response.body.produit.prixRevision,
      );
    } finally {
      await app.close();
    }
  });
  await test('regular product form also enforces expected price revision', async () => {
    const { ProduitService } = require('../dist/src/produit/produit.service');
    const regular = new ProduitService(
      db,
      { create: async () => ({}) },
      {},
      {},
    );
    const p = await read();
    await regular.update(
      p.id,
      { prixDetail: 1650, prixRevisionAttendue: p.prixRevision },
      actor,
    );
    assert.equal((await read()).prixDetail, 1650);
    assert.equal((await read()).prixVerifieRevision, null);
    await assert.rejects(
      regular.update(
        p.id,
        { prixDetail: 1300, prixRevisionAttendue: p.prixRevision },
        actor,
      ),
      (e) => e.getStatus() === 409,
    );
    await assert.rejects(
      regular.update(p.id, { prixDetail: 1300 }, actor),
      (e) => e.getStatus() === 409,
    );
  });
  await test('name proposals preserve price validation, acceptance is durable and retry-safe', async () => {
    const p = await read();
    const proposal = await service.mutate(p.id, req(p, 'PROPOSER', { sujet: 'IDENTIFICATION', changements: { nomProduit: 'Condensateur corrigé 1000 µF', referenceFabricant: '1000UF-25V' } }), employee);
    assert.equal((await read()).nomProduit, p.nomProduit);
    const operation = req(p, 'ACCEPTER', { sujet: 'IDENTIFICATION', propositionId: proposal.propositionId });
    await service.mutate(p.id, operation, actor); await service.mutate(p.id, operation, actor);
    const after = await read();
    assert.equal(after.nomProduit, 'Condensateur corrigé 1000 µF');
    assert.equal(after.identificationVerifieRevision, after.identificationRevision);
    assert.equal(after.prixVerifieRevision, p.prixVerifieRevision);
    assert.equal(after.prixRevision, p.prixRevision);
    const history = await service.detail(p.id);
    assert(history.historique.some(event => event.avant.nomProduit === p.nomProduit && event.apres.nomProduit === after.nomProduit));
  });
  await test('two name corrections conflict; stock and price changes do not conflict with identification', async () => {
    const p = await read();
    await pool.query('UPDATE produit SET quantite_stock=quantite_stock, prix_detail=prix_detail+1 WHERE id=$1', [p.id]);
    await service.mutate(p.id, req(p, 'VALIDER', { sujet: 'IDENTIFICATION', changements: { nomProduit: 'Nom actualisé' } }), actor);
    await assert.rejects(service.mutate(p.id, req(p, 'VALIDER', { sujet: 'IDENTIFICATION', changements: { nomProduit: 'Nom dépassé' } }), actor), error => error.getStatus() === 409);
    assert.equal((await read()).nomProduit, 'Nom actualisé');
  });
  await test('full review validates four subjects, photos remain proposals until accepted', async () => {
    let p = await read();
    const proposal = await service.mutate(p.id, req(p, 'PROPOSER', { sujet: 'PHOTO', changements: { imageUrl: 'https://example.com/replacement.jpg' } }), employee);
    assert.notEqual((await read()).imageUrl, 'https://example.com/replacement.jpg');
    await service.mutate(p.id, req(p, 'ACCEPTER', { sujet: 'PHOTO', propositionId: proposal.propositionId }), actor);
    p = await read();
    await service.mutate(p.id, req(p, 'VALIDER', { sujet: 'COMPLET' }), actor);
    const complete = await read();
    for (const prefix of ['prix', 'classement', 'identification', 'photo']) assert.equal(complete[prefix+'VerifieRevision'], complete[prefix+'Revision']);
    assert.equal((await service.list({ etat: 'VERIFIES' })).total, 1);
    const summary = await service.overview();
    assert.equal(summary.total.complete, 1);
    assert.equal(summary['categorie:'+category.id].complete, 1);
    assert.equal(summary['sous:'+complete.sousCategorieId+':'+category.id].total, 1);
    assert.equal((await service.list({ etat: 'TOUS' })).total, 1);
    await service.presence(p.id, employee);
    assert.equal((await service.detail(p.id)).presence[0].auteurId, employee.id);
    await service.presence(p.id, employee, true);
    assert.equal((await service.detail(p.id)).presence.length, 0);
  });
  await test('external identification and photo changes invalidate only concerned controls', async () => {
    const p = await read();
    await service.mutate(p.id, req(p, 'PROPOSER', { sujet: 'COMPLET' }), employee);
    await service.mutate(p.id, req(p, 'VALIDER'), actor); // unchanged prices do not dismiss a full proposal
    assert.equal(await db.catalogueProposition.count({ where: { produitId: p.id, sujet: 'COMPLET', statut: 'EN_ATTENTE' } }), 1);
    await pool.query('UPDATE produit SET nom_produit=$2 WHERE id=$1', [p.id, 'Correction externe']);
    let changed = await read();
    assert.equal(changed.identificationVerifieRevision, null);
    assert.equal(changed.prixVerifieRevision, p.prixVerifieRevision);
    assert.equal(changed.photoVerifieRevision, p.photoVerifieRevision);
    assert.equal(await db.catalogueProposition.count({ where: { produitId: p.id, sujet: 'COMPLET', statut: 'EN_ATTENTE' } }), 0);
    await pool.query('UPDATE produit SET image_url=$2 WHERE id=$1', [p.id, 'https://example.com/external.jpg']);
    changed = await read();
    assert.equal(changed.photoVerifieRevision, null);
    assert.equal(changed.classementVerifieRevision, p.classementVerifieRevision);
    assert.equal((await service.list({ etat: 'A_VERIFIER' })).total, 1);
    const rejected = await service.mutate(p.id, req(changed, 'PROPOSER', { sujet: 'IDENTIFICATION', changements: { nomProduit: 'Nom refusé' } }), employee);
    await service.mutate(p.id, req(changed, 'REFUSER', { sujet: 'IDENTIFICATION', propositionId: rejected.propositionId }), actor);
    assert.equal((await read()).nomProduit, 'Correction externe');
  });
  await test('archiving preserves stock and product history and blocks further reviews', async () => {
    const p = await read();
    await service.mutate(
      p.id,
      req(p, 'ARCHIVER', { sujet: 'ARCHIVAGE' }),
      actor,
    );
    const changed = await read();
    assert.equal(changed.estActif, false);
    assert.equal(changed.quantiteStock, 8);
    assert.equal((await service.list()).total, 0);
    await assert.rejects(
      service.mutate(p.id, req(changed, 'VALIDER'), actor),
      (e) => e.getStatus() === 400,
    );
    assert.ok((await service.detail(p.id)).historique.length > 0);
  });
  await test('validation cannot bypass price checks by sending a discussion type', async () => {
    const p = await db.produit.create({ data: { categorieId: category.id, nomProduit: 'Prix invalide', prixDetail: 1000 } });
    await assert.rejects(service.mutate(p.id, req(p, 'VALIDER', { type: 'DISCUSSION', commentaire: 'Test', changements: { prixDetail: 0 } }), actor), e => e.getStatus() === 400);
  });
  fs.writeFileSync(
    path.join(folder, 'results.json'),
    JSON.stringify(
      { passed: results.length, results, productionConnections: 0 },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: results.length,
      report: path.join(folder, 'results.json'),
    }),
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (db) await db.$disconnect();
    if (pool) await pool.end();
    if (started)
      run('pg_ctl', [
        '-D',
        path.join(folder, 'data'),
        '-m',
        'fast',
        '-w',
        'stop',
      ]);
  });
