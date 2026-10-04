// Real isolated Nest/JWT/PostgreSQL fixture recipe. No .env or external API.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const connectionString = process.env.NEWOTEG_PARCOURS_TEST_DATABASE_URL;
if (!connectionString) throw Error('Explicit isolated database required');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error('Refusing database outside local fixture cluster');
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.PARCOURS_METRICS_ENABLED = 'true';
const { Pool } = require('pg'),
  { PrismaClient } = require('@prisma/client'),
  { PrismaPg } = require('@prisma/adapter-pg');
const { Test } = require('@nestjs/testing'),
  { ValidationPipe } = require('@nestjs/common');
const { PassportModule } = require('@nestjs/passport'),
  { JwtModule, JwtService } = require('@nestjs/jwt'),
  { ConfigService } = require('@nestjs/config');
const { DatabaseService } = require('../dist/src/database/database.service');
const {
  AdminJwtStrategy,
} = require('../dist/src/admin-auth/admin-jwt.strategy');
const { ParcoursService } = require('../dist/src/parcours/parcours.service');
const {
  ParcoursController,
} = require('../dist/src/parcours/parcours.controller');
const pool = new Pool({ connectionString }),
  db = new PrismaClient({ adapter: new PrismaPg(pool) });
const service = new ParcoursService(db),
  checks = [],
  orders = [],
  requests = [],
  admins = [],
  receiptIds = [],
  browserEvents = [];
let app, client, demande, base;
const dayMs = 86400000,
  now = new Date(),
  today = new Date(
    new Date(now.getTime() + 3600000).toISOString().slice(0, 10) + 'T00:00:00Z',
  ),
  day = today.toISOString().slice(0, 10),
  yesterday = new Date(today.getTime() - dayMs).toISOString().slice(0, 10),
  start = new Date(today.getTime() - 3600000);
