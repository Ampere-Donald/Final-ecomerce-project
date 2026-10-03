// Only the dedicated local fixture database. No .env, Railway, SMTP or payments.
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { randomUUID, randomBytes } = require('node:crypto');
const connectionString = process.env.NEWOTEG_GUEST_TEST_DATABASE_URL;
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
const { MailService } = require(root + 'auth/mail.service');
const { JwtStrategy } = require(root + 'auth/jwt.strategy');
const { CommandeService } = require(root + 'commande/commande.service');
const { CommandeController } = require(root + 'commande/commande.controller');
const { GuestOrderService } = require(root + 'commande/guest-order.service');
const { GuestOrderController } = require(
  root + 'commande/guest-order.controller',
);
const { GuestLinkService } = require(root + 'commande/guest-link.service');
const { GuestActionService } = require(root + 'commande/guest-action.service');
const { GuestActionController } = require(
  root + 'commande/guest-action.controller',
);
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const mail = {
  enabled: true,
  delivered: true,
  messages: [],
  guestRecoveryAvailable() {
    return this.enabled;
  },
  async sendGuestActionCode(to, code, reference, action) {
    this.messages.push({ to, code, reference, action });
    return this.delivered;
  },
  async sendGuestAccessCode(to, code) {
    this.messages.push({ to, code, action: 'RECOVER' });
    return this.delivered;
  },
  async sendGuestLinkCode(to, code, reference, accountEmail) {
    this.messages.push({ to, code, reference, accountEmail, action: 'LINK' });
    return this.delivered;
  },
};
const orders = new CommandeService(
  db,
  { create: async () => ({}) },
  new Proxy(
    {},
    {
      get: () => () => {
        throw Error('External auth must not be called');
      },
    },
  ),
);
const guests = new GuestOrderService(db, mail),
  links = new GuestLinkService(db, mail),
  actions = new GuestActionService(db, mail);
const fixtures = [],
  requestIds = [],
  clients = [],
  products = [],
  checks = [];
let category, app, httpBase, browser, jwt;
const output =
  'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/guest-actions';
