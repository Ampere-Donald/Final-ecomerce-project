const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SEO_PREVIEW_URL || 'http://127.0.0.1:5228';
const output = process.env.SEO_EVIDENCE;
if (!output || !path.isAbsolute(output)) throw Error('Absolute output directory required');
fs.mkdirSync(output, { recursive: true });
const report = { at: new Date().toISOString(), checks: [], errors: [], writes: [] };
const ids = ['02d5805f-7f51-4574-938d-d8cfe8c09487', '0f776e03-7dd5-4346-97f0-2881154110bd',
  'e2eb7c63-9e35-4888-bd3f-cb940fbd8c0c', '7a4a260b-35bd-40ce-b246-d548a553432f', '01c4196c-5e44-47bf-8061-cdc06ef6ae9b',
  '3adebd14-a588-4b3a-b82a-26a95b3e7067', '8a3e12dd-f05d-4c32-a264-5569e068a561'];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  async function context(options) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', ...options });
    await ctx.route('**/*', route => {
      if (!['GET', 'HEAD'].includes(route.request().method())) { report.writes.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    ctx.on('page', page => {
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', entry => { if (entry.type() === 'error' && /hydration|startup/i.test(entry.text())) report.errors.push(entry.text()); });
    });
    return ctx;
  }
  try {
    const staticContext = await context({ javaScriptEnabled: false });
    const page = await staticContext.newPage();
    for (const id of ids) {
      const response = await page.goto(base + '/product/' + id);
      assert.equal(response.status(), 200);
      assert((await response.text()).includes('data-initial-product="fr"'));
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('#product-editorial-title').count(), 1);
      const heading = await page.locator('h1').innerText();
      const data = JSON.parse(await page.locator('script[data-product-schema]').textContent())['@graph'][0];
      assert.equal(data.name, heading);
      assert.equal((await page.locator('.e-product-info .e-product-price .e-price').innerText()).replace(/\s/g, ' '),
        data.offers ? (new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(data.offers.price)) + ' FCFA').replace(/\s/g, ' ') : 'Prix à confirmer');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      report.checks.push({ id, mode: 'no-js', heading, schemaPrice: data.offers?.price ?? null, status: 'passed' });
    }
    await staticContext.close();
    const hydratedContext = await context({});
    const hydrated = await hydratedContext.newPage();
    for (const id of ids) {
      await hydrated.goto(base + '/product/' + id);
      await hydrated.locator('.e-product-info h1').waitFor();
      await hydrated.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button =>
        button.getAttribute('aria-label') === 'Choisir la réception : Retrait à Akwa' && !button.disabled));
      assert.equal(await hydrated.locator('script[data-product-schema]').count(), 1);
      assert.equal(await hydrated.locator('#product-editorial-title').count(), 1);
      if (id === '01c4196c-5e44-47bf-8061-cdc06ef6ae9b') assert.equal(await hydrated.locator('.e-datasheet').innerText(), 'Consulter le site indiqué');
      await hydrated.locator('.e-product-editorial summary').click();
      for (const link of await hydrated.locator('.e-product-editorial details a').all()) {
        const href = await link.getAttribute('href');
        if (href.startsWith('/product-reference-images/')) {
          const photo = await hydratedContext.request.get(base + href);
          assert.equal(photo.status(), 200);
          assert(photo.headers()['content-type'].startsWith('image/jpeg'));
        }
      }
      await hydrated.locator('.e-product-editorial summary').click();
      assert.equal(await hydrated.locator('link[rel="canonical"]').count(), 1);
      assert.equal(await hydrated.locator('link[rel="canonical"]').getAttribute('href'), 'https://newoteg.com/product/' + id);
      assert.equal(await hydrated.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      report.checks.push({ id, mode: 'hydrated', status: 'passed' });
    }
    await hydrated.goto(base + '/product/' + ids[1]);
    await hydrated.locator('.e-product-info button.e-help-product').click();
    await hydrated.getByRole('dialog').waitFor();
    await hydrated.getByRole('button', { name: 'Fermer / Close', exact: true }).click();
    await hydrated.locator('.e-product-info button.e-btn').filter({ hasText: 'Ajouter au panier' }).click();
    await hydrated.waitForFunction(() => JSON.parse(localStorage.getItem('newoteg_cart') || '[]').some(p => p.id === '0f776e03-7dd5-4346-97f0-2881154110bd'));
    report.checks.push({ action: 'hydrated advice dialog and local cart addition', status: 'passed' });
    await hydrated.locator('.toast').waitFor({ state: 'hidden' });
    await hydrated.locator('.e-product-info h1').click();
    for (const width of [390, 1440]) {
      await hydrated.setViewportSize({ width, height: 950 });
      assert.equal(await hydrated.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await hydrated.screenshot({ path: path.join(output, 'product-' + width + '.png'), fullPage: true });
    }
    await hydrated.goto(base + '/product/7a4a260b-35bd-40ce-b246-d548a553432f');
    for (const width of [390, 1440]) {
      await hydrated.setViewportSize({ width, height: 950 });
      await hydrated.locator('#product-editorial-title').waitFor();
      await hydrated.locator('.e-product-editorial summary').click();
      assert.equal(await hydrated.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await hydrated.screenshot({ path: path.join(output, 'power-supply-' + width + '.png'), fullPage: true });
      await hydrated.locator('.e-product-editorial summary').click();
    }
    await hydratedContext.close();
    assert.deepEqual(report.errors, []); assert.deepEqual(report.writes, []);
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
  finally { await browser.close(); fs.writeFileSync(path.join(output, 'hydration-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
})();
