// Continue the actual anonymous checkout on the same owned disposable database.
// OTP transport is captured in memory only. No provider is activated or called.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const runtime =
  'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(runtime + '/playwright');
const { expect } = require(runtime + '/playwright/test');

module.exports = async ({
  db,
  base,
  mail,
  guestOrder,
  initialKey,
  ok,
  output,
}) => {
  const [identity] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name',
  );
  assert.match(identity.name, /^newoteg_e2e_[a-f0-9]{32}$/);
  assert.equal(mail.enabled, false);
  assert.equal(mail.messages.length, 0);
  const initialGrant = await db.commandeGuestAccess.findUniqueOrThrow({
    where: { commandeId: guestOrder.id },
  });
  const initialOrder = await db.commande.findUniqueOrThrow({
    where: { id: guestOrder.id },
  });
  const stock = () =>
    db.produit.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, quantiteStock: true },
    });
  const initialStock = await stock();
  const initialCash = await db.caisse.count();
  const initialNotifications = await db.notification.count({
    where: {
      type: 'COMMANDE_STATUT',
      message: { contains: guestOrder.numeroSuivi },
    },
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    if (!localStorage.getItem('appLang')) localStorage.setItem('appLang', 'en');
  });
  const requests = [],
    arrivals = [],
    errors = [],
    blocked = [],
    transportFailures = [];
  let dropRecovery = false,
    dropRecoveryRead = false,
    dropReceipt = false;
  const receiptPayloads = [];
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      blocked.push(url.hostname);
      return route.abort();
    }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    arrivals.push({ method: request.method(), path: url.pathname });
    if (dropRecoveryRead && url.pathname === '/api/commandes/guest/access') {
      dropRecoveryRead = false;
      transportFailures.push('Read before API after committed recovery');
      return route.abort('connectionreset');
    }
    try {
      const response = await route.fetch({
        url: base + url.pathname + url.search,
        maxRetries: 0,
      });
      requests.push({
        method: request.method(),
        path: url.pathname,
        status: response.status(),
      });
      if (
        url.pathname.startsWith('/api/commandes/guest/') &&
        url.pathname !== '/api/commandes/guest/channels' &&
        response.ok()
      ) {
        assert.match(response.headers()['cache-control'], /private.*no-store/);
        assert.equal(response.headers()['referrer-policy'], 'no-referrer');
        assert.match(response.headers()['x-robots-tag'], /noindex/);
      }
      if (dropRecovery && url.pathname === '/api/commandes/guest/recover') {
        assert.ok(response.ok());
        dropRecovery = false;
        dropRecoveryRead = true;
        transportFailures.push('Recovery response after commit');
        return route.abort('connectionreset');
      }
      if (url.pathname === '/api/commandes/guest/actions' && response.ok()) {
        receiptPayloads.push(request.postDataJSON()); // Never written to traces.
        if (dropReceipt) {
          dropReceipt = false;
          transportFailures.push('Receipt response after commit');
          return route.abort('connectionreset');
        }
      }
      return route.fulfill({ response });
    } catch (error) {
      errors.push(error.message);
      return route.abort();
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const visit = () =>
    page.goto('http://127.0.0.1:5187/suivi-invite', {
      waitUntil: 'domcontentloaded',
    });
  async function screen(name) {
    await page.evaluate(async () => {
      document.activeElement?.blur();
      scrollTo(0, 0);
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
    });
    // Private keys and codes may be in input values; none belong in artifacts.
    await page.screenshot({
      path: path.join(output, name + '.png'),
      fullPage: true,
      mask: [page.locator('input')],
    });
  }
  async function post(route, body, expectedStatus) {
    const response = await fetch(base + '/api' + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (expectedStatus) assert.equal(response.status, expectedStatus);
    else assert.ok(response.ok, route + ' expected a successful response');
    return response.json();
  }
  const key = () =>
    page.evaluate(() => sessionStorage.getItem('newoteg_guest_tracking_v1'));
  try {
    mail.enabled = true;
    // Unknown reference/address gets the same generic receipt but sends nothing.
    const unknown = await post('/commandes/guest/recovery', {
      numeroSuivi: guestOrder.numeroSuivi,
      email: 'unknown@example.invalid',
    });
    assert.ok(unknown.challengeId);
    assert.equal(mail.messages.length, 0);
    assert.equal(await db.commandeGuestChallenge.count(), 0);
    await visit();
    await page
      .getByLabel('Order number', { exact: true })
      .fill(guestOrder.numeroSuivi);
    await page
      .getByLabel('Email', { exact: true })
      .fill('GUEST-FIXTURE@example.invalid');
    await page
      .getByRole('button', { name: 'Get a code by email', exact: true })
      .click();
    await expect(
      page.getByLabel('Code received by email', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'If these details match a guest order, a code has been sent to the email recorded at checkout.',
        { exact: true },
      ),
    ).toBeVisible();
    assert.equal(mail.messages.length, 1);
    const recovery = mail.messages[0];
    assert.equal(recovery.method, 'sendGuestAccessCode');
    assert.equal(recovery.args[0], initialGrant.recoveryEmail);
    assert.ok(
      /^\d{8}$/.test(recovery.args[1]),
      'Captured recovery code has the required format',
    );
    const challenge = await db.commandeGuestChallenge.findFirstOrThrow({
      where: { commandeId: guestOrder.id, purpose: 'RECOVER' },
    });
    assert.equal(challenge.delivered, true);
    assert.ok(
      challenge.codeHash !== recovery.args[1],
      'Code is not stored in plaintext',
    );
    await screen('guest-recovery-code-en-mobile');
    dropRecovery = true;
    await page
      .getByLabel('Code received by email', { exact: true })
      .fill(recovery.args[1]);
    await page
      .getByRole('button', { name: 'Verify code', exact: true })
      .click();
    await expect(page.getByRole('alert')).toBeVisible();
    assert.equal(
      (
        await db.commandeGuestAccess.findUniqueOrThrow({
          where: { commandeId: guestOrder.id },
        })
      ).version,
      initialGrant.version + 1,
    );
    assert.ok(await key());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(guestOrder.numeroSuivi, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Confirm receipt', exact: true }),
    ).toBeEnabled();
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem('newoteg_guest_recovery_v1'),
      ),
      null,
    );
    assert.equal(
      requests.filter((r) => r.path === '/api/commandes/guest/recover').length,
      1,
    );
    assert.ok(
      (await key()) !== initialKey,
      'Recovered access replaces the previous key',
    );
    const privateRead = await post('/commandes/guest/access', {
      accessToken: await key(),
    });
    assert.equal(privateRead.commande.id, guestOrder.id);
    for (const field of [
      'nomClient',
      'telephone',
      'adresseLivraison',
      'clientId',
    ])
      assert.equal(
        field in privateRead.commande,
        false,
        'Read-only tracking omits contacts and account identity',
      );
    await post('/commandes/guest/access', { accessToken: initialKey }, 401);
    await expect(page).toHaveTitle('Private order tracking · X-Electronic');
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(new URL(page.url()).search, '');
    ok(
      'Anonymous customer recovers actual checkout access via captured test code; lost response/read and reload recover one rotated key, with the old link rejected and no account created',
    );

    await page
      .getByRole('button', { name: 'Confirm receipt', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Get a receipt code', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveText(
      'Wait before requesting a new code.',
    );
    assert.ok(
      requests.some(
        (r) => r.path.endsWith('/guest/actions/request') && r.status === 429,
      ),
    );
    assert.equal(mail.messages.length, 1);
    console.log(
      'WAIT real shared recovery/action code spacing; no challenge timestamps are modified',
    );
    let remaining;
    while ((remaining = challenge.createdAt.getTime() + 61000 - Date.now()) > 0)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(remaining, 30000)),
      );
    const receiptResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          '/api/commandes/guest/actions/request' &&
        response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await dialog
      .getByRole('button', { name: 'Get a receipt code', exact: true })
      .click();
    assert.equal((await receiptResponse).status(), 200);
    await expect(
      dialog.getByLabel('Email code for this action', { exact: true }),
    ).toBeVisible();
    assert.equal(mail.messages.length, 2);
    const receipt = mail.messages[1];
    assert.equal(receipt.method, 'sendGuestActionCode');
    assert.equal(receipt.args[0], initialGrant.recoveryEmail);
    assert.equal(receipt.args[2], guestOrder.numeroSuivi);
    assert.equal(receipt.args[3], 'RECEIVE');
    const action = await db.commandeGuestChallenge.findFirstOrThrow({
      where: { commandeId: guestOrder.id, purpose: 'RECEIVE' },
    });
    assert.notEqual(action.id, challenge.id);
    assert.equal(action.delivered, true);
    assert.equal(action.grantVersion, initialGrant.version + 1);
    const saved = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('newoteg_guest_action_v1')),
    );
    assert.ok(saved.actionKey);
    assert.equal('code' in saved, false);
    await post(
      '/commandes/guest/actions',
      {
        accessToken: await key(),
        action: 'RECEIVE',
        challengeId: action.id,
        actionKey: randomBytes(32).toString('base64url'),
      },
      400,
    );
    assert.equal(
      (await db.commande.findUniqueOrThrow({ where: { id: guestOrder.id } }))
        .statut,
      'EN_LIVRAISON',
    );
    await screen('guest-receipt-code-en-mobile');
    await dialog
      .getByLabel('Email code for this action', { exact: true })
      .fill(receipt.args[1]);
    dropReceipt = true;
    await dialog
      .getByRole('button', { name: 'Confirm receipt of items', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    const committed = await db.commande.findUniqueOrThrow({
      where: { id: guestOrder.id },
    });
    assert.equal(committed.statut, 'LIVREE');
    assert.equal(committed.version, initialOrder.version + 1);
    assert.ok(committed.dateLivraison);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: 'Check my request result', exact: true })
      .click();
    await expect(
      page.getByText('Receipt has been confirmed. Thank you!', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Delivery receipt confirmed.', { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: 'Write my review', exact: true })
        .first(),
    ).toBeVisible();
    assert.equal(receiptPayloads.length, 2);
    assert.ok(
      JSON.stringify({ ...receiptPayloads[0], code: undefined }) ===
        JSON.stringify({ ...receiptPayloads[1], code: undefined }),
      'Receipt replay retains its exact capabilities without exposing them in diagnostics',
    );
    assert.equal('code' in receiptPayloads[1], false);
    assert.equal(
      (await db.commande.findUniqueOrThrow({ where: { id: guestOrder.id } }))
        .version,
      committed.version,
    );
    assert.equal(
      await db.commandeGuestChallenge.count({
        where: {
          commandeId: guestOrder.id,
          purpose: 'RECEIVE',
          completedAt: { not: null },
        },
      }),
      1,
    );
    assert.equal(
      await db.notification.count({
        where: {
          type: 'COMMANDE_STATUT',
          message: { contains: guestOrder.numeroSuivi },
        },
      }),
      initialNotifications + 1,
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem('newoteg_guest_action_v1'),
      ),
      null,
    );
    assert.equal(await db.commande.count(), 2);
    assert.equal(await db.client.count(), 1);
    assert.equal(await db.caisse.count(), initialCash);
    assert.deepEqual(await stock(), initialStock);
    assert.equal(mail.messages.length, 2);
    ok(
      'Distinct receipt code respects real shared cooldown; read-only link cannot confirm alone; lost committed receipt is replayed without code, extra stock deduction, payment or duplicate notification',
    );

    for (const [width, lang] of [
      [360, 'en'],
      [768, 'fr'],
      [1440, 'en'],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (value) => localStorage.setItem('appLang', value),
        lang,
      );
      await visit();
      await expect(
        page.getByText(
          lang === 'en'
            ? 'Delivery receipt confirmed.'
            : 'Réception de la livraison confirmée.',
          { exact: true },
        ),
      ).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
      await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
      await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
        'content',
        'no-referrer',
      );
      await screen('guest-received-' + lang + '-' + width);
    }
    await page
      .getByRole('link', { name: 'Catalogue', exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/catalogue$/);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]'),
    ).toHaveCount(0);
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    ok(
      'Recovered anonymous delivery ends received with reviews available in FR/EN at 360, 768 and 1440 pixels; private inputs masked, transport test-only and no external traffic',
    );
  } catch (error) {
    await screen('guest-flow-failure').catch(() => {});
    fs.writeFileSync(
      path.join(output, 'guest-flow-failure.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'Unavailable'),
    );
    throw error;
  } finally {
    mail.enabled = false;
    fs.writeFileSync(
      path.join(output, 'guest-flow-browser-evidence.json'),
      JSON.stringify(
        {
          requests,
          arrivals,
          errors,
          blockedExternalHosts: blocked,
          transportFailures,
          apiResponsesMocked: false,
          codesCapturedInMemoryOnly: true,
          realProvidersEnabled: false,
          timestampsModified: false,
        },
        null,
        2,
      ) + '\n',
    );
    await context.unrouteAll({ behavior: 'wait' });
    await context.close();
    await browser.close();
  }
};
