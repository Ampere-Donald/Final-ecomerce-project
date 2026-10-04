// Called by the guarded PostgreSQL recipe. Commerce mocks; real Nest metrics.
const assert = require('node:assert/strict'),
  fs = require('node:fs');
const {
  chromium,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {
  expect,
} = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
module.exports = async ({ base, db, ok, remember }) => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  });
  const debug = [];
  const contexts = new Set(),
    outside = [],
    errors = [],
    cases = [];
  const out =
    'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/parcours-ui';
  fs.mkdirSync(out, { recursive: true });
  const product = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'FIXTURE-METRICS',
    nomProduit: 'Pièce fictive de mesure',
    designationEn: 'Synthetic measurement part',
    prixDetail: 100,
    prixPublic: 100,
    quantiteStock: 1,
    estActif: true,
    categorieId: '22222222-2222-4222-8222-222222222222',
    categorie: {
      id: '22222222-2222-4222-8222-222222222222',
      nom: 'Famille fictive',
    },
    attributs: [],
  };
  const user = {
    id: 'synthetic-client',
    nom: 'Coordonnées privées fictives',
    telephone: '600000000',
    email: 'private@example.invalid',
  };
  const order = {
    id: 'synthetic-order',
    numeroSuivi: 'RECETTE-MESURE',
    statut: 'LIVREE',
    modeReception: 'RETRAIT_MAGASIN',
    dateCommande: new Date().toISOString(),
    dateLivraison: new Date().toISOString(),
    montantTotal: 100,
    lignes: [
      {
        id: 'synthetic-line',
        produitId: product.id,
        nomProduit: product.nomProduit,
        quantite: 1,
        prixUnitaire: 100,
      },
    ],
  };
  async function make({
    width = 390,
    lang = 'fr',
    authenticated = false,
    enabled = true,
    outcome = 'none',
  } = {}) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: 'reduce',
    });
    contexts.add(context);
    await context.addInitScript(
      ({ user, lang, authenticated }) => {
        if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
        localStorage.setItem('appLang', lang);
        if (authenticated) {
          localStorage.setItem('newoteg_token', 'synthetic-sensitive-token');
          localStorage.setItem('newoteg_user', JSON.stringify(user));
        }
      },
      { user, lang, authenticated },
    );
    if (width === 360)
      await context.addInitScript(() => {
        Object.defineProperty(crypto, 'randomUUID', {
          value: undefined,
          configurable: true,
        });
      });
    await context.addCookies([
      {
        name: 'private-cookie',
        value: 'synthetic-cookie',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: 'private-cookie',
        value: 'synthetic-cookie',
        domain: 'localhost',
        path: '/',
      },
    ]);
    const state = {
      enabled,
      outcome,
      drop: false,
      errorSearch: false,
      seen: [],
      calls: 0,
      caps: 0,
      submitted: 0,
    };
    context.on('page', (page) =>
      page.on('pageerror', (e) => errors.push(e.message)),
    );
    await context.route('**/*', async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname;
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        if (url.hostname === 'wa.me')
          return route.fulfill({
            contentType: 'text/html',
            body: '<p>WhatsApp fictif — aucun envoi</p>',
          });
        outside.push(url.hostname);
        return route.abort();
      }
      if (!p.startsWith('/api/')) return route.continue();
      if (req.method() === 'OPTIONS')
        return route.fulfill({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers':
              'Content-Type,Authorization,X-Request-Id',
          },
        });
      if (p.startsWith('/api/parcours/')) {
        const headers = await req.allHeaders();
        for (const name of [
          'authorization',
          'cookie',
          'referer',
          'x-request-id',
        ])
          assert.equal(
            headers[name],
            undefined,
            'Anonymous metrics header ' + name,
          );
        if (p.endsWith('/disponibilite')) {
          state.caps++;
          return route.fulfill({ json: { actif: state.enabled } });
        }
        assert.equal(p, '/api/parcours/evenements');
        const body = req.postDataJSON();
        assert.deepEqual(Object.keys(body), ['evenements']);
        for (const e of body.evenements) {
          assert.deepEqual(Object.keys(e).sort(), [
            'appareil',
            'evenement',
            'id',
            'jour',
            'langue',
            'reception',
          ]);
          remember(e);
          state.seen.push(e);
        }
        const text = JSON.stringify(body);
        for (const secret of [
          'private@example.invalid',
          '600000000',
          product.id,
          product.code,
          order.id,
          'synthetic-sensitive-token',
          'synthetic-cookie',
        ])
          assert.ok(!text.includes(secret));
        state.calls++;
        const response = await route.fetch({ url: base + p, maxRetries: 0 });
        assert.equal(response.status(), 200);
        assert.deepEqual(await response.json(), {
          actif: true,
          enregistre: true,
        });
        if (state.drop) {
          state.drop = false;
          return route.abort('connectionreset');
        }
        return route.fulfill({ response });
      }
      if (p === '/api/auth/me') return route.fulfill({ json: user });
      if (p === '/api/commandes/my-orders')
        return route.fulfill({ json: [order] });
      if (p === '/api/commandes/quote') {
        const body = req.postDataJSON();
        return route.fulfill({
          json: {
            requestProtocol: 1,
            montantArticles: body.lignes.reduce(
              (n, l) => n + l.quantite * 100,
              0,
            ),
            lignes: body.lignes.map((l) => ({
              ...l,
              nomProduit: product.nomProduit,
              prixUnitaire: 100,
            })),
          },
        });
      }
      if (
        p === '/api/commandes/checkout' ||
        (p === '/api/commandes' && req.method() === 'POST')
      ) {
        state.submitted++;
        if (state.outcome === 'uncertain')
          return route.fulfill({
            status: 503,
            json: { message: 'Réponse fictive incertaine' },
          });
        if (state.outcome === 'success')
          return route.fulfill({
            json: { commande: { ...order, statut: 'EN_ATTENTE' } },
          });
        throw Error('Unexpected fixture order submission');
      }
      if (req.method() !== 'GET') throw Error('Unexpected API mutation ' + p);
      if (p === '/api/produits/' + product.id)
        return route.fulfill({ json: product });
      if (p.startsWith('/api/produits/'))
        return route.fulfill({
          status: 404,
          json: { message: 'Fixture missing' },
        });
      if (p === '/api/produits') {
        if (state.errorSearch && url.searchParams.has('search'))
          return route.fulfill({
            status: 503,
            json: { message: 'Fixture search outage' },
          });
        const empty = url.searchParams.has('search');
        return route.fulfill({
          json: {
            data: empty ? [] : [product],
            meta: { total: empty ? 0 : 1, lastPage: 1 },
          },
        });
      }
      if (p === '/api/categories')
        return route.fulfill({
          json: [{ id: product.categorieId, nom: 'Famille fictive' }],
        });
      if (p.startsWith('/api/avis/produits/'))
        return route.fulfill({
          json: { items: [], total: 0, moyenne: null, page: 1, limit: 10 },
        });
      return route.fulfill({ json: [] });
    });
    const page = await context.newPage();
    const logs = [];
    page.on('console', (m) => {
      if (m.type() === 'error') logs.push(m.text());
    });
    page.on('requestfailed', (r) =>
      logs.push(r.url() + ': ' + r.failure()?.errorText),
    );
    debug.push({ page, state, logs });
    const count = (name) =>
      new Set(state.seen.filter((e) => e.evenement === name).map((e) => e.id))
        .size;
    return { page, context, state, count };
  }
  async function waitCount(c, name, number) {
    await expect.poll(() => c.count(name), { timeout: 12000 }).toBe(number);
  }
  async function close(c) {
    await c.context.unrouteAll({ behavior: 'wait' });
    await c.context.close();
    contexts.delete(c.context);
  }
  async function prepareFees(c) {
    await c.page.goto('http://127.0.0.1:5187/product/' + product.id);
    await c.page
      .locator('.e-product-info')
      .getByRole('button', { name: 'Ajouter au panier', exact: true })
      .click();
    await waitCount(c, 'AJOUT_PANIER', 1);
    await c.page.goto('http://127.0.0.1:5187/checkout');
    await c.page.locator('input[name="mode"][value="LIVRAISON"]').check();
    await c.page
      .getByLabel('Nom complet', { exact: true })
      .fill('Personne fictive');
    await c.page.getByLabel('Téléphone', { exact: true }).fill('600000000');
    await c.page.getByLabel('Ville', { exact: true }).fill('Douala');
    await c.page
      .getByLabel('Quartier, adresse et repère', { exact: true })
      .fill('Adresse fictive de recette');
    assert.equal(c.count('FRAIS_VUS'), 0);
    await c.page
      .getByRole('button', { name: 'Vérifier ma sélection', exact: true })
      .click();
    await expect(c.page.locator('.e-review')).toBeVisible();
    await c.page
      .locator('.e-summary')
      .getByText('Frais de livraison', { exact: true })
      .scrollIntoViewIfNeeded();
    await waitCount(c, 'FRAIS_VUS', 1);
  }
  try {
    const c = await make({ authenticated: true });
    await c.page.goto('http://127.0.0.1:5187/product/' + product.id);
    await waitCount(c, 'FICHE_OUVERTE', 1);
    c.state.drop = true;
    await c.page
      .locator('.e-product-info')
      .getByRole('button', { name: 'Ajouter au panier', exact: true })
      .click();
    await waitCount(c, 'AJOUT_PANIER', 1);
    await expect
      .poll(
        () => c.state.seen.filter((e) => e.evenement === 'AJOUT_PANIER').length,
        { timeout: 12000 },
      )
      .toBe(2);
    const replay = c.state.seen.filter((e) => e.evenement === 'AJOUT_PANIER');
    assert.deepEqual(replay[0], replay[1]);
    assert.equal(
      await db.parcoursRecu.count({ where: { id: replay[0].id } }),
      1,
    );
    assert.equal(
      (
        await db.parcoursJour.findFirst({
          where: {
            jour: new Date(replay[0].jour + 'T00:00:00Z'),
            evenement: 'AJOUT_PANIER',
            langue: 'fr',
            appareil: 'mobile',
            reception: 'GENERAL',
          },
        })
      ).nombre,
      1,
    );
    await c.page
      .locator('.e-product-info')
      .getByRole('button', { name: 'Ajouter au panier', exact: true })
      .click();
    await c.page
      .getByRole('button', { name: 'Conseil sur cette pièce', exact: true })
      .click();
    await c.page
      .getByRole('link', {
        name: 'Ouvrir ce message dans WhatsApp',
        exact: true,
      })
      .click();
    await waitCount(c, 'WHATSAPP_OUVERT', 1);
    assert.equal(c.count('AJOUT_PANIER'), 1);
    const stored = await c.page.evaluate(() => [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ]);
    assert.equal(
      stored.some((k) => /parcours|journey|analytics/i.test(k)),
      false,
    );
    await close(c);
    cases.push(
      'Actual stock-capped add, lost reply same UUID, StrictMode, anonymous headers and WhatsApp without transmitting message',
    );
    ok(cases.at(-1));

    const search = await make();
    await search.page.goto(
      'http://127.0.0.1:5187/catalogue?search=private%40example.invalid',
    );
    await waitCount(search, 'RECHERCHE_VIDE', 1);
    await search.page.locator('.e-sort select').selectOption('price-asc');
    await search.page.locator('#e-search').fill('another-empty');
    await search.page.locator('#e-search').press('Enter');
    await waitCount(search, 'RECHERCHE_VIDE', 2);
    search.state.errorSearch = true;
    await search.page.locator('.e-sort select').selectOption('price-desc');
    await expect(
      search.page.getByText('Résultats indisponibles', { exact: true }),
    ).toBeVisible();
    await search.page.goto('http://127.0.0.1:5187/product/missing');
    await expect(
      search.page.getByRole('heading', { name: 'Ce produit est introuvable' }),
    ).toBeVisible();
    assert.equal(search.count('RECHERCHE_VIDE'), 2);
    assert.equal(search.count('FICHE_OUVERTE'), 0);
    await close(search);
    cases.push(
      'Successful empty searches only; failed search and missing detail not counted, free search absent from telemetry',
    );
    ok(cases.at(-1));

    for (const outcome of ['none', 'uncertain', 'success']) {
      const f = await make({ width: outcome === 'none' ? 390 : 1440, outcome });
      await prepareFees(f);
      if (outcome !== 'none') {
        await f.page.locator('.e-review-accept input').check();
        await f.page
          .getByRole('button', { name: 'Enregistrer ma commande', exact: true })
          .click();
        await expect.poll(() => f.state.submitted).toBe(1);
        await expect(
          f.page.getByRole('heading', {
            name:
              outcome === 'success'
                ? 'Commande enregistrée'
                : 'Reprendre votre commande',
            exact: true,
          }),
        ).toBeVisible();
      }
      await f.page
        .locator('.e-footer')
        .getByRole('link', { name: 'Catalogue', exact: true })
        .click();
      await expect(f.page).toHaveURL(/\/catalogue$/);
      if (outcome === 'none') await waitCount(f, 'SORTIE_APRES_FRAIS', 1);
      else {
        await new Promise((r) => setTimeout(r, 5500));
        assert.equal(f.count('SORTIE_APRES_FRAIS'), 0);
      }
      await close(f);
    }
    cases.push(
      'Fee visibility, real navigation departure, known and uncertain order responses conservatively separated',
    );
    ok(cases.at(-1));

    const reorder = await make({ authenticated: true });
    await reorder.page.goto('http://127.0.0.1:5187/commandes');
    await reorder.page
      .getByRole('button', { name: 'Acheter à nouveau', exact: true })
      .click();
    await reorder.page
      .getByRole('button', {
        name: 'Ajouter la sélection au panier',
        exact: true,
      })
      .click();
    await expect(reorder.page).toHaveURL(/\/panier$/);
    await waitCount(reorder, 'REACHAT_AJOUTE', 1);
    assert.equal(reorder.count('AJOUT_PANIER'), 1);
    await close(reorder);
    cases.push(
      'Reorder counted only after group addition committed, without order ID',
    );
    ok(cases.at(-1));

    const disabled = await make({ enabled: false });
    await disabled.page.goto('http://127.0.0.1:5187/product/' + product.id);
    await disabled.page
      .locator('.e-product-info')
      .getByRole('button', { name: 'Ajouter au panier', exact: true })
      .click();
    await disabled.page.goto('http://127.0.0.1:5187/panier');
    await expect(disabled.page.locator('.e-cart-line')).toBeVisible();
    assert.equal(disabled.state.calls, 0);
    await close(disabled);
    cases.push('Disabled metrics do not post or block the cart');
    ok(cases.at(-1));

    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      const size = await make({ width, lang: width === 768 ? 'en' : 'fr' });
      await size.page.goto('http://127.0.0.1:5187/product/' + product.id);
      await waitCount(size, 'FICHE_OUVERTE', 1);
      assert.equal(size.state.caps, 1);
      const e = size.state.seen.find((e) => e.evenement === 'FICHE_OUVERTE');
      assert.equal(
        e.appareil,
        width < 768 ? 'mobile' : width < 1100 ? 'tablette' : 'ordinateur',
      );
      assert.equal(e.langue, width === 768 ? 'en' : 'fr');
      const overflow = await size.page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false);
      if ([390, 1440].includes(width))
        await size.page.screenshot({
          path: `${out}/fiche-${width}.png`,
          fullPage: true,
        });
      await close(size);
    }
    cases.push(
      'Six viewport widths, FR/EN, one capability request and one committed detail observation per document',
    );
    ok(cases.at(-1));
    assert.deepEqual(outside, []);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      out + '/result.json',
      JSON.stringify(
        {
          success: true,
          cases,
          outsideRequests: outside.length,
          javascriptErrors: errors.length,
          limits: [
            'commerce APIs mocked; observation endpoints real Nest/PostgreSQL',
            'no physical phone, admin dashboard or real order/pilot in this recipe',
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const last = debug.at(-1);
    if (last && !last.page.isClosed()) {
      await last.page.screenshot({
        path: out + '/failure.png',
        fullPage: true,
      });
      console.log(
        'Fixture diagnosis',
        JSON.stringify({
          state: last.state,
          logs: last.logs,
          errors,
          outside,
          body: (await last.page.locator('body').innerText()).slice(0, 1800),
        }),
      );
    }
    throw error;
  } finally {
    for (const context of contexts) {
      await context.unrouteAll({ behavior: 'wait' });
      await context.close();
    }
    await browser.close();
  }
};
