// Runs only inside the disposable database owned by verify-end-to-end-local.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime =
  'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(runtime + '/playwright');
const { expect } = require(runtime + '/playwright/test');

module.exports = async ({
  db,
  base,
  client,
  admin,
  password,
  products,
  ok,
  output,
}) => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const contexts = [],
    requests = [],
    errors = [],
    blocked = [];
  const faults = { create: false, prepare: false, accept: false };
  let acceptedAttempt;
  async function surface(origin, width, name) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    });
    contexts.push(context);
    await context.addInitScript(() => {
      if (!localStorage.getItem('appLang'))
        localStorage.setItem('appLang', 'fr');
    });
    await context.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        p = url.pathname;
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
        blocked.push(url.hostname);
        return route.abort();
      }
      if (!p.startsWith('/api/')) return route.continue();
      try {
        const response = await route.fetch({
          url: base + p + url.search,
          maxRetries: 0,
        });
        requests.push({
          surface: name,
          method: request.method(),
          path: p,
          status: response.status(),
        });
        const fault =
          request.method() === 'POST' &&
          (p === '/api/devis'
            ? 'create'
            : /\/preparation$/.test(p)
              ? 'prepare'
              : /\/accepter$/.test(p)
                ? 'accept'
                : null);
        if (fault && faults[fault]) {
          assert.ok(response.ok(), 'Only cut a successful committed response');
          if (fault === 'accept') acceptedAttempt = request.postDataJSON();
          faults[fault] = false;
          return route.abort('connectionreset');
        }
        return route.fulfill({ response });
      } catch (error) {
        errors.push('Forwarding: ' + error.message);
        await route.abort();
      }
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(name + ': ' + error.message));
    return {
      page,
      visit: (p) => page.goto(origin + p, { waitUntil: 'domcontentloaded' }),
    };
  }
  let customer, shop;
  async function screen(page, name) {
    await page.screenshot({
      path: path.join(output, name + '.png'),
      fullPage: true,
    });
  }
  try {
    customer = await surface('http://127.0.0.1:5187', 390, 'customer');
    shop = await surface('http://127.0.0.1:5174', 1440, 'shop');
    const page = customer.page,
      adminPage = shop.page;
    await customer.visit('/login?returnTo=%2Fdevis');
    await page
      .getByLabel('E-mail ou téléphone', { exact: true })
      .fill(client.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: 'Se connecter', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Demander un devis', exact: true }),
    ).toBeVisible();
    await page
      .getByLabel('Vos références et quantités', { exact: true })
      .fill(products.map((p) => p.code + '; 1').join('\n'));
    await page
      .getByRole('button', { name: 'Vérifier les références', exact: true })
      .click();
    for (const product of products)
      await page
        .getByLabel(new RegExp('^Article pour ' + product.code))
        .selectOption(product.id);
    await page
      .getByLabel('Téléphone de contact', { exact: true })
      .fill(client.telephone);
    await page
      .getByRole('radio', { name: 'Retrait à Akwa', exact: true })
      .check();
    faults.create = true;
    await page
      .getByRole('button', { name: 'Envoyer ma demande de devis', exact: true })
      .click();
    await expect(
      page.getByRole('button', {
        name: 'Reprendre le même envoi',
        exact: true,
      }),
    ).toBeVisible();
    assert.equal(await db.demandeDevis.count(), 1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: 'Reprendre le même envoi', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Votre demande de devis',
        exact: true,
      }),
    ).toBeVisible();
    const quoteRequest = await db.demandeDevis.findFirstOrThrow();
    assert.equal(quoteRequest.clientId, client.id);
    assert.equal(await db.demandeDevis.count(), 1);
    const stockBefore = await db.produit.findMany({
      where: { id: { in: products.map((p) => p.id) } },
      orderBy: { id: 'asc' },
    });
    const orderCountBefore = await db.commande.count();
    await screen(page, 'devis-request-recovered-mobile');

    await shop.visit('/login');
    await adminPage
      .getByLabel("Nom d'utilisateur", { exact: true })
      .fill(admin.username);
    await adminPage.getByLabel('Mot de passe', { exact: true }).fill(password);
    await adminPage
      .getByRole('button', { name: 'Se connecter', exact: true })
      .click();
    await expect
      .poll(() =>
        adminPage.evaluate(() =>
          Boolean(localStorage.getItem('newoteg_admin_token')),
        ),
      )
      .toBe(true);
    await shop.visit('/demandes-devis');
    const queue = adminPage.getByRole('region', {
      name: 'File de demandes',
      exact: true,
    });
    await queue.getByRole('button', { name: new RegExp(client.nom) }).click();
    const selected = adminPage.getByRole('region', {
      name: 'Demande sélectionnée',
      exact: true,
    });
    await selected.getByLabel(/^Attribuer à/).selectOption(admin.id);
    await selected
      .getByRole('button', { name: 'Enregistrer l’affectation', exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await db.demandeDevis.findUniqueOrThrow({
              where: { id: quoteRequest.id },
            })
          ).responsableId,
      )
      .toBe(admin.id);
    await selected.getByLabel(/^Type de réponse/).selectOption('ENVOYEE');
    const prepare = selected.getByRole('button', {
      name: 'Préparer ou reprendre depuis la demande',
      exact: true,
    });
    faults.prepare = true;
    await prepare.click();
    await expect.poll(() => db.proforma.count()).toBe(1);
    await expect(prepare).toBeEnabled();
    await prepare.click();
    await expect(
      adminPage.getByRole('status').filter({ hasText: 'Proforma retrouvée' }),
    ).toBeVisible();
    const proforma = await db.proforma.findFirstOrThrow({
      include: { lignes: true },
    });
    assert.equal(Number(proforma.montantTotal), 3100);
    assert.equal(await db.proforma.count(), 1);
    assert.equal(await db.commande.count(), orderCountBefore);
    assert.deepEqual(
      await db.produit.findMany({
        where: { id: { in: products.map((p) => p.id) } },
        orderBy: { id: 'asc' },
      }),
      stockBefore,
      'Preparing a quote reserves no stock',
    );
    await selected
      .getByLabel(/^Proforma de ce client/)
      .selectOption(proforma.id);
    const message =
      'Proposition fictive pour la recette locale. Retrait à Akwa après confirmation de disponibilité.';
    await selected
      .getByLabel('Message visible par le client', { exact: true })
      .fill(message);
    await adminPage.setViewportSize({ width: 390, height: 1000 });
    assert.ok(
      await adminPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'Quote preparation must fit the shop mobile page',
    );
    await screen(adminPage, 'devis-shop-preparation-mobile');
    await selected
      .getByRole('button', {
        name: 'Rendre la réponse disponible',
        exact: true,
      })
      .click();
    await expect
      .poll(
        async () =>
          (
            await db.demandeDevis.findUniqueOrThrow({
              where: { id: quoteRequest.id },
            })
          ).statut,
      )
      .toBe('ENVOYEE');
    await adminPage.setViewportSize({ width: 1440, height: 1000 });
    await screen(adminPage, 'devis-shop-offer-desktop');
    ok(
      'Real client request and administrative assignment/preparation/reply; lost responses recover one request and one proforma without stock reservation',
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await screen(page, 'devis-shop-offer-customer-mobile');
    await page.getByRole('checkbox').check();
    faults.accept = true;
    await page
      .getByRole('button', { name: 'Créer ma commande à valider', exact: true })
      .click();
    await expect(
      page.getByRole('button', {
        name: 'Reprendre la même confirmation',
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => db.commande.count()).toBe(orderCountBefore + 1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', {
        name: 'Votre commande est enregistrée',
        exact: true,
      }),
    ).toBeVisible();
    const clientToken = await page.evaluate(() =>
      localStorage.getItem('newoteg_token'),
    );
    const replay = await fetch(
      base + '/api/devis/mine/' + quoteRequest.id + '/accepter',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + clientToken,
        },
        body: JSON.stringify(acceptedAttempt),
      },
    );
    assert.ok(
      replay.ok,
      'The original acceptance can also be replayed without another order',
    );
    const accepted = await db.demandeDevis.findUniqueOrThrow({
      where: { id: quoteRequest.id },
      include: { commande: true },
    });
    assert.equal(accepted.statut, 'ACCEPTEE');
    assert.equal(Number(accepted.commande.montantTotal), 3100);
    assert.equal(await db.commande.count(), orderCountBefore + 1);
    for (const before of stockBefore)
      assert.equal(
        (await db.produit.findUniqueOrThrow({ where: { id: before.id } }))
          .quantiteStock,
        before.quantiteStock - 1,
      );
    await screen(page, 'devis-acceptance-recovered-mobile');
    ok(
      'Customer reads real shop offer; accepted quote survives lost response and reload as one order with one stock deduction',
    );

    await shop.visit('/orders');
    const row = adminPage
      .getByRole('row')
      .filter({ hasText: accepted.commande.numeroSuivi });
    await row.getByRole('combobox').selectOption('CONFIRMEE');
    await expect
      .poll(
        async () =>
          (
            await db.commande.findUniqueOrThrow({
              where: { id: accepted.commandeId },
            })
          ).statut,
      )
      .toBe('CONFIRMEE');
    await row.getByRole('button', { name: 'Retrait', exact: true }).click();
    await expect(
      adminPage.getByRole('heading', {
        name: 'Traiter le retrait',
        exact: true,
      }),
    ).toBeVisible();
    const confirmation = adminPage.getByRole('button', {
      name: 'Confirmer le retrait',
      exact: true,
    });
    await expect(confirmation).toBeDisabled();
    for (const product of products)
      await adminPage
        .getByRole('checkbox', { name: new RegExp(product.nomProduit) })
        .check();
    await adminPage
      .getByRole('button', { name: 'Especes', exact: true })
      .click();
    await confirmation.click();
    await expect
      .poll(
        async () =>
          (
            await db.commande.findUniqueOrThrow({
              where: { id: accepted.commandeId },
            })
          ).statut,
      )
      .toBe('LIVREE');
    await expect(
      adminPage.getByRole('heading', {
        name: 'Traiter le retrait',
        exact: true,
      }),
    ).not.toBeVisible();
    const cash = await db.caisse.findMany({
      where: { motif: { contains: accepted.commande.numeroSuivi } },
    });
    assert.equal(cash.length, 1);
    assert.equal(Number(cash[0].montant), 3100);
    for (const before of stockBefore)
      assert.equal(
        (await db.produit.findUniqueOrThrow({ where: { id: before.id } }))
          .quantiteStock,
        before.quantiteStock - 1,
        'Physical pickup does not deduct ordered stock twice',
      );
    await customer.visit('/commandes/' + accepted.commandeId);
    await expect(
      page
        .getByRole('button', { name: 'Donner mon avis', exact: true })
        .first(),
    ).toBeVisible();
    await screen(page, 'devis-order-received-mobile');
    await screen(adminPage, 'devis-order-picked-up-shop');
    assert.deepEqual(errors, []);
    ok(
      'Shop UI confirms availability and checks each line before fictitious cash pickup; customer sees received order with review available',
    );
  } catch (error) {
    for (const [name, surface] of [
      ['customer', customer],
      ['shop', shop],
    ])
      if (surface) {
        await screen(surface.page, 'devis-failure-' + name).catch(() => {});
        fs.writeFileSync(
          path.join(output, 'devis-failure-' + name + '.txt'),
          await surface.page
            .locator('body')
            .innerText()
            .catch(() => 'Unavailable'),
        );
      }
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(output, 'devis-browser-evidence.json'),
      JSON.stringify(
        {
          requests,
          errors,
          blockedExternalHosts: [...new Set(blocked)],
          apiResponsesMocked: false,
          fixturesOnly: true,
        },
        null,
        2,
      ),
    );
    for (const context of contexts) {
      await context.unrouteAll({ behavior: 'wait' });
      await context.close();
    }
    await browser.close();
  }
};
