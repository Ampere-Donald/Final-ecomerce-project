/* Dedicated PostgreSQL integration recipe. Refuses every non-local/non-test database.
 * Build first; apply the schema and acceptance migration to a NEW isolated database.
 * NEWOTEG_ACCEPTANCE_TEST_DATABASE_URL=postgresql://quote_test@127.0.0.1:55439/newoteg_quote_acceptance_test
 * node scripts/verify-quote-acceptance.cjs
 * Creates fictitious fixtures only; does not run the HTTP server, email or external services.
 */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const connectionString = process.env.NEWOTEG_ACCEPTANCE_TEST_DATABASE_URL;
if (!connectionString)
  throw Error("An explicit isolated test database URL is required.");
const target = new URL(connectionString);
if (
  target.protocol !== "postgresql:" ||
  target.hostname !== "127.0.0.1" ||
  target.port !== "55439" ||
  target.pathname !== "/newoteg_quote_acceptance_test"
) {
  throw Error(
    "Refusing a database outside the dedicated local acceptance fixture.",
  );
}
process.env.DATABASE_URL = connectionString;
process.env.NODE_PATH = path.resolve(__dirname, "../dist");
require("node:module").Module._initPaths();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { DevisService } = require("../dist/src/devis/devis.service");
const {
  DevisAcceptService,
} = require("../dist/src/devis/devis-accept.service");
const { ProformaService } = require("../dist/src/proforma/proforma.service");
const {
  inspectTicketStock,
  assertTicketStockAvailable,
} = require("../dist/src/ticket-vente/ticket-stock.util");
const pool = new Pool({ connectionString, max: 12 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const events = { emit() {} };
const proformasFor = (database) =>
  new ProformaService(
    database,
    events,
    { generateNumeroTicket: async () => `T-${randomUUID().slice(0, 16)}` },
    {},
  );
const acceptance = new DevisAcceptService(db);
const proformas = proformasFor(db);
const devis = new DevisService(db, proformas);
const attempt = () => ({
  requestId: randomUUID(),
  version: 2,
  conditionsAcceptees: true,
});
const ok = (name) => console.log("PASS " + name);

async function fixture(count = 1) {
  const suffix = randomUUID();
  const [client, seller, category] = await Promise.all([
    db.client.create({ data: { nom: "Client fictif " + suffix.slice(0, 8) } }),
    db.adminUser.create({
      data: {
        nom: "Vendeur fictif",
        username: "quote-test-" + suffix,
        role: "VENDEUR",
      },
    }),
    db.categorie.create({ data: { nom: "Quote fixture " + suffix } }),
  ]);
  const products = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      db.produit.create({
        data: {
          categorieId: category.id,
          nomProduit: "Pièce fictive " + i,
          prixDetail: 3000,
          prixDemiGros: 1000,
          prixGros: 500,
          quantiteStock: 10,
        },
      }),
    ),
  );
  const quote = await db.proforma.create({
    data: {
      numero: "FP-" + suffix,
      vendeurId: seller.id,
      clientId: client.id,
      clientNom: client.nom,
      dateExpiration: new Date(Date.now() + 86400000),
      montantTotal: count * 3000,
      lignes: {
        create: products.map((p) => ({
          produitId: p.id,
          nomProduit: p.nomProduit,
          quantite: 2,
          prixUnitaire: 1500,
          sousTotal: 3000,
        })),
      },
    },
    include: { lignes: true },
  });
  const request = await devis.create(client.id, {
    requestId: randomUUID(),
    telephone: "+237600000000",
    modeReception: "RETRAIT_MAGASIN",
    lignes: products.map((p) => ({
      reference: p.nomProduit,
      produitId: p.id,
      quantite: 2,
    })),
  });
  await devis.respond({ id: seller.id, role: "VENDEUR" }, request.id, {
    version: 1,
    statut: "ENVOYEE",
    message: "Offre de recette",
    proformaId: quote.id,
    motifRemise: "Projet de démonstration",
  });
  return { client, seller, products, quote, request };
}
function wrapTransactions(decorate) {
  return {
    $transaction: (action, options) =>
      db.$transaction((tx) => action(decorate(tx)), options),
  };
}
function readBarrier(model, method) {
  let arrived = 0,
    release;
  const gate = new Promise((resolve) => (release = resolve));
  const timer = setTimeout(() => release(), 7000);
  const database = wrapTransactions(
    (tx) =>
      new Proxy(tx, {
        get(target, prop) {
          if (prop !== model) return target[prop];
          return new Proxy(target[prop], {
            get(delegate, key) {
              if (key !== method) return delegate[key];
              return async (args) => {
                const value = await delegate[key](args);
                if (arrived < 2) {
                  arrived++;
                  if (arrived === 2) {
                    clearTimeout(timer);
                    release();
                  }
                  await gate;
                }
                return value;
              };
            },
          });
        },
      }),
  );
  return {
    database,
    assertOverlap() {
      assert.equal(arrived, 2, "Both operations must reach the contested read");
      clearTimeout(timer);
    },
  };
}
async function assertClean(f) {
  assert.equal(
    await db.commande.count({ where: { clientId: f.client.id } }),
    0,
  );
  assert.equal(
    await db.mouvementStock.count({
      where: { produitId: { in: f.products.map((p) => p.id) } },
    }),
    0,
  );
  const stocks = await db.produit.findMany({
    where: { id: { in: f.products.map((p) => p.id) } },
  });
  assert(stocks.every((p) => p.quantiteStock === 10));
  assert.equal(
    (await db.proforma.findUnique({ where: { id: f.quote.id } })).statut,
    "EN_COURS",
  );
  assert.equal(
    (await db.demandeDevis.findUnique({ where: { id: f.request.id } })).statut,
    "ENVOYEE",
  );
}
(async () => {
  await db.$connect();
  // The two contenders read the same unaccepted request before either claims the proforma.
  for (const sameKey of [true, false]) {
    const f = await fixture(),
      one = attempt(),
      two = sameKey ? one : attempt();
    const barrier = readBarrier("demandeDevis", "findFirst"),
      service = new DevisAcceptService(barrier.database);
    const results = await Promise.all([
      service.accept(f.client.id, f.request.id, one),
      service.accept(f.client.id, f.request.id, two),
    ]);
    barrier.assertOverlap();
    assert.equal(results[0].commande.id, results[1].commande.id);
    assert.equal(results.filter((r) => r.replayed).length, 1);
    assert.equal(
      await db.commande.count({ where: { clientId: f.client.id } }),
      1,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: f.products[0].id } }))
        .quantiteStock,
      8,
    );
    assert.equal(
      await db.mouvementStock.count({ where: { produitId: f.products[0].id } }),
      1,
    );
    assert.equal(
      await db.demandeDevisEvent.count({
        where: { demandeId: f.request.id, statut: "ACCEPTEE" },
      }),
      1,
    );
    assert.equal(
      await db.notification.count({
        where: { message: { contains: results[0].commande.numeroSuivi } },
      }),
      1,
    );
    await db.commande.delete({ where: { id: results[0].commande.id } });
    const tombstone = await db.demandeDevis.findUnique({
      where: { id: f.request.id },
    });
    assert.equal(tombstone.commandeId, null);
    assert.equal(tombstone.numeroCommande, results[0].commande.numeroSuivi);
    await assert.rejects(
      () => service.accept(f.client.id, f.request.id, one),
      (error) => error.getStatus() === 409,
    );
    assert.equal(
      await db.commande.count({ where: { clientId: f.client.id } }),
      0,
    );
    assert.equal(
      (await db.produit.findUnique({ where: { id: f.products[0].id } }))
        .quantiteStock,
      8,
    );
    ok(
      `Concurrent acceptances (${sameKey ? "same" : "different"} UUID), one order/stock movement/audit/notification; deletion tombstone prevents recreation`,
    );
  }
  {
    const f = await fixture(2);
    let writes = 0;
    const faulty = wrapTransactions(
      (tx) =>
        new Proxy(tx, {
          get(target, prop) {
            if (prop !== "produit") return target[prop];
            return new Proxy(target.produit, {
              get(delegate, key) {
                if (key !== "updateMany") return delegate[key];
                return async (args) => {
                  if (++writes === 2) return { count: 0 };
                  return delegate.updateMany(args);
                };
              },
            });
          },
        }),
    );
    await assert.rejects(
      () =>
        new DevisAcceptService(faulty).accept(
          f.client.id,
          f.request.id,
          attempt(),
        ),
      (error) => error.getStatus() === 409,
    );
    assert.equal(writes, 2);
    await assertClean(f);
    ok(
      "Failure injected on second stock line rolls back real first decrement and proforma claim",
    );
  }
  {
    const f = await fixture();
    await db.ticketVente.create({
      data: {
        numeroTicket: "T-" + randomUUID().slice(0, 16),
        vendeurId: f.seller.id,
        clientId: f.client.id,
        montantTotal: 13500,
        expiresAt: new Date(Date.now() + 600000),
        lignes: {
          create: {
            produitId: f.products[0].id,
            nomProduit: f.products[0].nomProduit,
            quantite: 9,
            prixUnitaire: 1500,
            sousTotal: 13500,
          },
        },
      },
    });
    await assert.rejects(
      () => acceptance.accept(f.client.id, f.request.id, attempt()),
      (error) => error.getStatus() === 409,
    );
    await assertClean(f);
    ok(
      "Existing live cash-desk reservation prevents accepting more than sellable stock",
    );
  }
  {
    const f = await fixture();
    const barrier = readBarrier("proforma", "findUnique");
    const results = await Promise.allSettled([
      new DevisAcceptService(barrier.database).accept(
        f.client.id,
        f.request.id,
        attempt(),
      ),
      proformasFor(barrier.database).transformer(
        f.quote.id,
        { id: f.seller.id, role: "VENDEUR" },
        "ESPECES",
      ),
    ]);
    barrier.assertOverlap();
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert(
      results
        .filter((r) => r.status === "rejected")
        .every((r) => r.reason.getStatus() === 409),
    );
    const orders = await db.commande.count({
        where: { clientId: f.client.id },
      }),
      tickets = await db.ticketVente.count({
        where: { clientId: f.client.id },
      });
    assert.equal(orders + tickets, 1);
    assert.equal(
      (await db.produit.findUnique({ where: { id: f.products[0].id } }))
        .quantiteStock,
      orders ? 8 : 10,
    );
    ok(
      "Cash-desk transformation racing quote acceptance produces exactly one commercial document",
    );
  }
  {
    const f = await fixture();
    const barrier = readBarrier("proforma", "findUnique");
    const results = await Promise.allSettled([
      new DevisAcceptService(barrier.database).accept(
        f.client.id,
        f.request.id,
        attempt(),
      ),
      proformasFor(barrier.database).update(
        f.quote.id,
        { id: f.seller.id, role: "VENDEUR" },
        {
          lignes: [
            { produitId: f.products[0].id, quantite: 2, prixUnitaire: 2000 },
          ],
        },
      ),
    ]);
    barrier.assertOverlap();
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const orders = await db.commande.findMany({
      where: { clientId: f.client.id },
      include: { lignes: true },
    });
    if (orders.length) {
      assert.equal(Number(orders[0].montantTotal), 3000);
      assert.equal(Number(orders[0].lignes[0].prixUnitaire), 1500);
    } else {
      assert.equal(
        Number(
          (await db.proforma.findUnique({ where: { id: f.quote.id } }))
            .montantTotal,
        ),
        4000,
      );
    }
    ok("Concurrent proforma edit never mixes old consent with new prices");
  }
  {
    const f = await fixture(2);
    await db.produit.updateMany({
      where: { id: { in: f.products.map((p) => p.id) } },
      data: { quantiteStock: 2 },
    });
    const secondQuote = await db.proforma.create({
      data: {
        numero: "FP-" + randomUUID(),
        vendeurId: f.seller.id,
        clientId: f.client.id,
        dateExpiration: new Date(Date.now() + 86400000),
        montantTotal: 6000,
        lignes: {
          create: f.quote.lignes
            .slice()
            .reverse()
            .map(
              ({
                produitId,
                nomProduit,
                quantite,
                prixUnitaire,
                sousTotal,
              }) => ({
                produitId,
                nomProduit,
                quantite,
                prixUnitaire,
                sousTotal,
              }),
            ),
        },
      },
    });
    const secondRequest = await devis.create(f.client.id, {
      requestId: randomUUID(),
      telephone: "+237600000000",
      modeReception: "RETRAIT_MAGASIN",
      lignes: f.products
        .slice()
        .reverse()
        .map((p) => ({
          reference: p.nomProduit,
          produitId: p.id,
          quantite: 2,
        })),
    });
    await devis.respond(
      { id: f.seller.id, role: "VENDEUR" },
      secondRequest.id,
      {
        version: 1,
        statut: "ENVOYEE",
        proformaId: secondQuote.id,
        message: "Autre projet fictif",
        motifRemise: "Recette",
      },
    );
    const barrier = readBarrier("proforma", "findUnique"),
      service = new DevisAcceptService(barrier.database);
    const results = await Promise.allSettled([
      service.accept(f.client.id, f.request.id, attempt()),
      service.accept(f.client.id, secondRequest.id, attempt()),
    ]);
    barrier.assertOverlap();
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      await db.commande.count({ where: { clientId: f.client.id } }),
      1,
    );
    const products = await db.produit.findMany({
      where: { id: { in: f.products.map((p) => p.id) } },
    });
    assert(products.every((p) => p.quantiteStock === 0));
    assert.equal(
      await db.mouvementStock.count({
        where: { produitId: { in: f.products.map((p) => p.id) } },
      }),
      2,
    );
    ok(
      "Two distinct quotes with reversed line order cannot oversell the last units or deadlock",
    );
  }
  {
    const f = await fixture();
    await db.produit.update({
      where: { id: f.products[0].id },
      data: { quantiteStock: 2 },
    });
    const ticket = db.$transaction(
      async (tx) => {
        assertTicketStockAvailable(
          await inspectTicketStock(tx, f.quote.lignes, { lock: true }),
        );
        return tx.ticketVente.create({
          data: {
            numeroTicket: "T-" + randomUUID().slice(0, 16),
            vendeurId: f.seller.id,
            clientId: f.client.id,
            montantTotal: 3000,
            expiresAt: new Date(Date.now() + 600000),
            lignes: {
              create: f.quote.lignes.map(
                ({
                  produitId,
                  nomProduit,
                  quantite,
                  prixUnitaire,
                  sousTotal,
                }) => ({
                  produitId,
                  nomProduit,
                  quantite,
                  prixUnitaire,
                  sousTotal,
                }),
              ),
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
    const results = await Promise.allSettled([
      acceptance.accept(f.client.id, f.request.id, attempt()),
      ticket,
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const orders = await db.commande.count({
        where: { clientId: f.client.id },
      }),
      tickets = await db.ticketVente.count({
        where: { clientId: f.client.id },
      });
    assert.equal(orders + tickets, 1);
    assert.equal(
      (await db.produit.findUnique({ where: { id: f.products[0].id } }))
        .quantiteStock,
      orders ? 0 : 2,
    );
    ok(
      "New cash-desk reservation racing acceptance cannot promise the same last units twice",
    );
  }
  {
    const f = await fixture();
    await db.produit.update({
      where: { id: f.products[0].id },
      data: { prixDetail: 9000 },
    });
    const result = await acceptance.accept(
      f.client.id,
      f.request.id,
      attempt(),
    );
    assert.equal(result.commande.montantTotal, 3000);
    const lines = await db.ligneCommande.findMany({
      where: { commandeId: result.commande.id },
    });
    assert.equal(Number(lines[0].prixUnitaire), 1500);
    const view = await devis.findMineOne(f.client.id, f.request.id);
    assert.equal(view.commande.id, result.commande.id);
    assert.equal(view.acceptedVersion, 2);
    assert(
      !/autorisationPrix|acceptRequestId|cmup|fingerprint/.test(
        JSON.stringify(view),
      ),
    );
    await assert.rejects(
      () => devis.findMineOne(randomUUID(), f.request.id),
      (error) => error.getStatus() === 404,
    );
    ok(
      "Negotiated price survives catalogue change; private accepted view hides audit and attempt identity",
    );
  }
  {
    const f = await fixture();
    await db.produit.update({
      where: { id: f.products[0].id },
      data: { prixDemiGros: 2000 },
    });
    await assert.rejects(
      () =>
        devis.respond({ id: f.seller.id, role: "VENDEUR" }, f.request.id, {
          version: 2,
          statut: "ENVOYEE",
          proformaId: f.quote.id,
          message: "Test",
          motifRemise: "Test",
        }),
      (error) => error.getStatus() === 403,
    );
    await db.produit.update({
      where: { id: f.products[0].id },
      data: { prixDemiGros: 1000 },
    });
    await assert.rejects(
      () =>
        devis.respond({ id: f.seller.id, role: "VENDEUR" }, f.request.id, {
          version: 2,
          statut: "ENVOYEE",
          proformaId: f.quote.id,
          message: "Test",
        }),
      (error) => error.getStatus() === 400,
    );
    assert.equal(
      (await db.demandeDevis.findUnique({ where: { id: f.request.id } }))
        .version,
      2,
    );
    ok(
      "Sending a commercial offer enforces current seller price bounds and a private discount reason",
    );
  }
  assert.equal(await db.caisse.count(), 0);
  assert.equal(await db.vente.count(), 0);
  assert.equal(await db.facture.count(), 0);
  ok("No payment, sale, cash ledger or invoice created by acceptance");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
