// Real services, fictitious records, dedicated local PostgreSQL only. No .env.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs'),
  path = require('node:path');
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
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ProduitService } = require('../dist/src/produit/produit.service');
const { ProduitController } = require('../dist/src/produit/produit.controller');
const { AchatService } = require('../dist/src/achat/achat.service');
const { CmupService } = require('../dist/src/cmup/cmup.service');
const { CommandeService } = require('../dist/src/commande/commande.service');
const {
  CommandeController,
} = require('../dist/src/commande/commande.controller');
const {
  TicketVenteService,
} = require('../dist/src/ticket-vente/ticket-vente.service');
const pool = new Pool({ connectionString, max: 10 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const notificationStub = { create: async () => ({}) };
const noExternal = new Proxy(
  {},
  {
    get() {
      return () => {
        throw Error('External dependency must not be called');
      };
    },
  },
);
const products = new ProduitService(
  db,
  notificationStub,
  noExternal,
  noExternal,
);
const publicProducts = new ProduitController(products, noExternal);
const purchases = new AchatService(db, notificationStub, new CmupService(db));
const commandsFor = (database) =>
  new CommandeService(database, notificationStub, noExternal);
const commands = commandsFor(db),
  publicCommands = new CommandeController(commands);
const tickets = new TicketVenteService(db, notificationStub, noExternal, {
  nextDaily: async () => 'DEMO-' + randomUUID().slice(0, 12),
});
const suffix = randomUUID(),
  end = new Date(Date.now() + 7 * 86400000);
const checks = [],
  owned = [],
  ticketIds = [];
let admin,
  preview,
  completed = false;
const ok = (name) => {
  checks.push(name);
  console.log('PASS ' + name);
};
const reject = async (fn, code) => {
  try {
    await fn();
    throw Error('Expected rejection: ' + code);
  } catch (err) {
    assert.equal(err.getResponse?.().code, code);
  }
};
function wrapTransactions(decorate) {
  return new Proxy(db, {
    get(target, key) {
      if (key === '$transaction')
        return (fn, options) =>
          db.$transaction((tx) => fn(decorate(tx)), options);
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
(async () => {
  try {
    const previousFile =
      'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial/backend-result.json';
    if (fs.existsSync(previousFile)) {
      const previous = JSON.parse(fs.readFileSync(previousFile, 'utf8'));
      if (previous.fixture && previous.previewKept && previous.productId) {
        const row = await db.produit.findUnique({
          where: { id: previous.productId },
        });
        if (
          row &&
          row.code === previous.productCode &&
          row.code.startsWith('DEMO-OFF-') &&
          row.nomProduit.startsWith('Démonstration') &&
          row.description ===
            'Recette locale fictive, aucune offre commerciale réelle.'
        )
          await db.produit.update({
            where: { id: row.id },
            data: { estActif: false },
          });
        else if (row)
          throw Error(
            'Prior fixture preview identity changed; explicit review required.',
          );
      }
    }
    const category = await db.categorie.create({
      data: { nom: 'Démonstration offres ' + suffix },
    });
    const supplier = await db.fournisseur.create({
      data: { nomEntreprise: 'Fournisseur fictif de recette ' + suffix },
    });
    admin = await db.adminUser.create({
      data: {
        nom: 'Recette commerciale fictive',
        username: 'commercial-test-' + suffix.slice(0, 20),
        role: 'SUPER_ADMIN',
      },
    });
    async function product(name, extra = {}) {
      const p = await db.produit.create({
        data: {
          categorieId: category.id,
          nomProduit: 'Démonstration — ' + name + ' ' + suffix.slice(0, 8),
          designationEn: 'Demonstration — ' + name,
          code: 'DEMO-OFF-' + randomUUID().slice(0, 8) + '-N',
          description:
            'Recette locale fictive, aucune offre commerciale réelle.',
          imageUrl: 'http://127.0.0.1:5187/design-e/hdmi-5m.webp',
          prixDetail: 3500,
          prixDemiGros: 1000,
          prixGros: 800,
          prixPromo: 2800,
          finPromo: end,
          quantiteStock: 0,
          dateAjout: new Date('2020-01-01T00:00:00Z'),
          ...extra,
        },
      });
      owned.push(p.id);
      return p;
    }
    const p = (preview = await product('câble de recette'));
    const draft = await purchases.create({
      fournisseurId: supplier.id,
      devise: 'FCFA',
      tauxVersFcfa: 1,
      lignesAchat: [{ produitId: p.id, quantite: 10, prixUnitaireDevise: 500 }],
    });
    assert.ok(
      !(await publicProducts.findArrivages()).some((row) => row.id === p.id),
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: p.id } })).quantiteStock,
      0,
    );
    ok('Purchase draft has no stock effect and is not an arrival');
    const receipt = await purchases.valider(draft.id);
    const arrivals = await publicProducts.findArrivages(),
      arrived = arrivals.find((row) => row.id === p.id);
    assert.equal(arrived.arrivageAt.getTime(), receipt.validatedAt.getTime());
    assert.equal(arrived.quantiteStock, 10);
    assert.equal(arrived.prixPublic, 2800);
    assert.ok(!Object.hasOwn(arrived, 'cmupActuel'));
    assert.ok(!Object.hasOwn(arrived, 'dernierFournisseurId'));
    assert.ok(!JSON.stringify(arrived).includes(supplier.id));
    ok(
      'Validated purchase adds real stock and dated public arrival without supplier or costs',
    );
    assert.ok(
      (await publicProducts.findFlash()).some(
        (row) => row.id === p.id && row.prixPublic === 2800,
      ),
    );
    const imported = await product('fiche importée', {
      dateAjout: new Date(),
      quantiteStock: 10,
    });
    assert.ok(
      !(await publicProducts.findArrivages()).some(
        (row) => row.id === imported.id,
      ),
    );
    await db.achat.update({
      where: { id: receipt.id },
      data: { validatedAt: new Date(Date.now() - 31 * 86400000) },
    });
    assert.ok(
      !(await publicProducts.findArrivages()).some((row) => row.id === p.id),
    );
    await db.achat.update({
      where: { id: receipt.id },
      data: { validatedAt: receipt.validatedAt },
    });
    ok(
      'Recent import alone and receipt older than 30 days do not create arrivals',
    );
    const equalPrice = await product('offre incohérente', {
      quantiteStock: 5,
      prixPromo: 3500,
    });
    const expired = await product('offre expirée', {
      quantiteStock: 5,
      finPromo: new Date(Date.now() - 1000),
    });
    const flash = await publicProducts.findFlash();
    assert.ok(
      !flash.some((row) => [equalPrice.id, expired.id].includes(row.id)),
    );
    ok(
      'Expired and non-discounted offers are excluded from commercial selection',
    );
    const quote = await commands.quote({
      lignes: [{ produitId: p.id, quantite: 2 }],
    });
    assert.equal(quote.montantArticles, 5600);
    const payload = {
      requestId: randomUUID(),
      nomClient: 'Client fictif recette',
      telephone: '+237600000000',
      adresseLivraison: 'Retrait de démonstration Akwa',
      modeReception: 'RETRAIT_MAGASIN',
      montantTotal: quote.montantArticles,
      lignes: quote.lignes,
    };
    const beforeOrders = await db.commande.count(),
      beforeMoves = await db.mouvementStock.count();
    await db.produit.update({
      where: { id: p.id },
      data: {
        finPromo: new Date(Date.now() - 1000),
        version: { increment: 1 },
      },
    });
    await reject(() => publicCommands.checkout(payload), 'PRICE_CHANGED');
    assert.equal(await db.commande.count(), beforeOrders);
    assert.equal(await db.mouvementStock.count(), beforeMoves);
    assert.equal(
      await db.commandeRequest.count({
        where: { requestId: payload.requestId },
      }),
      0,
    );
    ok(
      'Offer expiration requires new acceptance and rolls back order, request and stock',
    );
    await db.produit.update({
      where: { id: p.id },
      data: { finPromo: end, version: { increment: 1 } },
    });
    const accepted = await publicCommands.checkout(payload),
      replayed = await publicCommands.checkout(payload);
    assert.equal(accepted.commande.id, replayed.commande.id);
    assert.equal(Number(accepted.commande.montantTotal), 5600);
    assert.equal(Number(accepted.commande.lignes[0].prixUnitaire), 2800);
    assert.equal(await db.commande.count(), beforeOrders + 1);
    assert.equal(
      (await db.produit.findUnique({ where: { id: p.id } })).quantiteStock,
      8,
    );
    assert.equal(await db.mouvementStock.count(), beforeMoves + 1);
    assert.ok(
      !Object.hasOwn(accepted.commande.lignes[0].produit, 'cmupActuel'),
    );
    assert.ok(
      !Object.hasOwn(
        replayed.commande.lignes[0].produit,
        'dernierCoutAchatFcfa',
      ),
    );
    ok(
      'Guest promotion order and replay share one order, one stock movement and no private costs',
    );
    const reserved = await tickets.create(admin.id, {
      lignes: [{ produitId: p.id, quantite: 8, prixUnitaire: 3500 }],
    });
    ticketIds.push(reserved.id);
    assert.ok(
      !(await publicProducts.findFlash()).some((row) => row.id === p.id),
    );
    assert.ok(
      !(await publicProducts.findArrivages()).some((row) => row.id === p.id),
    );
    await reject(
      () => commands.quote({ lignes: [{ produitId: p.id, quantite: 1 }] }),
      'STOCK_CHANGED',
    );
    await reject(
      () =>
        commands.createWithAccount({
          ...payload,
          requestId: randomUUID(),
          montantTotal: 2800,
          lignes: [
            {
              produitId: p.id,
              nomProduit: p.nomProduit,
              quantite: 1,
              prixUnitaire: 2800,
            },
          ],
        }),
      'STOCK_CHANGED',
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: p.id } })).quantiteStock,
      8,
    );
    await db.ticketVente.update({
      where: { id: reserved.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.ok(
      (await publicProducts.findFlash()).some((row) => row.id === p.id),
    );
    ok(
      'Shop reservation excludes commercial rows and blocks web order; expiry releases availability',
    );
    const racePart = await product('course de stock', { quantiteStock: 10 });
    const racePayload = {
      ...payload,
      requestId: randomUUID(),
      montantTotal: 16800,
      lignes: [
        {
          produitId: racePart.id,
          nomProduit: racePart.nomProduit,
          quantite: 6,
          prixUnitaire: 2800,
        },
      ],
    };
    const race = await Promise.allSettled([
      commands.createWithAccount(racePayload),
      tickets.create(admin.id, {
        lignes: [{ produitId: racePart.id, quantite: 6, prixUnitaire: 3500 }],
      }),
    ]);
    assert.equal(
      race.filter((result) => result.status === 'fulfilled').length,
      1,
    );
    if (race[1].status === 'fulfilled') ticketIds.push(race[1].value.id);
    const stock = await db.produit.findUnique({ where: { id: racePart.id } });
    const reserves = await db.ligneTicket.aggregate({
      where: {
        produitId: racePart.id,
        ticket: { statut: 'EN_ATTENTE', expiresAt: { gt: new Date() } },
      },
      _sum: { quantite: true },
    });
    assert.ok(stock.quantiteStock >= (reserves._sum.quantite || 0));
    assert.equal(
      await db.commande.count({
        where: { lignes: { some: { produitId: racePart.id } } },
      }),
      race[0].status === 'fulfilled' ? 1 : 0,
    );
    const loser = race.find((result) => result.status === 'rejected').reason;
    assert.ok(
      ['STOCK_CHANGED', 'STOCK_INSUFFISANT_AVANT_CAISSE'].includes(
        loser.getResponse?.().code,
      ) || loser.code === 'P2034',
    );
    ok(
      'Competing shop reservation and web order cannot both consume the same stock',
    );
    const concurrentPart = await product('reprise simultanée', {
      quantiteStock: 10,
    });
    const concurrentPayload = {
      ...payload,
      requestId: randomUUID(),
      lignes: [
        {
          produitId: concurrentPart.id,
          nomProduit: concurrentPart.nomProduit,
          quantite: 2,
          prixUnitaire: 2800,
        },
      ],
    };
    const replays = await Promise.all([
      commands.createWithAccount(concurrentPayload),
      commands.createWithAccount(concurrentPayload),
    ]);
    assert.equal(replays[0].commande.id, replays[1].commande.id);
    assert.equal(
      (await db.produit.findUnique({ where: { id: concurrentPart.id } }))
        .quantiteStock,
      8,
    );
    ok('Concurrent guest retries create only one promotion order');
    let release, reached;
    const gate = new Promise((resolve) => {
        release = resolve;
      }),
      locked = new Promise((resolve) => {
        reached = resolve;
      });
    const editPart = await product('édition concurrente', {
      quantiteStock: 10,
    });
    const wrapped = wrapTransactions(
      (tx) =>
        new Proxy(tx, {
          get(target, key) {
            if (key !== 'produit') return target[key];
            return new Proxy(tx.produit, {
              get(model, key) {
                if (key !== 'findUnique') return model[key];
                return async (args) => {
                  const result = await tx.produit.findUnique(args);
                  if (args.where.id === editPart.id) {
                    reached();
                    await gate;
                  }
                  return result;
                };
              },
            });
          },
        }),
    );
    const editingOrder = commandsFor(wrapped).createWithAccount({
      ...payload,
      requestId: randomUUID(),
      lignes: [
        {
          produitId: editPart.id,
          nomProduit: editPart.nomProduit,
          quantite: 2,
          prixUnitaire: 2800,
        },
      ],
    });
    editingOrder.catch(() => {});
    await locked;
    const editPool = new Pool({
      connectionString,
      application_name: 'newoteg-commercial-price-edit',
    });
    try {
      const priceEdit = editPool.query(
        'UPDATE produit SET prix_promo = 2600, version = version + 1 WHERE id = $1',
        [editPart.id],
      );
      const deadline = Date.now() + 10000;
      let waiting = false;
      while (Date.now() < deadline) {
        const rows =
          await db.$queryRaw`SELECT 1 FROM pg_stat_activity WHERE application_name = 'newoteg-commercial-price-edit' AND wait_event_type = 'Lock'`;
        if (rows.length) {
          waiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(
        waiting,
        true,
        'Price update must wait for the accepted-order transaction',
      );
      release();
      const result = await editingOrder;
      await priceEdit;
      assert.equal(Number(result.commande.lignes[0].prixUnitaire), 2800);
      assert.equal(
        (
          await commands.quote({
            lignes: [{ produitId: editPart.id, quantite: 1 }],
          })
        ).montantArticles,
        2600,
      );
      ok(
        'Concurrent price edit waits for order; the next quote sees the new price',
      );
    } finally {
      release();
      await editingOrder.catch(() => {});
      await editPool.end();
    }
    const output =
      'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/commercial';
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, 'backend-result.json'),
      JSON.stringify(
        {
          checks,
          fixture: true,
          productId: p.id,
          productCode: p.code,
          arrivalAt: receipt.validatedAt.toISOString(),
          previewKept: process.env.NEWOTEG_COMMERCIAL_PREVIEW === 'true',
        },
        null,
        2,
      ),
    );
    completed = true;
    console.log(
      JSON.stringify({
        passed: checks.length,
        database: 'dedicated local fixture',
        preview:
          process.env.NEWOTEG_COMMERCIAL_PREVIEW === 'true' ? p.id : null,
      }),
    );
  } finally {
    if (ticketIds.length)
      await db.ticketVente.updateMany({
        where: { id: { in: ticketIds } },
        data: {
          statut: 'ANNULE',
          annuleAt: new Date(),
          motifAnnulation: 'Fin de recette fictive',
        },
      });
    if (owned.length)
      await db.produit.updateMany({
        where: {
          id: {
            in: owned.filter(
              (id) =>
                !(
                  completed &&
                  process.env.NEWOTEG_COMMERCIAL_PREVIEW === 'true' &&
                  id === preview?.id
                ),
            ),
          },
        },
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
  console.error(error.message);
  process.exitCode = 1;
});
