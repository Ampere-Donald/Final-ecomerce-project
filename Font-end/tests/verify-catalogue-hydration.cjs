// Read-only browser contract for the optional real-data catalogue HTML renderer.
// Supply a compiled catalogue-worker preview; fixtures affect this browser only.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.CATALOGUE_TEST_URL || 'http://127.0.0.1:5213';
const output = process.env.CATALOGUE_TEST_OUTPUT;
if (!output || !path.isAbsolute(output)) throw Error('Absolute evidence directory required');
fs.mkdirSync(output, { recursive: true });
const report = { base, checks: [], errors: [], writes: [] };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  async function context(options = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', ...options });
    await ctx.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).pathname === '/cdn-cgi/rum') return route.abort();
      if (!['GET', 'HEAD'].includes(request.method())) { report.writes.push(request.url()); return route.abort(); }
      return route.continue();
    });
    ctx.on('page', page => {
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /hydration|startup/i.test(message.text())) report.errors.push(message.text());
      });
    });
    return ctx;
  }
  try {
    const staticCtx = await context({ javaScriptEnabled: false });
    const staticPage = await staticCtx.newPage();
    const response = await staticPage.goto(base + '/catalogue');
    const html = await response.text();
    assert(html.includes('data-initial-catalogue="fr"'), 'SSR must be present');
    assert.equal(response.headers()['cache-control'], 'no-store');
    const snapshot = JSON.parse(await staticPage.locator('#initial-catalogue-data').textContent());
    const productPath = Object.keys(snapshot.resources).find(key => key.startsWith('/produits?'));
    const rows = snapshot.resources[productPath].data;
    assert(rows.length > 0, 'Use real nonempty public data for this acceptance test');
    assert.equal(await staticPage.locator('.e-catalog-grid article').count(), rows.length);
    assert((await staticPage.locator('.e-page-lead p').innerText()).includes(String(snapshot.resources[productPath].meta.total)));
    assert(!/coutRevient|margeInterne|privateNote/.test(await staticPage.locator('#initial-catalogue-data').textContent()));
    assert.equal(await staticPage.getByRole('combobox', { name: 'Trier les produits', exact: true }).isEnabled(), false);
    for (const width of [360, 390, 768, 1024, 1440]) {
      await staticPage.setViewportSize({ width, height: 950 });
      assert.equal(await staticPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Overflow at ' + width);
      await staticPage.screenshot({ path: path.join(output, 'without-js-' + width + '.png') });
    }
    // Native header form remains useful even without JavaScript.
    await staticPage.locator('#header-product-search').fill('condens');
    await staticPage.locator('#header-product-search').press('Enter');
    await staticPage.waitForURL('**/catalogue?search=condens');
    assert.equal(await staticPage.locator('[data-initial-catalogue]').count(), 1);
    report.checks.push('Real products, totals, CSS and native search available without JS at five widths; uncached public-only data');
    await staticCtx.close();

    const earlyCtx = await context();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await earlyCtx.route('**/assets/*.js', async route => { await gate; return route.continue(); });
    const early = await earlyCtx.newPage();
    const apiRequests = [];
    early.on('request', request => { if (new URL(request.url()).pathname === '/api/produits') apiRequests.push(request.url()); });
    await early.goto(base + '/catalogue', { waitUntil: 'commit' });
    await early.locator('.e-catalog-grid article').first().waitFor();
    await early.evaluate(() => { window.originalCard = document.querySelector('.e-catalog-grid article'); window.originalHeading = document.querySelector('.e-page-lead h1'); });
    const commercialContent = page => page.locator('.e-home-product-body').allTextContents();
    const before = await commercialContent(early);
    release();
    await early.waitForFunction(() => !document.querySelector('.e-sort select').disabled);
    assert.equal(await early.evaluate(() => window.originalCard === document.querySelector('.e-catalog-grid article')), true);
    assert.equal(await early.evaluate(() => window.originalHeading === document.querySelector('.e-page-lead h1')), true);
    assert.deepEqual(await commercialContent(early), before);
    assert.equal(apiRequests.length, 0, 'Fresh server products should not be requested again at hydration');
    assert.equal(await early.locator('title').count(), 1);
    assert.equal(await early.locator('link[rel="canonical"]').count(), 1);
    await early.getByRole('combobox', { name: 'Trier les produits', exact: true }).selectOption('price-desc');
    await early.waitForURL('**sort=price-desc');
    await early.waitForFunction(() => document.querySelectorAll('.e-catalog-grid article').length > 0);
    assert(apiRequests.some(value => new URL(value).searchParams.get('sort') === 'price_desc'));
    await early.getByRole('button', { name: 'Suivant', exact: true }).click();
    await early.waitForURL('**page=2');
    await early.waitForFunction(() => document.querySelectorAll('.e-catalog-grid article').length > 0);
    assert(apiRequests.some(value => new URL(value).searchParams.get('page') === '2'));
    await early.getByRole('button', { name: 'Filtres', exact: true }).click();
    // The controlled checkbox commits during React Router's transition. Verify
    // the resulting URL and checked state after that commit, not in the click's
    // intermediate browser frame.
    await early.getByLabel('En stock uniquement', { exact: true }).click();
    await early.waitForURL('**instock=true');
    await early.waitForFunction(() => document.querySelector('.e-modal input[type="checkbox"]')?.checked === true);
    await early.getByRole('button', { name: 'Voir les résultats', exact: true }).click();
    await early.waitForURL('**instock=true');
    await early.waitForFunction(() => document.querySelectorAll('.e-catalog-grid article').length > 0);
    assert(apiRequests.some(value => new URL(value).searchParams.get('inStock') === 'true'));
    assert.equal(new URL(early.url()).searchParams.has('page'), false);
    await early.screenshot({ path: path.join(output, 'hydrated-filtered-mobile.png'), fullPage: true });
    report.checks.push('Hydration keeps original nodes/content, avoids duplicate product GET; sort/pagination/stock filter fetch correct URLs');
    const beforeBack = apiRequests.length;
    await early.locator('.e-crumbs a[href="/"]').click();
    await early.waitForURL(base + '/');
    await early.locator('#home-hero-title').waitFor();
    await early.goBack();
    await early.waitForURL('**instock=true');
    await early.waitForFunction(() => document.querySelectorAll('.e-catalog-grid article').length > 0);
    assert(apiRequests.length > beforeBack, 'Browser Back must fetch fresh products rather than reuse the boot snapshot');
    report.checks.push('Leaving the initial route and browser Back read fresh catalogue data');
    await earlyCtx.close();

    const filteredCtx = await context(); const filtered = await filteredCtx.newPage();
    const query = new URLSearchParams({ search: 'condens', sort: 'price-desc', minPrice: '100', maxPrice: '9000' });
    const filteredResponse = await filtered.goto(base + '/catalogue?' + query);
    assert((await filteredResponse.text()).includes('data-initial-catalogue="fr"'));
    await filtered.waitForFunction(() => !document.querySelector('.e-sort select').disabled);
    assert.equal(await filtered.getByRole('combobox', { name: 'Trier les produits', exact: true }).inputValue(), 'price-desc');
    assert((await filtered.locator('.e-page-lead h1').innerText()).includes('condens'));
    await filtered.getByRole('button', { name: 'Filtres', exact: true }).click();
    assert.equal(await filtered.getByLabel('Prix min. (FCFA)', { exact: true }).inputValue(), '100');
    assert.equal(await filtered.getByLabel('Prix max. (FCFA)', { exact: true }).inputValue(), '9000');
    await filtered.keyboard.press('Escape');
    report.checks.push('Direct filtered URL hydrates matching search, sort and price bounds');
    await filteredCtx.close();

    const savedCtx = await context();
    await savedCtx.addInitScript(({ id, categoryId, origin }) => {
      if (location.origin !== origin) return;
      localStorage.setItem('appLang', 'en');
      localStorage.setItem('newoteg_comparison_v1', JSON.stringify({ schema: 1, categoryId, ids: [id] }));
    }, { id: rows[0].id, categoryId: rows[0].categorieId || rows[0].categorie?.id, origin: new URL(base).origin });
    const saved = await savedCtx.newPage();
    await saved.goto(base + '/catalogue');
    await saved.getByRole('heading', { name: 'Electronic products', exact: true }).waitFor();
    assert((await saved.locator('.e-compare-link').innerText()).includes('(1/3)'));
    for (const width of [360, 390, 768, 1024, 1440]) {
      await saved.setViewportSize({ width, height: 950 });
      assert.equal(await saved.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    report.checks.push('Saved English and comparison selection restore after anonymous French HTML without hydration errors at five widths');
    await savedCtx.close();

    // The outage fixture belongs to the native local preview. A remote version
    // reads the actual API and must not be assumed to contain this fixture.
    if (['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
    const failureCtx = await context(); const failure = await failureCtx.newPage();
    const failedResponse = await failure.goto(base + '/catalogue?search=LAB_API_FAILURE');
    assert(!(await failedResponse.text()).includes('data-initial-catalogue="fr"'));
    await failure.getByText('Résultats indisponibles', { exact: true }).waitFor();
    assert.equal(await failure.getByRole('heading', { name: 'Aucun résultat pour cette recherche', exact: true }).count(), 0);
    report.checks.push('Upstream 503 falls back to the existing unavailable state, never a false zero-result success');
    await failureCtx.close();
    }
    assert.deepEqual(report.errors, []); assert.deepEqual(report.writes, []);
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.failure = error.stack; process.exitCode = 1; }
  finally {
    fs.writeFileSync(path.join(output, 'hydration-result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report)); await browser.close();
  }
})();
