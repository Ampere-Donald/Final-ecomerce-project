const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.SEO_PREVIEW_URL || 'http://127.0.0.1:5232';
const output = process.env.SEO_EVIDENCE;
if (!output || new URL(base).hostname !== '127.0.0.1') throw Error('Local preview and evidence folder required');
fs.mkdirSync(output, { recursive: true });
const report = { checkedAt: new Date().toISOString(), checks: [], errors: [], executedWrites: 0, stubbedBatches: 0 };
(async () => {
  const batches = [];
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname === '/api/parcours/disponibilite') return route.fulfill({ json: { actif: true } });
    if (url.pathname === '/api/parcours/evenements') {
      batches.push(request.postDataJSON());
      return route.fulfill({ json: { actif: true, enregistre: true } });
    }
    if (!['GET', 'HEAD'].includes(request.method())) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  try {
    await page.goto(base + '/product/0f776e03-7dd5-4346-97f0-2881154110bd', { referer: 'https://www.google.cm/search?q=must-not-be-transmitted', waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(button => button.getAttribute('aria-label') === 'Choisir la réception : Retrait à Akwa' && !button.disabled));
    await page.locator('.e-help-product').click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Fermer / Close', exact: true }).click();
    await page.locator('footer a[href="/devis"]').first().click();
    await page.locator('#devis-list').fill('PRIVATE-REFERENCE; 1');
    await page.locator('#devis-list').fill('PRIVATE-REFERENCE; 2');
    await page.waitForTimeout(6000);
    const events = batches.flatMap(batch => batch.evenements);
    assert.equal(events.filter(event => event.evenement === 'CONSEIL_OUVERT').length, 1);
    assert.equal(events.filter(event => event.evenement === 'DEVIS_COMMENCE').length, 1);
    assert(events.length >= 3);
    for (const event of events) {
      assert.equal(event.canalEntree, 'RECHERCHE_NATURELLE');
      assert.equal(Object.keys(event).sort().join(','), 'appareil,canalEntree,evenement,id,jour,langue,reception');
    }
    assert(!/must-not|PRIVATE-REFERENCE|https:/.test(JSON.stringify(batches)));
    report.stubbedBatches = batches.length;
    report.checks = ['Hydrated product advice event', 'One quote-start observation despite successive edits', 'Search source preserved during internal navigation', 'Closed payload excludes reference, referrer and search contents'];
    assert.deepEqual(report.errors, []);
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
  finally { await browser.close(); fs.writeFileSync(output + '/report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
