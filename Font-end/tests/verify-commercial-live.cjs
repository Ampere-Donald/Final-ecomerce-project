// Actual local HTTP catalogue and read-only quote. No real order API call.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = 'http://127.0.0.1:5187', api = 'http://127.0.0.1:3000';
const output = 'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial';
const fixture = JSON.parse(fs.readFileSync(path.join(output, 'backend-result.json'), 'utf8'));
if (!fixture.fixture || !fixture.previewKept || !fixture.productId) throw Error('Run guarded commercial recipe with explicit local preview first.');
const checks = [], errors = [], mutations = [], quotes = [];
const ok = name => { checks.push(name); console.log('PASS ' + name); };
(async () => {
  const detail = await fetch(api + '/api/produits/' + fixture.productId);
  assert.equal(detail.status, 200);
  const p = await detail.json();
  assert.equal(p.code, fixture.productCode); assert.ok(p.nomProduit.startsWith('Démonstration'));
  assert.equal(p.prixPublic, 2800); assert.equal(p.offre.prixCatalogue, 3500);
  for (const route of ['flash', 'arrivages', 'populaires']) {
    const response = await fetch(api + '/api/produits/' + route); assert.equal(response.status, 200);
    const list = await response.json(); assert.ok(Array.isArray(list));
    for (const row of list) for (const key of ['cmupActuel', 'dernierCoutAchatFcfa', 'dernierFournisseurId', 'quantiteReservee']) assert.ok(!Object.hasOwn(row, key));
    if (route !== 'populaires') assert.ok(list.some(row => row.id === p.id));
  }
  ok('Live HTTP offers and arrivals use dated fixture, public price and no internal costs');
  const catalogueParams = new URLSearchParams({ categoryId: p.categorieId, maxPrice: '2800', sort: 'price_asc', limit: '1' });
  const filteredResponse = await fetch(api + '/api/produits?' + catalogueParams); assert.equal(filteredResponse.status, 200);
  const filtered = await filteredResponse.json(); assert.equal(filtered.meta.total, 1); assert.equal(filtered.data[0].id, p.id); assert.equal(filtered.data[0].prixPublic, 2800);
  const invalidRange = await fetch(api + '/api/produits?minPrice=3000&maxPrice=2000'); assert.equal(invalidRange.status, 400);
  ok('Live HTTP catalogue filters the displayed promotion and rejects inverted bounds');
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    await ctx.addInitScript(() => localStorage.setItem('appLang', 'fr'));
    await ctx.route('**/*', route => {
      const req = route.request(), u = new URL(req.url());
      if ([base, api].includes(u.origin) && req.method() === 'GET') return route.continue();
      if (u.origin === api && req.method() === 'POST' && u.pathname === '/api/commandes/quote') return route.continue();
      if ([base, api].includes(u.origin)) mutations.push(u.pathname);
      return route.abort();
    });
    const page = await ctx.newPage(); page.on('pageerror', err => errors.push(err.message));
    page.on('response', async res => { if (res.url() === api + '/api/commandes/quote') quotes.push(await res.json()); });
    await page.goto(base + '/offres');
    const card = page.locator('.e-commercial-grid .e-card').filter({ hasText: fixture.productCode });
    await expect(card).toHaveCount(1); await expect(card.locator('.e-price')).toContainText(/2\s*800\s+FCFA/);
    await expect.poll(() => card.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.ok((await card.boundingBox()).width < width * 0.6, 'A single product must keep its column width');
      await page.screenshot({ path: path.join(output, 'live-offers-' + width + '.png'), fullPage: true });
    }
    ok('Actual API offer page renders on mobile and desktop');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      await page.goto(base + '/catalogue?category=' + encodeURIComponent(p.categorieId));
      const catalogueCard = page.locator('.e-catalog-grid .e-card').filter({ hasText: fixture.productCode });
      await expect(catalogueCard).toHaveCount(1);
      await page.getByLabel('Trier les produits', { exact: true }).selectOption('price-asc');
      await page.getByRole('button', { name: 'Filtres', exact: true }).click();
      await page.getByLabel('Prix max. (FCFA)', { exact: true }).fill('2800');
      await page.getByRole('button', { name: 'Voir les résultats', exact: true }).click();
      await expect(catalogueCard).toHaveCount(1); await expect(catalogueCard.locator('.e-price')).toContainText(/2\s*800\s+FCFA/);
      await expect(page.locator('.e-page-lead')).toContainText('1 référence(s)');
      await page.screenshot({ path: path.join(output, 'live-catalogue-price-' + width + '.png'), fullPage: true });
      await page.reload(); await expect(catalogueCard).toHaveCount(1);
      await page.getByRole('button', { name: 'Filtres', exact: true }).click();
      await page.getByLabel('Prix max. (FCFA)', { exact: true }).fill('2799');
      await page.getByRole('button', { name: 'Voir les résultats', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Aucun résultat pour cette recherche', exact: true })).toBeVisible();
      await expect(page.locator('.e-page-lead')).toContainText('0 référence(s)');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    ok('Actual mobile/desktop filter controls include offered price, persist after reload and show coherent empty counts');
    await page.goto(base + '/offres');
    await card.locator('h3').getByRole('link', { name: p.nomProduit, exact: true }).click();
    await expect(page.getByRole('heading', { name: p.nomProduit, exact: true })).toBeVisible();
    await expect(page.locator('.e-offer-details')).toContainText('Offre jusqu’au');
    await page.goto(base + '/offres');
    await card.getByRole('button', { name: 'Ajouter ' + p.nomProduit, exact: true }).click();
    await page.goto(base + '/panier'); await expect(page.locator('.e-cart-line')).toContainText(fixture.productCode);
    await expect(page.locator('.e-cart-line .e-price')).toContainText(/2\s*800\s+FCFA/);
    await page.reload(); await expect(page.locator('.e-cart-line .e-reference')).toContainText(fixture.productCode);
    await expect(page.locator('.e-cart-line .e-price')).toContainText(/2\s*800\s+FCFA/);
    ok('Product detail and hydrated cart preserve the current real API offer price');
    await page.goto(base + '/checkout');
    await page.getByLabel('Nom complet', { exact: true }).fill('Client fictif recette');
    await page.getByLabel('Téléphone', { exact: true }).fill('600000000');
    await page.getByRole('button', { name: 'Vérifier ma sélection', exact: true }).click();
    await expect.poll(() => quotes.length).toBe(1);
    assert.equal(quotes[0].montantArticles, 2800); assert.equal(quotes[0].lignes[0].prixUnitaire, 2800);
    assert.equal(quotes[0].fraisLivraison, null);
    await expect(page.getByRole('button', { name: /Enregistrer ma commande/ })).toBeVisible();
    ok('Actual HTTP checkout quote uses promotion without inventing delivery fees; no order submitted');
    await page.goto(base + '/arrivages');
    const arrival = page.locator('.e-commercial-grid > div').filter({ hasText: fixture.productCode });
    await expect(arrival.locator('.e-arrival-date time')).toHaveAttribute('datetime', fixture.arrivalAt);
    await page.screenshot({ path: path.join(output, 'live-arrivals-1440.png'), fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
    ok('Actual purchase arrival date displayed; no browser mutation or script error');
    fs.writeFileSync(path.join(output, 'live-result.json'), JSON.stringify({ checks, errors, mutations, realLocalAPI: true, productId: p.id, quoteReads: quotes.length }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