const event = (extra = {}) => {
  const id = randomUUID();
  receiptIds.push(id);
  return {
    id,
    jour: day,
    evenement: 'FICHE_OUVERTE',
    langue: 'en',
    appareil: 'tablette',
    reception: 'GENERAL',
    ...extra,
  };
};
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
async function http(route, token, payload) {
  const post = payload !== undefined;
  const r = await fetch(base + '/api/parcours/' + route, {
    method: post ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(post ? { body: JSON.stringify(payload) } : {}),
  });
  return { status: r.status, data: await r.json(), headers: r.headers };
}
async function fixture(
  dateCommande = start,
  modeReception = 'LIVRAISON',
  received = true,
  web = true,
) {
  const o = await db.commande.create({
    data: {
      numeroSuivi: 'MESURE-' + randomUUID().slice(0, 18),
      nomClient: 'Synthetic private identity',
      telephone: '600000000',
      adresseLivraison: 'Synthetic private address',
      montantTotal: 100,
      dateCommande,
      modeReception,
      statut: received ? 'LIVREE' : 'EN_ATTENTE',
      dateLivraison: received ? start : null,
    },
  });
  orders.push(o.id);
  if (web)
    for (let i = 0; i < 2; i++) {
      const requestId = randomUUID();
      requests.push(requestId);
      await db.commandeRequest.create({
        data: { requestId, fingerprint: 'a'.repeat(64), commandeId: o.id },
      });
    }
  return o;
}
(async () => {
  try {
    if (
      !(await pool.query("SELECT to_regclass('public.parcours_jour') AS name"))
        .rows[0].name
    ) {
      if (process.env.NEWOTEG_PARCOURS_APPLY_SCHEMA !== 'true')
        throw Error('Explicit local schema apply required');
      await pool.query(
        fs.readFileSync(
          path.join(
            __dirname,
            '../prisma/migrations/20261004100000_journey_metrics/migration.sql',
          ),
          'utf8',
        ),
      );
    }
    // This collector is not running elsewhere: refuse to erase another recipe's observations.
    assert.equal(
      await db.parcoursJour.count(),
      0,
      'Fixture metrics table must be empty',
    );
    assert.equal(
      await db.parcoursRecu.count(),
      0,
      'Fixture receipts table must be empty',
    );
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'VENDEUR'])
      admins.push(
        await db.adminUser.create({
          data: {
            nom: 'Metrics fixture',
            username: 'metrics-' + randomUUID().slice(0, 12),
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
      controllers: [ParcoursController],
      providers: [
        AdminJwtStrategy,
        { provide: DatabaseService, useValue: db },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => process.env.JWT_SECRET },
        },
        { provide: ParcoursService, useValue: service },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    base = 'http://127.0.0.1:' + app.getHttpServer().address().port;
    const jwt = module.get(JwtService),
      token = (a) =>
        jwt.sign({
          sub: a.id,
          type: 'admin',
          role: 'SUPER_ADMIN',
          sessionVersion: a.sessionVersion,
        });
    process.env.PARCOURS_METRICS_ENABLED = 'false';
    assert.equal(
      (await http('evenements', null, { evenements: [event()] })).data
        .enregistre,
      false,
    );
    assert.equal(await db.parcoursRecu.count(), 0);
    process.env.PARCOURS_METRICS_ENABLED = 'true';
    for (const payload of [null, [], {}, { evenements: [null] }])
      assert.equal((await http('evenements', null, payload)).status, 400);
    for (const e of [
      { ...event(), query: 'private@example.invalid' },
      { ...event(), accessToken: randomBytes(32).toString('base64url') },
      event({ evenement: 'COMMANDE_ENREGISTREE' }),
      event({ reception: 'LIVRAISON_CALCULEE' }),
      event({ jour: '2000-01-01' }),
    ])
      assert.equal(
        (await http('evenements', null, { evenements: [e] })).status,
        400,
      );
    assert.equal(
      (
        await http('evenements', null, {
          evenements: [event()],
          email: 'private@example.invalid',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await http('evenements', null, {
          evenements: Array.from({ length: 21 }, () => event()),
        })
      ).status,
      400,
    );
    assert.equal(await db.parcoursRecu.count(), 0);
    ok(
      'Disabled collector writes nothing; strict nested DTO rejects free query/token/contact, invented sales and oversized batch',
    );
    const one = event(),
      batch = { evenements: [one, one] };
    const results = await Promise.all([
      http('evenements', null, batch),
      http('evenements', null, batch),
    ]);
    assert.ok(results.every((r) => r.status === 200));
    assert.equal((await db.parcoursJour.findFirst()).nombre, 1);
    assert.equal(await db.parcoursRecu.count(), 1);
    await service.ingest(batch, new Date(now.getTime() + dayMs));
    assert.equal((await db.parcoursJour.findFirst()).nombre, 1);
    const two = event();
    assert.equal(
      (await http('evenements', null, { evenements: [two] })).status,
      200,
    );
    assert.equal((await db.parcoursJour.findFirst()).nombre, 2);
    const before = await db.parcoursRecu.count();
    const rollback = event();
    assert.equal(
      (
        await http('evenements', null, {
          evenements: [rollback, { ...one, evenement: 'AJOUT_PANIER' }],
        })
      ).status,
      409,
    );
    assert.equal(await db.parcoursRecu.count(), before);
    assert.equal((await db.parcoursJour.findFirst()).nombre, 2);
    ok(
      'Concurrent/lost-response replay counts once; changed duplicate rolls back entire batch without losing increments',
    );
    const mixed = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        const cells = [event(), event({ evenement: 'AJOUT_PANIER' })];
        return http('evenements', null, {
          evenements: i % 2 ? cells.reverse() : cells,
        });
      }),
    );
    assert.ok(mixed.every((r) => r.status === 200));
    assert.equal(
      (
        await db.parcoursJour.findFirst({
          where: { evenement: 'FICHE_OUVERTE' },
        })
      ).nombre,
      10,
    );
    assert.equal(
      (
        await db.parcoursJour.findFirst({
          where: { evenement: 'AJOUT_PANIER' },
        })
      ).nombre,
      8,
    );
    const failedEvent = event(),
      receiptCount = await db.parcoursRecu.count();
    const failing = new Proxy(db, {
      get(target, property) {
        if (property === '$transaction')
          return (callback) =>
            target.$transaction((tx) =>
              callback(
                new Proxy(tx, {
                  get(t, p) {
                    if (p === 'parcoursJour')
                      return {
                        upsert: async () => {
                          throw Error('Injected aggregate write failure');
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
      new ParcoursService(failing).ingest({ evenements: [failedEvent] }),
      (e) => e.getStatus?.() === 503,
    );
    assert.equal(await db.parcoursRecu.count(), receiptCount);
    assert.equal(
      (
        await db.parcoursJour.findFirst({
          where: { evenement: 'FICHE_OUVERTE' },
        })
      ).nombre,
      10,
    );
    ok(
      'Overlapping aggregate cells retain all concurrent increments; failed counter write also rolls back its dedupe receipt',
    );
    const fees = event({
      evenement: 'FRAIS_VUS',
      reception: 'LIVRAISON_A_CONFIRMER',
      jour: yesterday,
    });
    assert.equal(
      (await http('evenements', null, { evenements: [fees] })).status,
      200,
    );
    const baseline = await service.report(day, day, now);
    await fixture();
    await fixture(start, 'RETRAIT_MAGASIN');
    await fixture(new Date(start.getTime() - dayMs * 2));
    await fixture(start, 'LIVRAISON', false);
    await fixture(start, 'LIVRAISON', true, false);
    client = await db.client.create({
      data: {
        nom: 'Synthetic metrics client',
        email: randomUUID() + '@example.invalid',
      },
    });
    demande = await db.demandeDevis.create({
      data: {
        clientId: client.id,
        requestId: randomUUID(),
        fingerprint: 'b'.repeat(64),
        nomClient: 'Synthetic private',
        telephone: '600000000',
        modeReception: 'RETRAIT_MAGASIN',
        createdAt: start,
      },
    });
    const reportRoute = 'rapport?debut=' + day + '&fin=' + day;
    for (const t of [
      null,
      jwt.sign({ sub: client.id, type: 'client' }),
      token(admins[2]),
    ])
      assert.ok([401, 403].includes((await http(reportRoute, t)).status));
    const report = await http(reportRoute, token(admins[0]));
    assert.equal(report.status, 200);
    assert.equal(report.headers.get('cache-control'), 'private, no-store');
    const r = report.data;
    assert.equal(
      r.activite.commandesEnregistrees -
        baseline.activite.commandesEnregistrees,
      3,
    );
    assert.equal(r.cohorte.livrees - baseline.cohorte.livrees, 1);
    assert.equal(r.cohorte.retirees - baseline.cohorte.retirees, 1);
    assert.equal(
      r.activite.livraisonsPeriode - baseline.activite.livraisonsPeriode,
      2,
    );
    assert.equal(
      r.activite.retraitsPeriode - baseline.activite.retraitsPeriode,
      1,
    );
    assert.equal(r.activite.devisDemandes - baseline.activite.devisDemandes, 1);
    assert.equal(
      r.activite.commandesSansProvenance -
        baseline.activite.commandesSansProvenance,
      1,
    );
    assert.deepEqual(r.retoursIncompatibilite, {
      disponible: true,
      nombre: 0,
      articles: 0,
      signalements: 0,
    });
    assert.equal(
      r.observations.find((o) => o.evenement === 'FICHE_OUVERTE').nombre,
      10,
    );
    assert.equal(
      r.observations.some((o) => o.evenement === 'FRAIS_VUS'),
      false,
    );
    for (const secret of [
      'Synthetic private',
      '600000000',
      client.email,
      one.id,
      orders[0],
      requests[0],
      'empreinte',
      'expiration',
    ])
      assert.ok(!JSON.stringify(r).includes(secret));
    ok(
      'Reports use actual deduplicated web orders/quotes, separate order cohort from received-date activity, exclude uncertain legacy provenance and PII',
    );
    assert.equal(
      (await http('rapport?debut=2026-02-30&fin=' + day, token(admins[0])))
        .status,
      400,
    );
    assert.equal(
      (await http('rapport?debut=0000-01-01&fin=0000-01-01', token(admins[0])))
        .status,
      400,
    );
    assert.equal(
      (await http('rapport?debut=2000-01-01&fin=' + day, token(admins[0])))
        .status,
      400,
    );
    assert.equal((await http(reportRoute, token(admins[1]))).status, 200);
    await db.adminUser.update({
      where: { id: admins[0].id },
      data: { sessionVersion: 2 },
    });
    assert.equal(
      (await http(reportRoute, token({ ...admins[0], sessionVersion: 1 })))
        .status,
      401,
    );
    ok(
      'Real admin roles/session and strict dates enforced; return counts read from the dedicated registry',
    );
    const expired = randomUUID();
    receiptIds.push(expired);
    await db.parcoursRecu.create({
      data: {
        id: expired,
        empreinte: '0'.repeat(64),
        expiration: new Date(today.getTime() - dayMs),
      },
    });
    const keptReceipts = (await db.parcoursRecu.count()) - 1;
    assert.equal((await service.cleanup(now)).supprimes, 1);
    assert.equal(await db.parcoursRecu.count(), keptReceipts);
    assert.equal(
      (
        await db.parcoursJour.findFirst({
          where: { evenement: 'FICHE_OUVERTE' },
        })
      ).nombre,
      10,
    );
    await assert.rejects(
      db.parcoursJour.updateMany({
        where: { evenement: 'FICHE_OUVERTE' },
        data: { nombre: 0 },
      }),
    );
    ok(
      'Receipt expiry removes only expired dedupe keys, preserves aggregate/history and SQL positive-count bounds',
    );
    if (process.env.NEWOTEG_PARCOURS_BROWSER === 'true') {
      const beforeOrders = await db.commande.count();
      await require('./verify-parcours-browser.cjs')({
        base,
        db,
        ok,
        remember: (e) => {
          browserEvents.push(e);
          receiptIds.push(e.id);
        },
      });
      assert.equal(await db.commande.count(), beforeOrders);
    }
    if (process.env.NEWOTEG_PARCOURS_ADMIN_BROWSER === 'true') {
      const beforeOrders = await db.commande.count();
      await require('./verify-parcours-admin-browser.cjs')({
        base,
        admin: admins[1],
        adminToken: token(admins[1]),
        seller: admins[2],
        sellerToken: token(admins[2]),
        today: day,
        expected: await service.report(day, day),
        ok,
        setEnabled: (value) => {
          process.env.PARCOURS_METRICS_ENABLED = String(value);
        },
      });
      assert.equal(await db.commande.count(), beforeOrders);
    }
    const out =
      'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/parcours-server/result.json';
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(
      out,
      JSON.stringify(
        {
          success: true,
          checks,
          externalRequests: 0,
          limits: [
            'compatibility-return registry and global business acceptance remain to integrate',
            ...(process.env.NEWOTEG_PARCOURS_ADMIN_BROWSER === 'true'
              ? [
                  'admin report uses real Nest/JWT/PostgreSQL; surrounding administration APIs mocked',
                ]
              : ['admin browser recipe not requested in this run']),
            ...(process.env.NEWOTEG_PARCOURS_BROWSER === 'true'
              ? ['browser commerce APIs mocked, observation API real']
              : ['browser recipe not requested in this run']),
            'anonymous observations are not verified sales',
            'migrations local only',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    if (app) await app.close();
    if (receiptIds.length)
      await db.parcoursRecu.deleteMany({ where: { id: { in: receiptIds } } });
    // We required these dedicated tables empty before the recipe, and only own
    // fixed dimensions were inserted by the ephemeral server.
    if (checks.length)
      await db.parcoursJour.deleteMany({
        where: {
          jour: { in: [today, new Date(yesterday + 'T00:00:00Z')] },
          langue: 'en',
          appareil: 'tablette',
          evenement: { in: ['FICHE_OUVERTE', 'FRAIS_VUS', 'AJOUT_PANIER'] },
        },
      });
    if (browserEvents.length)
      await db.parcoursJour.deleteMany({
        where: {
          OR: browserEvents.map((e) => ({
            jour: new Date(e.jour + 'T00:00:00Z'),
            evenement: e.evenement,
            langue: e.langue,
            appareil: e.appareil,
            reception: e.reception,
          })),
        },
      });
    if (demande) await db.demandeDevis.delete({ where: { id: demande.id } });
    await db.commandeRequest.deleteMany({
      where: { requestId: { in: requests } },
    });
    await db.commande.deleteMany({ where: { id: { in: orders } } });
    if (client) await db.client.delete({ where: { id: client.id } });
    await db.adminUser.deleteMany({
      where: { id: { in: admins.map((a) => a.id) } },
    });
    await db.$disconnect();
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
