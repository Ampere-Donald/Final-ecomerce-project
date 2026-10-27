// Local fixture recipe: real browser/build, no shop writes or messages.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.NEWOTEG_MOTION_BASE || 'http://127.0.0.1:5243';
assert.equal(new URL(base).hostname, '127.0.0.1');
const output = process.env.NEWOTEG_MOTION_OUTPUT;
assert(output && path.isAbsolute(output)); fs.mkdirSync(output, { recursive: true });
const names = ['Composants Électroniques', 'Audio & Son', 'Satellite & TV', 'Alimentation & Energie', 'Chargeurs & Power Banks', 'Piles & Batteries', 'Câbles & Connectique', 'Mesure & Test', 'Outillage'];
const categories = names.map((nom, i) => ({ id: 'cat-' + i, nom }));
const products = Array.from({ length: 12 }, (_, i) => ({
  id: '00000000-0000-4000-8000-' + String(i).padStart(12, '0'), code: 'FIXTURE-' + i,
  nomProduit: ['Alimentation stabilisée 24 V 5 A pour atelier et réparation', 'Câble HDMI mâle / mâle 15 mètres', 'Multimètre numérique avec accessoires', 'Condensateur électrolytique 470 µF 25 V'][i % 4],
  designationEn: ['Regulated 24 V 5 A workshop power supply', 'HDMI male / male cable 15 metres', 'Digital multimeter with accessories', 'Electrolytic capacitor 470 µF 25 V'][i % 4],
  estActif: true, prixPublic: i === 3 ? null : i === 4 ? 1250000 : 1500 + i * 1000,
  quantiteStock: i === 2 ? 0 : i === 3 ? null : 10,
  categorieId: categories[0].id, categorie: categories[0],
  imageUrl: base + '/design-e/' + ['category-v2-power.webp', 'category-v2-cables.webp', 'category-v2-tools.webp', 'category-v2-components.webp'][i % 4],
}));
const report = { checks: [], errors: [], writes: [], fixtureOnly: true };
const pass = label => { report.checks.push(label); console.log('PASS ' + label); };
let browser;
async function contextFor({ width, lang = 'fr', reduced = false, legacy = false }) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, hasTouch: width < 761, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(lang => localStorage.setItem('appLang', lang), lang);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== 'GET') { report.writes.push(url.pathname); return route.abort(); }
    if (url.pathname.startsWith('/api/')) {
      let json = [];
      if (url.pathname === '/api/categories') json = categories;
      else if (url.pathname === '/api/produits/populaires') json = products;
      else if (url.pathname === '/api/produits') json = { data: products.slice(0, Number(url.searchParams.get('limit')) || 12), meta: { total: 12, lastPage: 1 } };
      else if (/^\/api\/produits\/00000000/.test(url.pathname)) json = products.find(p => url.pathname.endsWith(p.id));
      else if (url.pathname === '/api/parcours/disponibilite') json = { actif: false };
      else if (url.pathname === '/api/commandes/guest/channels') json = { email: false, sms: false };
      else if (url.pathname === '/api/projets') json = { data: [], meta: { total: 0, lastPage: 1 } };
      return route.fulfill({ json });
    }
    if (url.origin !== base) return route.abort();
    if (legacy && request.resourceType() === 'document') {
      const response = await route.fetch();
      return route.fulfill({ response, body: (await response.text()).replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, '').replace(/\snomodule/g, '') });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydration/i.test(message.text())) report.errors.push(message.text()); });
  return { context, page };
}
async function geometry(page, track) {
  const value = await track.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    return { columns: [...node.children].filter(child => {
      const r = child.getBoundingClientRect(); return r.left >= bounds.left - 2 && r.right <= bounds.right + 2;
    }).length, widths: [...node.children].slice(0, 2).map(n => n.getBoundingClientRect().width) };
  });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Whole-page overflow');
  return value;
}
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    for (const [width, lang, legacy] of [[360, 'fr', false], [390, 'en', false], [768, 'fr', false], [1440, 'fr', false], [390, 'fr', true]]) {
      const { context, page } = await contextFor({ width, lang, legacy });
      await page.goto(base + '/');
      const section = page.locator('.e-home-selection'), rail = section.locator('.e-product-rail'), track = rail.locator('.e-product-rail-track');
      await expect(section.locator('.e-selection-card')).toHaveCount(10);
      await rail.scrollIntoViewIfNeeded();
      const size = await geometry(page, track);
      assert.equal(size.columns, width <= 760 ? 2 : width < 1200 ? 3 : 5);
      const cards = section.locator('.e-selection-card');
      await expect(cards.nth(2).locator('.e-selection-cta')).toContainText(lang === 'fr' ? 'équivalents' : 'alternatives');
      await expect(cards.nth(3).locator('.e-price')).toContainText(lang === 'fr' ? 'confirmer' : 'confirm');
      await expect(cards.nth(4).locator('.e-price')).toContainText(/1\s*250\s*000/);
      const next = rail.getByRole('button', { name: lang === 'fr' ? 'Produits suivants' : 'Next products', exact: true });
      await next.click();
      await expect.poll(() => track.evaluate(n => n.scrollLeft)).toBeGreaterThan(size.widths[0] * .8);
      await expect(rail).toHaveAttribute('data-rotation', 'paused');
      await track.focus(); await page.keyboard.press('Home');
      await expect.poll(() => track.evaluate(n => n.scrollLeft)).toBeLessThan(2);
      await page.keyboard.press('End'); await expect(next).toBeDisabled();
      await page.keyboard.press('Home');
      await expect(rail.locator('.e-rail-position')).toContainText('1–');
      await page.screenshot({ path: path.join(output, `selection-${lang}-${width}-${legacy ? 'legacy' : 'modern'}.png`) });
      pass(`${lang} ${width} ${legacy ? 'legacy' : 'modern'}: ${size.columns} full products, prices/stock, controls and keyboard`);
      await page.locator('.e-progressive').first().scrollIntoViewIfNeeded();
      const shelf = page.locator('[data-collection=capacitors] .e-product-rail');
      await expect(shelf.locator('.e-product-card').first()).toBeVisible();
      await shelf.scrollIntoViewIfNeeded();
      assert.equal((await geometry(page, shelf.locator('.e-product-rail-track'))).columns, size.columns);
      if (width === 360) {
        await page.goto(base + '/');
        await expect(section.locator('.e-selection-card')).toHaveCount(10);
        await rail.scrollIntoViewIfNeeded();
        await expect(rail).toHaveAttribute('data-rotation', 'running');
        await expect.poll(() => track.evaluate(n => n.scrollLeft), { timeout: 10000 }).toBeGreaterThan(30);
        await rail.getByRole('button', { name: 'Suspendre le défilement', exact: true }).click();
        const paused = await track.evaluate(n => n.scrollLeft);
        await page.waitForTimeout(7000);
        assert(Math.abs(await track.evaluate(n => n.scrollLeft) - paused) < 2, 'Pause must stop the moving track too');
        pass('Visible rail advances at real speed; Pause stops both timer and active scroll');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        await expect(rail.locator('[data-rail-play]')).toHaveCount(0);
        await track.focus(); await page.keyboard.press('ArrowRight');
        await expect(rail).toHaveAttribute('data-rotation', 'paused');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
        const globalPause = page.locator('footer .e-motion-toggle');
        await globalPause.click(); await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        await page.reload(); await expect(section.locator('.e-selection-card')).toHaveCount(10);
        await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
        await rail.scrollIntoViewIfNeeded(); await expect(rail).toHaveAttribute('data-rotation', 'paused');
        assert.equal(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
        await page.locator('.e-menu').click(); await expect(page.locator('dialog[open]')).toBeVisible();
        await page.keyboard.press('Escape'); await expect(page.locator('dialog[open]')).toHaveCount(0);
        await expect(page.locator('.e-menu')).toBeFocused();
        pass('Live reduced-motion change, manual controls, persisted global pause, no running scene and modal focus');
        await page.locator('footer .e-motion-toggle').click();
        const banner = page.locator('.e-banner-rotator').first();
        await banner.scrollIntoViewIfNeeded();
        await banner.getByRole('button', { name: 'Suspendre les bannières', exact: true }).click();
        await expect(banner).toHaveAttribute('data-rotation', 'paused');
        assert.equal(await banner.locator('.e-banner-slide').first().evaluate(n => getComputedStyle(n).transitionDuration), '0s');
        await banner.getByRole('button', { name: 'Bannière suivante', exact: true }).click();
        await expect(banner.locator('.e-banner-slide.is-active')).toHaveCount(1);
        await expect(banner.locator('.e-banner-slide:not(.is-active)')).toHaveAttribute('inert', '');
        pass('Banner pause stops its transition; manual selection and inactive focus exclusion remain usable');
      }
      for (const route of ['/catalogue', '/equivalences', '/panier', '/devis', '/contact', '/login']) {
        await page.goto(base + route); await expect(page.locator('main h1')).toBeVisible();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route + ' overflow');
      }
      pass(`${width}: catalogue, equivalences, cart, quote, contact and login remain usable`);
      await context.close();
    }
    const { context, page } = await contextFor({ width: 390, reduced: true });
    await page.goto(base + '/');
    const rail = page.locator('.e-home-selection .e-product-rail');
    await expect(rail.locator('.e-selection-card')).toHaveCount(10); await rail.scrollIntoViewIfNeeded();
    await page.waitForTimeout(7000);
    assert(Math.abs(await rail.locator('.e-product-rail-track').evaluate(n => n.scrollLeft)) < 2);
    await expect(rail.locator('[data-rail-play]')).toHaveCount(0);
    pass('Reduced motion from initial load: two products available, no autoplay');
    await context.close();
    const blocked = await contextFor({ width: 390 });
    await blocked.context.addInitScript(() => {
      Storage.prototype.getItem = () => { throw Error('Storage unavailable'); };
      Storage.prototype.setItem = () => { throw Error('Storage unavailable'); };
    });
    await blocked.page.goto(base + '/');
    await expect(blocked.page.locator('.e-home-selection .e-selection-card')).toHaveCount(10);
    const pause = blocked.page.locator('footer .e-motion-toggle');
    await expect(pause).toBeEnabled(); await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await blocked.page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(pause).toBeDisabled();
    await blocked.page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(pause).toBeEnabled(); await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(blocked.page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    pass('Storage unavailable: session pause survives system preference changes');
    await blocked.context.close();
    assert.deepEqual(report.errors, []); assert.deepEqual(report.writes, []);
    report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.failure = error.message; throw error; }
  finally { fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
