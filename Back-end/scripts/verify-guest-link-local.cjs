// Real PostgreSQL, real JWT/HTTP controllers, fictitious data, captured mail.
// Deliberately never loads .env or contacts Railway/SMTP.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs'),
  path = require('node:path');
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
  { JwtModule, JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { JwtStrategy } = require('../dist/src/auth/jwt.strategy');
const { AuthController } = require('../dist/src/auth/auth.controller');
const { AuthService } = require('../dist/src/auth/auth.service');
const {
  CommandeController,
} = require('../dist/src/commande/commande.controller');
const { CommandeService } = require('../dist/src/commande/commande.service');
const { DatabaseService } = require('../dist/src/database/database.service');
const { MailService } = require('../dist/src/auth/mail.service');
const {
  GuestOrderService,
} = require('../dist/src/commande/guest-order.service');
const {
  GuestOrderController,
} = require('../dist/src/commande/guest-order.controller');
const { GuestLinkService } = require('../dist/src/commande/guest-link.service');
const {
  GuestLinkController,
} = require('../dist/src/commande/guest-link.controller');
const { guestTokenHash } = require('../dist/src/commande/guest-access');
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
  async sendGuestAccessCode(to, code) {
    this.messages.push({ to, code, purpose: 'RECOVER' });
    return this.delivered;
  },
  async sendGuestLinkCode(to, code, reference, accountEmail) {
    this.messages.push({ to, code, reference, accountEmail, purpose: 'LINK' });
    return this.delivered;
  },
};
const links = new GuestLinkService(db, mail),
  guests = new GuestOrderService(db, mail);
const ids = [],
  clientIds = [],
  checks = [];
let product, category, app, browser, httpBase, jwt;
const output =
  'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/guest-link';
