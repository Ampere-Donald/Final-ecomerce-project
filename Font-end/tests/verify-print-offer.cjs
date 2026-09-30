const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const base = 'http://127.0.0.1:5186';
const captureDir = 'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures';
const customer = { id: 'client-fixture', nom: 'Client Démonstration', telephone: '+237600000000' };
let request = {
  id: 'quote-fixture', version: 2, statut: 'ENVOYEE', createdAt: new Date().toISOString(),
  nomClient: customer.nom, telephone: customer.telephone, modeReception: 'LIVRAISON',
  destination: 'Douala · adresse de démonstration', lignes: [
    { reference: 'LM358-N', nomProduit: 'Amplificateur LM358-N', quantite: 2, produitId: 'product-fixture' },
  ],
  offre: { numero: 'FP-DEMO', dateExpiration: new Date(Date.now() + 86400000).toISOString(),
    montantArticles: 3000, fraisLivraison: null, reservationStock: false, lignes: [
      { produitId: 'product-fixture', nomProduit: 'Amplificateur LM358-N', quantite: 2, prixUnitaire: 1500, sousTotal: 3000 },
    ] },
};
const errors = [], methods = [];
const browserPromise = chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
(async () => {
  const browser = await browserPromise;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'fr-FR' });
    await context.route('**/*', r => new URL(r.request().url()).origin === base ? r.continue() : r.abort());
    await context.route('**/api/**', r => {
      const u = new URL(r.request().url());
      methods.push(r.request().method());
      const send = (data, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (u.pathname.endsWith('/auth/me')) return send(customer);
      if (u.pathname.endsWith('/devis/mine/quote-fixture')) return send(request);
      if (u.pathname.endsWith('/devis/mine/other-customer')) return send({ message: 'Demande introuvable' }, 404);
      return send([]);
    });
    await context.addInitScript(user => {
      localStorage.setItem('newoteg_token', 'fixture-only');
      localStorage.setItem('newoteg_user', JSON.stringify(user));
    }, customer);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/mes-devis/quote-fixture');
    await page.getByRole('link', { name: 'Voir la proposition imprimable' }).click();
    const sheet = page.getByRole('article', { name: 'Proposition commerciale imprimable' });
    await sheet.waitFor();
    assert.match(await sheet.innerText(), /FP-DEMO/);
    assert.match(await sheet.innerText(), /3\s?000.*FCFA/s);
    assert.match(await sheet.innerText(), /Frais et délai de livraison à confirmer/);
    assert.doesNotMatch(await sheet.innerText(), /motif de remise|coût d'achat|note interne|facture n°/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(captureDir, 'devis-print-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(captureDir, 'devis-print-desktop.png'), fullPage: true });
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.e-print-toolbar').evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.app > header').evaluate(el => getComputedStyle(el).display), 'none');
    await page.pdf({ path: path.join(captureDir, 'devis-print-a4.pdf'), format: 'A4', printBackground: true });
    console.log('PASS Private offer, customer-only fields, mobile/desktop and print media');

    request = { ...request, offre: { ...request.offre, dateExpiration: new Date(Date.now() - 86400000).toISOString() } };
    await page.goto(base + '/mes-devis/quote-fixture/imprimer');
    await page.getByText('Proposition non disponible à l’acceptation').waitFor();
    assert.match(await sheet.innerText(), /contactez la boutique avant toute commande/i);
    console.log('PASS Expired offer is visibly inactive');

    await page.goto(base + '/mes-devis/other-customer/imprimer');
    await page.getByRole('heading', { name: 'Proposition indisponible' }).waitFor();
    assert.equal(await page.getByRole('article', { name: 'Proposition commerciale imprimable' }).count(), 0);
    assert(methods.every(method => method === 'GET'));
    assert.deepEqual(errors, []);
    console.log('PASS Other customer 404 renders no offer and sends no mutation');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
