// Invoked only by the harness owning the fresh disposable database.
// Real matching service, PostgreSQL reservations, public pricing and browser UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const runtime =
  'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(runtime + '/playwright');
const { expect } = require(runtime + '/playwright/test');

module.exports = async ({ db, base, api, admin, products, ok, output }) => {
  const [identity] = await db.$queryRawUnsafe(
    'SELECT current_database() AS name',
  );
  assert.match(identity.name, /^newoteg_e2e_[a-f0-9]{32}$/);
  const orderCount = await db.commande.count();
  const fixtures = [];
  for (const suffix of ['Q', 'R', 'S', 'T'])
    fixtures.push(
      await db.produit.create({
        data: {
          categorieId: products[0].categorieId,
          code: 'LM358-' + suffix,
          codeFamille: 'AMPLI',
          nomProduit: 'Composant de recette LM358-' + suffix,
          designationEn: 'Test component LM358-' + suffix,
          marque: 'Recette fictive',
          description:
            'Fixture only; no real electronic compatibility verified.',
          quantiteStock: suffix === 'T' ? 0 : 3,
          estActif: suffix !== 'S',
          prixDetail: 2300,
          ...(suffix === 'Q'
            ? { prixPromo: 1800, finPromo: new Date(Date.now() + 3600000) }
            : {}),
          attributs: {
            create: {
              nomAttribut: 'Tension',
              typeAttribut: 'TEXTE',
              valeurs: { create: { valeur: '12 V' } },
            },
          },
        },
      }),
    );
  const [offer, reserved, archived, empty] = fixtures;
  const ticket = await db.ticketVente.create({
    data: {
      numeroTicket: 'EQUIV-FIXTURE',
      vendeurId: admin.id,
      montantTotal: 6900,
      expiresAt: new Date(Date.now() + 3600000),
      lignes: {
        create: {
          produitId: reserved.id,
          nomProduit: reserved.nomProduit,
          quantite: 3,
          prixUnitaire: 2300,
          sousTotal: 6900,
        },
      },
    },
  });
  const query = 'LM358-Z';
  const suggest = () =>
    api('POST', '/equivalence/suggest', { query, source: 'ecommerce' });
  const initial = await suggest();
  assert.equal(
    initial.mode,
    'catalogue',
    'No configured remote provider in this recipe',
  );
  const offered = initial.suggestions.find((s) => s.produitId === offer.id);
  assert.ok(offered);
  assert.equal(offered.prixPublic, 1800);
  assert.equal(offered.quantiteStock, 3);
  assert.equal(offered.offre.prixCatalogue, 2300);
  assert.ok(initial.suggestions.every((s) => s.compatibilite === 'inconnue'));
  for (const p of [reserved, archived, empty])
    assert.ok(!initial.suggestions.some((s) => s.produitId === p.id));
  const publicOffer = await api('GET', '/produits/' + offer.id);
  assert.equal(publicOffer.prixPublic, offered.prixPublic);
  assert.equal(publicOffer.quantiteStock, offered.quantiteStock);
  ok(
    'Equivalence API uses public offers and excludes fully reserved, archived and empty fixtures',
  );

  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const contexts = [],
    requests = [],
    errors = [],
    blocked = [];
  let failNext = false,
    page;
  async function surface(lang, width) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    });
    contexts.push(context);
    await context.addInitScript(
      (lang) => localStorage.setItem('appLang', lang),
      lang,
    );
    await context.route('**/*', async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
        blocked.push(url.hostname);
        return route.abort();
      }
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (failNext && url.pathname === '/api/equivalence/suggest') {
        failNext = false;
        return route.abort('connectionreset');
      }
      try {
        const response = await route.fetch({
          url: base + url.pathname + url.search,
          maxRetries: 0,
        });
        requests.push({
          lang,
          method: request.method(),
          path: url.pathname,
          status: response.status(),
        });
        return route.fulfill({ response });
      } catch (error) {
        errors.push(error.message);
        return route.abort();
      }
    });
    const result = await context.newPage();
    result.on('pageerror', (error) => errors.push(error.message));
    return result;
  }
  const visit = (p, route) =>
    p.goto('http://127.0.0.1:5187' + route, { waitUntil: 'domcontentloaded' });
  async function screenshot(p, name) {
    // Reset result auto-scroll so sticky navigation does not cover the middle
    // of a full-page proof, especially after changing responsive widths.
    await p.evaluate(async () => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    return p.screenshot({
      path: path.join(output, name + '.png'),
      fullPage: true,
    });
  }
  const offerArticle = (p) =>
    p
      .locator('.e-equivalent')
      .filter({ has: p.locator('a[href="/product/' + offer.id + '"]') });
  try {
    page = await surface('fr', 390);
    await visit(page, '/catalogue?search=' + query);
    await expect(
      page.getByRole('heading', {
        name: 'Aucun résultat pour cette recherche',
      }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Trouver un équivalent', exact: true })
      .click();
    await expect(page.getByLabel('La pièce que vous cherchez')).toHaveValue(
      query,
    );
    await page
      .getByRole('button', { name: 'Rechercher un équivalent', exact: true })
      .click();
    const article = offerArticle(page);
    await expect(article).toContainText(/1\s800\sFCFA/);
    await expect(article).toContainText('Correspondance catalogue');
    await expect(article).toContainText(
      'Vérifier les caractéristiques techniques avant substitution.',
    );
    await expect(article).toContainText(/Prix catalogue : 2\s300\sFCFA/);
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('newoteg_cart') || '[]'),
      ),
      [],
    );
    assert.equal(
      await page
        .locator('.e-equivalent')
        .getByRole('button', { name: /Ajouter/ })
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(() => document.activeElement.className),
      'e-equivalence-results',
    );
    await screenshot(page, 'equivalences-results-fr-mobile');
    await article.getByRole('link', { name: 'Examiner cette pièce' }).click();
    await expect(
      page.getByRole('heading', { name: offer.nomProduit, exact: true }),
    ).toBeVisible();
    await expect(page.locator('.e-product-price')).toContainText(
      /1\s800\sFCFA/,
    );
    await page
      .getByRole('button', {
        name: 'Comparer : ' + offer.nomProduit,
        exact: true,
      })
      .click();
    await visit(page, '/product/' + products[0].id);
    await expect(
      page.getByRole('heading', { name: products[0].nomProduit, exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: 'Comparer : ' + products[0].nomProduit,
        exact: true,
      })
      .click();
    await visit(page, '/comparer');
    await expect(
      page.getByRole('heading', {
        name: 'Comparer les composants',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('12 V', { exact: true })).toBeVisible();
    await expect(page.getByText('5 V', { exact: true })).toBeVisible();
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem('newoteg_cart') || '[]'),
      ),
      [],
    );
    await screenshot(page, 'equivalences-comparison-fr-mobile');
    await visit(page, '/product/' + offer.id);
    await expect(
      page.getByRole('heading', { name: offer.nomProduit, exact: true }),
    ).toBeVisible();
    await page
      .locator('.e-purchase')
      .getByRole('button', { name: 'Ajouter au panier', exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem('newoteg_cart') || '[]').length,
        ),
      )
      .toBe(1);
    const cart = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('newoteg_cart')),
    );
    assert.equal(cart[0].id, offer.id);
    assert.equal(cart[0].retailPrice, 1800);
    assert.equal(await db.commande.count(), orderCount);
    ok(
      'Absent-reference search reaches unverified alternatives, real specifications comparison and explicit cart selection',
    );

    await visit(
      page,
      '/equivalences?query=' +
        reserved.nomProduit +
        '&produitId=' +
        reserved.id,
    );
    await page
      .getByRole('button', { name: 'Rechercher un équivalent', exact: true })
      .click();
    await expect(offerArticle(page)).toBeVisible();
    assert.equal(
      await page
        .locator('.e-equivalent a[href="/product/' + reserved.id + '"]')
        .count(),
      0,
    );
    await page
      .getByLabel('La pièce que vous cherchez')
      .fill('chaise de bureau');
    await expect(page.locator('.e-equivalent')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Rechercher un équivalent', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Aucun équivalent proposé' }),
    ).toBeVisible();
    await page.getByLabel('La pièce que vous cherchez').fill(query);
    failNext = true;
    await page
      .getByRole('button', { name: 'Rechercher un équivalent', exact: true })
      .click();
    await expect(page.getByRole('alert')).toContainText(
      'Votre référence est conservée',
    );
    await expect(page.getByLabel('La pièce que vous cherchez')).toHaveValue(
      query,
    );
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(offerArticle(page)).toBeVisible();
    await screenshot(page, 'equivalences-retry-fr-mobile');
    const english = await surface('en', 1440);
    await visit(english, '/equivalences?query=' + query);
    await english
      .getByRole('button', { name: 'Find an equivalent', exact: true })
      .click();
    await expect(offerArticle(english)).toContainText(offer.designationEn);
    await expect(offerArticle(english)).toContainText(
      'Catalogue suggestion based on matching stocked products.',
    );
    await expect(offerArticle(english)).toContainText(
      'Check the technical specifications before substitution.',
    );
    await expect(english).toHaveTitle('Find an equivalent — X-Electronic');
    for (const width of [360, 768, 1440]) {
      await english.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() =>
          english.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await screenshot(english, 'equivalences-results-en-' + width);
    }
    ok(
      'Target exclusion, no-results, retained reference after failure and FR/EN responsive equivalence screens verified',
    );

    await db.ticketVente.update({
      where: { id: ticket.id },
      data: {
        montantTotal: 8700,
        lignes: {
          create: {
            produitId: offer.id,
            nomProduit: offer.nomProduit,
            quantite: 1,
            prixUnitaire: 1800,
            sousTotal: 1800,
          },
        },
      },
    });
    let result = await suggest();
    assert.equal(
      result.suggestions.find((s) => s.produitId === offer.id).quantiteStock,
      2,
    );
    await db.produit.update({
      where: { id: offer.id },
      data: { finPromo: new Date(Date.now() - 1000) },
    });
    result = await suggest();
    assert.equal(
      result.suggestions.find((s) => s.produitId === offer.id).prixPublic,
      2300,
    );
    assert.equal(
      result.suggestions.find((s) => s.produitId === offer.id).offre,
      null,
    );
    await db.ticketVente.update({
      where: { id: ticket.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    result = await suggest();
    assert.equal(
      result.suggestions.find((s) => s.produitId === offer.id).quantiteStock,
      3,
    );
    assert.equal(
      result.suggestions.find((s) => s.produitId === reserved.id).quantiteStock,
      3,
    );
    assert.equal(await db.commande.count(), orderCount);
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    ok(
      'Cached equivalences refresh after real reservations, offer expiry and reservation expiry without new orders',
    );
  } catch (error) {
    if (page) {
      await screenshot(page, 'equivalences-failure').catch(() => {});
      fs.writeFileSync(
        path.join(output, 'equivalences-failure.txt'),
        await page
          .locator('body')
          .innerText()
          .catch(() => 'Unavailable'),
      );
    }
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(output, 'equivalences-browser-evidence.json'),
      JSON.stringify(
        {
          requests,
          errors,
          blockedExternalHosts: blocked,
          apiResponsesMocked: false,
          fixturesOnly: true,
          remoteProviderConfigured: false,
          realTechnicalCompatibilityVerified: false,
        },
        null,
        2,
      ) + '\n',
    );
    for (const context of contexts) {
      await context.unrouteAll({ behavior: 'wait' });
      await context.close();
    }
    await browser.close();
  }
};
