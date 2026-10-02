// Fictitious records, dedicated local PostgreSQL only. No .env or external API.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const connectionString = process.env.NEWOTEG_COMMERCIAL_TEST_DATABASE_URL;
if (!connectionString)
  throw Error('Explicit isolated fixture database URL required.');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error(
    'Refusing a database outside the dedicated local acceptance cluster.',
  );
process.env.DATABASE_URL = connectionString;
const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ProduitService } = require('../dist/src/produit/produit.service');
const { cataloguePricing } = require('../dist/src/pricing/catalogue-price');
const {
  cataloguePriceSql,
} = require('../dist/src/pricing/catalogue-price.sql');
const {
  publicCatalogue,
  publicPriceMetadata,
} = require('../dist/src/produit/public-catalogue');
const pool = new Pool({ connectionString, max: 5 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { timeout: 20000 },
});
const service = new ProduitService(db, {}, {}, {});
const now = new Date(),
  suffix = randomUUID().slice(0, 8),
  owned = [],
  checks = [];
let admin, ticket;
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
(async () => {
  try {
    const category = await db.categorie.create({
      data: { nom: 'Démonstration filtres ' + suffix },
    });
    async function create(label, extra = {}) {
      const row = await db.produit.create({
        data: {
          categorieId: category.id,
          nomProduit: 'Recette prix ' + label + ' ' + suffix,
          code: 'DEMO-PRIX-' + randomUUID().slice(0, 12),
          codeFamille: 'RECETTE',
          prixDetail: 3500,
          quantiteStock: 8,
          ...extra,
        },
      });
      owned.push(row.id);
      return row;
    }
    const promoted = await create('promotion', {
      prixDetail: 3500,
      prixPromo: 2800,
      finPromo: new Date(now.getTime() + 86400000),
    });
    await create('standard', { prixDetail: 3000 });
    await create('expirée', {
      prixDetail: 4500,
      prixPromo: 100,
      finPromo: now,
    });
    await create('même prix', {
      prixDetail: 4100,
      prixPromo: 4100,
      finPromo: new Date(now.getTime() + 86400000),
    });
    await create('sans prix', { prixDetail: null });
    await create('inactive', { estActif: false, prixDetail: 1 });
    const literal = await create('littéral %_\\ suffixe', { prixDetail: 3200 });
    for (let i = 0; i < 26; i++)
      await create('pagination ' + i, { prixDetail: 3100 + (i % 4) });
    const select = (params = {}) =>
      service.findAll({
        categoryId: category.id,
        publicPricingAt: now,
        ...params,
      });
    const filtered = await select({ maxPrice: 2800, sort: 'price_asc' });
    assert.deepEqual(
      filtered.data.map((p) => p.id),
      [promoted.id],
    );
    assert.equal(filtered.meta.total, 1);
    assert.equal(cataloguePricing(filtered.data[0], now).prixPublic, 2800);
    assert.equal(
      (await select({ minPrice: 3400, maxPrice: 3600 })).meta.total,
      0,
    );
    assert.equal(
      (await service.findAll({ categoryId: category.id, maxPrice: 2800 })).meta
        .total,
      0,
    );
    ok(
      'Public filters use the offered price while administration keeps the catalogue price',
    );

    const expected = (
      await db.produit.findMany({
        where: { categorieId: category.id, estActif: true },
      })
    ).sort((a, b) => {
      const pa = cataloguePricing(a, now).prixPublic,
        pb = cataloguePricing(b, now).prixPublic;
      return pa == null
        ? pb == null
          ? a.id.localeCompare(b.id)
          : 1
        : pb == null
          ? -1
          : pa - pb || a.id.localeCompare(b.id);
    });
    const seen = [];
    for (let page = 1; page <= Math.ceil(expected.length / 3); page++) {
      const result = await select({ sort: 'price_asc', page, limit: 3 });
      assert.equal(result.meta.total, expected.length);
      assert.equal(
        result.data.length,
        Math.min(3, expected.length - seen.length),
      );
      seen.push(...result.data.map((p) => p.id));
    }
    assert.deepEqual(
      seen,
      expected.map((p) => p.id),
    );
    const descending = await select({ sort: 'price_desc', limit: 500 });
    const prices = descending.data.map(
      (p) => cataloguePricing(p, now).prixPublic,
    );
    assert.equal(prices.at(-1), null);
    const valid = prices.filter((p) => p != null);
    assert.deepEqual(
      valid,
      [...valid].sort((a, b) => b - a),
    );
    const beyond = await select({ page: 100, limit: 3 });
    assert.equal(beyond.meta.total, expected.length);
    assert.deepEqual(beyond.data, []);
    ok(
      'Promotion sort, tied prices, null prices and page counts remain correct across every page',
    );

    assert.deepEqual(
      (await select({ search: '%_\\' })).data.map((p) => p.id),
      [literal.id],
    );
    assert.equal((await select({ search: "%' OR TRUE --" })).meta.total, 0);
    assert.equal((await select({ code: promoted.code })).meta.total, 1);
    assert.equal((await select({ codeFamille: 'OTHER' })).meta.total, 0);
    await select({ sort: '__proto__' });
    for (const params of [
      { minPrice: NaN },
      { maxPrice: Infinity },
      { minPrice: -1 },
      { minPrice: 4, maxPrice: 3 },
    ])
      await assert.rejects(
        () => select(params),
        (error) => error.getStatus?.() === 400,
      );
    ok(
      'Search escapes wildcard characters; combined filters and invalid bounds are controlled',
    );

    admin = await db.adminUser.create({
      data: {
        nom: 'Recette filtres fictive',
        username: 'pricing-' + suffix,
        role: 'SUPER_ADMIN',
      },
    });
    ticket = await db.ticketVente.create({
      data: {
        numeroTicket: 'PRIX-' + suffix,
        vendeurId: admin.id,
        montantTotal: 2800 * 8,
        expiresAt: new Date(now.getTime() + 86400000),
        lignes: {
          create: {
            produitId: promoted.id,
            nomProduit: promoted.nomProduit,
            quantite: 8,
            prixUnitaire: 2800,
            sousTotal: 2800 * 8,
          },
        },
      },
    });
    const reserved = await select({ maxPrice: 2800, inStock: true });
    assert.equal(reserved.meta.total, 0);
    assert.equal(
      (await select({ maxPrice: 2800 })).data[0].quantiteDisponibleVente,
      0,
    );
    await db.ticketVente.update({
      where: { id: ticket.id },
      data: { expiresAt: now },
    });
    assert.equal(
      (await select({ maxPrice: 2800, inStock: true })).meta.total,
      1,
    );
    ok(
      'In-stock counts exclude active shop reservations and release expired ones at the same instant',
    );

    const cases = [
      0,
      -1,
      null,
      0.004,
      0.005,
      1.005,
      2.675,
      90071992547410,
      Infinity,
      NaN,
    ];
    for (let i = 0; i < cases.length; i++) {
      const row = await create('arrondi ' + i);
      const value = cases[i];
      if (value == null)
        await db.produit.update({
          where: { id: row.id },
          data: { prixDetail: null },
        });
      else
        await db.$executeRaw(
          Prisma.sql`UPDATE produit SET prix_detail = ${String(value)}::double precision WHERE id = ${row.id}`,
        );
    }
    const all = await db.produit.findMany({
      where: { categorieId: category.id },
    });
    const sqlPrices = await db.$queryRaw(
      Prisma.sql`SELECT p.id, ${cataloguePriceSql(now)} AS price FROM produit p WHERE p.id_categorie = ${category.id}`,
    );
    const byId = new Map(all.map((p) => [p.id, p]));
    for (const row of sqlPrices)
      assert.equal(
        row.price,
        cataloguePricing(byId.get(row.id), now).prixPublic,
      );
    const active = await db.produit.findMany({ where: { estActif: true } });
    const known = active
      .map((p) => cataloguePricing(p, now).prixPublic)
      .filter((p) => p != null);
    assert.deepEqual(await publicPriceMetadata(db, now), {
      minPrice: Math.min(...known),
      maxPrice: Math.max(...known),
    });
    ok(
      'SQL and displayed prices agree on expiry, invalid offers, cent rounding, unsafe values and metadata',
    );

    let updated = false;
    const wrapped = new Proxy(db, {
      get(target, key) {
        if (key === '$transaction')
          return (fn, opts) =>
            db.$transaction(
              (tx) =>
                fn(
                  new Proxy(tx, {
                    get(t, k) {
                      if (k === '$queryRaw')
                        return async (...args) => {
                          const result = await t.$queryRaw(...args);
                          if (!updated) {
                            updated = true;
                            await db.produit.update({
                              where: { id: promoted.id },
                              data: { prixPromo: 2700 },
                            });
                          }
                          return result;
                        };
                      const value = t[k];
                      return typeof value === 'function'
                        ? value.bind(t)
                        : value;
                    },
                  }),
                ),
              opts,
            );
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const before = await publicCatalogue(
      wrapped,
      { categoryId: category.id, minPrice: 2800, maxPrice: 2800 },
      now,
    );
    assert.equal(before.meta.total, 1);
    assert.equal(cataloguePricing(before.data[0], now).prixPublic, 2800);
    assert.equal(
      (await select({ minPrice: 2800, maxPrice: 2800 })).meta.total,
      0,
    );
    assert.equal(
      (await select({ minPrice: 2700, maxPrice: 2700 })).data[0].id,
      promoted.id,
    );
    ok(
      'A concurrent price edit cannot mix an old filter/count with a new displayed product price',
    );
    const output =
      'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial';
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      output + '/catalogue-pricing-result.json',
      JSON.stringify(
        { checks, fixture: true, realLocalDatabase: true, externalCalls: 0 },
        null,
        2,
      ),
    );
  } finally {
    if (ticket)
      await db.ticketVente.update({
        where: { id: ticket.id },
        data: { statut: 'ANNULE', motifAnnulation: 'Fin de recette fictive' },
      });
    if (owned.length)
      await db.produit.updateMany({
        where: { id: { in: owned } },
        data: { estActif: false },
      });
    if (admin)
      await db.adminUser.update({
        where: { id: admin.id },
        data: { isActive: false },
      });
    await db.$disconnect();
    await pool.end();
  }
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
