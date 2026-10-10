// Read-only integration of the compiled renderer with the existing public
// product/category services. No full AppModule, schedulers or migration startup.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { ProduitService } = require('../dist/src/produit/produit.service.js');
const { CategorieService } = require('../dist/src/categorie/categorie.service.js');
const { StorefrontRenderingService } = require('../dist/src/storefront-rendering/storefront-rendering.service.js');
const { masquerCouts } = require('../dist/src/produit/public-product.js');
const { loadCatalogueRuntime } = require('../dist/src/storefront-rendering/catalogue-runtime.js');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output' || !path.isAbsolute(args[1]))
  throw Error('Usage: node scripts/verify-catalogue-database.cjs --output absolute-directory');
if (!process.env.DATABASE_URL) throw Error('DATABASE_URL must be supplied privately');
process.chdir(root);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2,
  connectionTimeoutMillis: 15000, options: '-c default_transaction_read_only=on -c statement_timeout=12000' });
const db = new PrismaClient({ adapter: new PrismaPg(pool), log: [],
  transactionOptions: { maxWait: 10000, timeout: 30000 } });
const report = { date: new Date().toISOString(), readOnly: false, checks: [], routes: [], status: 'failed' };
const parseBoot = html => JSON.parse(html.match(/id="initial-catalogue-data">([\s\S]*)<\/script>$/)[1]);
(async () => {
  try {
    const setting = await pool.query('SHOW default_transaction_read_only');
    assert.equal(setting.rows[0].default_transaction_read_only, 'on');
    await db.$transaction(async tx => {
      const inside = await tx.$queryRawUnsafe('SHOW transaction_read_only');
      assert.equal(inside[0].transaction_read_only, 'on');
    });
    report.readOnly = true;
    const runtime = loadCatalogueRuntime(path.join(root, '.storefront-renderer'));
    const products = new ProduitService(db, null, null, null), categories = new CategorieService(db, null, null);
    const rendering = new StorefrontRenderingService(products, categories, { get: () => 'true' });
    // Freeze only the verification response, not production data. Read both
    // actual public services once per route, then give that response to the
    // real rendering service to compare its price/stock projection exactly.
    let expected;
    const original = products.findAll.bind(products);
    products.findAll = async options => {
      const rows = await original(options);
      expected = JSON.parse(JSON.stringify({ ...rows, data: rows.data.map(p => masquerCouts(p, options.publicPricingAt)) }));
      return rows;
    };
    const actualCategories = await categories.findAll();
    const catalogueCategory = actualCategories.find(c => c._count?.produits > 0);
    assert(catalogueCategory, 'Existing public category required');
    const routes = ['/catalogue', '/catalogue?page=2&sort=price-desc',
      '/catalogue?search=c%C3%A2ble&instock=true&sort=price-asc&minPrice=1&maxPrice=100000',
      '/catalogue?category=' + encodeURIComponent(catalogueCategory.id),
      '/catalogue?search=NEWOTEG_LAB_ABSENT_5D0C9D87'];
    for (const url of routes) {
      const start = performance.now();
      const rendered = await rendering.catalogue(url, runtime.rendererId);
      const elapsedMs = Math.round(performance.now() - start);
      const boot = parseBoot(rendered.html), route = runtime.parseCatalogueRequest(url);
      const rows = boot.resources[route.path];
      assert.equal(boot.url, url); assert.equal(rows.meta.total, expected.meta.total);
      assert.equal(rows.meta.lastPage, expected.meta.lastPage);
      assert.deepEqual(rows.data.map(p => [p.id, p.prixPublic, p.quantiteStock, p.offre]),
        expected.data.map(p => [p.id, p.prixPublic, p.quantiteStock, p.offre]));
      assert(!/cmupActuel|dernierCoutAchatFcfa|dernierFournisseurId|quantiteReservee/.test(rendered.html));
      assert(rows.data.every(p => p.estActif !== false));
      if (url.includes('instock=true')) assert(rows.data.every(p => p.quantiteStock > 0));
      if (url.includes('category=')) assert(rows.data.every(p => p.categorieId === catalogueCategory.id));
      if (url.includes('NEWOTEG_LAB_ABSENT')) assert.equal(rows.meta.total, 0);
      report.routes.push({ url, rows: rows.data.length, total: rows.meta.total, elapsedMs, htmlBytes: Buffer.byteLength(rendered.html) });
    }
    report.rendererId = runtime.rendererId;
    report.checks.push('Connection and Prisma transactions forced read-only',
      'Actual public product/category service and compiled rendering service used',
      'Exact product identity, public prices, dated offers, available stock and totals preserved',
      'Pagination, price sort/bounds, accents, stock, real category and zero-result routes',
      'Inactive products and private costs/reservations absent');
    report.status = 'passed';
  } catch (error) {
    // Database/ORM error messages can contain a URL or sensitive query context.
    report.failure = error.code || error.constructor?.name || 'Integration failure';
    process.exitCode = 1;
  } finally {
    await db.$disconnect(); await pool.end();
    fs.mkdirSync(args[1], { recursive: true });
    fs.writeFileSync(path.join(args[1], 'database-result.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
})();
