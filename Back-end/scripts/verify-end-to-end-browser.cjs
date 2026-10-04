// Invoked only after verify-end-to-end-local.cjs creates its own guarded database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const runtime =
  'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(runtime + '/playwright');
const { expect } = require(runtime + '/playwright/test');

module.exports = async ({
  db,
  base,
  api,
  adminToken,
  client,
  password,
  products,
  project,
  mail,
  ok,
  output,
}) => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 1000 },
    reducedMotion: 'reduce',
  });
  const errors = [],
    blocked = [],
    requests = [];
  let dropOrder = false,
    dropReview = false;
  await context.addInitScript(() => {
    if (!localStorage.getItem('appLang')) localStorage.setItem('appLang', 'fr');
  });
  await context.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      blocked.push(url.hostname);
      return route.abort();
    }
    if (!url.pathname.startsWith('/api/')) return route.continue();
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
      if (url.pathname === '/api/commandes/guest/access' && response.ok()) {
        assert.match(response.headers()['cache-control'], /private.*no-store/);
        assert.equal(response.headers()['referrer-policy'], 'no-referrer');
        assert.match(response.headers()['x-robots-tag'], /noindex/);
      }
      if (
        (dropOrder &&
          request.method() === 'POST' &&
          url.pathname === '/api/commandes') ||
        (dropReview &&
          request.method() === 'POST' &&
          url.pathname === '/api/avis')
      ) {
        assert.ok(
          response.ok(),
          'Only drop an already committed successful response',
        );
        if (url.pathname === '/api/avis') dropReview = false;
        else dropOrder = false;
        return route.abort('connectionreset');
      }
      return route.fulfill({ response });
    } catch (error) {
      errors.push('Forwarding: ' + error.message);
      await route.abort();
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const visit = (route) =>
    page.goto('http://127.0.0.1:5187' + route, {
      waitUntil: 'domcontentloaded',
    });
  async function screen(name) {
    await page.screenshot({
      path: path.join(output, name + '.png'),
      fullPage: true,
    });
  }
  try {
    await visit('/login?returnTo=%2Fcatalogue');
    await page
      .getByLabel('E-mail ou téléphone', { exact: true })
      .fill(client.email);
    await page.getByLabel('Mot de passe', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: 'Se connecter', exact: true })
      .click();
    await expect(page).toHaveURL(/\/catalogue$/);
    await expect(
      page.getByRole('button', {
        name: 'Comparer : ' + products[0].nomProduit,
        exact: true,
      }),
    ).toBeVisible();
    for (const product of products)
      await page
        .getByRole('button', {
          name: 'Comparer : ' + product.nomProduit,
          exact: true,
        })
        .click();
    await visit('/comparer');
    await expect(
      page.getByRole('heading', {
        name: 'Comparer les composants',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('3.3 V', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('5 V', { exact: true }).first()).toBeVisible();
    await screen('comparison-mobile');
    ok(
      'Existing customer signs in through real JWT API and compares real catalogue references',
    );

    await visit('/projets/' + project.slug);
    await expect(
      page.getByRole('heading', { name: project.titre, exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Vérifier et ajouter au panier',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/panier$/);
    await visit('/checkout');
    await expect(
      page.getByRole('heading', {
        name: 'Comment recevoir votre commande ?',
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('radio', { name: /Retrait à Akwa/ }).check();
    await page
      .getByRole('button', { name: 'Vérifier ma sélection', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Une dernière vérification',
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('checkbox').check();
    dropOrder = true;
    await page
      .getByRole('button', { name: 'Enregistrer ma commande', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Reprendre votre commande',
        exact: true,
      }),
    ).toBeVisible();
    await expect.poll(() => db.commande.count()).toBe(1);
    const original = await db.commande.findFirstOrThrow({
      include: { lignes: true },
    });
    assert.equal(original.clientId, client.id);
    assert.equal(original.modeReception, 'RETRAIT_MAGASIN');
    assert.equal(Number(original.montantTotal), 4200);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: 'Reprendre cette tentative', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Commande enregistrée', exact: true }),
    ).toBeVisible();
    assert.equal(await db.commande.count(), 1);
    for (let i = 0; i < products.length; i++) {
      const product = await db.produit.findUniqueOrThrow({
        where: { id: products[i].id },
      });
      assert.equal(product.quantiteStock, 20 - (i + 1));
    }
    await screen('order-recovered-mobile');
    ok(
      'Published project reaches real checkout; lost response and reload recover one order with one stock deduction',
    );

    const customerToken = await page.evaluate(() =>
      localStorage.getItem('newoteg_token'),
    );
    async function deniedReview(lineId, expectedStatus) {
      const response = await fetch(base + '/api/avis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + customerToken,
        },
        body: JSON.stringify({
          requestId: randomUUID(),
          ligneCommandeId: lineId,
          note: 2,
          texte: 'Tentative de recette qui doit être refusée.',
          pseudonyme: 'Recette privée',
        }),
      });
      assert.equal(response.status, expectedStatus);
    }
    await deniedReview(original.lignes[0].id, 409);
    assert.equal(
      await db.avisProduit.count(),
      0,
      'No review before physical receipt',
    );

    await api(
      'PATCH',
      '/commandes/' + original.id,
      { statut: 'CONFIRMEE' },
      adminToken,
    );
    await api(
      'PATCH',
      '/commandes/' + original.id + '/pickup',
      { paiementSurPlace: false },
      adminToken,
    );
    await visit('/commandes/' + original.id);
    await page
      .getByRole('button', { name: 'Donner mon avis', exact: true })
      .first()
      .click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('1/5', { exact: true }).check();
    await dialog
      .getByLabel('Pseudonyme public', { exact: true })
      .fill('Maker recette');
    const negative =
      'La pièce fonctionne, mais la présentation ne correspondait pas à mes attentes.';
    await dialog.getByLabel('Votre avis', { exact: true }).fill(negative);
    await dialog.getByRole('checkbox').check();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      assert.ok(
        await dialog.evaluate(
          (el) =>
            document.activeElement === document.body ||
            el.contains(document.activeElement),
        ),
      );
    }
    dropReview = true;
    await dialog
      .getByRole('button', { name: 'Enregistrer mon avis', exact: true })
      .click();
    await expect.poll(() => db.avisProduit.count()).toBe(1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: 'Reprendre mon avis', exact: true })
      .click();
    dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'Enregistrer mon avis', exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    const review = await db.avisProduit.findFirstOrThrow({
      include: { ligne: true },
    });
    assert.equal(review.note, 1);
    assert.equal(review.texte, negative);
    assert.equal(await db.avisProduit.count(), 1);
    await deniedReview(review.ligneCommandeId, 409);
    assert.equal(
      await db.avisProduit.count(),
      1,
      'Another request cannot create a second review for the same received line',
    );
    let publicReviews = await api(
      'GET',
      '/avis/produits/' + review.ligne.produitId,
    );
    assert.equal(publicReviews.total, 0);
    await api(
      'POST',
      '/avis/admin/' + review.id + '/moderation',
      {
        requestId: randomUUID(),
        expectedVersion: review.version,
        action: 'PUBLIER',
      },
      adminToken,
    );
    publicReviews = await api(
      'GET',
      '/avis/produits/' + review.ligne.produitId,
    );
    assert.equal(publicReviews.total, 1);
    assert.equal(publicReviews.items[0].note, 1);
    await visit('/product/' + review.ligne.produitId);
    await expect(page.getByText(negative, { exact: true })).toBeVisible();
    await screen('negative-review-published-mobile');
    ok(
      'Confirmed pickup unlocks review; lost review response recovers one row; compliant one-star review is published only after moderation',
    );

    await db.produit.update({
      where: { id: products[0].id },
      data: { prixDetail: 1600 },
    });
    await visit('/commandes/' + original.id);
    await page
      .getByRole('button', { name: 'Acheter à nouveau', exact: true })
      .click();
    dialog = page.getByRole('dialog');
    await expect(
      dialog.getByText('Prix actualisé', { exact: true }),
    ).toBeVisible();
    await screen('reorder-current-prices-mobile');
    await dialog
      .getByRole('button', {
        name: 'Ajouter la sélection au panier',
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/panier$/);
    assert.equal(
      await db.commande.count(),
      1,
      'Reorder prepares cart without creating another order',
    );
    assert.equal(
      (
        await db.commande.findUniqueOrThrow({ where: { id: original.id } })
      ).montantTotal.toString(),
      '4200',
    );
    ok(
      'Reorder exposes current price and prepares cart while preserving historical order amount',
    );

    for (const [width, lang] of [
      [360, 'fr'],
      [768, 'fr'],
      [1440, 'en'],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        (lang) => localStorage.setItem('appLang', lang),
        lang,
      );
      await visit('/commandes/' + original.id);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(
        page.getByRole('button', {
          name: lang === 'en' ? 'Buy again' : 'Acheter à nouveau',
          exact: true,
        }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      assert.ok(overflow <= 1, 'Order page horizontal overflow at ' + width);
      await screen('received-order-' + width + '-' + lang);
    }
    assert.deepEqual(errors, []);
    assert.ok(
      requests.some((r) => r.path === '/api/auth/login' && r.status === 201),
    );
    ok(
      'Received order has no page overflow at 360, 768 and 1440 pixels; English and review-dialog keyboard navigation verified',
    );

    // A separate anonymous journey: no stored account or cart, no signup, no send provider.
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('appLang', 'en');
    });
    await visit('/projets/' + project.slug);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .getByRole('button', { name: 'Check and add to cart', exact: true })
      .click();
    await expect(page).toHaveURL(/\/panier$/);
    await visit('/checkout');
    await page.getByRole('radio', { name: /^Delivery/ }).check();
    await page
      .getByLabel('Full name', { exact: true })
      .fill('Guest acceptance fixture');
    await page.getByLabel('Phone', { exact: true }).fill('+237600000002');
    await page
      .getByLabel('Tracking email (optional)', { exact: true })
      .fill('guest-fixture@example.invalid');
    await page.getByLabel('City', { exact: true }).fill('Douala');
    await page
      .getByLabel('Street address and landmark', { exact: true })
      .fill('Fixture only, no real delivery address');
    await expect(page.getByText('To confirm', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Review my selection', exact: true })
      .click();
    await page.getByRole('checkbox').check();
    await page
      .getByRole('button', { name: 'Record my order', exact: true })
      .click();
    const track = page.getByRole('link', {
      name: 'View my private tracking',
      exact: true,
    });
    await expect(track).toBeVisible();
    const guestOrder = await db.commande.findFirstOrThrow({
      where: { clientId: null },
      include: { lignes: true },
    });
    assert.equal(guestOrder.modeReception, 'LIVRAISON');
    assert.equal(Number(guestOrder.montantTotal), 4600);
    assert.equal(
      await db.client.count(),
      1,
      'Guest checkout must not create an account',
    );
    await track.click();
    await expect(
      page.getByRole('heading', { name: 'Your private tracking', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(guestOrder.numeroSuivi, { exact: true }),
    ).toBeVisible();
    assert.equal(
      new URL(page.url()).hash,
      '',
      'Private token is removed from browser address',
    );
    assert.equal(new URL(page.url()).search, '', 'No private token in query');
    await api(
      'PATCH',
      '/commandes/' + guestOrder.id,
      { statut: 'CONFIRMEE' },
      adminToken,
    );
    await api(
      'PATCH',
      '/commandes/' + guestOrder.id,
      { statut: 'EN_LIVRAISON' },
      adminToken,
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(guestOrder.numeroSuivi, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('In transit', { exact: true }).first(),
    ).toBeVisible();
    await screen('guest-delivery-private-desktop');
    assert.deepEqual(await api('GET', '/commandes/guest/channels'), {
      email: false,
      sms: false,
    });
    assert.equal(mail.messages.length, 0);
    assert.equal(await db.commande.count(), 2);
    for (let i = 0; i < products.length; i++)
      assert.equal(
        (await db.produit.findUniqueOrThrow({ where: { id: products[i].id } }))
          .quantiteStock,
        20 - 2 * (i + 1),
      );
    assert.deepEqual(errors, []);
    ok(
      'English anonymous delivery records no account or messages; fees remain unconfirmed and dispatched tracking stays private after reload',
    );
  } catch (error) {
    await screen('failure').catch(() => {});
    fs.writeFileSync(
      path.join(output, 'failure-dom.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => 'Unavailable'),
    );
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(output, 'browser-evidence.json'),
      JSON.stringify(
        {
          requests,
          errors,
          blockedExternalHosts: [...new Set(blocked)],
          apiResponsesMocked: false,
          adminOperations: 'Real API; admin UI not covered by this recipe',
        },
        null,
        2,
      ),
    );
    await context.unrouteAll({ behavior: 'wait' });
    await context.close();
    await browser.close();
  }
};
