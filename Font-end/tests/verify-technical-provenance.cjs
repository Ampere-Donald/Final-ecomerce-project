// Isolated local preview only. Synthetic articles, no production calls/writes.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.TECHNICAL_BASE || 'http://127.0.0.1:5188';
assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base), 'Owned local preview required');
const output = process.env.TECHNICAL_OUTPUT || 'C:/Users/pc/Documents/Newoteg/output/implementation-work/technical-provenance-20261010/browser';
const make = (id, documentation, value = '0 Ω') => ({ id, code: 'DEMO-' + id, nomProduit: 'Pièce de recette ' + id, estActif: true, categorieId: 'components', categorie: { id: 'components', nom: 'Composants' }, prixDetail: 3500, quantiteStock: 3, imageUrl: base + '/design-e/hdmi-5m.webp', attributs: [{ nomAttribut: 'Résistance', valeurs: [{ valeur: value, documentation }] }] });
const products = {
  a: make('a', { etat: 'DOCUMENTE', obsolete: false, reluLe: '2026-10-10T12:00:00Z', sourceUrl: 'https://example.com/recipe.pdf', sourceDocument: 'Document de recette fictif', sourceRepere: 'Tableau 2', conditions: 'Mesure à 25 °C', motif: 'Recette uniquement', valeurNormalisee: '1000', uniteNormalisee: 'Ω', reluParId: 'PRIVATE_REVIEWER' }, '1 kΩ'),
  b: make('b', { etat: 'CONTRADICTOIRE', motif: 'Deux documents de recette en désaccord' }, '1000 Ω'),
  c: make('c', { etat: 'A_VERIFIER', obsolete: true, sourceDocument: 'DO_NOT_SHOW_OLD_SOURCE' }),
};
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const checks = [], errors = [], writes = [], outside = [];
  try {
    for (const width of [390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
      await context.addInitScript(() => localStorage.setItem('newoteg_comparison_v1', JSON.stringify({ schema: 1, categoryId: 'components', ids: ['a', 'b', 'c'] })));
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
          if (route.request().method() !== 'GET') { writes.push(url.pathname); return route.abort(); }
          if (url.pathname === '/api/produits') return route.fulfill({ json: { data: Object.values(products), meta: { total: 3, lastPage: 1 } } });
          if (url.pathname.startsWith('/api/produits/')) return route.fulfill({ json: products[url.pathname.split('/').pop()] || {} });
          if (url.pathname === '/api/categories') return route.fulfill({ json: [{ id: 'components', nom: 'Composants' }] });
          return route.fulfill({ json: [] });
        }
        if (url.origin !== base) { outside.push(url.origin); return route.abort(); }
        if (process.env.TECHNICAL_LEGACY === '1' && route.request().resourceType() === 'document') {
          const response = await route.fetch(); const body = (await response.text()).replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, '').replace(/\snomodule/g, '');
          return route.fulfill({ response, body });
        }
        return route.continue();
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/product/a');
      const source = page.locator('.e-specs .e-technical-source'); await expect(source).toContainText('Documenté après relecture');
      await source.locator('summary').click(); await expect(source).toContainText('Mesure à 25 °C'); await expect(source).toContainText('Tableau 2');
      await expect(source.getByRole('link')).toHaveAttribute('href', 'https://example.com/recipe.pdf');
      assert(!await page.locator('body').textContent().then(t => t.includes('PRIVATE_REVIEWER')));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Product overflow ' + width);
      const productHeight = await page.evaluate(() => { scrollTo(0, 0); return document.documentElement.scrollHeight; });
      await page.setViewportSize({ width, height: Math.min(5000, Math.max(1000, productHeight)) });
      await page.screenshot({ path: path.join(output, `product-${width}.png`), fullPage: true });
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(base + '/product/c'); await expect(page.locator('.e-specs')).toContainText('0 Ω'); await expect(page.locator('.e-specs')).toContainText('relecture à renouveler'); await expect(page.locator('body')).not.toContainText('DO_NOT_SHOW_OLD_SOURCE');
      await page.goto(base + '/comparer'); await expect(page.locator('.e-comparison-table')).toContainText('Sources contradictoires'); await expect(page.locator('.e-comparison-table')).toContainText('Documenté après relecture');
      await page.locator('.e-comparison-table .e-technical-source').first().locator('summary').click(); await expect(page.locator('.e-comparison-table')).toContainText('ne garantit pas une équivalence');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Comparison page overflow ' + width);
      const comparisonHeight = await page.evaluate(() => { scrollTo(0, 0); return document.documentElement.scrollHeight; });
      await page.setViewportSize({ width, height: Math.min(5000, Math.max(1000, comparisonHeight)) });
      await page.screenshot({ path: path.join(output, `comparison-${width}.png`), fullPage: true });
      checks.push({ width, states: true, sourceDetails: true, zero: true, staleHidden: true, noPrivateIdentity: true, noPageOverflow: true });
      await context.close();
    }
    assert.equal(errors.length, 0, errors.join('\n')); assert.equal(writes.length, 0); assert.equal(outside.length, 0, outside.join('\n'));
    const result = { passed: true, fixture: 'Synthetic local articles; no production traffic', legacy: process.env.TECHNICAL_LEGACY === '1', checks, errors, writes, outside };
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
