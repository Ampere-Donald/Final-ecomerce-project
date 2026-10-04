// Isolated real PostgreSQL/Nest/JWT recipe; no .env, real email or stock writes.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const connectionString = process.env.NEWOTEG_INCOMPATIBILITES_TEST_DATABASE_URL;
if (!connectionString)
  throw Error('Explicit dedicated local database required');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error('Refusing database outside dedicated local fixture cluster');
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.GUEST_EMAIL_ENABLED = 'false';
process.env.PARCOURS_METRICS_ENABLED = 'false';
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
const { IncompatibilitesService } = require(
  root + 'incompatibilites/incompatibilites.service',
);
const { IncompatibilitesController } = require(
  root + 'incompatibilites/incompatibilites.controller',
);
const { GuestIncompatibilitesService } = require(
  root + 'incompatibilites/guest-incompatibilites.service',
);
const { GuestIncompatibilitesController } = require(
  root + 'incompatibilites/guest-incompatibilites.controller',
);
const { MailService } = require(root + 'auth/mail.service'),
  { guestTokenHash } = require(root + 'commande/guest-access');
const { ParcoursService } = require(root + 'parcours/parcours.service');
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const fault = { enabled: false };
const privateDb = new Proxy(db, {
  get(target, key) {
    if (key === '$transaction')
      return (callback, options) =>
        target.$transaction(
          (tx) =>
            callback(
              new Proxy(tx, {
                get(tx, key) {
                  if (key === 'incompatibiliteDecision')
                    return new Proxy(tx[key], {
                      get(delegate, method) {
                        if (method === 'create' && fault.enabled)
                          return () => {
                            throw Error(
                              'Synthetic private diagnostic must never be logged or returned',
                            );
                          };
                        return typeof delegate[method] === 'function'
                          ? delegate[method].bind(delegate)
                          : delegate[method];
                      },
                    });
                  return typeof tx[key] === 'function'
                    ? tx[key].bind(tx)
                    : tx[key];
                },
              }),
            ),
          options,
        );
    return typeof target[key] === 'function'
      ? target[key].bind(target)
      : target[key];
  },
});
const service = new IncompatibilitesService(privateDb);
const mail = {
  enabled: true,
  delivered: true,
  messages: [],
  guestRecoveryAvailable() {
    return this.enabled;
  },
  async sendGuestIncompatibiliteCode(to, code, reference, product) {
    this.messages.push({ to, code, reference, product });
    return this.delivered;
  },
};
const guest = new GuestIncompatibilitesService(db, mail, service);
const orders = [],
  clients = [],
  admins = [],
  checks = [];
