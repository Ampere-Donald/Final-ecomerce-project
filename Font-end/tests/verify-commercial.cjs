// Fictitious merchandising recipe. Every API is intercepted; external traffic is blocked.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:5187';
const output = 'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial';
const end = new Date(Date.now() + 7 * 86400000).toISOString();
const arrival = new Date(Date.now() - 86400000).toISOString();
const part = {
  id: 'commercial-fixture', code: 'DEMO-COM-N', nomProduit: 'Câble fictif de recette',
  designationEn: 'Fictitious test cable', estActif: true, quantiteStock: 8,
  prixDetail: 3500, prixPublic: 2800, prixPromo: 2800, finPromo: end,
  offre: { prixCatalogue: 3500, prixOffre: 2800, fin: end },
  arrivageAt: arrival, dateAjout: '2020-01-01T00:00:00.000Z',
  categorieId: 'commercial-category', categorie: { id: 'commercial-category', nom: 'Connectique de recette' },
  imageUrl: base + '/design-e/hdmi-5m.webp', attributs: [],
};
const checks = [], errors = [], mutations = [], outside = [];
function check(name) { checks.push(name); console.log('PASS ' + name); }
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    async function scenario(lang = 'fr') {
      const state = { mode: 'normal', status: 200 };
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
      await ctx.addInitScript(lang => localStorage.setItem('appLang', lang), lang);
      await ctx.route('**/*', route => {
        const origin = new URL(route.request().url()).origin;
        if (origin === base) return route.continue();
        outside.push(origin); return route.abort();
      });
      await ctx.route('**/api/**', route => {
        const req = route.request(), u = new URL(req.url());
        if (req.method() !== 'GET') { mutations.push(u.pathname); return route.abort(); }
        if (/\/produits\/(flash|arrivages)$/.test(u.pathname)) {
          const rows = state.mode === 'empty' ? [] : [state.mode === 'malformed' ? { ...part, offre: { ...part.offre, prixOffre: 9000 } } : part];
          return route.fulfill({ status: state.status, json: state.status === 200 ? rows : { message: 'recipe' } });
        }
        if (u.pathname.endsWith('/produits/' + part.id)) return route.fulfill({ json: part });
        if (u.pathname.endsWith('/produits')) return route.fulfill({ json: { data: [part], meta: { total: 1, lastPage: 1 } } });
        if (u.pathname.endsWith('/projets')) return route.fulfill({ json: { data: [], meta: { total: 0, lastPage: 1 } } });
        return route.fulfill({ json: [] });
      });
      const page = await ctx.newPage();
      page.on('pageerror', err => errors.push(err.message));
      return { page, state, close: () => ctx.close() };
    }
    const normal = await scenario();
    await normal.page.goto(base + '/offres');
    const card = normal.page.locator('.e-commercial-grid .e-card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.e-price')).toHaveText(/2\s*800\s+FCFA/);
    await expect(card).toContainText('Prix catalogue');
    await expect(card.locator('time')).toHaveAttribute('datetime', end);
    assert.equal(await normal.page.locator('.e-commercial-page s, .e-commercial-page del').count(), 0);
    check('Offer uses server public price, exact end date and no historical crossed price');
    for (const width of [360, 390, 768, 1100, 1240, 1440]) {
      await normal.page.setViewportSize({ width, height: 1000 });
      assert.equal(await normal.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
      if ([390, 1440].includes(width)) await normal.page.screenshot({ path: path.join(output, 'offers-' + width + '.png'), fullPage: true });
    }
    check('Offer page fits six viewport widths');
    await card.getByRole('button', { name: 'Ajouter Câble fictif de recette', exact: true }).click();
    await normal.page.goto(base + '/panier');
    await expect(normal.page.locator('h1')).toContainText('panier');
    await expect(normal.page.locator('.e-cart-layout')).toContainText(/2\s*800\s+FCFA/);
    await normal.page.reload();
    await expect(normal.page.locator('.e-cart-layout')).toContainText(/2\s*800\s+FCFA/);
    check('Offer price survives cart catalogue revalidation and reload');
    await normal.page.goto(base + '/arrivages');
    await expect(normal.page.locator('.e-arrival-date time')).toHaveAttribute('datetime', arrival);
    const geometry = await normal.page.locator('.e-commercial-grid > div').evaluate(el => ({
      wrapper: el.getBoundingClientRect().bottom,
      card: el.querySelector('.e-card').getBoundingClientRect().bottom,
    }));
    assert.ok(geometry.card <= geometry.wrapper + 1);
    await normal.page.screenshot({ path: path.join(output, 'arrivals-1440.png'), fullPage: true });
    check('Arrival date uses receipt evidence rather than product import date; card fits row');
    await normal.page.goto(base + '/');
    await expect(normal.page.locator('.e-commercial-teaser')).toHaveCount(2);
    check('Home exposes offers and arrivals when real API rows exist');
    await normal.close();
    const empty = await scenario(); empty.state.mode = 'empty';
    await empty.page.goto(base + '/offres');
    await expect(empty.page.getByRole('heading', { name: 'Aucune offre active pour le moment' })).toBeVisible();
    await expect(empty.page.getByRole('link', { name: 'Consulter le catalogue', exact: true })).toBeVisible();
    await empty.page.goto(base + '/arrivages');
    await expect(empty.page.getByRole('heading', { name: 'Aucun arrivage disponible pour le moment' })).toBeVisible();
    await empty.page.goto(base + '/');
    await expect(empty.page.locator('.e-commercial-teaser')).toHaveCount(0);
    check('Empty pages explain absence and home invents no commercial rows');
    await empty.close();
    const fail = await scenario(); fail.state.status = 503;
    await fail.page.goto(base + '/offres');
    await expect(fail.page.getByRole('alert')).toBeVisible();
    fail.state.status = 200;
    await fail.page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(fail.page.locator('.e-commercial-grid .e-card')).toHaveCount(1);
    fail.state.mode = 'malformed'; await fail.page.reload();
    await expect(fail.page.getByRole('alert')).toBeVisible();
    await expect(fail.page.locator('.e-commercial-grid .e-card')).toHaveCount(0);
    check('Network retry succeeds and contradictory offer data blocks purchase cards');
    await fail.close();
    const english = await scenario('en');
    await english.page.goto(base + '/offres');
    await expect(english.page.getByRole('heading', { level: 1 })).toHaveText('Current offers');
    await expect(english.page.locator('.e-offer-details')).toContainText('Douala time');
    english.state.mode = 'empty'; await english.page.goto(base + '/arrivages');
    await expect(english.page.getByRole('heading', { name: 'No available arrivals at the moment' })).toBeVisible();
    check('English prices, date context and empty states render');
    await english.close();
    assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ checks, errors, mutations, externalRequestsBlocked: outside, fixture: true }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, api: 'all mocked', mutations: mutations.length, errors: errors.length }));
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
