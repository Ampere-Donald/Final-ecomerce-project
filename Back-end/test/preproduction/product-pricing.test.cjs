// Run after npm run build, against a disposable local database with the Prisma schema.
// PRICING_REHEARSAL_DATABASE_URL=postgresql://.../pricing_rehearsal... node --test test/preproduction/product-pricing.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
require('reflect-metadata');

const databaseUrl = process.env.PRICING_REHEARSAL_DATABASE_URL;
test('initial pricing HTTP flow with real PostgreSQL: staff, validation, concurrency and rollback', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only a local database is allowed');
  assert.match(url.pathname, /^\/pricing_rehearsal[\w-]*$/, 'Use a dedicated disposable pricing database');
  process.env.DATABASE_URL = databaseUrl;
  const { Test } = require('@nestjs/testing');
  const { ValidationPipe, UnauthorizedException } = require('@nestjs/common');
  const request = require('supertest');
  const { DatabaseService } = require('../../dist/src/database/database.service');
  const { ProductPricingService, PRICING_STAFF_ROLES } = require('../../dist/src/produit/product-pricing.service');
  const { ProductPricingController } = require('../../dist/src/produit/product-pricing.controller');
  const { AdminAuthGuard } = require('../../dist/src/admin-auth/admin-auth.guard');
  const { RolesGuard } = require('../../dist/src/admin-auth/roles.guard');
  const actors = new Map();
  const module = await Test.createTestingModule({
    controllers: [ProductPricingController],
    providers: [DatabaseService, ProductPricingService, RolesGuard],
  }).overrideGuard(AdminAuthGuard).useValue({
    // Local transport authentication only. RolesGuard, DTOs, controller, service and DB are real.
    canActivate(context) {
      const req = context.switchToHttp().getRequest();
      req.user = actors.get(req.headers['x-rehearsal-actor']);
      if (!req.user) throw new UnauthorizedException();
      return true;
    },
  }).compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();
  const db = app.get(DatabaseService);
  const http = app.getHttpServer();
  const token = randomUUID().slice(0, 8);
  const category = await db.categorie.create({ data: { nom: `Pricing rehearsal ${token}` } });
  const makeProduct = (suffix, extra = {}) => db.produit.create({ data: {
    categorieId: category.id, nomProduit: `Rehearsal ${token} ${suffix}`, quantiteStock: 10,
    ...extra,
  } });
  try {
    await request(http).get('/api/catalogue-pricing').expect(401);
    for (const role of PRICING_STAFF_ROLES) {
      const actor = await db.adminUser.create({ data: { nom: `Rehearsal ${token} ${role}`, role } });
      actors.set(role, actor);
      const product = await makeProduct(role);
      await request(http).patch(`/api/catalogue-pricing/${product.id}`).set('x-rehearsal-actor', role)
        .send({ prixDetail: 1500, version: 1, estActif: false, quantiteStock: 999 }).expect(200);
      const stored = await db.produit.findUniqueOrThrow({ where: { id: product.id } });
      assert.equal(stored.prixDetail, 1500);
      assert.equal(stored.version, 2);
      assert.equal(stored.estActif, true, 'Unknown publication fields must be stripped');
      assert.equal(stored.quantiteStock, 10, 'Unknown stock fields must be stripped');
      await request(http).patch(`/api/catalogue-pricing/${product.id}`).set('x-rehearsal-actor', role)
        .send({ prixDetail: 2000, version: 2 }).expect(409);
      const list = await request(http).get('/api/catalogue-pricing').query({ categoryId: category.id })
        .set('x-rehearsal-actor', role).expect(200);
      assert.ok(!list.body.data.some((item) => item.id === product.id), 'Saved products must leave the queue');
    }
    const draft = await makeProduct('draft', { estActif: false, prixDemiGros: 1000 });
    for (const invalid of [0, -1, 1.5, '1500', 1_000_000_001]) {
      await request(http).patch(`/api/catalogue-pricing/${draft.id}`).set('x-rehearsal-actor', 'VENDEUR')
        .send({ prixDetail: invalid, version: 1 }).expect(400);
    }
    await request(http).patch(`/api/catalogue-pricing/${draft.id}`).set('x-rehearsal-actor', 'VENDEUR')
      .send({ prixDetail: 1500, prixDemiGros: 900, version: 1 }).expect(409);
    await request(http).patch(`/api/catalogue-pricing/${draft.id}`).set('x-rehearsal-actor', 'VENDEUR')
      .send({ prixDetail: 1500, version: 1 }).expect(200);
    const storedDraft = await db.produit.findUniqueOrThrow({ where: { id: draft.id } });
    assert.equal(storedDraft.estActif, false, 'Pricing never publishes drafts');
    assert.equal(storedDraft.prixDemiGros, 1000, 'Existing tiers must be kept');

    const concurrent = await makeProduct('concurrent');
    const race = await Promise.all(['VENDEUR', 'CAISSIER'].map((role, index) =>
      request(http).patch(`/api/catalogue-pricing/${concurrent.id}`).set('x-rehearsal-actor', role)
        .send({ prixDetail: 1700 + index * 100, version: 1 })));
    assert.deepEqual(race.map((response) => response.status).sort(), [200, 409]);
    const audits = await db.activityLog.findMany({ where: {
      action: 'INITIAL_PRODUCT_PRICE_SET', details: { path: ['productId'], equals: concurrent.id },
    } });
    assert.equal(audits.length, 1, 'Only the winning transaction writes an audit');

    const rollback = await makeProduct('rollback');
    actors.set('invalid-audit-author', { id: randomUUID(), nom: 'Missing author', role: 'ADMIN' });
    await request(http).patch(`/api/catalogue-pricing/${rollback.id}`).set('x-rehearsal-actor', 'invalid-audit-author')
      .send({ prixDetail: 1500, version: 1 }).expect(500);
    const unchanged = await db.produit.findUniqueOrThrow({ where: { id: rollback.id } });
    assert.equal(unchanged.prixDetail, null, 'Audit failure must roll back the price');
    assert.equal(unchanged.version, 1);
    const list = await request(http).get('/api/catalogue-pricing').query({ categoryId: category.id })
      .set('x-rehearsal-actor', 'CAISSIER').expect(200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.data[0].id, rollback.id);
    assert.ok(!Object.hasOwn(list.body.data[0], 'cmupActuel'), 'Purchase costs are never exposed');
    assert.ok(list.body.recentActivity.some((activity) => activity.productId === concurrent.id && activity.author));
  } finally {
    await app.close();
  }
});
