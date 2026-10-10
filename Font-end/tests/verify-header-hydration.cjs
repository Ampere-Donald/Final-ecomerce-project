// Browser regression: typing in initial HTML must open suggestions after hydration.
// Run with HEADER_TEST_URL and PLAYWRIGHT_MODULE pointing to the test runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || undefined,
    headless: true,
  });
  const report = { base: process.env.HEADER_TEST_URL, cases: [], errors: [], requests: [] };
  try {
    for (const focused of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('**/assets/*.js', async route => { await gate; await route.continue(); });
      await context.route('**/api/produits?*', async route => {
        const params = new URL(route.request().url()).searchParams;
        if (params.get('salesSearch') !== 'true') return route.continue();
        report.requests.push(params.get('search'));
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
          data: [{ id: 'isolated-search-fixture', nomProduit: 'Multimètre de test', code: 'TEST', prixPublic: 1500, quantiteStock: 2 }],
          meta: { total: 1 },
        }) });
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && /hydration/i.test(message.text())) report.errors.push(message.text()); });
      await page.goto(report.base, { waitUntil: 'commit' });
      const input = page.locator('#header-product-search');
      await input.waitFor();
      await page.evaluate(() => { window.initialSearchNode = document.querySelector('#header-product-search'); });
      await input.fill('multimètre');
      if (!focused) await input.evaluate(element => element.blur());
      release();
      await page.waitForFunction(() => !document.querySelector('.e-menu').disabled);
      assert.equal(await input.inputValue(), 'multimètre');
      assert.equal(await page.evaluate(() => window.initialSearchNode === document.querySelector('#header-product-search')), true);
      if (focused) {
        await page.locator('.e-search-result').waitFor();
        assert.equal(await input.getAttribute('aria-expanded'), 'true');
        assert.equal(await input.evaluate(element => element === document.activeElement), true);
        await input.press('Escape');
        assert.equal(await page.locator('.e-search-panel').count(), 0);
      } else {
        // Wait past debounce to prove an unfocused preserved value does not reopen.
        await page.waitForTimeout(700);
        assert.equal(await page.locator('.e-search-panel').count(), 0);
      }
      report.cases.push({ focused, textAndNodePreserved: true, suggestions: focused });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.requests, ['multimètre']);
    if (process.env.HEADER_TEST_REPORT) fs.writeFileSync(process.env.HEADER_TEST_REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
