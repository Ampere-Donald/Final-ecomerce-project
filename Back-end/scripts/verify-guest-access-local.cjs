// Isolated PostgreSQL, fictitious orders, captured mail only. Never loads .env.
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
process.env.DATABASE_URL = connectionString;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { Pool } = require('pg'),
  { PrismaClient } = require('@prisma/client'),
  { PrismaPg } = require('@prisma/adapter-pg');
const { CommandeService } = require('../dist/src/commande/commande.service');
const {
  GuestOrderService,
} = require('../dist/src/commande/guest-order.service');
const { guestTokenHash } = require('../dist/src/commande/guest-access');
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const mail = {
  enabled: true,
  delivered: true,
  last: null,
  count: 0,
  guestRecoveryAvailable() {
    return this.enabled;
  },
  async sendGuestAccessCode(to, code) {
    this.last = { to, code };
    this.count++;
    return this.delivered;
  },
};
const guests = new GuestOrderService(db, mail);
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
const output =
  'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/guest-access';
const checks = [],
  ids = [],
  requestIds = [];
let product, client, category, browser;
const token = () => randomBytes(32).toString('base64url');
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
async function rejects(task, code = 'GUEST_ACCESS_UNAVAILABLE') {
  await assert.rejects(task, (e) => e.getResponse?.().code === code);
}
async function create(extra = {}) {
  const dto = {
    requestId: randomUUID(),
    guestAccessKey: token(),
    guestEmail: 'Guest@example.invalid',
    nomClient: 'Invité fictif recette',
    telephone: '600000000',
    adresseLivraison: 'Adresse fictive privée',
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
  };
  requestIds.push(dto.requestId);
  const result = await orders.createWithAccount(dto);
  ids.push(result.commande.id);
  return { dto, result };
}
async function ageChallenge(id) {
  await db.commandeGuestChallenge.update({
    where: { id },
    data: { createdAt: new Date(Date.now() - 61000) },
  });
}
(async () => {
  try {
    const exists = await pool.query(
      "SELECT to_regclass('public.commande_guest_access') AS name",
    );
    if (!exists.rows[0].name) {
      if (process.env.NEWOTEG_GUEST_APPLY_SCHEMA !== 'true')
        throw Error(
          'Guest schema absent; explicit isolated apply flag required',
        );
      const sql = fs.readFileSync(
        path.join(
          __dirname,
          '../prisma/migrations/20261003005000_guest_order_access/migration.sql',
        ),
        'utf8',
      );
      assert.ok(
        !/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE)\b/i.test(
          sql.replace(/ON (UPDATE|DELETE) CASCADE/g, ''),
        ),
      );
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query(sql);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
      ok(
        'Additive guest tables applied only to dedicated local fixture database',
      );
    }
    category = await db.categorie.create({
      data: { nom: 'Recette suivi invité ' + randomUUID() },
    });
    product = await db.produit.create({
      data: {
        categorieId: category.id,
        nomProduit: 'Démonstration — câble suivi privé',
        code: 'DEMO-GUEST-' + randomUUID().slice(0, 8),
        codeFamille: 'RECETTE',
        quantiteStock: 40,
        prixDetail: 3500,
        imageUrl: 'http://127.0.0.1:5187/design-e/hdmi-5m.webp',
      },
    });
    const first = await create(),
      before = (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock;
    const grant = await db.commandeGuestAccess.findUnique({
      where: { commandeId: first.result.commande.id },
    });
    assert.equal(grant.tokenHash, guestTokenHash(first.dto.guestAccessKey));
    assert.equal(grant.recoveryEmail, 'guest@example.invalid');
    assert.ok(!JSON.stringify(grant).includes(first.dto.guestAccessKey));
    const [replayA, replayB] = await Promise.all([
      orders.createWithAccount(first.dto),
      orders.createWithAccount(first.dto),
    ]);
    assert.equal(replayA.commande.id, first.result.commande.id);
    assert.equal(replayB.commande.id, first.result.commande.id);
    assert.equal(
      replayA.commande.guestAccess.expiresAt.getTime(),
      grant.expiresAt.getTime(),
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock,
      before,
    );
    assert.equal(
      await db.commandeRequest.count({
        where: { requestId: first.dto.requestId },
      }),
      1,
    );
    ok(
      'Lost-response and concurrent order retries retain one order, one stock debit and the original grant expiry',
    );
    const read = await guests.read(first.dto.guestAccessKey),
      json = JSON.stringify(read);
    for (const value of [
      first.dto.telephone,
      first.dto.nomClient,
      first.dto.adresseLivraison,
      'guest@example.invalid',
      'tokenHash',
      'cmupActuel',
      'dernierFournisseur',
    ])
      assert.ok(!json.includes(value));
    assert.equal(read.commande.lignes[0].prixUnitaire.toString(), '3500');
    assert.equal(read.access.canCancel, false);
    ok(
      'Private read exposes historical items/status and excludes contact, address, recovery email and costs',
    );
    const collisionId = randomUUID();
    requestIds.push(collisionId);
    await rejects(
      () => orders.createWithAccount({ ...first.dto, requestId: collisionId }),
      'GUEST_KEY_REUSED',
    );
    assert.equal(
      await db.commandeRequest.count({ where: { requestId: collisionId } }),
      0,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: product.id } }))
        .quantiteStock,
      before,
    );
    ok(
      'Duplicate private key rolls back the new order, its request and stock movement',
    );
    await db.commandeGuestAccess.update({
      where: { commandeId: first.result.commande.id },
      data: { expiresAt: new Date(0) },
    });
    await rejects(() => guests.read(first.dto.guestAccessKey));
    await rejects(() => orders.createWithAccount(first.dto));
    const countBefore = mail.count;
    const unknown = await guests.requestRecovery(
      'CMD-NONEXISTENT',
      'unknown@example.invalid',
    );
    const wrong = await guests.requestRecovery(
      first.result.commande.numeroSuivi,
      'wrong@example.invalid',
    );
    assert.equal(unknown.message, wrong.message);
    assert.equal(mail.count, countBefore);
    assert.equal(await db.commandeGuestChallenge.count(), 0);
    const recovery = await guests.requestRecovery(
      first.result.commande.numeroSuivi,
      ' Guest@Example.invalid ',
    );
    const code = mail.last.code;
    assert.match(code, /^\d{8}$/);
    assert.equal(mail.last.to, 'guest@example.invalid');
    const saved = await db.commandeGuestChallenge.findUnique({
      where: { id: recovery.challengeId },
    });
    assert.equal(saved.delivered, true);
    assert.ok(!JSON.stringify(saved).includes(code));
    const cool = await guests.requestRecovery(
      first.result.commande.numeroSuivi,
      'guest@example.invalid',
    );
    assert.equal(cool.message, unknown.message);
    assert.equal(mail.count, countBefore + 1);
    const wrongCode = code === '00000000' ? '00000001' : '00000000';
    await rejects(() =>
      guests.recover(recovery.challengeId, wrongCode, token()),
    );
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: recovery.challengeId },
        })
      ).attempts,
      1,
    );
    const next = token();
    await guests.recover(recovery.challengeId, code, next);
    assert.equal(
      (await guests.read(next)).commande.id,
      first.result.commande.id,
    );
    await rejects(() => guests.read(first.dto.guestAccessKey));
    await rejects(() => guests.recover(recovery.challengeId, code, token()));
    await rejects(() => orders.createWithAccount(first.dto));
    ok(
      'Email recovery binds the recorded address, hides unknown orders, counts failures, enforces cooldown and rotates one-use access',
    );
    await ageChallenge(recovery.challengeId);
    const limited = await guests.requestRecovery(
        first.result.commande.numeroSuivi,
        'guest@example.invalid',
      ),
      limitedCode = mail.last.code;
    for (let n = 0; n < 5; n++)
      await rejects(() =>
        guests.recover(
          limited.challengeId,
          limitedCode === '99999999' ? '88888888' : '99999999',
          token(),
        ),
      );
    await rejects(() =>
      guests.recover(limited.challengeId, limitedCode, token()),
    );
    await ageChallenge(limited.challengeId);
    const third = await guests.requestRecovery(
      first.result.commande.numeroSuivi,
      'guest@example.invalid',
    );
    await ageChallenge(third.challengeId);
    const mailBefore = mail.count;
    await guests.requestRecovery(
      first.result.commande.numeroSuivi,
      'guest@example.invalid',
    );
    assert.equal(mail.count, mailBefore);
    ok(
      'Five wrong codes exhaust the challenge; recovery sends are capped at three per order per hour',
    );
    await guests.revoke(
      first.result.commande.id,
      'fixture-admin',
      'Recette révocation',
    );
    await guests.revoke(first.result.commande.id, 'fixture-admin', 'Repeated');
    assert.equal(
      (
        await db.commandeGuestAccess.findUnique({
          where: { commandeId: first.result.commande.id },
        })
      ).version,
      3,
    );
    await rejects(() => guests.read(next));
    await rejects(() =>
      guests.recover(third.challengeId, mail.last.code, token()),
    );
    await guests.requestRecovery(
      first.result.commande.numeroSuivi,
      'guest@example.invalid',
    );
    assert.equal(mail.count, mailBefore);
    ok(
      'Administrative revocation is idempotent and blocks read, pending code and email recovery',
    );
    const failed = await create();
    mail.delivered = false;
    const failure = await guests.requestRecovery(
      failed.result.commande.numeroSuivi,
      'guest@example.invalid',
    );
    await rejects(() =>
      guests.recover(failure.challengeId, mail.last.code, token()),
    );
    assert.equal(
      (
        await db.commandeGuestChallenge.findUnique({
          where: { id: failure.challengeId },
        })
      ).delivered,
      false,
    );
    mail.delivered = true;
    const expired = await create(),
      expiry = await guests.requestRecovery(
        expired.result.commande.numeroSuivi,
        'guest@example.invalid',
      );
    const expiredCode = mail.last.code;
    await db.commandeGuestChallenge.update({
      where: { id: expiry.challengeId },
      data: { expiresAt: new Date(0) },
    });
    await rejects(() =>
      guests.recover(expiry.challengeId, expiredCode, token()),
    );
    ok('Undelivered emails and expired codes never recover access');
    const concurrent = await create(),
      concurrentChallenge = await guests.requestRecovery(
        concurrent.result.commande.numeroSuivi,
        'guest@example.invalid',
      );
    const concurrentCode = mail.last.code;
    const keys = [token(), token()];
    const winners = await Promise.allSettled(
      keys.map((k) =>
        guests.recover(concurrentChallenge.challengeId, concurrentCode, k),
      ),
    );
    assert.equal(winners.filter((r) => r.status === 'fulfilled').length, 1);
    ok('Two concurrent redemptions have exactly one winner');
    const linked = await create();
    client = await db.client.create({
      data: {
        nom: 'Compte fictif',
        email: 'guest-link-' + randomUUID() + '@example.invalid',
      },
    });
    await db.commande.update({
      where: { id: linked.result.commande.id },
      data: { clientId: client.id },
    });
    await rejects(() => guests.read(linked.dto.guestAccessKey));
    await rejects(() => orders.createWithAccount(linked.dto));
    await guests.requestRecovery(
      linked.result.commande.numeroSuivi,
      'guest@example.invalid',
    );
    assert.equal(mail.count, mailBefore + 3);
    ok(
      'Account ownership disables the old guest key, replay and email recovery',
    );
    if (process.env.NEWOTEG_GUEST_BROWSER === 'true') {
      const {
        chromium,
      } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
      const {
        expect,
      } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
      const base = 'http://127.0.0.1:5187',
        api = 'http://127.0.0.1:3000';
      const fixture = await create();
      const res = await fetch(api + '/api/commandes/guest/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: fixture.dto.guestAccessKey }),
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('cache-control'), /no-store/);
      assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
      assert.match(res.headers.get('x-robots-tag'), /noindex/);
      const revoke = await fetch(
        api +
          '/api/commandes/guest/admin/' +
          fixture.result.commande.id +
          '/revoke',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
      );
      assert.equal(revoke.status, 401);
      const unavailable = await fetch(api + '/api/commandes/guest/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numeroSuivi: fixture.result.commande.numeroSuivi,
          email: 'guest@example.invalid',
        }),
      });
      assert.equal((await unavailable.json()).available, false);
      ok(
        'Live HTTP private headers, unauthorised revocation denial and truthful disabled email channel',
      );
      browser = await chromium.launch({
        headless: true,
        executablePath:
          'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      });
      fs.mkdirSync(output, { recursive: true });
      for (const width of [390, 1440]) {
        const ctx = await browser.newContext({
            viewport: { width, height: 1000 },
          }),
          page = await ctx.newPage(),
          errors = [],
          leaks = [];
        await ctx.addInitScript(() => localStorage.setItem('appLang', 'fr'));
        await ctx.route('**/*', (route) => {
          const request = route.request(),
            u = new URL(request.url());
          if (request.url().includes(fixture.dto.guestAccessKey))
            leaks.push('secret-in-http-url');
          if (
            [base, api].includes(u.origin) &&
            (request.method() === 'GET' ||
              (request.method() === 'POST' &&
                u.pathname === '/api/commandes/guest/access'))
          )
            return route.continue();
          leaks.push('unexpected-external-or-mutation');
          return route.abort();
        });
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(
          base + '/suivi-invite#acces=' + fixture.dto.guestAccessKey,
        );
        await expect(
          page.getByRole('heading', {
            name: fixture.result.commande.numeroSuivi,
          }),
        ).toBeVisible();
        assert.equal(new URL(page.url()).hash, '');
        assert.equal(new URL(page.url()).search, '');
        assert.equal(
          await page
            .locator('meta[name=robots]')
            .last()
            .getAttribute('content'),
          'noindex, nofollow',
        );
        assert.ok(
          !(await page
            .locator('body')
            .innerText()
            .then(
              (text) =>
                text.includes(fixture.dto.telephone) ||
                text.includes(fixture.dto.adresseLivraison),
            )),
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.screenshot({
          path: path.join(output, 'tracking-' + width + '.png'),
          fullPage: true,
          mask: [page.locator('input[readonly]')],
        });
        await page
          .getByRole('button', { name: 'Actualiser', exact: true })
          .click();
        await expect(
          page.getByRole('heading', {
            name: fixture.result.commande.numeroSuivi,
          }),
        ).toBeVisible();
        await page.reload();
        await expect(
          page.getByRole('heading', {
            name: fixture.result.commande.numeroSuivi,
          }),
        ).toBeVisible();
        await page
          .getByRole('button', { name: 'Fermer mon accès sur cet appareil' })
          .click();
        await expect(
          page.getByRole('heading', { name: 'Retrouver mon accès par email' }),
        ).toBeVisible();
        await expect(
          page.getByText(
            'L’envoi des emails de récupération n’est pas encore disponible.',
            { exact: false },
          ),
        ).toBeVisible();
        assert.deepEqual(errors, []);
        assert.deepEqual(leaks, []);
        await ctx.close();
      }
      ok(
        'Live mobile/desktop tracking strips secret fragment, avoids external scripts/PII, survives reload and closes session access',
      );
      // Actual checkout on this fixture: the first committed HTTP response is dropped.
      const ctx = await browser.newContext({
          viewport: { width: 390, height: 1000 },
        }),
        page = await ctx.newPage();
      let submitted = 0,
        firstPayload,
        createdOrder;
      await ctx.addInitScript(() => localStorage.setItem('appLang', 'fr'));
      await ctx.route('**/*', async (route) => {
        const request = route.request(),
          u = new URL(request.url());
        if (![base, api].includes(u.origin)) return route.abort();
        if (request.method() === 'GET') return route.continue();
        if (
          request.method() === 'POST' &&
          ['/api/commandes/quote', '/api/commandes/guest/access'].includes(
            u.pathname,
          )
        )
          return route.continue();
        if (
          request.method() === 'POST' &&
          u.pathname === '/api/commandes/checkout'
        ) {
          const payload = request.postDataJSON();
          assert.equal(payload.lignes.length, 1);
          assert.equal(payload.lignes[0].produitId, product.id);
          requestIds.push(payload.requestId);
          submitted++;
          if (submitted === 1) {
            firstPayload = payload;
            const response = await route.fetch({ maxRetries: 0 });
            assert.equal(response.status(), 201);
            createdOrder = (await response.json()).commande;
            ids.push(createdOrder.id);
            return route.abort('connectionreset');
          }
          assert.deepEqual(payload, firstPayload);
          return route.continue();
        }
        throw Error('Unexpected mutation ' + u.pathname);
      });
      const stockBefore = (
        await db.produit.findUnique({ where: { id: product.id } })
      ).quantiteStock;
      await page.goto(base + '/product/' + product.id);
      await page
        .getByRole('button', { name: 'Ajouter au panier', exact: true })
        .first()
        .click();
      await page.goto(base + '/checkout');
      await page
        .getByLabel('Nom complet', { exact: true })
        .fill('Invité recette coupure');
      await page.getByLabel('Téléphone', { exact: true }).fill('600000001');
      await page
        .getByLabel('Email de suivi (facultatif)', { exact: true })
        .fill('recipe@example.invalid');
      await page
        .getByRole('button', { name: 'Vérifier ma sélection', exact: true })
        .click();
      await page.getByRole('checkbox').check();
      await page
        .getByRole('button', { name: 'Enregistrer ma commande', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { name: 'Reprendre votre commande' }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Reprendre votre commande' }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: /Reprendre cette tentative/ })
        .click();
      await expect(
        page.getByRole('heading', {
          name: 'Commande enregistrée',
          exact: true,
        }),
      ).toBeVisible();
      assert.equal(
        (await db.produit.findUnique({ where: { id: product.id } }))
          .quantiteStock,
        stockBefore - 1,
      );
      assert.equal(submitted, 2);
      await page.getByRole('link', { name: 'Voir mon suivi privé' }).click();
      await expect(
        page.getByRole('heading', { name: createdOrder.numeroSuivi }),
      ).toBeVisible();
      assert.equal(
        await db.client.count({ where: { telephone: '600000001' } }),
        0,
      );
      await ctx.close();
      ok(
        'Actual guest checkout with lost response and reload creates no account, debits stock once and recovers the same private tracking link',
      );
      const emailFixture = await create();
      await db.commandeGuestAccess.update({
        where: { commandeId: emailFixture.result.commande.id },
        data: { expiresAt: new Date(0) },
      });
      const emailCtx = await browser.newContext({
          viewport: { width: 390, height: 1000 },
        }),
        emailPage = await emailCtx.newPage();
      let rotatedKey,
        recoveryPosts = 0;
      const emailErrors = [];
      emailPage.on('pageerror', (e) => emailErrors.push(e.message));
      await emailCtx.addInitScript(() => localStorage.setItem('appLang', 'fr'));
      // Real guest service + real local DB; only the email transport is captured.
      await emailCtx.route('**/*', async (route) => {
        const request = route.request(),
          u = new URL(request.url());
        if (![base, api].includes(u.origin)) return route.abort();
        if (u.origin === api && u.pathname === '/api/commandes/guest/channels')
          return route.fulfill({ json: { email: true, sms: false } });
        if (
          u.origin === api &&
          u.pathname === '/api/commandes/guest/recovery'
        ) {
          const payload = request.postDataJSON();
          return route.fulfill({
            json: await guests.requestRecovery(
              payload.numeroSuivi,
              payload.email,
            ),
          });
        }
        if (u.origin === api && u.pathname === '/api/commandes/guest/recover') {
          const payload = request.postDataJSON();
          recoveryPosts++;
          rotatedKey = payload.accessToken;
          await guests.recover(
            payload.challengeId,
            payload.code,
            payload.accessToken,
          );
          return route.abort('connectionreset');
        }
        if (
          request.method() === 'GET' ||
          (request.method() === 'POST' &&
            u.pathname === '/api/commandes/guest/access')
        )
          return route.continue();
        throw Error('Unexpected email recipe mutation');
      });
      await emailPage.goto(base + '/suivi-invite');
      await emailPage
        .getByLabel('Numéro de commande', { exact: true })
        .fill(emailFixture.result.commande.numeroSuivi);
      await emailPage
        .getByLabel('Email', { exact: true })
        .fill('guest@example.invalid');
      await emailPage
        .getByRole('button', { name: 'Recevoir un code par email' })
        .click();
      await expect(emailPage.getByLabel('Code reçu par email')).toBeVisible();
      await emailPage.getByLabel('Code reçu par email').fill(mail.last.code);
      await emailPage.getByRole('button', { name: 'Vérifier le code' }).click();
      await expect(
        emailPage.getByRole('heading', {
          name: emailFixture.result.commande.numeroSuivi,
        }),
      ).toBeVisible();
      assert.equal(recoveryPosts, 1);
      await rejects(() => guests.read(emailFixture.dto.guestAccessKey));
      assert.ok(rotatedKey);
      await emailPage.reload();
      await expect(
        emailPage.getByRole('heading', {
          name: emailFixture.result.commande.numeroSuivi,
        }),
      ).toBeVisible();
      assert.equal(recoveryPosts, 1);
      assert.deepEqual(emailErrors, []);
      await emailPage.screenshot({
        path: path.join(output, 'email-recovered-390.png'),
        fullPage: true,
        mask: [emailPage.locator('input[readonly]')],
      });
      await emailCtx.close();
      ok(
        'Email recovery UI with captured transport handles a lost redemption response, reads the rotated key and survives reload without a second code redemption',
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
          fixture: true,
          realSms: false,
          realEmail: false,
          checks,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close();
    if (ids.length)
      await db.commande.deleteMany({ where: { id: { in: ids } } });
    if (requestIds.length)
      await db.commandeRequest.deleteMany({
        where: { requestId: { in: requestIds } },
      });
    if (client) await db.client.delete({ where: { id: client.id } });
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
