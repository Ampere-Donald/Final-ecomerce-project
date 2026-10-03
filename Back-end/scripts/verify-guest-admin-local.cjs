// Dedicated local PostgreSQL only. Fictitious data, captured mail, no .env.
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
const { DatabaseService } = require(root + 'database/database.service'),
  { MailService } = require(root + 'auth/mail.service');
const { AdminJwtStrategy } = require(root + 'admin-auth/admin-jwt.strategy');
const { CommandeController } = require(root + 'commande/commande.controller'),
  { CommandeService } = require(root + 'commande/commande.service');
const { GuestOrderController } = require(
    root + 'commande/guest-order.controller',
  ),
  { GuestOrderService } = require(root + 'commande/guest-order.service');
const { GuestLinkService } = require(root + 'commande/guest-link.service');
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const mail = {
  last: null,
  count: 0,
  guestRecoveryAvailable: () => true,
  async sendGuestAccessCode(to, code) {
    this.last = { to, code };
    this.count++;
    return true;
  },
  async sendGuestLinkCode(to, code) {
    this.last = { to, code };
    this.count++;
    return true;
  },
};
const guests = new GuestOrderService(db, mail),
  links = new GuestLinkService(db, mail);
const orders = new CommandeService(db, { create: async () => ({}) }, {});
const output =
  'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/guest-admin';
const admins = [],
  fixtures = [],
  requestIds = [],
  checks = [];
let product, client, app, browser, jwt, httpBase;
const key = () => randomBytes(32).toString('base64url');
function ok(name) {
  checks.push(name);
  console.log('PASS ' + name);
}
async function fixture(extra = {}) {
  const requestId = randomUUID(),
    accessToken = key();
  requestIds.push(requestId);
  const result = await orders.createWithAccount({
    requestId,
    guestAccessKey: accessToken,
    guestEmail: 'private@example.invalid',
    nomClient: 'Client fictif accès boutique',
    telephone: '600000010',
    adresseLivraison: 'Retrait Akwa — recette fictive',
    modeReception: 'RETRAIT_MAGASIN',
    montantTotal: 3500,
    lignes: [
      {
        produitId: product.id,
        nomProduit: product.nomProduit,
        quantite: 1,
        prixUnitaire: 3500,
      },
    ],
    ...extra,
  });
  const f = { order: result.commande, accessToken };
  fixtures.push(f);
  return f;
}
const grant = (f) =>
  db.commandeGuestAccess.findUnique({ where: { commandeId: f.order.id } });
