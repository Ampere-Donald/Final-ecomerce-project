// Local, isolated fixtures only; no .env, messages, stock changes or real orders.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const connectionString = process.env.NEWOTEG_REVIEWS_TEST_DATABASE_URL;
if (!connectionString) throw Error('Explicit isolated database URL required');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error('Refusing database outside dedicated local fixture cluster');
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { Pool } = require('pg'),
  { PrismaClient } = require('@prisma/client'),
  { PrismaPg } = require('@prisma/adapter-pg');
const { Test } = require('@nestjs/testing'),
  { ValidationPipe } = require('@nestjs/common');
const { PassportModule } = require('@nestjs/passport'),
  { JwtModule, JwtService } = require('@nestjs/jwt'),
  { ConfigService } = require('@nestjs/config');
const root = '../dist/src/';
const { DatabaseService } = require(root + 'database/database.service');
const { JwtStrategy } = require(root + 'auth/jwt.strategy'),
  { AdminJwtStrategy } = require(root + 'admin-auth/admin-jwt.strategy');
const { AvisService } = require(root + 'avis/avis.service'),
  { AvisController } = require(root + 'avis/avis.controller');
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const service = new AvisService(db),
  orders = [],
  clients = [],
  admins = [],
  reviews = [],
  checks = [];