let product, category, app, jwt, base;
const key = () => randomBytes(32).toString('base64url');
const body = (line) => ({
  requestId: randomUUID(),
  ligneCommandeId: line,
  quantite: 2,
  motif: 'BROCHAGE',
  description:
    'Diagnostic privé fictif : les broches ne correspondent pas à mon montage.',
});
const decision = (version = 1, action = 'EN_EXAMEN') => ({
  requestId: randomUUID(),
  expectedVersion: version,
  action,
  reponse: 'Réponse privée fictive de la boutique concernant le brochage.',
});
const day = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
async function fixture({
  owner = clients[0].id,
  status = 'LIVREE',
  dateLivraison = new Date(),
  web = true,
} = {}) {
  const order = await db.commande.create({
    data: {
      numeroSuivi: 'INC-' + randomUUID().slice(0, 20),
      nomClient: 'Identité privée fictive',
      telephone: '600000000',
      adresseLivraison: 'Adresse privée fictive',
      montantTotal: 200,
      clientId: owner,
      statut: status,
      dateLivraison,
      lignes: {
        create: {
          produitId: product.id,
          nomProduit: product.nomProduit,
          quantite: 2,
          prixUnitaire: 100,
          sousTotal: 200,
        },
      },
    },
    include: { lignes: true },
  });
  orders.push(order.id);
  if (web)
    await db.commandeRequest.create({
      data: {
        requestId: randomUUID(),
        fingerprint: 'a'.repeat(64),
        commandeId: order.id,
      },
    });
  return order;
}
async function guestFixture(email = 'private@example.invalid') {
  const order = await fixture({ owner: null }),
    accessToken = key();
  await db.commandeGuestAccess.create({
    data: {
      commandeId: order.id,
      tokenHash: guestTokenHash(accessToken),
      recoveryEmail: email,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  return {
    order,
    accessToken,
    actionKey: key(),
    dto: body(order.lignes[0].id),
  };
}
async function requestCode(f) {
  const result = await guest.request(f.accessToken, f.dto);
  assert.ok(result.challengeId, 'Captured local code expected');
  return {
    ...f,
    challengeId: result.challengeId,
    code: mail.messages.at(-1).code,
  };
}
const execute = (f, code = f.code, dto = f.dto) =>
  guest.execute(f.accessToken, f.challengeId, f.actionKey, dto, code);
const adminToken = (a) =>
  jwt.sign({
    sub: a.id,
    type: 'admin',
    role: 'SUPER_ADMIN',
    sessionVersion: a.sessionVersion,
  });
const clientToken = (c) => jwt.sign({ sub: c.id, type: 'client' });
async function http(route, token, payload) {
  const response = await fetch(base + '/api/incompatibilites' + route, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  };
}
(async () => {
  try {
    if (
      !(
        await pool.query(
          "SELECT to_regclass('public.dossier_incompatibilite') AS name",
        )
      ).rows[0].name
    ) {
      if (process.env.NEWOTEG_INCOMPATIBILITES_APPLY_SCHEMA !== 'true')
        throw Error('Explicit dedicated schema apply required');
      const sql = fs.readFileSync(
        path.join(
          __dirname,
          '../prisma/migrations/20261004140000_incompatibilites/migration.sql',
        ),
        'utf8',
      );
      assert.ok(!/^\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/im.test(sql));
      const connection = await pool.connect();
      try {
        await connection.query('BEGIN');
        try {
          await connection.query(sql);
          await connection.query('COMMIT');
        } catch (error) {
          await connection.query('ROLLBACK');
          throw error;
        }
      } finally {
        connection.release();
      }
    }
    category = await db.categorie.create({
      data: { nom: 'Incompatibilités fictives ' + randomUUID() },
    });
    product = await db.produit.create({
      data: {
        categorieId: category.id,
        nomProduit: 'Pièce fictive pour diagnostic',
        prixDetail: 100,
        quantiteStock: 7,
      },
    });
    for (let i = 0; i < 2; i++)
      clients.push(
        await db.client.create({
          data: {
            nom: 'Client fictif',
            email: randomUUID() + '@example.invalid',
          },
        }),
      );
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'VENDEUR', 'CAISSIER'])
      admins.push(
        await db.adminUser.create({
          data: {
            nom: 'Recette incompatibilité',
            username: 'inc-' + randomUUID().slice(0, 12),
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
      controllers: [
        IncompatibilitesController,
        GuestIncompatibilitesController,
      ],
      providers: [
        JwtStrategy,
        AdminJwtStrategy,
        { provide: DatabaseService, useValue: db },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => process.env.JWT_SECRET },
        },
        { provide: IncompatibilitesService, useValue: service },
        { provide: GuestIncompatibilitesService, useValue: guest },
        { provide: MailService, useValue: mail },
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
    const main = await fixture(),
      dto = body(main.lignes[0].id),
      ownerToken = clientToken(clients[0]);
    assert.equal((await http('', null, dto)).status, 401);
    assert.equal((await http('', clientToken(clients[1]), dto)).status, 404);
    for (const invalid of [
      { ...dto, quantite: 0 },
      { ...dto, motif: 'GARANTI' },
      { ...dto, returned: true },
      { ...dto, description: 'court' },
    ])
      assert.equal((await http('', ownerToken, invalid)).status, 400);
    for (const options of [
      { status: 'EN_LIVRAISON' },
      { dateLivraison: null },
    ]) {
      const f = await fixture(options);
      assert.equal(
        (await http('', ownerToken, body(f.lignes[0].id))).status,
        409,
      );
    }
    const purchases = await http('/commandes/' + main.id, ownerToken);
    assert.equal(purchases.status, 200);
    assert.equal(purchases.data.eligible, true);
    assert.equal(purchases.headers.get('cache-control'), 'private, no-store');
    assert.ok(!JSON.stringify(purchases.data).includes('600000000'));
    assert.equal(
      (await http('/commandes/' + main.id, clientToken(clients[1]))).status,
      404,
    );
    ok(
      'Real account ownership and receipt required; closed DTO rejects invented return, invalid quantity, motif and private extra fields',
    );
    const creates = await Promise.all([
      http('', ownerToken, dto),
      http('', ownerToken, dto),
    ]);
    assert.ok(creates.every((result) => result.status === 200));
    assert.deepEqual(creates[0].data, creates[1].data);
    const dossierId = creates[0].data.id;
    assert.equal(
      await db.dossierIncompatibilite.count({
        where: { ligneCommandeId: dto.ligneCommandeId },
      }),
      1,
    );
    assert.equal(
      (await http('', ownerToken, { ...dto, quantite: 1 })).status,
      409,
    );
    assert.equal(
      (await http('', ownerToken, { ...dto, requestId: randomUUID() })).status,
      409,
    );
    const oversized = await fixture();
    assert.equal(
      (
        await http('', ownerToken, {
          ...body(oversized.lignes[0].id),
          quantite: 3,
        })
      ).status,
      409,
    );
    ok(
      'Concurrent and lost-response creation replays one dossier; changed payload, new duplicate and excessive purchased quantity refused',
    );
    for (const a of [admins[2], admins[3]])
      assert.equal((await http('/admin', adminToken(a))).status, 403);
    assert.equal((await http('/admin', ownerToken)).status, 401);
    const list = await http('/admin', adminToken(admins[0]));
    assert.equal(list.status, 200);
    assert.equal(
      list.data.items.some((item) => item.id === dossierId),
      true,
    );
    for (const field of [
      'telephone',
      'adresseLivraison',
      'email',
      'fingerprint',
      'prixUnitaire',
      'prixAchat',
      'actorId',
    ])
      assert.ok(!JSON.stringify(list.data).includes('"' + field + '"'));
    assert.equal(
      (await http('/admin?statut=UNKNOWN', adminToken(admins[0]))).status,
      400,
    );
    assert.equal(
      (await http('/admin?page=0', adminToken(admins[0]))).status,
      400,
    );
    await db.adminUser.update({
      where: { id: admins[0].id },
      data: { sessionVersion: 2 },
    });
    assert.equal((await http('/admin', adminToken(admins[0]))).status, 401);
    admins[0].sessionVersion = 2;
    ok(
      'Admin list is bounded and private; fresh server roles/session enforced despite forged JWT role claim',
    );
    const examine = decision();
    const examined = await http(
      '/admin/' + dossierId + '/decision',
      adminToken(admins[0]),
      examine,
    );
    assert.equal(examined.status, 200);
    assert.equal(
      (
        await http(
          '/admin/' + dossierId + '/decision',
          adminToken(admins[0]),
          decision(),
        )
      ).status,
      409,
    );
    const returned = {
      ...decision(2, 'RETOUR_CONFIRME'),
      retourQuantite: 2,
      diagnostic: 'BROCHAGE',
    };
    for (const bad of [
      { ...returned, retourQuantite: 3 },
      { ...returned, diagnostic: undefined },
      { ...returned, retourQuantite: undefined },
      { ...decision(2), diagnostic: 'BROCHAGE' },
    ])
      assert.equal(
        (
          await http(
            '/admin/' + dossierId + '/decision',
            adminToken(admins[0]),
            bad,
          )
        ).status,
        400,
      );
    const returns = await Promise.all([
      http(
        '/admin/' + dossierId + '/decision',
        adminToken(admins[0]),
        returned,
      ),
      http(
        '/admin/' + dossierId + '/decision',
        adminToken(admins[0]),
        returned,
      ),
    ]);
    assert.ok(returns.every((result) => result.status === 200));
    assert.deepEqual(returns[0].data, returns[1].data);
    const stored = await db.dossierIncompatibilite.findUnique({
      where: { id: dossierId },
    });
    const confirmedAt = stored.retourConfirmeAt.toISOString();
    assert.equal(stored.retourQuantite, 2);
    assert.equal(
      await db.incompatibiliteDecision.count({ where: { dossierId } }),
      2,
    );
    assert.equal(
      (
        await http(
          '/admin/' + dossierId + '/decision',
          adminToken(admins[0]),
          decision(3),
        )
      ).status,
      409,
    );
    await http(
      '/admin/' + dossierId + '/decision',
      adminToken(admins[0]),
      returned,
    );
    assert.equal(
      (
        await db.dossierIncompatibilite.findUnique({ where: { id: dossierId } })
      ).retourConfirmeAt.toISOString(),
      confirmedAt,
    );
    ok(
      'Versioned examination and return require quantity/diagnostic; concurrent replay records one dated return and immutable terminal outcome',
    );
    const contested = await fixture(),
      contestedDossier = await service.create(
        clients[0].id,
        body(contested.lignes[0].id),
      );
    const contenders = await Promise.all([
      http(
        '/admin/' + contestedDossier.id + '/decision',
        adminToken(admins[0]),
        decision(1, 'RESOLU_SANS_RETOUR'),
      ),
      http(
        '/admin/' + contestedDossier.id + '/decision',
        adminToken(admins[1]),
        decision(1, 'CLOTURE'),
      ),
    ]);
    assert.deepEqual(contenders.map((x) => x.status).sort(), [200, 409]);
    assert.equal(
      await db.incompatibiliteDecision.count({
        where: { dossierId: contestedDossier.id },
      }),
      1,
    );
    const beforeHistory = await db.incompatibiliteDecision.count({
      where: { dossierId: contestedDossier.id },
    });
    const rollbackOrder = await fixture(),
      rollbackDossier = await service.create(
        clients[0].id,
        body(rollbackOrder.lignes[0].id),
      );
    fault.enabled = true;
    const failure = await http(
      '/admin/' + rollbackDossier.id + '/decision',
      adminToken(admins[0]),
      decision(),
    );
    fault.enabled = false;
    assert.equal(failure.status, 503);
    assert.ok(!JSON.stringify(failure.data).includes('Synthetic private'));
    assert.equal(
      (
        await db.dossierIncompatibilite.findUnique({
          where: { id: rollbackDossier.id },
        })
      ).version,
      1,
    );
    assert.equal(
      await db.incompatibiliteDecision.count({
        where: { dossierId: rollbackDossier.id },
      }),
      0,
    );
    assert.equal(beforeHistory, 1);
    ok(
      'Two admin decisions on one version produce one winner; failed audit insert rolls back dossier and returns generic private failure',
    );
    const disabled = await guestFixture();
    mail.enabled = false;
    const sendCount = mail.messages.length;
    assert.equal(
      (await guest.request(disabled.accessToken, disabled.dto)).available,
      false,
    );
    assert.equal(
      (await guest.purchases(disabled.accessToken)).codeAvailable,
      false,
    );
    assert.equal(mail.messages.length, sendCount);
    mail.enabled = true;
    const missingEmail = await guestFixture(null);
    await assert.rejects(
      guest.request(missingEmail.accessToken, missingEmail.dto),
      (error) => error.getStatus?.() === 400,
    );
    const g = await requestCode(await guestFixture());
    const repeat = await guest.request(g.accessToken, g.dto);
    assert.equal(repeat.challengeId, g.challengeId);
    assert.equal(mail.messages.length, sendCount + 1);
    assert.equal(mail.messages.at(-1).to, 'private@example.invalid');
    assert.equal(
      (
        await http('/guest/request', null, {
          ...g.dto,
          accessToken: g.accessToken,
          email: 'attacker@example.invalid',
        })
      ).status,
      400,
    );
    const noCode = await http('/guest', null, {
      ...g.dto,
      accessToken: g.accessToken,
      challengeId: g.challengeId,
      actionKey: g.actionKey,
    });
    assert.equal(noCode.status, 400);
    assert.equal(noCode.data.code, 'GUEST_RETURN_CODE_REQUIRED');
    await assert.rejects(
      execute(g, g.code, { ...g.dto, quantite: 1 }),
      (error) => error.getStatus?.() === 401,
    );
    const guestResults = await Promise.all([execute(g), execute(g)]);
    const result = guestResults[0];
    assert.equal(result.enregistre, true);
    assert.deepEqual(guestResults[1], result);
    assert.deepEqual(await execute(g, null), result);
    assert.deepEqual(await execute(g, null), result);
    assert.equal(
      await db.dossierIncompatibilite.count({
        where: { ligneCommandeId: g.dto.ligneCommandeId },
      }),
      1,
    );
    const challenge = await db.commandeGuestChallenge.findUnique({
      where: { id: g.challengeId },
    });
    assert.ok(challenge.completedAt && challenge.proofHash);
    assert.ok(!JSON.stringify(challenge).includes(g.code));
    await db.commandeGuestAccess.update({
      where: { commandeId: g.order.id },
      data: { revokedAt: new Date() },
    });
    assert.deepEqual(await execute(g, null), result);
    await assert.rejects(
      guest.purchases(g.accessToken),
      (error) => error.getStatus?.() === 401,
    );
    ok(
      'Guest code is explicit, content-bound, recipient fixed, disabled without provider; lost-response receipt replays after access revocation without revealing dossier',
    );
    for (const change of [
      'expiry',
      'revoked',
      'linked',
      'grantVersion',
      'orderVersion',
      'quantity',
      'purpose',
    ]) {
      const f = await requestCode(await guestFixture());
      if (change === 'expiry')
        await db.commandeGuestChallenge.update({
          where: { id: f.challengeId },
          data: { expiresAt: new Date(Date.now() - 1) },
        });
      if (change === 'revoked')
        await db.commandeGuestAccess.update({
          where: { commandeId: f.order.id },
          data: { revokedAt: new Date() },
        });
      if (change === 'linked')
        await db.commande.update({
          where: { id: f.order.id },
          data: { clientId: clients[1].id },
        });
      if (change === 'grantVersion')
        await db.commandeGuestAccess.update({
          where: { commandeId: f.order.id },
          data: { version: { increment: 1 } },
        });
      if (change === 'orderVersion')
        await db.commande.update({
          where: { id: f.order.id },
          data: { version: { increment: 1 } },
        });
      if (change === 'quantity')
        await db.ligneCommande.update({
          where: { id: f.dto.ligneCommandeId },
          data: { quantite: 1 },
        });
      if (change === 'purpose')
        await db.commandeGuestChallenge.update({
          where: { id: f.challengeId },
          data: { purpose: 'REVIEW' },
        });
      await assert.rejects(execute(f), (error) =>
        [401, 409].includes(error.getStatus?.()),
      );
      assert.equal(
        await db.dossierIncompatibilite.count({
          where: { ligneCommandeId: f.dto.ligneCommandeId },
        }),
        0,
      );
    }
    ok(
      'Guest expiry, revocation, linking, access/order versions, reduced purchased quantity and different code purpose prevent creation',
    );
    const brute = await requestCode(await guestFixture()),
      wrong = brute.code === '00000000' ? '00000001' : '00000000';
    for (let i = 0; i < 5; i++)
      await assert.rejects(
        execute(brute, wrong),
        (error) => error.getStatus?.() === 401,
      );
    const invalidated = await db.commandeGuestChallenge.findUnique({
      where: { id: brute.challengeId },
    });
    assert.equal(invalidated.attempts, 5);
    assert.ok(invalidated.consumedAt);
    await assert.rejects(
      execute(brute),
      (error) => error.getStatus?.() === 401,
    );
    const failedMail = await guestFixture();
    mail.delivered = false;
    assert.equal(
      (await guest.request(failedMail.accessToken, failedMail.dto)).available,
      false,
    );
    mail.delivered = true;
    assert.equal(
      (
        await db.commandeGuestChallenge.findFirst({
          where: { commandeId: failedMail.order.id },
        })
      ).delivered,
      false,
    );
    const budget = await guestFixture();
    await db.commandeGuestChallenge.createMany({
      data: ['RECOVER', 'REVIEW', 'LINK'].map((purpose) => ({
        commandeId: budget.order.id,
        codeHash: 'a'.repeat(64),
        purpose,
        createdAt: new Date(Date.now() - 120000),
        expiresAt: new Date(Date.now() + 600000),
      })),
    });
    await assert.rejects(
      guest.request(budget.accessToken, budget.dto),
      (error) => error.getStatus?.() === 429,
    );
    ok(
      'Five incorrect codes consume the challenge; failed mail cannot authorize creation; hourly send budget shared across guest purposes',
    );
    const metrics = new ParcoursService(db),
      before = await metrics.report(day, day);
    const legacy = await fixture({ web: false }),
      legacyCase = await service.create(
        clients[0].id,
        body(legacy.lignes[0].id),
      );
    await service.decide(admins[0].id, legacyCase.id, {
      ...decision(1, 'RETOUR_CONFIRME'),
      retourQuantite: 2,
      diagnostic: 'BROCHAGE',
    });
    const counted = await fixture(),
      countedCase = await service.create(
        clients[0].id,
        body(counted.lignes[0].id),
      );
    const onlySignal = await fixture();
    await service.create(clients[0].id, body(onlySignal.lignes[0].id));
    await service.decide(admins[0].id, countedCase.id, {
      ...decision(1, 'RETOUR_CONFIRME'),
      retourQuantite: 1,
      diagnostic: 'BROCHAGE',
    });
    const after = await metrics.report(day, day);
    assert.equal(after.retoursIncompatibilite.disponible, true);
    assert.equal(
      after.retoursIncompatibilite.nombre -
        before.retoursIncompatibilite.nombre,
      1,
    );
    assert.equal(
      after.retoursIncompatibilite.articles -
        before.retoursIncompatibilite.articles,
      1,
    );
    assert.equal(
      after.retoursIncompatibilite.signalements -
        before.retoursIncompatibilite.signalements,
      2,
    );
    for (const value of [
      'Diagnostic privé',
      'Réponse privée',
      '600000000',
      clients[0].email,
      countedCase.id,
      dto.ligneCommandeId,
      g.accessToken,
      g.code,
    ])
      assert.ok(!JSON.stringify(after).includes(value));
    await assert.rejects(
      db.dossierIncompatibilite.update({
        where: { id: countedCase.id },
        data: { retourQuantite: 3 },
      }),
    );
    await assert.rejects(
      db.dossierIncompatibilite.update({
        where: { id: countedCase.id },
        data: { diagnostic: null },
      }),
    );
    ok(
      'Aggregate counts confirmed web dossiers/quantities by confirmation date, separates mere signals and excludes legacy provenance, private text and secrets',
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock,
      7,
    );
    assert.equal(
      Number(
        (await db.commande.findUnique({ where: { id: main.id } })).montantTotal,
      ),
      200,
    );
    assert.equal(
      await db.mouvementStock.count({ where: { produitId: product.id } }),
      0,
    );
    ok(
      'Reports and confirmed returns leave physical stock, order amount and payments untouched; dedicated SQL bounds prevent incoherent return records',
    );
    if (process.env.NEWOTEG_INCOMPATIBILITES_BROWSER === 'true') {
      await require('./verify-incompatibilites-browser.cjs')({
        db,
        base,
        fixture,
        guestFixture,
        clients,
        admins,
        clientToken,
        adminToken,
        mail,
        ok,
      });
    }
    const output =
      'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/incompatibilites-server/result.json';
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(
      output,
      JSON.stringify(
        {
          success: true,
          checks,
          externalRequests: 0,
          realEmails: 0,
          limits: [
            'Synthetic isolated PostgreSQL, controllers and JWT real, mail captured without transport',
            process.env.NEWOTEG_INCOMPATIBILITES_BROWSER === 'true'
              ? 'Interfaces verified in standalone Edge; no physical phone or team acceptance'
              : 'Browser recipe not run in this invocation',
            'No refund/exchange/restock policy invented',
            'Only local migration',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    if (app) await app.close();
    await db.incompatibiliteDecision.deleteMany({
      where: { dossier: { ligne: { commandeId: { in: orders } } } },
    });
    await db.dossierIncompatibilite.deleteMany({
      where: { ligne: { commandeId: { in: orders } } },
    });
    await db.commandeRequest.deleteMany({
      where: { commandeId: { in: orders } },
    });
    await db.commande.deleteMany({ where: { id: { in: orders } } });
    if (product) await db.produit.delete({ where: { id: product.id } });
    if (category) await db.categorie.delete({ where: { id: category.id } });
    await db.client.deleteMany({
      where: { id: { in: clients.map((c) => c.id) } },
    });
    await db.adminUser.deleteMany({
      where: { id: { in: admins.map((a) => a.id) } },
    });
    await db.$disconnect();
    await pool.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