async function http(url, token, body) {
  return fetch(httpBase + url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function adminToken(admin, overrides = {}) {
  return jwt.sign({
    sub: admin.id,
    role: admin.role,
    type: 'admin',
    sessionVersion: admin.sessionVersion,
    ...overrides,
  });
}

(async () => {
  try {
    const category = await db.categorie.create({
      data: { nom: 'Recette accès administration ' + randomUUID() },
    });
    product = await db.produit.create({
      data: {
        categorieId: category.id,
        nomProduit: 'Démonstration — câble suivi boutique',
        code: 'DEMO-GUEST-ADMIN-' + randomUUID().slice(0, 8),
        codeFamille: 'RECETTE',
        quantiteStock: 60,
        prixDetail: 3500,
      },
    });
    client = await db.client.create({
      data: {
        nom: 'Compte fictif rattachement boutique',
        telephone: '600000011',
        email: 'account-' + randomUUID() + '@example.invalid',
        motDePasse: 'UNUSABLE-LOCAL-FIXTURE',
      },
    });
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'VENDEUR', 'CAISSIER'])
      admins.push(
        await db.adminUser.create({
          data: {
            username: 'recette-' + randomUUID().slice(0, 8),
            nom: 'Recette ' + role,
            role,
            isActive: true,
            sessionVersion: 1,
          },
        }),
      );
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: process.env.JWT_SECRET }),
      ],
      controllers: [GuestOrderController, CommandeController],
      providers: [
        AdminJwtStrategy,
        { provide: DatabaseService, useValue: db },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => process.env.JWT_SECRET },
        },
        { provide: MailService, useValue: mail },
        { provide: GuestOrderService, useValue: guests },
        { provide: CommandeService, useValue: orders },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.enableCors({ origin: ['http://127.0.0.1:5174'] });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    httpBase = 'http://127.0.0.1:' + app.getHttpServer().address().port;
    jwt = module.get(JwtService);
    const f = await fixture(),
      statusUrl = '/api/commandes/guest/admin/' + f.order.id,
      revokeUrl = statusUrl + '/revoke';
    assert.equal((await http(statusUrl)).status, 401);
    assert.equal((await http(revokeUrl, null, {})).status, 401);
    assert.equal(
      (await http(statusUrl, jwt.sign({ sub: client.id, type: 'client' })))
        .status,
      401,
    );
    for (const admin of admins.slice(2)) {
      // The signed role does not override the current database role.
      const token = adminToken(admin, { role: 'SUPER_ADMIN' });
      assert.equal((await http(statusUrl, token)).status, 403);
      assert.equal((await http(revokeUrl, token, {})).status, 403);
    }
    assert.equal(
      (await http(statusUrl, adminToken(admins[0], { sessionVersion: 0 })))
        .status,
      401,
    );
    await db.adminUser.update({
      where: { id: admins[3].id },
      data: { isActive: false },
    });
    assert.equal((await http(statusUrl, adminToken(admins[3]))).status, 401);
    ok(
      'Real admin JWT and database roles: anonymous/client/vendor/cashier/revoked or inactive sessions cannot read or revoke private access',
    );

    for (const admin of admins.slice(0, 2)) {
      const response = await http(
        statusUrl,
        adminToken(admin, { role: 'VENDEUR' }),
      );
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
      const data = await response.json(),
        text = JSON.stringify(data),
        saved = await grant(f);
      assert.equal(data.state, 'ACTIVE');
      assert.equal(data.canRevoke, true);
      assert.deepEqual(Object.keys(data.grant).sort(), [
        'expiresAt',
        'issuedAt',
        'reason',
        'revokedAt',
        'version',
      ]);
      for (const secret of [
        f.accessToken,
        saved.tokenHash,
        'private@example.invalid',
        'codeHash',
        'proofHash',
        'clientId',
      ])
        assert.ok(!text.includes(secret));
    }
    assert.equal(mail.count, 0);
    assert.equal(
      (
        await http(
          '/api/commandes/guest/admin/' + randomUUID(),
          adminToken(admins[0]),
        )
      ).status,
      404,
    );
    assert.equal(
      (await http(revokeUrl, adminToken(admins[0]), { expectedVersion: '1' }))
        .status,
      400,
    );
    assert.equal(
      (await http(revokeUrl, adminToken(admins[0]), { expectedVersion: 0 }))
        .status,
      400,
    );
    ok(
      'Authorised lookup projects only state/dates/reason/version, private headers, no keys/email/codes or sending; unknown orders and invalid versions refused',
    );

    const old = await grant(f),
      recovery = await guests.requestRecovery(
        f.order.numeroSuivi,
        'private@example.invalid',
      );
    const beforeOrder = await db.commande.findUnique({
        where: { id: f.order.id },
      }),
      beforeStock = (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock;
    const beforeMovements = await db.mouvementStock.count({
      where: { produitId: product.id },
    });
    const responses = await Promise.all(
      admins.slice(0, 2).map((admin, index) =>
        http(revokeUrl, adminToken(admin), {
          expectedVersion: old.version,
          reason: 'Motif fictif ' + index,
          revokedBy: 'FORGED-ACTOR',
        }),
      ),
    );
    assert.deepEqual(
      responses.map((r) => r.status),
      [200, 200],
    );
    const revoked = await grant(f);
    assert.equal(revoked.version, old.version + 1);
    assert.ok(admins.some((a) => a.id === revoked.revokedBy));
    await guests.revoke(
      f.order.id,
      admins[1].id,
      'Tentative de réécriture',
      old.version,
    );
    assert.deepEqual(await grant(f), revoked);
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: recovery.challengeId },
        })
      ).consumedAt !== null,
      true,
    );
    await assert.rejects(() => guests.read(f.accessToken));
    await assert.rejects(() =>
      guests.recover(recovery.challengeId, mail.last.code, key()),
    );
    assert.deepEqual(
      await db.commande.findUnique({ where: { id: f.order.id } }),
      beforeOrder,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock,
      beforeStock,
    );
    assert.equal(
      await db.mouvementStock.count({ where: { produitId: product.id } }),
      beforeMovements,
    );
    ok(
      'Concurrent/idempotent revocation preserves first actor/date/reason, consumes pending codes and closes read/recovery without changing order or stock',
    );

    const stale = await fixture(),
      challenge = await guests.requestRecovery(
        stale.order.numeroSuivi,
        'private@example.invalid',
      ),
      rotatedKey = key();
    await guests.recover(challenge.challengeId, mail.last.code, rotatedKey);
    const rotated = await grant(stale);
    assert.equal(
      (
        await http(
          '/api/commandes/guest/admin/' + stale.order.id + '/revoke',
          adminToken(admins[0]),
          { expectedVersion: rotated.version - 1, reason: 'Ancien écran' },
        )
      ).status,
      409,
    );
    assert.deepEqual(await grant(stale), rotated);
    await guests.read(rotatedKey);
    const rollback = await fixture(),
      rollbackGrant = await grant(rollback);
    const brokenDb = {
      $transaction: (callback) =>
        db.$transaction((tx) =>
          callback(
            new Proxy(tx, {
              get(object, property) {
                if (property === 'commandeGuestChallenge')
                  return {
                    updateMany: () => {
                      throw Error('Injected challenge failure');
                    },
                  };
                const value = object[property];
                return typeof value === 'function' ? value.bind(object) : value;
              },
            }),
          ),
        ),
    };
    await assert.rejects(() =>
      new GuestOrderService(brokenDb, mail).revoke(
        rollback.order.id,
        admins[0].id,
        'Échec fictif',
        rollbackGrant.version,
      ),
    );
    assert.deepEqual(await grant(rollback), rollbackGrant);
    ok(
      'Stale screen cannot revoke a recovered access; a failure consuming challenges rolls back revocation and version',
    );

    const expired = await fixture();
    await db.commandeGuestAccess.update({
      where: { commandeId: expired.order.id },
      data: { expiresAt: new Date(0) },
    });
    assert.equal((await guests.adminStatus(expired.order.id)).state, 'EXPIRED');
    const legacy = await fixture();
    await db.commandeGuestAccess.delete({
      where: { commandeId: legacy.order.id },
    });
    assert.equal(
      (await guests.adminStatus(legacy.order.id)).state,
      'NO_ACCESS',
    );
    await db.commande.update({
      where: { id: legacy.order.id },
      data: { clientId: client.id },
    });
    assert.equal((await guests.adminStatus(legacy.order.id)).state, 'ACCOUNT');
    const linked = await fixture();
    const linkConsent = await links.request(linked.accessToken, client.id);
    await links.link(
      linked.accessToken,
      linkConsent.challengeId,
      key(),
      client.id,
      mail.last.code,
    );
    assert.equal((await guests.adminStatus(linked.order.id)).state, 'LINKED');
    assert.equal((await guests.adminStatus(linked.order.id)).canRevoke, false);
    const linkedGrant = await grant(linked);
    await guests.revoke(
      linked.order.id,
      admins[0].id,
      'Rejeu inutile',
      linkedGrant.version,
    );
    assert.deepEqual(await grant(linked), linkedGrant);
    for (let i = 0; i < 4; i++) {
      const race = await fixture(),
        consent = await links.request(race.accessToken, client.id),
        code = mail.last.code;
      const results = await Promise.allSettled([
        guests.revoke(race.order.id, admins[0].id, 'Course fictive', 1),
        links.link(
          race.accessToken,
          consent.challengeId,
          key(),
          client.id,
          code,
        ),
      ]);
      assert.equal(results[0].status, 'fulfilled');
      const order = await db.commande.findUnique({
        where: { id: race.order.id },
      });
      assert.equal(
        order.clientId,
        results[1].status === 'fulfilled' ? client.id : null,
      );
      assert.ok((await grant(race)).revokedAt);
      await assert.rejects(() => guests.read(race.accessToken));
    }
    ok(
      'Expired/legacy/account/linked states are distinct; linking and revocation races preserve account ownership and never reopen guest access',
    );

    if (process.env.NEWOTEG_GUEST_TEST_BROWSER === 'true') {
      const runtime =
        'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
      const { chromium } = require(runtime),
        { expect } = require(runtime + '/test');
      browser = await chromium.launch({
        executablePath:
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        headless: true,
      });
      fs.mkdirSync(output, { recursive: true });
      for (const width of [360, 390, 1440]) {
        const ui = await fixture(),
          admin = admins[0],
          token = adminToken(admin),
          origin = 'http://127.0.0.1:5174';
        const context = await browser.newContext({
            viewport: { width, height: 1000 },
          }),
          page = await context.newPage();
        let posts = 0;
        const errors = [],
          outside = [];
        await context.addInitScript(
          ({ token, admin }) => {
            localStorage.setItem('newoteg_admin_token', token);
            localStorage.setItem('newoteg_admin_user', JSON.stringify(admin));
          },
          {
            token,
            admin: {
              id: admin.id,
              nom: admin.nom,
              username: admin.username,
              role: admin.role,
            },
          },
        );
        page.on('pageerror', (error) => errors.push(error.message));
        await context.route('**/*', async (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
            outside.push(url.hostname);
            return route.abort();
          }
          if (!url.pathname.startsWith('/api/')) return route.continue();
          if (url.pathname === '/api/admin-auth/me')
            return route.fulfill({
              json: {
                id: admin.id,
                nom: admin.nom,
                username: admin.username,
                role: admin.role,
              },
            });
          if (url.pathname === '/api/commandes') {
            const response = await route.fetch({
              url: httpBase + '/api/commandes/' + ui.order.id,
              maxRetries: 0,
            });
            assert.equal(response.status(), 200);
            return route.fulfill({ json: [await response.json()] });
          }
          if (url.pathname.startsWith('/api/commandes/guest/admin/')) {
            const response = await route.fetch({
              url: httpBase + url.pathname,
              maxRetries: 0,
            });
            if (request.method() === 'POST') {
              posts++;
              assert.equal(response.status(), 200);
              return route.abort('connectionreset');
            }
            return route.fulfill({ response });
          }
          if (request.method() !== 'GET')
            throw Error('Unexpected mutation ' + url.pathname);
          return route.fulfill({
            json: url.pathname.endsWith('/unread-count') ? { count: 0 } : [],
          });
        });
        await page.goto(origin + '/orders', {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await page
          .getByRole('button', {
            name: width < 768 ? 'Détails →' : 'Détails',
            exact: true,
          })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Détails de la commande',
        });
        await expect(
          dialog.getByText('Lien actif', { exact: true }),
        ).toBeVisible();
        await expect(
          dialog.getByRole('button', {
            name: 'Fermer les détails de la commande',
          }),
        ).toBeFocused();
        await expect
          .poll(() =>
            dialog.evaluate((element) =>
              [element, element.parentElement].every(
                (node) => Number(getComputedStyle(node).opacity) === 1,
              ),
            ),
          )
          .toBe(true);
        await dialog.screenshot({
          path: path.join(output, `overview-${width}.png`),
        });
        await dialog
          .getByRole('button', { name: 'Préparer la révocation de l’accès' })
          .click();
        await dialog
          .getByLabel('Motif de révocation')
          .fill('Lien partagé par erreur — recette fictive');
        await dialog.getByRole('checkbox').check();
        await dialog.screenshot({
          path: path.join(output, `consent-${width}.png`),
        });
        await dialog
          .getByRole('button', { name: 'Révoquer l’accès invité', exact: true })
          .click();
        await expect(dialog.getByRole('alert')).toBeVisible();
        await dialog
          .getByRole('button', {
            name: 'Vérifier le résultat de la révocation',
          })
          .click();
        await expect(
          dialog.getByText('La révocation est confirmée.'),
        ).toBeVisible();
        assert.equal(posts, 1);
        await dialog.screenshot({
          path: path.join(output, `revoked-${width}.png`),
        });
        await dialog
          .getByRole('button', { name: 'Actualiser l’état de l’accès' })
          .focus();
        await page.keyboard.press('Tab');
        await expect(
          dialog.getByRole('button', {
            name: 'Fermer les détails de la commande',
          }),
        ).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(
          dialog.getByRole('button', { name: 'Actualiser l’état de l’accès' }),
        ).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole('button', {
            name: width < 768 ? 'Détails →' : 'Détails',
            exact: true,
          }),
        ).toBeFocused();
        await page.reload();
        await page
          .getByRole('button', {
            name: width < 768 ? 'Détails →' : 'Détails',
            exact: true,
          })
          .click();
        await expect(
          page.getByText('Accès révoqué', { exact: true }),
        ).toBeVisible();
        assert.equal(posts, 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        assert.deepEqual(errors, []);
        assert.deepEqual(outside, []);
        await context.close();
      }
      ok(
        'Real API-backed admin UI at 360/390/1440: consent, lost response, state verification without duplicate POST, reload, keyboard focus/escape and no external requests',
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
    if (fixtures.length)
      await db.commande.deleteMany({
        where: { id: { in: fixtures.map((f) => f.order.id) } },
      });
    if (requestIds.length)
      await db.commandeRequest.deleteMany({
        where: { requestId: { in: requestIds } },
      });
    if (client) await db.client.delete({ where: { id: client.id } });
    if (admins.length)
      await db.adminUser.deleteMany({
        where: { id: { in: admins.map((a) => a.id) } },
      });
    if (product)
      await db.produit.update({
        where: { id: product.id },
        data: { estActif: false },
      });
    await db.$disconnect();
    await pool.end();
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
