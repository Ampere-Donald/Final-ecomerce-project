// Child of the owned DB recipe only. No production context or credentials.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
assert(process.send, 'Launch from the owned database recipe, using IPC only');
process.once('message', async fixture => {
  const adminBase = process.env.TECHNICAL_ADMIN_BASE, storeBase = process.env.TECHNICAL_STOREFRONT_BASE;
  for (const base of [adminBase, storeBase, fixture.base]) assert(/^http:\/\/127\.0\.0\.1:\d+$/.test(base), 'Local servers required');
  const output = process.env.TECHNICAL_BROWSER_OUTPUT;
  const endpoint = '/valeurs-attribut/' + fixture.value + '/documentation';
  const apiCalls = [], errors = [], outside = [];
  const request = async (route, method = 'GET', body, authenticated = true) => {
    const r = await fetch(fixture.base + '/api' + route, { method, headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + fixture.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, data: await r.json() };
  };
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    fs.mkdirSync(output, { recursive: true });
    const admin = { id: 'synthetic-ui', nom: 'Administrateur de recette', username: 'recette', role: 'ADMIN' };
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await context.addInitScript(({ token, admin }) => { localStorage.setItem('newoteg_admin_token', token); localStorage.setItem('newoteg_admin_user', JSON.stringify(admin)); }, { token: fixture.token, admin });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/admin-auth/me') return route.fulfill({ json: admin });
        if (/^\/api\/(attributs|valeurs-attribut)(\/|$)/.test(url.pathname)) {
          const r = await request(url.pathname.slice(4), route.request().method(), route.request().postDataJSON());
          apiCalls.push({ path: url.pathname, method: route.request().method(), status: r.status });
          return route.fulfill({ status: r.status, json: r.data });
        }
        return route.fulfill({ json: [] });
      }
      if (url.origin !== adminBase) { outside.push(url.origin); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(adminBase + '/attributs'); await page.getByRole('button', { name: /Source de Courant/ }).click();
    await expect(page.getByLabel('État du brouillon')).toHaveValue('A_VERIFIER');
    await expect(page.getByRole('button', { name: 'Documenter après relecture' })).toBeDisabled();
    for (const [label, value] of [['Lien HTTPS vers la source', 'https://manufacturer.example/fixture.pdf'], ['Titre du document', 'Fiche de recette fictive'], ['Page, tableau ou section', 'Tableau 2'], ['Note de décision (publique)', 'Relecture de recette uniquement'], ['Unité de la valeur d’origine', 'mA'], ['Valeur normalisée (facultatif)', '1'], ['Unité normalisée', 'A'], ['Conditions d’utilisation ou de mesure', 'Mesure à 25 °C']]) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Brouillon enregistré' })).toBeVisible();
    assert.equal((await request(endpoint, 'GET', undefined, false)).data.etat, 'A_VERIFIER');
    // A second real actor changes the stored draft. The browser still has the old version.
    let current = (await request(endpoint + '-admin')).data;
    const { documentation, valeurVersion, attributVersion, produitVersion } = current;
    const body = { ...documentation, version: documentation.version, valeurVersion, attributVersion, produitVersion, etat: 'A_VERIFIER', conditions: 'Condition modifiée par la recette' };
    assert.equal((await request(endpoint, 'PATCH', body)).status, 200);
    await page.getByLabel('Titre du document', { exact: true }).fill('Saisie locale conservée'); await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
    await expect(page.getByRole('alert')).toContainText('Votre saisie est conservée'); await expect(page.getByLabel('Titre du document', { exact: true })).toHaveValue('Saisie locale conservée'); await expect(page.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeDisabled();
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Recharger la dernière version' }).click(); await expect(page.getByLabel('Titre du document', { exact: true })).toHaveValue('Fiche de recette fictive');
    await page.locator('section[aria-labelledby="technical-source-title"] input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Documenter après relecture' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Relecture enregistrée' })).toBeVisible();
    const visible = (await request(endpoint, 'GET', undefined, false)).data; assert.equal(visible.etat, 'DOCUMENTE'); assert(!JSON.stringify(visible).includes('reluParId'));
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.getByLabel('Titre du document', { exact: true }).scrollIntoViewIfNeeded(); await expect(page.getByLabel('Titre du document', { exact: true })).toBeVisible();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const checkbox = page.locator('section[aria-labelledby="technical-source-title"] input[type="checkbox"]');
      await checkbox.check(); await expect(page.getByRole('button', { name: 'Documenter après relecture' })).toBeEnabled();
      const review = page.getByRole('button', { name: 'Documenter après relecture' }); await review.scrollIntoViewIfNeeded();
      assert(await review.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), 'Review control hidden by chrome at ' + width);
      await checkbox.uncheck();
      await page.screenshot({ path: path.join(output, `admin-actions-${width}.png`) });
      await page.getByLabel('État du brouillon').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, `admin-${width}.png`) });
    }
    await context.close();
    const store = await browser.newContext({ viewport: { width: 390, height: 1000 }, serviceWorkers: 'block' });
    await store.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/produits/' + fixture.product.id) {
          const d = (await request(endpoint, 'GET', undefined, false)).data;
          const p = structuredClone(fixture.product); p.attributs[0].valeurs[0].documentation = d;
          return route.fulfill({ json: p });
        }
        return route.fulfill({ json: [] });
      }
      if (url.origin !== storeBase) { outside.push(url.origin); return route.abort(); }
      return route.continue();
    });
    const client = await store.newPage(); client.on('pageerror', e => errors.push(e.message)); await client.goto(storeBase + '/product/' + fixture.product.id);
    const source = client.locator('.e-specs .e-technical-source'); await expect(source).toContainText('Documenté après relecture'); await source.locator('summary').click(); await expect(source).toContainText('Fiche de recette fictive'); await expect(source).toContainText('Condition modifiée par la recette'); await expect(source).toContainText('1 A');
    await source.screenshot({ path: path.join(output, 'public-source-390.png') }); await store.close();
    assert.equal(errors.length, 0, errors.join('\n')); assert.equal(outside.length, 0, outside.join('\n')); assert(apiCalls.some(c => c.method === 'PATCH' && c.status === 409)); assert(apiCalls.some(c => c.method === 'POST' && c.status === 201));
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ passed: true, fixture: 'Synthetic only; actual Nest guards/DTO/services/PostgreSQL for source reads and writes; product shell and session lookup are fixture adapters', checks: ['draft', 'no automatic review', 'real 409 preserves inputs', 'reload then explicit review', 'private identity omitted', '390/768/1440 admin', 'real public source in built product UI'], apiCalls, errors, outside }, null, 2));
    console.log('PASS browser admin draft/conflict/review against owned PostgreSQL and current source in storefront');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await browser.close(); process.disconnect(); }
});