const key = () => randomBytes(32).toString('base64url');
function ok(name) {
  checks.push(name);
  console.log('PASS ' + name);
}
async function rejects(task, expected = 'GUEST_ACTION_INVALID') {
  await assert.rejects(task, (e) => e.getResponse?.().code === expected);
}
async function fixture(extra = {}) {
  const accessToken = key(),
    actionKey = key(),
    requestId = randomUUID();
  requestIds.push(requestId);
  const before = await db.produit.findUnique({ where: { id: products[0].id } });
  const result = await orders.createWithAccount({
    requestId,
    guestAccessKey: accessToken,
    guestEmail: 'checkout@example.invalid',
    nomClient: 'NOM PRIVE FICTIF',
    telephone: '600000000',
    adresseLivraison: 'ADRESSE PRIVEE FICTIVE',
    montantTotal: 7000,
    modeReception: 'RETRAIT_MAGASIN',
    lignes: [
      {
        produitId: products[0].id,
        nomProduit: products[0].nomProduit,
        quantite: 2,
        prixUnitaire: 3500,
      },
    ],
    ...extra,
  });
  const f = {
    order: result.commande,
    accessToken,
    actionKey,
    beforeStock: before.quantiteStock,
  };
  fixtures.push(f);
  return f;
}
async function consent(f, action) {
  const response = await actions.request(f.accessToken, action);
  assert.ok(response.challengeId);
  return {
    ...f,
    action,
    challengeId: response.challengeId,
    code: mail.messages.at(-1).code,
  };
}
async function execute(c, code = c.code, action = c.action) {
  return actions.execute(
    c.accessToken,
    action,
    c.challengeId,
    c.actionKey,
    code,
  );
}
async function row(f) {
  return db.commande.findUnique({ where: { id: f.order.id } });
}
async function stock() {
  return (await db.produit.findUnique({ where: { id: products[0].id } }))
    .quantiteStock;
}
async function returns(f) {
  return db.mouvementStock.count({
    where: {
      typeMouvement: 'RETOUR',
      motif: 'Annulation commande #' + f.order.numeroSuivi,
    },
  });
}
async function cash(f) {
  return db.caisse.findMany({
    where: {
      motif: {
        startsWith: 'Retrait magasin - Commande ' + f.order.numeroSuivi,
      },
    },
  });
}
async function notifications(f) {
  return db.notification.count({
    where: { message: { contains: f.order.numeroSuivi } },
  });
}
async function age(id) {
  await db.commandeGuestChallenge.update({
    where: { id },
    data: { createdAt: new Date(Date.now() - 61000) },
  });
}
async function post(pathname, body, client) {
  const response = await fetch(httpBase + '/api/commandes/guest/' + pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(client
        ? { Authorization: 'Bearer ' + jwt.sign({ sub: client.id }) }
        : {}),
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  };
}
// Force a real stale snapshot, rather than hoping the scheduler creates a race.
function pauseSnapshot(service) {
  const original = service.findOne.bind(service);
  let resume, seen;
  const ready = new Promise((resolve) => {
      seen = resolve;
    }),
    gate = new Promise((resolve) => {
      resume = resolve;
    });
  service.findOne = async (id) => {
    const value = await original(id);
    seen();
    await gate;
    return value;
  };
  return {
    ready,
    resume,
    restore: () => {
      service.findOne = original;
    },
  };
}
(async () => {
  try {
    const columns = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name='commande_guest_challenge' AND column_name='action_result'",
    );
    if (!columns.rowCount) {
      if (process.env.NEWOTEG_GUEST_APPLY_SCHEMA !== 'true')
        throw Error('Explicit isolated apply flag required');
      const sql = fs.readFileSync(
        path.join(
          __dirname,
          '../prisma/migrations/20261003110000_guest_order_actions/migration.sql',
        ),
        'utf8',
      );
      assert.ok(!/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/i.test(sql));
      await pool.query(sql);
      ok('Additive action receipt column applied only to isolated PostgreSQL');
    }
    category = await db.categorie.create({
      data: { nom: 'Recette actions invitées ' + randomUUID() },
    });
    for (let i = 0; i < 2; i++)
      products.push(
        await db.produit.create({
          data: {
            categorieId: category.id,
            code: 'DEMO-ACTION-' + randomUUID().slice(0, 8),
            codeFamille: 'RECETTE',
            nomProduit: 'Démonstration — câble action ' + i,
            quantiteStock: 200,
            prixDetail: 3500,
          },
        }),
      );
    for (let i = 0; i < 2; i++)
      clients.push(
        await db.client.create({
          data: {
            nom: 'Compte fictif action ' + i,
            email: `action-${randomUUID()}@example.invalid`,
            telephone: i ? '600000001' : '600000000',
            emailVerifie: true,
          },
        }),
      );
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '5m' },
        }),
      ],
      controllers: [
        GuestActionController,
        GuestOrderController,
        CommandeController,
      ],
      providers: [
        GuestActionService,
        GuestOrderService,
        JwtStrategy,
        { provide: CommandeService, useValue: orders },
        { provide: DatabaseService, useValue: db },
        { provide: MailService, useValue: mail },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => process.env.JWT_SECRET },
        },
      ],
    }).compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.listen(0, '127.0.0.1');
    httpBase = await app.getUrl();

    const first = await fixture();
    const read = await guests.read(first.accessToken);
    assert.equal(read.access.canCancel, false);
    assert.equal(read.actions.canRequestCancel, true);
    assert.equal(
      (
        await post('actions', {
          accessToken: first.accessToken,
          action: 'CANCEL',
          actionKey: first.actionKey,
          challengeId: randomUUID(),
          code: '12345678',
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await post('actions/request', {
          accessToken: first.accessToken,
          action: 'LINK',
        })
      ).status,
      400,
    );
    const sent = await post('actions/request', {
      accessToken: first.accessToken,
      action: 'CANCEL',
      email: 'attacker@example.invalid',
      clientId: clients[0].id,
    });
    assert.equal(sent.status, 200);
    assert.equal(sent.headers.get('cache-control'), 'private, no-store');
    assert.equal(mail.messages.at(-1).to, 'checkout@example.invalid');
    const c = {
      ...first,
      action: 'CANCEL',
      challengeId: sent.data.challengeId,
      code: mail.messages.at(-1).code,
    };
    const payload = {
      accessToken: c.accessToken,
      actionKey: c.actionKey,
      challengeId: c.challengeId,
      action: c.action,
    };
    assert.equal(
      (await post('actions', payload)).data.code,
      'GUEST_ACTION_CODE_REQUIRED',
    );
    const cancelled = await Promise.all([
      post('actions', { ...payload, code: c.code }),
      post('actions', { ...payload, code: c.code }),
    ]);
    assert.ok(cancelled.every((r) => r.status === 200));
    assert.deepEqual(cancelled[0].data, cancelled[1].data);
    assert.equal((await row(c)).statut, 'ANNULEE');
    assert.equal((await row(c)).version, c.order.version + 1);
    assert.equal(await stock(), c.beforeStock);
    assert.equal(await returns(c), 1);
    assert.equal(await notifications(c), 1);
    assert.equal((await cash(c)).length, 0);
    assert.deepEqual((await post('actions', payload)).data, cancelled[0].data);
    assert.deepEqual(Object.keys(cancelled[0].data).sort(), [
      'action',
      'commandeId',
      'numeroSuivi',
      'statut',
    ]);
    await rejects(
      actions.execute(c.accessToken, 'CANCEL', c.challengeId, key()),
    );
    ok(
      'Anonymous email-proven cancellation ignores recipient/owner claims, commits one stock return/notification and replays only its immutable result',
    );

    const delivery = await fixture({ modeReception: 'LIVRAISON' });
    await orders.update(delivery.order.id, { statut: 'EN_LIVRAISON' });
    const receive = await consent(delivery, 'RECEIVE'),
      beforeReceive = await stock();
    const received = await Promise.all([execute(receive), execute(receive)]);
    assert.deepEqual(received[0], received[1]);
    assert.equal((await row(receive)).statut, 'LIVREE');
    assert.equal(await stock(), beforeReceive);
    assert.equal(await returns(receive), 0);
    assert.equal(await notifications(receive), 1);
    assert.equal((await cash(receive)).length, 0);
    const pickup = await fixture();
    await rejects(
      actions.request(pickup.accessToken, 'RECEIVE'),
      'GUEST_ACTION_UNAVAILABLE',
    );
    await assert.rejects(
      orders.update(pickup.order.id, { statut: 'EN_LIVRAISON' }),
      /retrait magasin/i,
    );
    await rejects(
      actions.request(receive.accessToken, 'CANCEL'),
      'GUEST_ACTION_UNAVAILABLE',
    );
    ok(
      'Receipt only for dispatched delivery, exactly once, without payment/stock changes; pickup and cancellation after dispatch refused',
    );

    const wrong = await consent(await fixture(), 'CANCEL');
    const wrongCode = wrong.code === '00000000' ? '11111111' : '00000000';
    for (let i = 0; i < 5; i++) await rejects(execute(wrong, wrongCode));
    await rejects(execute(wrong));
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: wrong.challengeId },
        })
      ).attempts,
      5,
    );
    assert.equal(await returns(wrong), 0);
    assert.equal((await row(wrong)).statut, 'EN_ATTENTE');
    const cross = await consent(await fixture(), 'CANCEL');
    await rejects(execute(cross, cross.code, 'RECEIVE'));
    await rejects(
      guests.recover(cross.challengeId, cross.code, key()),
      'GUEST_ACCESS_UNAVAILABLE',
    );
    await rejects(
      links.link(
        cross.accessToken,
        cross.challengeId,
        cross.actionKey,
        clients[0].id,
        cross.code,
      ),
      'GUEST_LINK_INVALID',
    );
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: cross.challengeId },
        })
      ).attempts,
      0,
    );
    ok(
      'Five wrong codes consume consent; cancellation, receipt, recovery and linking purposes cannot be interchanged',
    );

    const stale = await consent(await fixture(), 'CANCEL');
    await orders.update(stale.order.id, { statut: 'CONFIRMEE' });
    await rejects(execute(stale), 'GUEST_ORDER_CHANGED');
    assert.equal(await returns(stale), 0);
    const rotated = await consent(await fixture(), 'CANCEL');
    await db.commandeGuestAccess.update({
      where: { commandeId: rotated.order.id },
      data: { version: { increment: 1 } },
    });
    await rejects(execute(rotated), 'GUEST_ORDER_CHANGED');
    for (const condition of [
      'revoke',
      'code-expiry',
      'access-expiry',
      'send-failure',
    ]) {
      const f = await fixture();
      mail.delivered = condition !== 'send-failure';
      const requested = await actions.request(f.accessToken, 'CANCEL');
      mail.delivered = true;
      const challengeId = (
        await db.commandeGuestChallenge.findFirst({
          where: { commandeId: f.order.id },
        })
      ).id;
      if (condition === 'revoke') await guests.revoke(f.order.id, 'qa');
      if (condition === 'code-expiry')
        await db.commandeGuestChallenge.update({
          where: { id: challengeId },
          data: { expiresAt: new Date(0) },
        });
      if (condition === 'access-expiry')
        await db.commandeGuestAccess.update({
          where: { commandeId: f.order.id },
          data: { expiresAt: new Date(0) },
        });
      if (condition === 'send-failure')
        assert.equal(requested.available, false);
      await rejects(
        actions.execute(
          f.accessToken,
          'CANCEL',
          challengeId,
          f.actionKey,
          mail.messages.at(-1).code,
        ),
      );
      assert.equal(await returns(f), 0);
    }
    ok(
      'Order/access versions, expiry, revocation and failed delivery block sensitive actions without returning stock',
    );

    const race = await consent(await fixture(), 'CANCEL');
    const pausePickup = pauseSnapshot(orders);
    const latePickup = orders
      .processPickup(race.order.id, { paiementSurPlace: true })
      .then(
        () => null,
        (e) => e,
      );
    await pausePickup.ready;
    await execute(race);
    pausePickup.resume();
    const pickupError = await latePickup;
    pausePickup.restore();
    assert.equal(pickupError?.getStatus(), 409);
    assert.equal((await cash(race)).length, 0);
    assert.equal(await returns(race), 1);
    const wonPickup = await consent(await fixture(), 'CANCEL');
    await orders.processPickup(wonPickup.order.id, { paiementSurPlace: true });
    await rejects(execute(wonPickup), 'GUEST_ORDER_CHANGED');
    assert.equal((await cash(wonPickup)).length, 1);
    assert.equal(await returns(wonPickup), 0);
    const duplicate = await fixture();
    const originalFind = orders.findOne.bind(orders);
    let release,
      arrivals = 0;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    orders.findOne = async (id) => {
      const value = await originalFind(id);
      if (++arrivals === 2) release();
      await gate;
      return value;
    };
    const concurrentPickup = await Promise.allSettled([
      orders.processPickup(duplicate.order.id, { paiementSurPlace: true }),
      orders.processPickup(duplicate.order.id, { paiementSurPlace: true }),
    ]);
    orders.findOne = originalFind;
    assert.equal(
      concurrentPickup.filter((r) => r.status === 'fulfilled').length,
      1,
    );
    assert.equal((await cash(duplicate)).length, 1);
    ok(
      'Deterministic cancellation/pickup races have one winner; cancelled orders create no cash and concurrent pickups never record cash twice',
    );

    const adminRace = await consent(
      await fixture({ modeReception: 'LIVRAISON' }),
      'CANCEL',
    );
    const pauseAdmin = pauseSnapshot(orders);
    const lateAdmin = orders
      .update(adminRace.order.id, { statut: 'EN_LIVRAISON' })
      .then(
        () => null,
        (e) => e,
      );
    await pauseAdmin.ready;
    await execute(adminRace);
    pauseAdmin.resume();
    const adminError = await lateAdmin;
    pauseAdmin.restore();
    assert.equal(adminError?.getStatus(), 409);
    assert.equal((await row(adminRace)).statut, 'ANNULEE');
    for (const f of [adminRace, receive])
      await assert.rejects(
        orders.update(f.order.id, { statut: 'EN_ATTENTE' }),
        /terminée/,
      );
    const owned = await fixture({
      modeReception: 'LIVRAISON',
      clientId: clients[0].id,
    });
    await orders.update(owned.order.id, { statut: 'EN_LIVRAISON' });
    const pauseReceive = pauseSnapshot(orders);
    const lateReceipt = orders
      .confirmReception(owned.order.id, clients[0].id)
      .then(
        () => null,
        (e) => e,
      );
    await pauseReceive.ready;
    await db.commande.update({
      where: { id: owned.order.id },
      data: { clientId: clients[1].id, version: { increment: 1 } },
    });
    pauseReceive.resume();
    const ownerError = await lateReceipt;
    pauseReceive.restore();
    assert.equal(ownerError?.getStatus(), 409);
    assert.equal((await row(owned)).statut, 'EN_LIVRAISON');
    await rejects(
      actions.request(owned.accessToken, 'RECEIVE'),
      'GUEST_ACCESS_UNAVAILABLE',
    );
    ok(
      'Admin edits cannot overwrite cancellation/reopen terminal orders; stale account receipt cannot confirm for a different owner',
    );

    const bothLines = products.map((p) => ({
      produitId: p.id,
      nomProduit: p.nomProduit,
      quantite: 2,
      prixUnitaire: 3500,
    }));
    const rollback = await consent(
      await fixture({ lignes: bothLines, montantTotal: 14000 }),
      'CANCEL',
    );
    const beforeRollback = await db.produit.findMany({
      where: { id: { in: products.map((p) => p.id) } },
      orderBy: { id: 'asc' },
    });
    const failingDb = {
      $transaction: (fn) =>
        db.$transaction((tx) => {
          let updates = 0;
          const produit = new Proxy(tx.produit, {
            get: (model, name) =>
              name === 'update'
                ? async (args) => {
                    if (++updates === 2)
                      throw Error('Simulated second stock update failure');
                    return model.update(args);
                  }
                : model[name],
          });
          return fn(
            new Proxy(tx, {
              get: (model, name) =>
                name === 'produit' ? produit : model[name],
            }),
          );
        }),
    };
    await assert.rejects(
      new GuestActionService(failingDb, mail).execute(
        rollback.accessToken,
        rollback.action,
        rollback.challengeId,
        rollback.actionKey,
        rollback.code,
      ),
      /Simulated/,
    );
    assert.deepEqual(
      (
        await db.produit.findMany({
          where: { id: { in: products.map((p) => p.id) } },
          orderBy: { id: 'asc' },
        })
      ).map((p) => p.quantiteStock),
      beforeRollback.map((p) => p.quantiteStock),
    );
    assert.equal((await row(rollback)).statut, 'EN_ATTENTE');
    assert.equal(await returns(rollback), 0);
    assert.equal(await notifications(rollback), 0);
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: rollback.challengeId },
        })
      ).attempts,
      0,
    );
    await execute(rollback);
    assert.equal(await returns(rollback), 2);
    const overlap = [
      await consent(
        await fixture({ lignes: bothLines, montantTotal: 14000 }),
        'CANCEL',
      ),
      await consent(
        await fixture({
          lignes: [...bothLines].reverse(),
          montantTotal: 14000,
        }),
        'CANCEL',
      ),
    ];
    await Promise.all(overlap.map((c) => execute(c)));
    assert.ok(
      (await Promise.all(overlap.map((c) => returns(c)))).every((n) => n === 2),
    );
    ok(
      'Multi-line cancellation rolls back status, stock, movements, code and notification on failure; opposite line orders cancel concurrently without deadlock',
    );

    const budget = await consent(await fixture(), 'CANCEL');
    await assert.rejects(
      actions.request(budget.accessToken, 'CANCEL'),
      (e) => e.getStatus?.() === 429,
    );
    await age(budget.challengeId);
    const recovery = await guests.requestRecovery(
      budget.order.numeroSuivi,
      'checkout@example.invalid',
    );
    await rejects(execute(budget));
    await age(recovery.challengeId);
    const linked = await links.request(budget.accessToken, clients[0].id);
    await age(linked.challengeId);
    await assert.rejects(
      actions.request(budget.accessToken, 'CANCEL'),
      (e) => e.getStatus?.() === 429,
    );
    const done = await consent(await fixture(), 'CANCEL');
    const immutable = await execute(done);
    await age(done.challengeId);
    const linkRequest = await links.request(done.accessToken, clients[0].id);
    await links.link(
      done.accessToken,
      linkRequest.challengeId,
      key(),
      clients[0].id,
      mail.messages.at(-1).code,
    );
    assert.deepEqual(
      await actions.execute(
        done.accessToken,
        'CANCEL',
        done.challengeId,
        done.actionKey,
      ),
      immutable,
    );
    await db.commandeGuestChallenge.update({
      where: { id: done.challengeId },
      data: { completedAt: new Date(Date.now() - 31 * 86400000) },
    });
    await rejects(
      actions.execute(
        done.accessToken,
        'CANCEL',
        done.challengeId,
        done.actionKey,
      ),
    );
    mail.enabled = false;
    assert.equal((await actions.request(key(), 'CANCEL')).available, false);
    mail.enabled = true;
    const noEmail = await fixture();
    await db.commandeGuestAccess.update({
      where: { commandeId: noEmail.order.id },
      data: { recoveryEmail: null },
    });
    await rejects(
      actions.request(noEmail.accessToken, 'CANCEL'),
      'GUEST_EMAIL_MISSING',
    );
    ok(
      'All purposes share sending limits; completed receipts expose no fresh ownership/PII and expire; absent channel/email is explicit',
    );

    if (process.env.NEWOTEG_GUEST_TEST_BROWSER === 'true') {
      const {
        chromium,
      } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
      const {
        expect,
      } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
      browser = await chromium.launch({
        headless: true,
        executablePath:
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      });
      fs.mkdirSync(output, { recursive: true });
      for (const [width, action, lang] of [
        [360, 'CANCEL', 'fr'],
        [390, 'CANCEL', 'fr'],
        [1440, 'RECEIVE', 'en'],
      ]) {
        const f = await fixture({
          modeReception: action === 'RECEIVE' ? 'LIVRAISON' : 'RETRAIT_MAGASIN',
        });
        if (action === 'RECEIVE')
          await orders.update(f.order.id, { statut: 'EN_LIVRAISON' });
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          locale: lang === 'fr' ? 'fr-FR' : 'en-GB',
        });
        await context.addInitScript(
          (lang) => localStorage.setItem('appLang', lang),
          lang,
        );
        const page = await context.newPage(),
          errors = [],
          external = [];
        let submissions = 0,
          lost = false;
        page.on('pageerror', (e) => errors.push(e.message));
        await context.route('**/*', async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (url.hostname !== '127.0.0.1') {
            external.push(url.hostname);
            return route.abort();
          }
          if (!url.pathname.startsWith('/api/')) return route.continue();
          if (url.pathname.startsWith('/api/commandes/guest/')) {
            const response = await fetch(httpBase + url.pathname, {
              method: request.method(),
              headers: { 'Content-Type': 'application/json' },
              ...(request.postData() ? { body: request.postData() } : {}),
            });
            const data = await response.json();
            if (
              url.pathname === '/api/commandes/guest/actions' &&
              request.postDataJSON()?.code
            ) {
              submissions++;
              if (!lost && response.status === 200) {
                lost = true;
                return route.abort('failed');
              }
            }
            return route.fulfill({
              status: response.status,
              contentType: 'application/json',
              body: JSON.stringify(data),
            });
          }
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(
              url.pathname === '/api/produits'
                ? { data: [], meta: { total: 0, lastPage: 1 } }
                : [],
            ),
          });
        });
        await page.goto(
          'http://127.0.0.1:5187/suivi-invite#acces=' + f.accessToken,
        );
        await expect(
          page.getByRole('heading', { name: f.order.numeroSuivi }),
        ).toBeVisible();
        await page
          .getByRole('button', {
            name: lang === 'fr' ? 'Annuler la commande' : 'Confirm receipt',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', {
            name:
              lang === 'fr'
                ? 'Recevoir un code d’annulation'
                : 'Get a receipt code',
            exact: true,
          })
          .click();
        const label =
          lang === 'fr'
            ? 'Code reçu par email pour cette action'
            : 'Email code for this action';
        await expect(page.getByLabel(label)).toBeVisible();
        await page
          .getByRole('dialog')
          .screenshot({
            path: path.join(output, `consent-${action}-${width}.png`),
          });
        const code = mail.messages.at(-1).code;
        await page.getByLabel(label).fill(code);
        await page
          .getByRole('button', {
            name:
              lang === 'fr'
                ? 'Confirmer l’annulation'
                : 'Confirm receipt of items',
            exact: true,
          })
          .click();
        await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
        assert.equal(
          JSON.stringify(
            await page.evaluate(() =>
              JSON.parse(sessionStorage.getItem('newoteg_guest_action_v1')),
            ),
          ).includes(code),
          false,
        );
        await page.reload();
        await page
          .getByRole('button', {
            name:
              lang === 'fr'
                ? 'Vérifier le résultat de ma demande'
                : 'Check my request result',
            exact: true,
          })
          .click();
        await expect(
          page
            .getByRole('status')
            .filter({
              hasText:
                lang === 'fr'
                  ? 'Votre commande a été annulée'
                  : 'Receipt has been confirmed',
            }),
        ).toBeVisible();
        assert.equal(submissions, 1);
        assert.equal(await notifications(f), 1);
        assert.equal(await returns(f), action === 'CANCEL' ? 1 : 0);
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        assert.equal(
          await page.evaluate(() =>
            sessionStorage.getItem('newoteg_guest_action_v1'),
          ),
          null,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.screenshot({
          path: path.join(output, `done-${action}-${width}.png`),
          fullPage: true,
          mask: [page.locator('input[readonly]')],
        });
        await context.close();
      }
      ok(
        'FR mobile 360/390 and EN desktop 1440: explicit consent, dropped committed response, reload and result check without second OTP or external requests',
      );
    }
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, 'result.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          isolatedDatabase:
            target.hostname + ':' + target.port + target.pathname,
          realEmail: false,
          realSms: false,
          realPayment: false,
          checks,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    if (app) await app.close();
    if (fixtures.length) {
      const references = fixtures.map((f) => f.order.numeroSuivi);
      await db.notification.deleteMany({
        where: {
          OR: references.map((ref) => ({ message: { contains: ref } })),
        },
      });
      await db.caisse.deleteMany({
        where: {
          OR: references.map((ref) => ({
            motif: { startsWith: 'Retrait magasin - Commande ' + ref },
          })),
        },
      });
      await db.commande.deleteMany({
        where: { id: { in: fixtures.map((f) => f.order.id) } },
      });
    }
    if (requestIds.length)
      await db.commandeRequest.deleteMany({
        where: { requestId: { in: requestIds } },
      });
    if (clients.length)
      await db.client.deleteMany({
        where: { id: { in: clients.map((c) => c.id) } },
      });
    if (products.length)
      await db.produit.updateMany({
        where: { id: { in: products.map((p) => p.id) } },
        data: { estActif: false },
      });
    await db.$disconnect();
    await pool.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
