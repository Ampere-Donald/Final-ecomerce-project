// Read-only built storefront recipe on the existing main/demo API.
// No API fixture replacement, order write, email, remote provider or database write.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const base = 'http://127.0.0.1:5188';
const output = process.env.NEWOTEG_SEO_OUTPUT;
if (!output || !path.isAbsolute(output)) throw Error('Absolute evidence directory required');
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../dist/.vite/manifest.json'), 'utf8'));
const homeKey = 'src/storefront/Home.jsx', projectKey = 'src/storefront/Projects.jsx';
assert.ok(manifest[homeKey] && manifest[projectKey], 'Build with vite build --manifest first');
const projectFile = '/' + manifest[projectKey].file;
function imports(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const imported of manifest[key].imports || []) imports(imported, seen);
  return seen;
}
assert.equal(imports(homeKey).has(projectKey), false, 'Home must not statically import project detail');
const checks = [], errors = [], forbidden = [];
(async () => {
  let browser;
  try {
    fs.mkdirSync(output, { recursive: true });
    browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
    let detailPath;
    for (const [lang, width] of [['fr', 390], ['en', 1440]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(lang => localStorage.setItem('appLang', lang), lang);
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        const localFixtureImage = url.origin === 'http://127.0.0.1:5187' && url.pathname.startsWith('/design-e/');
        if (request.method() !== 'GET' || (url.origin !== base && !localFixtureImage)) {
          forbidden.push(request.method() + ' ' + url.origin + url.pathname);
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage(), requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(new URL(request.url()).pathname));
      await page.goto(base + '/', { waitUntil: 'networkidle' });
      const previews = page.locator('.e-project-teaser .e-project-list-item');
      assert.ok(await previews.count() > 0, 'Real local demo API must have at least one published project');
      const title = await previews.first().locator('h2').innerText();
      const open = previews.first().locator('.e-project-open');
      detailPath = await open.getAttribute('href');
      assert.ok(detailPath.startsWith('/projets/'));
      assert.equal(requests.includes(projectFile), false, 'Detail chunk must not be requested on home');
      assert.equal(requests.some(url => url.startsWith('/api/projets/public/')), false);
      await previews.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `projects-home-${lang}-${width}.png`) });
      await open.click();
      await expect(page).toHaveURL(base + detailPath);
      await expect(page.locator('main h1')).toHaveText(title);
      await expect(page.locator('.e-project-materials')).toBeVisible();
      assert.ok(requests.includes(projectFile), 'Detail chunk loads after project navigation');
      assert.ok(requests.some(url => url.startsWith('/api/projets/public/')));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `project-detail-${lang}-${width}.png`) });
      checks.push({ lang, width, previewRendered: true, detailAbsentBeforeClick: true, detailLoadedAfterClick: true, materialVisible: true });
      await context.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(forbidden, []);
    fs.writeFileSync(path.join(output, 'home-project-loading-result.json'), JSON.stringify({ status: 'passed', projectFile, checks, errors, forbidden, limits: 'Real local demo catalogue, modern Edge only; no real technical project approval or mutation tested' }, null, 2));
    console.log(JSON.stringify({ status: 'passed', checks }));
  } finally { await browser?.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
