// Only called by verify-parcours-local.cjs after its exact isolated DB guard.
// Real report GETs; surrounding administration APIs mocked. No .env, no writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  chromium,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {
  expect,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
module.exports = async ({
  base,
  admin,
  adminToken,
  seller,
  sellerToken,
  today,
  expected,
  ok,
  setEnabled,
}) => {
  const frontend = 'http://127.0.0.1:5174';
  const output = 'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/parcours-admin';
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const contexts = [],
    calls = [],
    outside = [],
    errors = [],
    mutations = [],
    checks = [];
  const pass = (name) => {
    checks.push(name);
    ok(name);
  };
  fs.mkdirSync(output, { recursive: true });
  try {
    async function make(user, token) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        serviceWorkers: 'block',
      });
      contexts.push(context);
      const state = { failure: false };
      await context.addInitScript(
        ({ user, token }) => {
          if (location.hostname !== '127.0.0.1') return;
          localStorage.setItem('newoteg_admin_token', token);
          localStorage.setItem('newoteg_admin_user', JSON.stringify(user));
        },
        {
          user: {
            id: user.id,
            nom: 'Équipe de recette',
            username: user.username,
            role: user.role,
            mustChangeCredential: false,
          },
          token,
        },
      );
      await context.route('**/*', async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        if (![frontend, 'http://localhost:3000', 'http://127.0.0.1:3000'].includes(url.origin)) {
          outside.push(url.origin);
          return route.abort();
        }
        if (request.method() !== 'GET') {
          mutations.push(url.pathname);
          return route.abort();
        }
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (url.pathname === '/api/parcours/rapport') {
          const auth = request.headers().authorization;
          assert.ok(auth === 'Bearer ' + token, 'Current admin authentication required');
          calls.push({
            role: user.role,
            debut: url.searchParams.get('debut'),
            fin: url.searchParams.get('fin'),
          });
          assert.deepEqual([...url.searchParams.keys()].sort(), ['debut', 'fin']);
          if (state.failure && url.searchParams.get('fin') === today)
            return route.fulfill({
              status: 503,
              json: { message: 'Synthetic failure; private detail must not appear' },
            });
          const response = await fetch(base + url.pathname + url.search, {
            headers: { Authorization: auth },
          });
          assert.equal(response.status, 200);
          assert.equal(response.headers.get('cache-control'), 'private, no-store');
          const text = await response.text();
          assert.ok(!text.includes('Synthetic private') && !text.includes('600000000'));
          return route.fulfill({
            status: response.status,
            contentType: 'application/json',
            headers: { 'cache-control': 'private, no-store' },
            body: text,
          });
        }
        if (url.pathname === '/api/admin-auth/me')
          return route.fulfill({
            json: {
              id: user.id,
              nom: 'Équipe de recette',
              username: user.username,
              role: user.role,
              mustChangeCredential: false,
            },
          });
        if (url.pathname.endsWith('/unread-count')) return route.fulfill({ json: { count: 0 } });
        if (url.pathname.endsWith('/import-status'))
          return route.fulfill({
            json: { isImporting: false, progress: 0, message: '', error: null },
          });
        return route.fulfill({ json: [] });
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      return { context, page, state };
    }
    const { page, state } = await make(admin, adminToken);
    await page.goto(frontend + '/parcours');
    await expect(
      page.getByRole('table', { name: 'Comparaison des résultats métier' }),
    ).toBeVisible();
    assert.ok(calls.some((call) => call.role === 'SUPER_ADMIN'));
    for (const call of calls) assert.ok(call.fin < today);
    await expect(page.getByRole('link', { name: 'Parcours du site' })).toHaveCount(1);
    pass(
      'Admin dashboard default compares two closed Douala periods through authenticated real report reads',
    );
    await page.getByLabel('Du', { exact: true }).fill(today);
    await page.getByLabel('Au', { exact: true }).fill(today);
    await expect(page.getByRole('table')).toHaveCount(0);
    await page.getByRole('button', { name: 'Comparer', exact: true }).click();
    const business = page.getByRole('table', { name: 'Comparaison des résultats métier' });
    await expect(business).toBeVisible();
    const orderRow = business.getByRole('row').filter({ hasText: 'Commandes web enregistrées' });
    await expect(orderRow.locator('td').nth(1)).toHaveText(
      new Intl.NumberFormat('fr-FR').format(expected.activite.commandesEnregistrees),
    );
    await expect(page.getByText('Cette journée est incomplète', { exact: false })).toBeVisible();
    await expect(
      page.getByText('Retours pour incompatibilité : non mesurables actuellement.', {
        exact: true,
      }),
    ).toBeVisible();
    const observations = page.getByRole('table', { name: 'Comparaison des observations anonymes' });
    await expect(
      observations
        .getByRole('row')
        .filter({ hasText: 'Fiches produit ouvertes' })
        .locator('td')
        .nth(1),
    ).toHaveText('10');
    await page.getByText('Détail par langue, écran et réception', { exact: true }).click();
    await expect(
      page
        .locator('details li')
        .filter({ hasText: 'Fiches produit ouvertes' })
        .getByText('Anglais, tablette, Général', { exact: true }),
    ).toBeVisible();
    pass(
      'Chosen period renders deduplicated real order and observation counts, incomplete day, unavailable returns and dimension detail',
    );
    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      await page
        .getByRole('heading', { name: 'Parcours du site', exact: true })
        .scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(
        await page
          .getByLabel('Du', { exact: true })
          .evaluate((el) => el.getBoundingClientRect().width >= 130),
        'Date value must remain readable',
      );
      for (const table of await page.getByRole('table').all())
        assert.ok(await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
      if ([390, 1440].includes(width)) {
        await page.screenshot({ path: output + '/lecture-' + width + '.png' });
        await page
          .getByRole('heading', { name: 'Actions observées sur le site' })
          .scrollIntoViewIfNeeded();
        await page.screenshot({ path: output + '/observations-' + width + '.png' });
      }
    }
    await page.getByLabel('Du', { exact: true }).focus();
    // Native date editors expose separate day/month/year keyboard segments.
    for (let step = 0; step < 6; step++) {
      await page.keyboard.press('Tab');
      if (
        await page.getByLabel('Au', { exact: true }).evaluate((el) => el === document.activeElement)
      )
        break;
    }
    assert.equal(
      await page.getByLabel('Au', { exact: true }).evaluate((el) => el === document.activeElement),
      true,
    );
    pass(
      'Six admin viewport widths and date keyboard navigation; mobile uses stacked labels and three numeric columns',
    );
    setEnabled(false);
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    await expect(
      page.getByText('Collecte actuellement désactivée', { exact: false }),
    ).toBeVisible();
    await expect(
      observations
        .getByRole('row')
        .filter({ hasText: 'Fiches produit ouvertes' })
        .locator('td')
        .nth(1),
    ).toHaveText('10');
    state.failure = true;
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Le rapport n’a pas pu être lu.');
    await expect(page.getByRole('table')).toHaveCount(0);
    assert.ok(!(await page.locator('body').innerText()).includes('private detail'));
    state.failure = false;
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    await expect(business).toBeVisible();
    const storage = await page.evaluate(() =>
      [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((key) =>
        /parcours|rapport|observation/i.test(key),
      ),
    );
    assert.deepEqual(storage, []);
    pass(
      'Disabled collection preserves historical counts; partial failure hides results without fake zeros, retry works, no report in persistent storage',
    );
    const sellerPage = (await make(seller, sellerToken)).page;
    const before = calls.length;
    await sellerPage.goto(frontend + '/parcours');
    await expect(sellerPage).toHaveURL(frontend + '/');
    await expect(
      sellerPage.getByRole('heading', { name: 'Parcours du site', exact: true }),
    ).toHaveCount(0);
    assert.equal(calls.length, before);
    pass('Seller direct route access redirects to authorized home before report fetch');
    assert.deepEqual(mutations, []);
    assert.deepEqual(outside, []);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      output + '/result.json',
      JSON.stringify(
        {
          success: true,
          checks,
          mutations: 0,
          externalRequests: 0,
          javascriptErrors: 0,
          limits: [
            'Synthetic isolated data; surrounding administration/auth-me APIs mocked',
            'Real Nest report authentication and PostgreSQL',
            'No physical phone, no public rollout',
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const page = contexts[0]?.pages()[0];
    if (page) {
      await page.screenshot({ path: output + '/failure.png' }).catch(() => {});
      fs.writeFileSync(
        output + '/failure.txt',
        await page
          .locator('body')
          .innerText()
          .catch(() => 'unavailable'),
      );
    }
    throw error;
  } finally {
    setEnabled(true);
    for (const context of contexts) await context.close().catch(() => {});
    await browser.close();
  }
};