const key = () => randomBytes(32).toString('base64url');
function ok(name) {
  checks.push(name);
  console.log('PASS ' + name);
}
async function rejects(task, expected = 'GUEST_LINK_INVALID') {
  await assert.rejects(task, (e) => e.getResponse?.().code === expected);
}
async function fixture(extra = {}) {
  const accessToken = key(),
    actionKey = key();
  const order = await db.commande.create({
    data: {
      numeroSuivi: 'DEMO-LINK-' + randomUUID().slice(0, 8),
      nomClient: 'NOM PRIVE FICTIF',
      telephone: '600000000',
      adresseLivraison: 'ADRESSE PRIVEE FICTIVE',
      montantTotal: 3500,
      modeReception: 'RETRAIT_MAGASIN',
      lignes: {
        create: {
          produitId: product.id,
          nomProduit: product.nomProduit,
          quantite: 1,
          prixUnitaire: 3500,
          sousTotal: 3500,
        },
      },
      guestAccess: {
        create: {
          tokenHash: guestTokenHash(accessToken),
          recoveryEmail: 'checkout@example.invalid',
          expiresAt: new Date(Date.now() + 86400000),
          ...extra,
        },
      },
    },
  });
  ids.push(order.id);
  return { order, accessToken, actionKey };
}
async function challenge(f, client) {
  const response = await links.request(f.accessToken, client.id);
  assert.ok(response.challengeId);
  return {
    ...f,
    challengeId: response.challengeId,
    code: mail.messages.at(-1).code,
  };
}
async function aged(id) {
  await db.commandeGuestChallenge.update({
    where: { id },
    data: { createdAt: new Date(Date.now() - 61000) },
  });
}
async function post(pathname, payload, client) {
  const response = await fetch(httpBase + '/api/commandes/guest/' + pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(client
        ? {
            Authorization:
              'Bearer ' +
              jwt.sign({
                sub: client.id,
                email: client.email,
                nom: client.nom,
              }),
          }
        : {}),
    },
    body: JSON.stringify(payload),
  });
  return {
    status: response.status,
    data: await response.json(),
    headers: response.headers,
  };
}
(async () => {
  try {
    const columns = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'commande_guest_challenge' AND column_name = 'purpose'",
    );
    if (!columns.rowCount) {
      if (process.env.NEWOTEG_GUEST_APPLY_SCHEMA !== 'true')
        throw Error('Explicit isolated apply flag required for linking schema');
      const sql = fs.readFileSync(
        path.join(
          __dirname,
          '../prisma/migrations/20261003100000_guest_order_link/migration.sql',
        ),
        'utf8',
      );
      assert.ok(!/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/i.test(sql));
      const conn = await pool.connect();
      try {
        await conn.query('BEGIN');
        await conn.query(sql);
        await conn.query('COMMIT');
      } catch (error) {
        await conn.query('ROLLBACK');
        throw error;
      } finally {
        conn.release();
      }
      ok('Additive linking columns applied only to isolated local PostgreSQL');
    }
    category = await db.categorie.create({
      data: { nom: 'Recette rattachement ' + randomUUID() },
    });
    product = await db.produit.create({
      data: {
        categorieId: category.id,
        nomProduit: 'Démonstration — câble rattachement',
        code: 'DEMO-LINK-' + randomUUID().slice(0, 8),
        codeFamille: 'RECETTE',
        quantiteStock: 20,
        prixDetail: 3500,
      },
    });
    const clients = [];
    for (let i = 0; i < 2; i++) {
      const c = await db.client.create({
        data: {
          nom: 'Compte fictif ' + i,
          email: `link-${randomUUID()}@example.invalid`,
          telephone: i ? '600000001' : '600000000',
          emailVerifie: true,
        },
      });
      clients.push(c);
      clientIds.push(c.id);
    }
    const [owner, other] = clients;
    const module = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '5m' },
        }),
      ],
      controllers: [
        GuestLinkController,
        GuestOrderController,
        AuthController,
        CommandeController,
      ],
      providers: [
        GuestLinkService,
        GuestOrderService,
        JwtStrategy,
        AuthService,
        {
          provide: CommandeService,
          useValue: new CommandeService(db, { create: async () => ({}) }, {}),
        },
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

    const f = await fixture();
    assert.equal(
      (await post('link/request', { accessToken: f.accessToken })).status,
      401,
    );
    assert.equal(
      (
        await post('link', {
          accessToken: f.accessToken,
          actionKey: f.actionKey,
          challengeId: randomUUID(),
          code: '12345678',
        })
      ).status,
      401,
    );
    assert.equal(mail.messages.length, 0);
    assert.equal(
      (await db.commande.findUnique({ where: { id: f.order.id } })).clientId,
      null,
    );
    ok(
      'Read link and matching phone grant no account ownership; unauthenticated actions refused',
    );

    const sent = await post(
      'link/request',
      {
        accessToken: f.accessToken,
        clientId: other.id,
        email: 'attacker@example.invalid',
      },
      owner,
    );
    assert.equal(sent.status, 200);
    assert.equal(sent.headers.get('cache-control'), 'private, no-store');
    assert.equal(mail.messages.at(-1).to, 'checkout@example.invalid');
    assert.equal(mail.messages.at(-1).accountEmail, owner.email);
    const c = {
      ...f,
      challengeId: sent.data.challengeId,
      code: mail.messages.at(-1).code,
    };
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: c.challengeId },
        })
      ).targetClientId,
      owner.id,
    );
    await rejects(
      links.link(c.accessToken, c.challengeId, c.actionKey, other.id, c.code),
    );
    await rejects(
      guests.recover(c.challengeId, c.code, key()),
      'GUEST_ACCESS_UNAVAILABLE',
    );
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: c.challengeId },
        })
      ).attempts,
      0,
    );
    ok(
      'Recipient fixed at checkout, destination from real JWT only, recovery/link codes and accounts isolated',
    );

    const body = {
      accessToken: c.accessToken,
      actionKey: c.actionKey,
      challengeId: c.challengeId,
    };
    assert.equal(
      (await post('link', body, owner)).data.code,
      'GUEST_LINK_CODE_REQUIRED',
    );
    const results = await Promise.all([
      post('link', { ...body, code: c.code }, owner),
      post('link', { ...body, code: c.code }, owner),
    ]);
    assert.ok(results.every((r) => r.status === 200));
    assert.deepEqual(results[0].data, results[1].data);
    const linked = await db.commande.findUnique({ where: { id: c.order.id } });
    assert.equal(linked.clientId, owner.id);
    assert.equal(linked.version, c.order.version + 1);
    for (const client of [owner, other]) {
      const response = await fetch(httpBase + '/api/commandes/my-orders', {
        headers: { Authorization: 'Bearer ' + jwt.sign({ sub: client.id }) },
      });
      assert.equal(response.status, 200);
      const ownedOrders = await response.json();
      assert.equal(
        ownedOrders.some((order) => order.id === c.order.id),
        client.id === owner.id,
      );
    }
    assert.equal(
      (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock,
      20,
    );
    await rejects(guests.read(c.accessToken), 'GUEST_ACCESS_UNAVAILABLE');
    await rejects(links.link(c.accessToken, c.challengeId, key(), owner.id));
    await rejects(
      links.link(c.accessToken, c.challengeId, c.actionKey, other.id),
    );
    const receipt = await post('link', body, owner);
    assert.deepEqual(receipt.data, results[0].data);
    assert.deepEqual(Object.keys(receipt.data).sort(), [
      'commandeId',
      'linked',
      'numeroSuivi',
    ]);
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: c.challengeId },
        })
      ).attempts,
      1,
    );
    ok(
      'Concurrent exact retries link once, return immutable minimal receipt, revoke guest access and leave stock/payment untouched',
    );
    await db.commandeGuestChallenge.update({
      where: { id: c.challengeId },
      data: { completedAt: new Date(Date.now() - 31 * 86400000) },
    });
    await rejects(
      links.link(c.accessToken, c.challengeId, c.actionKey, owner.id),
    );

    const wrong = await challenge(await fixture(), owner);
    const wrongCode = wrong.code === '00000000' ? '11111111' : '00000000';
    for (let i = 0; i < 5; i++)
      await rejects(
        links.link(
          wrong.accessToken,
          wrong.challengeId,
          wrong.actionKey,
          owner.id,
          wrongCode,
        ),
      );
    await rejects(
      links.link(
        wrong.accessToken,
        wrong.challengeId,
        wrong.actionKey,
        owner.id,
        wrong.code,
      ),
    );
    const exhausted = await db.commandeGuestChallenge.findUnique({
      where: { id: wrong.challengeId },
    });
    assert.equal(exhausted.attempts, 5);
    assert.ok(exhausted.consumedAt);
    assert.equal(
      (await db.commande.findUnique({ where: { id: wrong.order.id } }))
        .clientId,
      null,
    );
    ok(
      'Five wrong codes are committed, consume consent and cannot attach the order',
    );

    const stale = await challenge(await fixture(), owner);
    await db.commande.update({
      where: { id: stale.order.id },
      data: { statut: 'CONFIRMEE', version: { increment: 1 } },
    });
    await rejects(
      links.link(
        stale.accessToken,
        stale.challengeId,
        stale.actionKey,
        owner.id,
        stale.code,
      ),
      'GUEST_ORDER_CHANGED',
    );
    assert.equal(
      (await db.commande.findUnique({ where: { id: stale.order.id } }))
        .clientId,
      null,
    );
    const rotated = await challenge(await fixture(), owner);
    await db.commandeGuestAccess.update({
      where: { commandeId: rotated.order.id },
      data: { version: { increment: 1 } },
    });
    await rejects(
      links.link(
        rotated.accessToken,
        rotated.challengeId,
        rotated.actionKey,
        owner.id,
        rotated.code,
      ),
      'GUEST_ORDER_CHANGED',
    );
    ok(
      'Order/access version changes consume stale consent and require a new explicit request',
    );

    for (const condition of ['revoked', 'expired', 'failed']) {
      const next = await fixture();
      mail.delivered = condition !== 'failed';
      const requested = await links.request(next.accessToken, owner.id);
      mail.delivered = true;
      const challengeId = (
        await db.commandeGuestChallenge.findFirst({
          where: { commandeId: next.order.id },
        })
      ).id;
      if (condition === 'revoked') await guests.revoke(next.order.id, 'qa');
      if (condition === 'expired')
        await db.commandeGuestChallenge.update({
          where: { id: challengeId },
          data: { expiresAt: new Date(0) },
        });
      if (condition === 'failed') assert.equal(requested.available, false);
      await rejects(
        links.link(
          next.accessToken,
          challengeId,
          next.actionKey,
          owner.id,
          mail.messages.at(-1).code,
        ),
      );
    }
    ok('Revocation, expiry and captured email failure prevent linking');

    const budget = await fixture();
    const first = await challenge(budget, owner);
    await assert.rejects(
      links.request(budget.accessToken, owner.id),
      (e) => e.getStatus?.() === 429,
    );
    await aged(first.challengeId);
    const recovery = await guests.requestRecovery(
      budget.order.numeroSuivi,
      'checkout@example.invalid',
    );
    await rejects(
      links.link(
        first.accessToken,
        first.challengeId,
        first.actionKey,
        owner.id,
        first.code,
      ),
    );
    await aged(recovery.challengeId);
    const third = await links.request(budget.accessToken, owner.id);
    await aged(third.challengeId);
    await assert.rejects(
      links.request(budget.accessToken, owner.id),
      (e) => e.getStatus?.() === 429,
    );
    await rejects(
      guests.recover(recovery.challengeId, mail.messages.at(-2).code, key()),
      'GUEST_ACCESS_UNAVAILABLE',
    );
    assert.equal(
      await db.commandeGuestChallenge.count({
        where: { commandeId: budget.order.id },
      }),
      3,
    );
    ok(
      'Link and recovery share 60-second cooldown, three-per-hour budget, replacement of pending consent',
    );

    mail.enabled = false;
    assert.equal(
      (await links.request((await fixture()).accessToken, owner.id)).available,
      false,
    );
    mail.enabled = true;
    const unrecorded = await fixture({ recoveryEmail: null });
    await rejects(
      links.request(unrecorded.accessToken, owner.id),
      'GUEST_EMAIL_MISSING',
    );
    ok(
      'Unavailable provider or missing checkout email never offers a false recovery path',
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
      for (const width of [390, 1440]) {
        const ui = await fixture(),
          errors = [],
          external = [];
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          locale: 'fr-FR',
        });
        const authToken = jwt.sign({
          sub: owner.id,
          email: owner.email,
          nom: owner.nom,
        });
        await context.addInitScript(
          ({ authToken, owner }) => {
            localStorage.setItem('newoteg_token', authToken);
            localStorage.setItem('newoteg_user', JSON.stringify(owner));
          },
          { authToken, owner },
        );
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        let lost = false,
          submissions = 0;
        await context.route('**/*', async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (url.hostname !== '127.0.0.1') {
            external.push(url.hostname);
            return route.abort();
          }
          if (!url.pathname.startsWith('/api/')) return route.continue();
          const send = (data) =>
            route.fulfill({
              contentType: 'application/json',
              body: JSON.stringify(data),
            });
          if (
            url.pathname.startsWith('/api/commandes/guest/') ||
            url.pathname === '/api/auth/me' ||
            url.pathname === '/api/commandes/my-orders'
          ) {
            const response = await fetch(httpBase + url.pathname, {
              method: request.method(),
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + authToken,
              },
              ...(request.postData() ? { body: request.postData() } : {}),
            });
            const data = await response.json();
            if (
              url.pathname === '/api/commandes/guest/link' &&
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
          if (url.pathname === '/api/produits')
            return send({ data: [], meta: { total: 0, lastPage: 1 } });
          return send([]);
        });
        await page.goto(
          'http://127.0.0.1:5187/suivi-invite#acces=' + ui.accessToken,
        );
        await expect(
          page.getByRole('heading', { name: ui.order.numeroSuivi }),
        ).toBeVisible();
        await page
          .getByRole('button', { name: 'Rattacher à mon compte', exact: true })
          .click();
        await expect(page.getByRole('dialog')).toContainText(owner.email);
        await page
          .getByRole('button', {
            name: 'Recevoir un code de rattachement',
            exact: true,
          })
          .click();
        await expect(
          page.getByLabel('Code de rattachement reçu par email'),
        ).toBeVisible();
        await page
          .getByRole('dialog')
          .screenshot({ path: path.join(output, 'consent-' + width + '.png') });
        const uiCode = mail.messages.at(-1).code;
        await page
          .getByLabel('Code de rattachement reçu par email')
          .fill(uiCode);
        await page
          .getByRole('button', {
            name: 'Confirmer le rattachement',
            exact: true,
          })
          .click();
        await expect(
          page
            .getByRole('alert')
            .filter({ hasText: /réponse|Network|réseau/i }),
        ).toBeVisible();
        const pending = await page.evaluate(() =>
          JSON.parse(sessionStorage.getItem('newoteg_guest_link_v1')),
        );
        assert.ok(pending?.actionKey);
        assert.equal(JSON.stringify(pending).includes(uiCode), false);
        await page.reload();
        await page
          .getByRole('button', {
            name: 'Vérifier le résultat du rattachement',
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(
          'http://127.0.0.1:5187/commandes/' + ui.order.id,
        );
        await expect(
          page.getByRole('heading', { name: ui.order.numeroSuivi }),
        ).toBeVisible();
        assert.equal(submissions, 1);
        assert.deepEqual(errors, []);
        assert.deepEqual(external, []);
        assert.equal(
          await page.evaluate(() =>
            sessionStorage.getItem('newoteg_guest_link_v1'),
          ),
          null,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
        await page.screenshot({
          path: path.join(output, 'linked-' + width + '.png'),
          fullPage: true,
        });
        await context.close();
      }
      ok(
        'Mobile/desktop UI explicit consent, lost response, reload and immutable receipt redirect without resending OTP or external requests',
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
          checks,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    if (app) await app.close();
    if (ids.length)
      await db.commande.deleteMany({ where: { id: { in: ids } } });
    if (clientIds.length)
      await db.client.deleteMany({ where: { id: { in: clientIds } } });
    if (product)
      await db.produit.update({
        where: { id: product.id },
        data: { estActif: false },
      });
    await db.$disconnect();
    await pool.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
