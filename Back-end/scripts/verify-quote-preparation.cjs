/* Dedicated PostgreSQL integration recipe. Refuses every non-local/non-test database.
 * Build first; apply the schema and acceptance migration to a NEW isolated database.
 * NEWOTEG_ACCEPTANCE_TEST_DATABASE_URL=postgresql://quote_test@127.0.0.1:55439/newoteg_quote_acceptance_test
 * node scripts/verify-quote-acceptance.cjs
 * Creates fictitious fixtures only; does not run the HTTP server, email or external services.
 */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const connectionString = process.env.NEWOTEG_ACCEPTANCE_TEST_DATABASE_URL;
if (!connectionString)
  throw Error('An explicit isolated test database URL is required.');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
) {
  throw Error(
    'Refusing a database outside the dedicated local acceptance fixture.',
  );
}
process.env.DATABASE_URL = connectionString;
process.env.NODE_PATH = path.resolve(__dirname, '../dist');
require('node:module').Module._initPaths();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { DevisService } = require('../dist/src/devis/devis.service');
const {
  DevisAcceptService,
} = require('../dist/src/devis/devis-accept.service');
const { ProformaService } = require('../dist/src/proforma/proforma.service');
const {
  inspectTicketStock,
  assertTicketStockAvailable,
} = require('../dist/src/ticket-vente/ticket-stock.util');
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
    new (require('../dist/src/database/document-number.service').DocumentNumberService)(
      database,
    ),
  );
const acceptance = new DevisAcceptService(db);
const proformas = proformasFor(db);
const devis = new DevisService(db, proformas);
const attempt = () => ({
  requestId: randomUUID(),
  version: 2,
  conditionsAcceptees: true,
});
const ok = (name) => console.log('PASS ' + name);

async function main() {
  const suffix = randomUUID();
  const client = await db.client.create({
    data: { nom: 'Client préparation fictif' },
  });
  const seller = await db.adminUser.create({
    data: {
      nom: 'Vendeur préparation',
      username: 'prep-' + suffix,
      role: 'VENDEUR',
    },
  });
  const category = await db.categorie.create({
    data: { nom: 'Préparation ' + suffix },
  });
  const product = await db.produit.create({
    data: {
      categorieId: category.id,
      nomProduit: 'Référence préparation fictive',
      prixDetail: 2500,
      quantiteStock: 10,
    },
  });
  const request = await devis.create(client.id, {
    requestId: randomUUID(),
    telephone: '+237600000000',
    modeReception: 'RETRAIT_MAGASIN',
    lignes: [
      { reference: product.nomProduit, produitId: product.id, quantite: 3 },
    ],
  });
  const actor = { id: seller.id, role: 'VENDEUR' };
  const claimed = await devis.assign(actor, request.id, {
    version: 1,
    responsableId: seller.id,
  });
  const calls = await Promise.allSettled([
    devis.prepare(actor, request.id, { version: claimed.version }),
    devis.prepare(actor, request.id, { version: claimed.version }),
  ]);
  assert(calls.some((result) => result.status === 'fulfilled'));
  for (const result of calls)
    if (result.status === 'rejected')
      assert.equal(result.reason.status, 409, JSON.stringify(result.reason));
  const recovered = await devis.prepare(actor, request.id, {
    version: claimed.version,
  });
  assert.equal(recovered.reprise, true);
  for (const result of calls)
    if (result.status === 'fulfilled')
      assert.equal(result.value.proforma.id, recovered.proforma.id);
  const events = await db.demandeDevisEvent.findMany({
    where: { demandeId: request.id },
  });
  assert.equal(
    events.filter((e) => e.details.action === 'PROFORMA_PREPAREE').length,
    1,
  );
  assert.equal(await db.proforma.count({ where: { clientId: client.id } }), 1);
  assert.equal(recovered.proforma.clientId, client.id);
  assert.equal(Number(recovered.proforma.montantTotal), 7500);
  const current = await db.demandeDevis.findUnique({
    where: { id: request.id },
  });
  assert.equal(current.statut, 'RECUE');
  assert.equal(current.offre, null);
  assert.equal(
    (await db.produit.findUnique({ where: { id: product.id } })).quantiteStock,
    10,
  );
  ok(
    'concurrent preparation and lost-response recovery create one private proforma, one receipt and reserve no stock',
  );
  await db.proforma.delete({ where: { id: recovered.proforma.id } });
  await assert.rejects(
    devis.prepare(actor, request.id, { version: claimed.version }),
    (error) => error.status === 409,
  );
  assert.equal(await db.proforma.count({ where: { clientId: client.id } }), 0);
  ok('deleted preparation cannot be recreated silently');
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