let product, category, app, jwt, base;
const body = (id) => ({
  requestId: randomUUID(),
  ligneCommandeId: id,
  note: 1,
  texte: 'Ce câble ne convient pas à mon montage, je regrette cet achat.',
  pseudonyme: 'Maker test',
  projetRealise: 'Prototype fictif',
});
function ok(name) {
  checks.push(name);
  console.log('PASS ' + name);
}
async function fixture(
  statut = 'LIVREE',
  owner = clients[0].id,
  dateLivraison = new Date(),
) {
  const order = await db.commande.create({
    data: {
      numeroSuivi: 'AVIS-' + randomUUID().slice(0, 18),
      nomClient: 'IDENTITE NON PUBLIQUE',
      telephone: '600000000',
      adresseLivraison: 'ADRESSE NON PUBLIQUE',
      montantTotal: 200,
      statut,
      dateLivraison,
      clientId: owner,
      lignes: {
        create: [1, 2].map(() => ({
          produitId: product.id,
          nomProduit: product.nomProduit,
          quantite: 1,
          prixUnitaire: 100,
          sousTotal: 100,
        })),
      },
    },
    include: { lignes: true },
  });
  orders.push(order.id);
  return order;
}
async function create(client, dto) {
  const result = await service.create(client, dto);
  reviews.push(result.id);
  return result;
}
async function http(route, token, payload) {
  const response = await fetch(base + '/api/avis' + route, {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  };
}
const adminToken = (a) =>
  jwt.sign({
    sub: a.id,
    type: 'admin',
    role: 'SUPER_ADMIN',
    sessionVersion: a.sessionVersion,
  });
const clientToken = (c) => jwt.sign({ sub: c.id, type: 'client' });
(async () => {
  try {
    const exists = await pool.query(
      "SELECT to_regclass('public.avis_produit') AS name",
    );
    if (!exists.rows[0].name) {
      if (process.env.NEWOTEG_REVIEWS_APPLY_SCHEMA !== 'true')
        throw Error('Explicit isolated schema apply flag required');
      const sql = fs.readFileSync(
        path.join(
          __dirname,
          '../prisma/migrations/20261003130000_verified_reviews/migration.sql',
        ),
        'utf8',
      );
      assert.ok(!/^\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/im.test(sql));
      await pool.query(sql);
    }
    category = await db.categorie.create({
      data: { nom: 'Recette avis ' + randomUUID() },
    });
    product = await db.produit.create({
      data: {
        categorieId: category.id,
        nomProduit: 'Article fictif pour avis',
        prixDetail: 100,
        quantiteStock: 5,
      },
    });
    for (let i = 0; i < 2; i++)
      clients.push(
        await db.client.create({
          data: {
            nom: 'Client avis fictif',
            email: randomUUID() + '@example.invalid',
          },
        }),
      );
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'VENDEUR', 'CAISSIER'])
      admins.push(
        await db.adminUser.create({
          data: {
            nom: 'Recette avis ' + role,
            username: 'avis-' + randomUUID().slice(0, 12),
            role,
            sessionVersion: 1,
          },
        }),
      );
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      controllers: [AvisController],
      providers: [
        JwtStrategy,
        AdminJwtStrategy,
        { provide: DatabaseService, useValue: db },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => process.env.JWT_SECRET },
        },
        { provide: AvisService, useValue: service },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    base = 'http://127.0.0.1:' + app.getHttpServer().address().port;
    jwt = module.get(JwtService);
    const empty = await service.publicList(product.id);
    assert.equal(empty.total, 0);
    assert.equal(empty.moyenne, null);
    assert.deepEqual(empty.items, []);
    ok('Empty product rating is null, no invented reviews');

    const delivered = await fixture(),
      dto = body(delivered.lignes[0].id);
    assert.equal((await http('', undefined, dto)).status, 401);
    assert.equal((await http('', clientToken(clients[1]), dto)).status, 404);
    assert.equal(
      (await http('/commandes/' + delivered.id, clientToken(clients[1])))
        .status,
      404,
    );
    assert.equal(
      (await http('', clientToken(clients[0]), { ...dto, note: 0 })).status,
      400,
    );
    assert.equal(
      (await http('', clientToken(clients[0]), { ...dto, note: '5' })).status,
      400,
    );
    for (const order of [
      await fixture('EN_ATTENTE'),
      await fixture('EN_LIVRAISON'),
      await fixture('ANNULEE'),
      await fixture('LIVREE', clients[0].id, null),
    ])
      await assert.rejects(
        service.create(clients[0].id, body(order.lignes[0].id)),
        (e) => e.getStatus?.() === 409,
      );
    const guestOrder = await fixture('LIVREE', null);
    await assert.rejects(
      service.create(clients[0].id, body(guestOrder.lignes[0].id)),
      (e) => e.getStatus?.() === 404,
    );
    ok(
      'Owner, authentication and actual received status/date required; guest read access insufficient',
    );

    const results = await Promise.all([
      create(clients[0].id, dto),
      create(clients[0].id, dto),
    ]);
    assert.deepEqual(results[0], results[1]);
    assert.equal(
      await db.avisProduit.count({
        where: { ligneCommandeId: dto.ligneCommandeId },
      }),
      1,
    );
    assert.equal(
      (await http('', clientToken(clients[0]), dto)).data.id,
      results[0].id,
    );
    await assert.rejects(
      service.create(clients[0].id, { ...dto, note: 5 }),
      (e) => e.getStatus?.() === 409,
    );
    await assert.rejects(
      service.create(clients[0].id, { ...dto, requestId: randomUUID() }),
      (e) => e.getStatus?.() === 409,
    );
    const second = await create(clients[0].id, body(delivered.lignes[1].id));
    assert.notEqual(second.id, results[0].id);
    assert.equal((await service.publicList(product.id)).total, 0);
    ok(
      'One review per purchased line, concurrent replay, lost-response retry, pending remains private',
    );

    for (const token of [
      undefined,
      clientToken(clients[0]),
      ...admins.slice(2).map(adminToken),
    ]) {
      const read = await http('/admin', token);
      assert.ok([401, 403].includes(read.status));
      assert.ok(
        [401, 403].includes(
          (
            await http('/admin/' + second.id + '/moderation', token, {
              requestId: randomUUID(),
              expectedVersion: 1,
              action: 'PUBLIER',
            })
          ).status,
        ),
      );
    }
    assert.equal((await http('/admin', adminToken(admins[0]))).status, 200);
    assert.equal((await http('/admin', adminToken(admins[1]))).status, 200);
    const adminRoute = '/admin/' + results[0].id + '/moderation';
    assert.equal(
      (
        await http(adminRoute, adminToken(admins[0]), {
          requestId: randomUUID(),
          expectedVersion: 1,
          action: 'REFUSER',
          motif: 'NOTE_NEGATIVE',
        })
      ).status,
      400,
    );
    ok(
      'Database admin roles enforced; negative score is not a rejection reason',
    );

    const publish = {
      requestId: randomUUID(),
      expectedVersion: 1,
      action: 'PUBLIER',
    };
    const published = await http(adminRoute, adminToken(admins[0]), publish);
    assert.equal(published.status, 200);
    assert.deepEqual(
      (await http(adminRoute, adminToken(admins[0]), publish)).data,
      published.data,
    );
    assert.equal(
      await db.avisModeration.count({ where: { avisId: results[0].id } }),
      1,
    );
    const negative = await service.publicList(product.id);
    assert.equal(negative.total, 1);
    assert.equal(negative.moyenne, 1);
    assert.equal(negative.items[0].achatVerifie, true);
    for (const forbidden of [
      'ligneCommandeId',
      'requestId',
      'fingerprint',
      'clientId',
      'telephone',
      'adresseLivraison',
      'nomClient',
      'acteurId',
      'motif',
      'statut',
      'version',
    ])
      assert.ok(!JSON.stringify(negative).includes('"' + forbidden + '"'));
    const response = await http('/produits/' + product.id);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(
      (await http('/produits/' + product.id + '?limit=31')).status,
      400,
    );
    assert.equal(
      (await http('/produits/' + product.id + '?page=-1')).status,
      400,
    );
    ok(
      'Negative review publishes normally, exact minimal public projection and bounded pagination',
    );

    const stale = await http(adminRoute, adminToken(admins[0]), {
      requestId: randomUUID(),
      expectedVersion: 1,
      action: 'REFUSER',
      motif: 'SPAM',
    });
    assert.equal(stale.status, 409);
    const reply = await service.moderate(admins[0].id, results[0].id, {
      requestId: randomUUID(),
      expectedVersion: 2,
      action: 'REPONDRE',
      reponse: 'Contactez-nous pour vérifier le câble adapté à votre montage.',
    });
    assert.equal(reply.version, 3);
    assert.ok((await service.publicList(product.id)).items[0].reponseBoutique);
    ok(
      'Stale moderation refused and shop reply appears only with a published review',
    );

    const one = await service.report(clients[1].id, results[0].id, {
      motif: 'HORS_SUJET',
    });
    assert.deepEqual(
      await service.report(clients[1].id, results[0].id, { motif: 'SPAM' }),
      one,
    );
    assert.equal(
      await db.avisSignalement.count({ where: { avisId: results[0].id } }),
      1,
    );
    assert.equal((await service.publicList(product.id)).total, 1);
    assert.equal(
      (await service.adminList('PUBLIE'))[0].signalements[0].motif,
      'HORS_SUJET',
    );
    ok(
      'Reports deduplicate and preserve publication until a moderator decides',
    );

    const concurrent = await Promise.allSettled([
      service.moderate(admins[0].id, second.id, {
        requestId: randomUUID(),
        expectedVersion: 1,
        action: 'PUBLIER',
      }),
      service.moderate(admins[1].id, second.id, {
        requestId: randomUUID(),
        expectedVersion: 1,
        action: 'REFUSER',
        motif: 'SPAM',
      }),
    ]);
    assert.equal(concurrent.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      concurrent.find((r) => r.status === 'rejected').reason.getStatus(),
      409,
    );
    assert.equal(
      await db.avisModeration.count({ where: { avisId: second.id } }),
      1,
    );
    ok('Concurrent moderators cannot overwrite the same observed version');

    const rollbackOrder = await fixture(),
      rollbackReview = await create(
        clients[0].id,
        body(rollbackOrder.lignes[0].id),
      );
    const failingDb = new Proxy(db, {
      get(target, property) {
        if (property === '$transaction')
          return (callback) =>
            target.$transaction((tx) =>
              callback(
                new Proxy(tx, {
                  get(t, p) {
                    if (p === 'avisModeration')
                      return {
                        findUnique: t.avisModeration.findUnique.bind(
                          t.avisModeration,
                        ),
                        create: async () => {
                          throw Error('Injected audit failure');
                        },
                      };
                    const value = t[p];
                    return typeof value === 'function' ? value.bind(t) : value;
                  },
                }),
              ),
            );
        const value = target[property];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await assert.rejects(
      new AvisService(failingDb).moderate(admins[0].id, rollbackReview.id, {
        requestId: randomUUID(),
        expectedVersion: 1,
        action: 'PUBLIER',
      }),
      /Injected audit failure/,
    );
    assert.equal(
      (await db.avisProduit.findUnique({ where: { id: rollbackReview.id } }))
        .statut,
      'EN_ATTENTE',
    );
    assert.equal(
      await db.avisModeration.count({ where: { avisId: rollbackReview.id } }),
      0,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock,
      5,
    );
    ok(
      'Audit failure rolls back publication; no stock, order status or external side effects',
    );
    const raceOrder = await fixture();
    let release, seen;
    const ready = new Promise((resolve) => {
        seen = resolve;
      }),
      gate = new Promise((resolve) => {
        release = resolve;
      });
    const pausedDb = new Proxy(db, {
      get(target, property) {
        if (property === '$transaction')
          return (callback) =>
            target.$transaction((tx) =>
              callback(
                new Proxy(tx, {
                  get(t, p) {
                    if (p === 'ligneCommande')
                      return {
                        findUnique: async (args) => {
                          const value = await t.ligneCommande.findUnique(args);
                          seen();
                          await gate;
                          return value;
                        },
                      };
                    const value = t[p];
                    return typeof value === 'function' ? value.bind(t) : value;
                  },
                }),
              ),
            );
        const value = target[property];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const attempt = new AvisService(pausedDb).create(
      clients[0].id,
      body(raceOrder.lignes[0].id),
    );
    const refused = assert.rejects(attempt, (e) => e.getStatus?.() === 404);
    await ready;
    await db.commande.update({
      where: { id: raceOrder.id },
      data: { clientId: clients[1].id, version: { increment: 1 } },
    });
    release();
    await refused;
    assert.equal(
      await db.avisProduit.count({
        where: { ligne: { commandeId: raceOrder.id } },
      }),
      0,
    );
    ok(
      'Ownership changed between initial lookup and lock cannot authorize a review',
    );

    const globalOrder = await fixture();
    const globalReviews = await Promise.all(
      globalOrder.lignes.map((line) => create(clients[0].id, body(line.id))),
    );
    const sharedRequest = randomUUID();
    const collision = await Promise.allSettled(
      globalReviews.map((review) =>
        service.moderate(admins[0].id, review.id, {
          requestId: sharedRequest,
          expectedVersion: 1,
          action: 'PUBLIER',
        }),
      ),
    );
    assert.equal(collision.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(
      collision.find((r) => r.status === 'rejected').reason.getStatus(),
      409,
    );
    assert.equal(
      await db.avisModeration.count({ where: { requestId: sharedRequest } }),
      1,
    );
    assert.equal(
      await db.avisProduit.count({
        where: { id: { in: globalReviews.map((r) => r.id) }, statut: 'PUBLIE' },
      }),
      1,
    );
    ok(
      'Reusing one moderation attempt across different reviews rolls back the losing change',
    );

    const output =
      'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/reviews-server/result.json';
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(
      output,
      JSON.stringify(
        {
          success: true,
          checks,
          database: 'isolated local fixtures only',
          limits: [
            'account API foundation only',
            'guest proof, media, client/admin UI and metrics still to deliver',
          ],
          externalRequests: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    if (app) await app.close();
    const scope = { avis: { ligne: { commandeId: { in: orders } } } };
    await db.avisSignalement.deleteMany({ where: scope });
    await db.avisModeration.deleteMany({ where: scope });
    await db.avisProduit.deleteMany({
      where: { ligne: { commandeId: { in: orders } } },
    });
    await db.commande.deleteMany({ where: { id: { in: orders } } });
    await db.client.deleteMany({
      where: { id: { in: clients.map((c) => c.id) } },
    });
    await db.adminUser.deleteMany({
      where: { id: { in: admins.map((a) => a.id) } },
    });
    if (product) await db.produit.delete({ where: { id: product.id } });
    if (category) await db.categorie.delete({ where: { id: category.id } });
    await db.$disconnect();
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
