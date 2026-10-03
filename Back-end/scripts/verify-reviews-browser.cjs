// Called only by verify-reviews-local.cjs after its dedicated database guard.
const assert = require('node:assert/strict'),
  fs = require('node:fs');
const {
  chromium,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {
  expect,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
module.exports = async ({
  db,
  base,
  fixture,
  guestFixture,
  clients,
  admins,
  product,
  clientToken,
  adminToken,
  mail,
  ok,
}) => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const out =
    'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/reviews-ui';
  fs.mkdirSync(out, { recursive: true });
  const errors = [],
    outside = [],
    posts = [],
    contexts = new Set();
  async function closeContext(context) {
    await context.unrouteAll({ behavior: 'wait' });
    await context.close();
    contexts.delete(context);
  }
  try {
    async function contextFor(order, width, lang = 'fr', guest, admin) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      });
      contexts.add(context);
      const token = admin ? adminToken(admin) : clientToken(clients[0]);
      await context.addInitScript(
        ({ token, client, admin, lang }) => {
          localStorage.setItem('appLang', lang);
          if (admin) {
            localStorage.setItem('newoteg_admin_token', token);
            localStorage.setItem('newoteg_admin_user', JSON.stringify(admin));
          } else if (client) {
            localStorage.setItem('newoteg_token', token);
            localStorage.setItem('newoteg_user', JSON.stringify(client));
          }
        },
        { token, client: guest || admin ? null : clients[0], admin, lang },
      );
      const state = {
        drop: false,
        dropRequest: false,
        deny: false,
        error: false,
        empty: false,
      };
      await context.route('**/*', async (route) => {
        const req = route.request(),
          url = new URL(req.url()),
          p = url.pathname;
        if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
          outside.push(url.hostname);
          return route.abort();
        }
        if (!p.startsWith('/api/')) return route.continue();
        if (p.startsWith('/api/avis')) {
          if (state.error && p.startsWith('/api/avis/produits/'))
            return route.fulfill({
              status: 503,
              json: { message: 'Fixture outage' },
            });
          if (state.empty && p.startsWith('/api/avis/produits/'))
            return route.fulfill({
              json: { page: 1, limit: 10, total: 0, moyenne: null, items: [] },
            });
          const response = await route.fetch({
            url: base + p + url.search,
            maxRetries: 0,
          });
          if (req.method() === 'POST') {
            const body = req.postDataJSON();
            posts.push({
              path: p,
              requestId: body.requestId,
              code: !!body.code,
            });
            if (
              (state.drop &&
                (p === '/api/avis' ||
                  p === '/api/avis/guest' ||
                  p.includes('/moderation'))) ||
              (state.dropRequest && p === '/api/avis/guest/request')
            ) {
              state.drop = false;
              state.dropRequest = false;
              assert.equal(response.status(), 200);
              return route.abort('connectionreset');
            }
          }
          return route.fulfill({ response });
        }
        if (req.method() !== 'GET' && p != '/api/commandes/guest/access')
          throw Error('Unexpected mutation ' + p);
        if (p === '/api/auth/me') return route.fulfill({ json: clients[0] });
        if (p === '/api/admin-auth/me') return route.fulfill({ json: admin });
        if (p === '/api/commandes/my-orders')
          return route.fulfill({ json: [order] });
        if (p === '/api/commandes/guest/channels')
          return route.fulfill({ json: { email: mail.enabled, sms: false } });
        if (p === '/api/commandes/guest/access') {
          const grant = await db.commandeGuestAccess.findUnique({
            where: { commandeId: order.id },
          });
          if (grant?.revokedAt)
            return route.fulfill({
              status: 401,
              json: { message: 'Fixture revoked' },
            });
          return route.fulfill({
            json: {
              commande: order,
              access: {
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
              },
              linking: { available: false },
              actions: {},
            },
          });
        }
        if (p === '/api/produits/' + product.id)
          return route.fulfill({
            json: {
              ...product,
              categorie: {
                id: product.categorieId,
                nom: 'Connectique de recette',
              },
              attributs: [],
              imageUrl: 'http://127.0.0.1:5187/design-e/hdmi-5m.webp',
              prixPublic: 100,
            },
          });
        if (p === '/api/produits')
          return route.fulfill({
            json: { data: [], meta: { total: 0, lastPage: 1 } },
          });
        return route.fulfill({ json: [] });
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      return { context, page, state };
    }
    async function form(page, lang = 'fr') {
      await page
        .getByRole('button', {
          name: lang === 'en' ? 'Write my review' : 'Donner mon avis',
        })
        .first()
        .click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('1/5', { exact: true }).check();
      await dialog
        .getByLabel(lang === 'en' ? 'Public nickname' : 'Pseudonyme public', {
          exact: true,
        })
        .fill('Maker <test>');
      await dialog
        .getByLabel(lang === 'en' ? 'Your review' : 'Votre avis', {
          exact: true,
        })
        .fill('Le câble fonctionne, mais il est trop court pour mon montage.');
      await dialog.getByRole('checkbox').check();
      return dialog;
    }
    for (const [width, lang] of [
      [360, 'fr'],
      [390, 'fr'],
      [1440, 'en'],
    ]) {
      const order = await fixture(),
        ui = await contextFor(order, width, lang);
      await ui.page.goto('http://127.0.0.1:5187/commandes/' + order.id, {
        waitUntil: 'domcontentloaded',
      });
      let dialog = await form(ui.page, lang);
      if (width === 360) {
        for (let i = 0; i < 12; i++) {
          await ui.page.keyboard.press('Tab');
          assert.ok(
            // Edge represents browser-chrome focus as body at the native wrap.
            await dialog.evaluate(
              (el) =>
                document.activeElement === document.body ||
                el.contains(document.activeElement),
            ),
          );
        }
        await ui.page.keyboard.press('Shift+Tab');
        assert.ok(
          await dialog.evaluate(
            (el) =>
              document.activeElement === document.body ||
              el.contains(document.activeElement),
          ),
        );
        await ui.page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(
          ui.page.getByRole('button', { name: 'Donner mon avis' }).first(),
        ).toBeFocused();
        dialog = await form(ui.page, lang);
        const sendButton = dialog.getByRole('button', {
          name: 'Enregistrer mon avis',
          exact: true,
        });
        const before = posts.length;
        await dialog
          .getByLabel('Pseudonyme public', { exact: true })
          .fill('   ');
        await sendButton.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Choisissez une note',
        );
        assert.equal(posts.length, before);
        await dialog
          .getByLabel('Pseudonyme public', { exact: true })
          .fill('Maker <test>');
        await ui.page.evaluate(() => {
          window.__fixtureReviewSet = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key.startsWith('newoteg_review_v1:'))
              throw Error('Fixture storage denied');
            return window.__fixtureReviewSet.call(this, key, value);
          };
        });
        await sendButton.click();
        await expect(dialog.getByRole('alert')).toContainText(
          'Aucun avis n’a été envoyé',
        );
        assert.equal(posts.length, before);
        await ui.page.evaluate(() => {
          Storage.prototype.setItem = window.__fixtureReviewSet;
          delete window.__fixtureReviewSet;
        });
      }
      await dialog.screenshot({
        path: out + '/account-form-' + width + '.png',
      });
      assert.ok(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      ui.state.drop = true;
      await dialog
        .getByRole('button', {
          name: lang === 'en' ? 'Record my review' : 'Enregistrer mon avis',
          exact: true,
        })
        .click();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await ui.page.reload({ waitUntil: 'domcontentloaded' });
      await ui.page
        .getByRole('button', {
          name: lang === 'en' ? 'Resume my review' : 'Reprendre mon avis',
        })
        .click();
      await ui.page
        .getByRole('dialog')
        .getByRole('button', {
          name: lang === 'en' ? 'Record my review' : 'Enregistrer mon avis',
          exact: true,
        })
        .click();
      await expect(
        ui.page.getByText(
          lang === 'en'
            ? 'Your review was recorded. It will be published after moderation.'
            : 'Votre avis a été enregistré. Il sera publié après modération.',
          { exact: true },
        ),
      ).toBeVisible();
      assert.equal(
        await db.avisProduit.count({
          where: { ligne: { commandeId: order.id } },
        }),
        1,
      );
      const requests = posts.filter((p) => p.path === '/api/avis').slice(-2);
      assert.equal(requests[0].requestId, requests[1].requestId);
      await ui.page
        .locator('.e-purchase-reviews')
        .screenshot({ path: out + '/account-done-' + width + '.png' });
      await closeContext(ui.context);
    }
    ok(
      'Client forms 360/390 FR and 1440 EN, lost response/reload/exact retry creates one review',
    );

    const guest = await guestFixture(),
      ui = await contextFor(guest.order, 390, 'fr', guest);
    await ui.page.goto(
      'http://127.0.0.1:5187/suivi-invite#acces=' + guest.token,
      { waitUntil: 'domcontentloaded' },
    );
    await expect
      .poll(() => ui.page.url())
      .toBe('http://127.0.0.1:5187/suivi-invite');
    let dialog = await form(ui.page);
    ui.state.dropRequest = true;
    await dialog
      .getByRole('button', { name: 'Recevoir le code pour cet avis' })
      .click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    const sends = mail.messages.length;
    await dialog
      .getByRole('button', { name: 'Recevoir le code pour cet avis' })
      .click();
    await expect(dialog.getByLabel('Code reçu par email')).toBeVisible();
    assert.equal(mail.messages.length, sends);
    await dialog
      .getByLabel('Code reçu par email')
      .fill(mail.messages.at(-1).code);
    ui.state.drop = true;
    await dialog
      .getByRole('button', { name: 'Enregistrer mon avis', exact: true })
      .click();
    // The component immediately retrieves a committed receipt after the lost response.
    await expect(
      ui.page.getByText(
        'Votre avis a été enregistré. Il sera publié après modération.',
        { exact: true },
      ),
    ).toBeVisible();
    assert.equal(
      await db.avisProduit.count({
        where: { ligne: { commandeId: guest.order.id } },
      }),
      1,
    );
    assert.equal(
      posts.filter((p) => p.path === '/api/avis/guest' && p.code).length,
      1,
    );
    ok(
      'Guest consent request and creation replies can be lost without another email or review',
    );
    await closeContext(ui.context);

    const moderationOrder = await fixture();
    // Reuse a real client-created review, not a hand-written public testimonial.
    const row = await db.avisProduit.findFirst({
      where: {
        statut: 'EN_ATTENTE',
        pseudonyme: 'Maker <test>',
        ligne: { produitId: product.id },
      },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(row);
    const adminUi = await contextFor(
      moderationOrder,
      390,
      'fr',
      null,
      admins[0],
    );
    await adminUi.page.goto('http://127.0.0.1:5174/avis', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const article = adminUi.page.locator(`article[data-review-id="${row.id}"]`);
    await article
      .getByRole('button', { name: 'Préparer la publication' })
      .click();
    await article.getByRole('checkbox').check();
    await article.screenshot({ path: out + '/moderation-390.png' });
    adminUi.state.drop = true;
    await article
      .getByRole('button', { name: 'Confirmer la décision' })
      .click();
    await expect(adminUi.page.getByRole('alert')).toBeVisible();
    await adminUi.page.reload({ waitUntil: 'domcontentloaded' });
    await adminUi.page
      .getByRole('button', { name: 'Vérifier ou reprendre la décision' })
      .click();
    await expect(
      adminUi.page.getByText(
        'Décision enregistrée. La liste relit maintenant l’état courant.',
        { exact: true },
      ),
    ).toBeVisible();
    const selectedId = posts
      .filter((p) => p.path.includes('/moderation'))
      .at(-1)
      .path.split('/')
      .at(-2);
    assert.equal(
      await db.avisModeration.count({ where: { avisId: selectedId } }),
      1,
    );
    assert.equal(selectedId, row.id);
    assert.equal(
      (await db.avisProduit.findUnique({ where: { id: row.id } })).statut,
      'PUBLIE',
    );
    ok(
      'Admin moderation at 390, explicit confirmation, lost response/reload replays a single decision',
    );
    await closeContext(adminUi.context);

    const publicUi = await contextFor(moderationOrder, 1440);
    await publicUi.page.goto('http://127.0.0.1:5187/product/' + product.id, {
      waitUntil: 'domcontentloaded',
    });
    try {
      await expect(publicUi.page.locator('.e-reviews')).toBeVisible();
    } catch (error) {
      await publicUi.page.screenshot({
        path: out + '/public-failure.png',
        fullPage: true,
      });
      console.log(
        'Public fixture page:',
        (await publicUi.page.locator('body').innerText()).slice(0, 6000),
      );
      console.log('Page errors:', errors);
      throw error;
    }
    try {
      await expect(
        publicUi.page
          .locator('.e-customer-review')
          .filter({ hasText: 'Maker <test>' }),
      ).toHaveCount(1);
    } catch (error) {
      console.log(
        'Public review section:',
        await publicUi.page.locator('.e-reviews').innerText(),
      );
      throw error;
    }
    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      await publicUi.page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await publicUi.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if ([390, 1440].includes(width)) {
        await publicUi.page.locator('.e-reviews-heading').evaluate((el) => {
          const header = document.querySelector('.e-header');
          window.scrollTo({
            behavior: 'instant',
            top:
              el.getBoundingClientRect().top +
              window.scrollY -
              (header?.getBoundingClientRect().height || 0) -
              20,
          });
        });
        await publicUi.page.screenshot({
          path: out + '/public-' + width + '.png',
        });
      }
    }
    const review = publicUi.page
      .locator('.e-customer-review')
      .filter({ hasText: 'Maker <test>' });
    await review.getByRole('button', { name: 'Signaler un contenu' }).click();
    await review.getByLabel('Motif du signalement').selectOption('HORS_SUJET');
    await review.getByRole('button', { name: 'Signaler ce contenu' }).click();
    await expect(
      publicUi.page.getByText(
        'Signalement enregistré. La boutique vérifiera le contenu.',
        { exact: true },
      ),
    ).toBeVisible();
    assert.equal(
      (await db.avisProduit.findUnique({ where: { id: selectedId } })).statut,
      'PUBLIE',
    );
    publicUi.state.error = true;
    await publicUi.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      publicUi.page.getByText('Les avis sont momentanément indisponibles.', {
        exact: true,
      }),
    ).toBeVisible();
    publicUi.state.error = false;
    await publicUi.page
      .locator('.e-reviews')
      .getByRole('button', { name: 'Réessayer' })
      .click();
    await expect(
      publicUi.page.locator('.e-customer-review').first(),
    ).toBeVisible();
    publicUi.state.empty = true;
    await publicUi.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      publicUi.page.getByText(/Aucun avis publié pour le moment/),
    ).toBeVisible();
    assert.equal(
      await publicUi.page
        .locator('.e-reviews-heading')
        .getByText(/\/5/)
        .count(),
      0,
    );
    ok(
      'Published negative review, escaped author text, report, empty/error/retry and six responsive widths',
    );
    await closeContext(publicUi.context);
    assert.deepEqual(errors, []); // Google is blocked intentionally; all other external requests refused.
    assert.ok(outside.every((host) => host === 'accounts.google.com'));
    fs.writeFileSync(
      out + '/result.json',
      JSON.stringify(
        {
          success: true,
          externalRequestsAllowed: 0,
          bootstrap:
            'catalogue, account/tracking and admin shells simulated; every avis API uses real Nest/JWT/PostgreSQL',
          widths: [360, 390, 768, 1100, 1240, 1440],
        },
        null,
        2,
      ),
    );
  } finally {
    for (const context of contexts) await closeContext(context);
    await browser.close();
  }
};
