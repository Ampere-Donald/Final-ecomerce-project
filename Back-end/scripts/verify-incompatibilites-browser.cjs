// Called only after the dedicated local PostgreSQL guard; surrounding commerce mocked.
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
  const output =
    'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/incompatibilites-ui';
  fs.mkdirSync(output, { recursive: true });
  const contexts = new Set(),
    outside = [],
    errors = [],
    posts = [];
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
    const state = { drops: 0, revoke: false, outage: false };
    async function handle(route) {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname;
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
        outside.push(url.hostname);
        return route.abort();
      }
      if (!p.startsWith('/api/')) return route.continue();
      if (p.startsWith('/api/incompatibilites')) {
        if (state.outage && req.method() === 'GET')
          return route.fulfill({
            status: 503,
            json: { message: 'Private synthetic database details' },
          });
        const response = await route.fetch({
          url: base + p + url.search,
          maxRetries: 0,
        });
        if (
          req.method() === 'POST' &&
          !p.endsWith('/purchases') &&
          !p.endsWith('/request')
        ) {
          posts.push({
            path: p,
            requestId: req.postDataJSON().requestId,
            code: !!req.postDataJSON().code,
          });
          if (state.drops > 0) {
            state.drops--;
            assert.equal(response.status(), 200);
            if (state.revoke) {
              await db.commandeGuestAccess.update({
                where: { commandeId: order.id },
                data: { revokedAt: new Date() },
              });
              state.revoke = false;
            }
            return route.abort('connectionreset');
          }
        }
        return route.fulfill({ response });
      }
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
        if (grant.revokedAt)
          return route.fulfill({
            status: 401,
            json: { message: 'Fixture revoked' },
          });
        return route.fulfill({
          json: {
            commande: order,
            access: { expiresAt: grant.expiresAt.toISOString() },
            linking: { available: false },
            actions: {},
          },
        });
      }
      if (/^\/api\/avis\/(commandes\/|guest\/purchases)/.test(p))
        return route.fulfill({
          json: {
            commandeId: order.id,
            eligible: true,
            codeAvailable: false,
            lignes: [],
          },
        });
      if (req.method() !== 'GET')
        throw Error('Unexpected mutation outside incompatibility routes');
      return route.fulfill({ json: [] });
    }
    await context.route('**/*', (route) =>
      handle(route).catch(async () => {
        errors.push('Local route handler failed');
        await route.abort().catch(() => {});
      }),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return { context, page, state };
  }
  async function close(ui) {
    await ui.context.unrouteAll({ behavior: 'wait' });
    await ui.context.close();
    contexts.delete(ui.context);
  }
  async function fill(page, lang = 'fr') {
    await page
      .getByRole('button', {
        name: lang === 'en' ? 'Report an issue' : 'Signaler un problème',
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog', {
      name:
        lang === 'en'
          ? 'Report an incompatibility'
          : 'Signaler une incompatibilité',
    });
    await dialog
      .getByLabel(lang === 'en' ? 'Affected quantity' : 'Quantité concernée', {
        exact: true,
      })
      .fill('2');
    await dialog
      .getByLabel(
        lang === 'en'
          ? 'Your circuit and the issue'
          : 'Votre montage et le problème',
        { exact: true },
      )
      .fill(
        'Les broches ne correspondent pas à mon montage. <script>texte privé</script>',
      );
    assert.ok(
      await dialog
        .locator('textarea')
        .evaluate(
          (el) =>
            el.getBoundingClientRect().width >=
            el.closest('form').getBoundingClientRect().width - 4,
        ),
      'Issue textarea must use the full form width',
    );
    return dialog;
  }
  try {
    for (const [width, lang] of [
      [360, 'fr'],
      [390, 'fr'],
      [768, 'en'],
      [1440, 'en'],
    ]) {
      const order = await fixture(),
        ui = await contextFor(order, width, lang);
      await ui.page.goto('http://127.0.0.1:5187/commandes/' + order.id);
      let dialog = await fill(ui.page, lang);
      if ([390, 1440].includes(width))
        await dialog.screenshot({ path: `${output}/formulaire-${width}.png` });
      if (width === 360) {
        for (let i = 0; i < 10; i++) {
          await ui.page.keyboard.press('Tab');
          assert.ok(
            await dialog.evaluate(
              (el) =>
                document.activeElement === document.body ||
                el.contains(document.activeElement),
            ),
          );
        }
        await ui.page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(
          ui.page.getByRole('button', {
            name: 'Signaler un problème',
            exact: true,
          }),
        ).toBeFocused();
        dialog = await fill(ui.page, lang);
        ui.state.drops = 1;
      }
      await dialog
        .getByRole('button', {
          name: lang === 'en' ? 'Record report' : 'Enregistrer le signalement',
          exact: true,
        })
        .click();
      if (width === 360) {
        await expect(dialog.getByRole('alert')).toBeVisible();
        await ui.page.reload();
        await ui.page
          .getByRole('button', { name: 'Reprendre la tentative', exact: true })
          .click();
        await ui.page
          .getByRole('button', {
            name: 'Vérifier le résultat de cette tentative',
            exact: true,
          })
          .click();
      }
      await expect(
        ui.page.getByText(
          lang === 'en' ? 'Report received' : 'Signalement reçu',
          { exact: true },
        ),
      ).toBeVisible();
      assert.equal(
        await db.dossierIncompatibilite.count({
          where: { ligneCommandeId: order.lignes[0].id },
        }),
        1,
      );
      assert.ok(
        await ui.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await ui.page
        .getByRole('heading', {
          name:
            lang === 'en'
              ? 'An item does not fit your circuit?'
              : 'Un article ne convient pas à votre montage ?',
        })
        .scrollIntoViewIfNeeded();
      await ui.page.screenshot({ path: `${output}/client-${width}.png` });
      await close(ui);
    }
    ok(
      'Client received-line form works at 360/390/768/1440 FR/EN, keyboard focus and literal private text; lost reply and reload replay one case',
    );
    const f = await guestFixture(),
      ui = await contextFor(f.order, 390, 'fr', f);
    mail.enabled = false;
    await ui.page.goto(
      'http://127.0.0.1:5187/suivi-invite#acces=' + f.accessToken,
    );
    await expect(
      ui.page.getByText(
        'La vérification par email est indisponible. Contactez la boutique pour votre problème.',
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      ui.page.getByRole('button', {
        name: 'Signaler un problème',
        exact: true,
      }),
    ).toBeDisabled();
    assert.equal(
      await db.dossierIncompatibilite.count({
        where: { ligneCommandeId: f.dto.ligneCommandeId },
      }),
      0,
    );
    mail.enabled = true;
    await ui.page.reload();
    const dialog = await fill(ui.page);
    await dialog
      .getByRole('button', {
        name: 'Recevoir le code de vérification',
        exact: true,
      })
      .click();
    const codeInput = dialog.getByLabel('Code email à 8 chiffres', {
      exact: true,
    });
    await expect(codeInput).toBeVisible();
    await codeInput.fill(mail.messages.at(-1).code);
    ui.state.drops = 2;
    ui.state.revoke = true;
    await dialog
      .getByRole('button', {
        name: 'Reprendre avec le même contenu',
        exact: true,
      })
      .click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await ui.page.reload();
    await ui.page
      .getByRole('button', { name: 'Reprendre la tentative', exact: true })
      .click();
    await ui.page
      .getByRole('button', {
        name: 'Vérifier le résultat de cette tentative',
        exact: true,
      })
      .click();
    await expect(
      ui.page.getByText(
        'Votre signalement est enregistré. La boutique examinera le problème.',
        { exact: true },
      ),
    ).toBeVisible();
    assert.equal(
      await db.dossierIncompatibilite.count({
        where: { ligneCommandeId: f.dto.ligneCommandeId },
      }),
      1,
    );
    await close(ui);
    ok(
      'Guest provider-off is explicit; captured email code authorizes one private case, interrupted receipt survives reload/revocation without code',
    );
    const order = await fixture(),
      dossier = await db.dossierIncompatibilite.create({
        data: {
          ligneCommandeId: order.lignes[0].id,
          requestId: require('node:crypto').randomUUID(),
          fingerprint: 'f'.repeat(64),
          quantite: 2,
          motif: 'BROCHAGE',
          description: 'Les broches ne correspondent pas à mon montage.',
        },
      });
    const adminUi = await contextFor(order, 390, 'fr', null, admins[0]);
    await adminUi.page.goto('http://127.0.0.1:5174/incompatibilites');
    const row = adminUi.page
      .getByRole('article')
      .filter({ hasText: order.numeroSuivi });
    await row
      .getByRole('button', { name: 'Examiner et répondre', exact: true })
      .click();
    await row
      .getByLabel('Décision', { exact: true })
      .selectOption('RETOUR_CONFIRME');
    await row
      .getByLabel('Réponse privée au client', { exact: true })
      .fill('Nous avons reçu et vérifié les deux pièces incompatibles.');
    await expect(
      row.getByRole('button', { name: 'Enregistrer la décision', exact: true }),
    ).toBeDisabled();
    await row.getByRole('checkbox').check();
    adminUi.state.drops = 1;
    await row
      .getByRole('button', { name: 'Enregistrer la décision', exact: true })
      .click();
    await expect(adminUi.page.getByRole('alert')).toBeVisible();
    await adminUi.page.reload();
    await adminUi.page
      .getByRole('button', { name: 'Reprendre la même décision', exact: true })
      .click();
    await expect(
      adminUi.page.getByText(
        'Décision enregistrée. La réponse est visible dans le suivi privé du client.',
        { exact: true },
      ),
    ).toBeVisible();
    await adminUi.page
      .getByLabel('État du dossier', { exact: true })
      .selectOption('RETOUR_CONFIRME');
    const decided = adminUi.page
      .getByRole('article')
      .filter({ hasText: order.numeroSuivi });
    await expect(decided).toBeVisible();
    await expect(
      decided.getByRole('button', {
        name: 'Examiner et répondre',
        exact: true,
      }),
    ).toHaveCount(0);
    assert.equal(
      await db.incompatibiliteDecision.count({
        where: { dossierId: dossier.id },
      }),
      1,
    );
    for (const width of [360, 390, 768, 1440]) {
      await adminUi.page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await adminUi.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if ([390, 1440].includes(width))
        await adminUi.page.screenshot({
          path: `${output}/boutique-${width}.png`,
        });
    }
    adminUi.state.outage = true;
    await adminUi.page
      .getByRole('button', { name: 'Actualiser', exact: true })
      .click();
    await expect(adminUi.page.getByRole('alert')).toBeVisible();
    await expect(adminUi.page.getByRole('article')).toHaveCount(0);
    assert.ok(
      !(await adminUi.page.locator('body').innerText()).includes(
        'Private synthetic database details',
      ),
    );
    adminUi.state.outage = false;
    await adminUi.page
      .getByRole('button', { name: 'Actualiser', exact: true })
      .click();
    await expect(decided).toBeVisible();
    await close(adminUi);
    const clientUi = await contextFor(order, 390);
    await clientUi.page.goto('http://127.0.0.1:5187/commandes/' + order.id);
    await expect(
      clientUi.page.getByText(
        'Nous avons reçu et vérifié les deux pièces incompatibles.',
        { exact: true },
      ),
    ).toBeVisible();
    await close(clientUi);
    ok(
      'Boutique confirmation requires explicit physical check; lost reply/reload records one audit, private response reaches client, terminal case and outage are clear at four widths',
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(outside, []);
    fs.writeFileSync(
      output + '/result.json',
      JSON.stringify(
        {
          success: true,
          externalRequests: 0,
          realEmails: 0,
          limits: [
            'Edge standalone; surrounding authentication and order reads mocked, registry/JWT/database real',
            'No physical phone or team acceptance',
            'No real policy/refund/restock activated',
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    for (const context of contexts) {
      await context.unrouteAll({ behavior: 'wait' });
      await context.close();
    }
    await browser.close();
  }
};
