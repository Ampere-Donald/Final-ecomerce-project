/* Fictitious PostgreSQL recipe. No .env loading, migration, payment, external
 * service, message or HTTP call. Build and apply the additive project schema
 * to the dedicated local acceptance database before running this script. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const connectionString = process.env.NEWOTEG_PROJECT_TEST_DATABASE_URL;
if (!connectionString)
  throw Error('An explicit local fixture database URL is required.');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error(
    'Refusing a database outside the dedicated local acceptance fixture.',
  );
process.env.DATABASE_URL = connectionString;
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ProjetService } = require('../dist/src/projet/projet.service');
const pool = new Pool({ connectionString, max: 8 });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const service = new ProjetService(db);
const ok = (name) => console.log('PASS ' + name);
let checks = 0;
async function check(name, fn) {
  await fn();
  checks++;
  ok(name);
}
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
async function run() {
  const suffix = randomUUID();
  const admin = await db.adminUser.create({
    data: {
      nom: 'Administrateur fictif projets',
      username: 'project-test-' + suffix,
      role: 'ADMIN',
    },
  });
  const actor = { id: admin.id, role: admin.role };
  const category = await db.categorie.create({
    data: { nom: 'Project fixture ' + suffix },
  });
  const product = await db.produit.create({
    data: {
      categorieId: category.id,
      nomProduit: 'Pièce de projet fictive ' + suffix.slice(0, 8),
      code: 'DEMO-PRJ-' + suffix.slice(0, 8) + '-N',
      description:
        'Pièce de recette fictive, aucune utilisation électronique réelle validée.',
      prixDetail: 3000,
      prixGros: 1000,
      quantiteStock: 10,
      attributs: {
        create: {
          nomAttribut: 'Critère de démonstration',
          typeAttribut: 'TEXTE',
          valeurs: { create: { valeur: 'DEMO-N' } },
        },
      },
    },
  });
  const content = (slug = 'project-test-' + randomUUID()) => ({
    requestId: randomUUID(),
    slug,
    titre: 'Projet de recette fictif',
    resume: 'Ne pas utiliser comme un montage réel.',
    objectif: 'Tester uniquement les règles de publication.',
    prerequis: 'Base PostgreSQL dédiée de recette.',
    contraintes: 'Aucune garantie de compatibilité électronique.',
    niveau: 'DEBUTANT',
    ordre: 0,
    documents: [
      {
        titre: 'Document de recette fictif',
        url: 'https://example.com/project-demo.pdf',
      },
    ],
    lignes: [
      {
        produitId: product.id,
        referenceSouhaitee: product.code,
        role: 'Matériel fictif',
        quantite: 2,
        necessaire: true,
      },
    ],
  });
  const approval = (row) => ({
    requestId: randomUUID(),
    version: row.version,
    referencesVerifiees: true,
    materielEtQuantitesVerifies: true,
    contraintesEtDocumentsVerifies: true,
    noteValidation:
      'PRIVATE_DEMO_NOTE — validation fictive réservée aux tests.',
    verifications: row.lignes.map((line) => ({
      ligneId: line.id,
      empreinteTechnique: line.empreinteActuelle,
    })),
  });
  const before = {
    commands: await db.commande.count(),
    movements: await db.mouvementStock.count(),
    physical: product.quantiteStock,
  };
  const attempt = content();
  let draft, published;
  await check(
    'draft creation / persistent replay / no duplicate receipt',
    async () => {
      draft = (await service.create(actor, attempt)).projet;
      assert.equal(draft.statut, 'BROUILLON');
      const replay = await service.create(
        actor,
        Object.fromEntries(Object.entries(attempt).reverse()),
      );
      assert.equal(replay.projet.id, draft.id);
      assert.equal(replay.operation.rejoue, true);
      assert.equal(await db.projet.count({ where: { slug: attempt.slug } }), 1);
      assert.equal(
        await db.projetEvent.count({ where: { requestId: attempt.requestId } }),
        1,
      );
      await assert.rejects(
        service.create(actor, { ...attempt, titre: 'Changed' }),
        (e) => e.getStatus() === 409,
      );
      await assert.rejects(
        service.findPublicOne(draft.slug),
        (e) => e.getStatus() === 404,
      );
    },
  );
  await check('admin identity and active-role gate', async () => {
    await assert.rejects(
      service.create({ id: admin.id, role: 'VENDEUR' }, content()),
      (e) => e.getStatus() === 403,
    );
    await db.adminUser.update({
      where: { id: admin.id },
      data: { isActive: false },
    });
    await assert.rejects(
      service.create(actor, content()),
      (e) => e.getStatus() === 403,
    );
    await db.adminUser.update({
      where: { id: admin.id },
      data: { isActive: true },
    });
  });
  await check(
    'changed characteristics between review and publication require new approval',
    async () => {
      const oldApproval = approval(draft);
      await db.produit.update({
        where: { id: product.id },
        data: { description: product.description + ' MODIFIED' },
      });
      await assert.rejects(
        service.publish(actor, draft.id, oldApproval),
        (e) => e.getStatus() === 409,
      );
      assert.equal(
        (await service.findAdminOne(actor, draft.id)).statut,
        'BROUILLON',
      );
      assert.equal(
        await db.projetEvent.count({ where: { projetId: draft.id } }),
        1,
      );
      draft = await service.findAdminOne(actor, draft.id);
      published = (await service.publish(actor, draft.id, approval(draft)))
        .projet;
      assert.equal(published.version, 2);
    },
  );
  await check(
    'public contract excludes internal notes/actors/costs/history',
    async () => {
      const view = await service.findPublicOne(draft.slug);
      assert.equal(view.validationActuelle, true);
      assert.equal(view.materielRequisDisponible, true);
      assert.equal(view.lignes[0].montant, 6000);
      for (const key of [
        'noteValidation',
        'valideParId',
        'historique',
        'empreinteTechnique',
        'empreinteActuelle',
        'prixGros',
        'prixDemiGros',
        'cmupActuel',
        'quantiteReservee',
      ])
        assert.equal(
          JSON.stringify(view).includes('"' + key + '"'),
          false,
          key,
        );
      assert.equal(JSON.stringify(view).includes('PRIVATE_DEMO_NOTE'), false);
    },
  );
  await check(
    'available quantity deducts pending non-expired cashier tickets',
    async () => {
      const ticket = await db.ticketVente.create({
        data: {
          numeroTicket: 'PJ-' + suffix.slice(0, 12),
          vendeurId: admin.id,
          montantTotal: 27000,
          expiresAt: new Date(Date.now() + 60000),
          lignes: {
            create: {
              produitId: product.id,
              nomProduit: product.nomProduit,
              quantite: 9,
              prixUnitaire: 3000,
              sousTotal: 27000,
            },
          },
        },
      });
      const view = await service.findPublicOne(draft.slug);
      assert.equal(view.lignes[0].produit.quantiteStock, 1);
      assert.equal(view.materielRequisDisponible, false);
      assert.equal(view.validationActuelle, true);
      await db.ticketVente.update({
        where: { id: ticket.id },
        data: { expiresAt: new Date(0) },
      });
      assert.equal(
        (await service.findPublicOne(draft.slug)).materielRequisDisponible,
        true,
      );
    },
  );
  await check(
    'current price/stock changes do not imply a changed technical approval',
    async () => {
      await db.produit.update({
        where: { id: product.id },
        data: { prixDetail: 4200, quantiteStock: 0 },
      });
      const view = await service.findPublicOne(draft.slug);
      assert.equal(view.validationActuelle, true);
      assert.equal(view.materielRequisDisponible, false);
      assert.equal(view.lignes[0].montant, 8400);
      await db.produit.update({
        where: { id: product.id },
        data: { quantiteStock: 10 },
      });
    },
  );
  await check(
    'later technical change/inactivation requires revalidation without replacement',
    async () => {
      const attribute = await db.attribut.findFirst({
        where: { produitId: product.id },
        include: { valeurs: true },
      });
      await db.valeurAttribut.update({
        where: { id: attribute.valeurs[0].id },
        data: { valeur: 'DEMO-X' },
      });
      assert.equal(
        (await service.findPublicOne(draft.slug)).validationActuelle,
        false,
      );
      await db.valeurAttribut.update({
        where: { id: attribute.valeurs[0].id },
        data: { valeur: 'DEMO-N' },
      });
      await db.produit.update({
        where: { id: product.id },
        data: { estActif: false },
      });
      const view = await service.findPublicOne(draft.slug);
      assert.equal(view.lignes[0].produit, null);
      assert.equal(view.lignes[0].referenceAttendue, product.code);
      await db.produit.update({
        where: { id: product.id },
        data: { estActif: true },
      });
    },
  );
  await check(
    'edit revokes publication; old version is rejected; withdraw is audited',
    async () => {
      const edit = { ...content(draft.slug), version: published.version };
      const saved = (await service.update(actor, draft.id, edit)).projet;
      assert.equal(saved.statut, 'BROUILLON');
      assert.equal(saved.validationVersion, null);
      await assert.rejects(
        service.findPublicOne(draft.slug),
        (e) => e.getStatus() === 404,
      );
      await assert.rejects(
        service.update(actor, draft.id, { ...edit, requestId: randomUUID() }),
        (e) => e.getStatus() === 409,
      );
      const next = (await service.publish(actor, draft.id, approval(saved)))
        .projet;
      const withdrawal = {
        requestId: randomUUID(),
        version: next.version,
        motif: 'Retrait fictif de recette',
      };
      const result = await service.withdraw(actor, draft.id, withdrawal);
      assert.equal(result.projet.statut, 'BROUILLON');
      assert.equal(result.projet.lignes[0].empreinteTechnique, null);
      assert.equal(
        (await service.withdraw(actor, draft.id, withdrawal)).operation.rejoue,
        true,
      );
      await assert.rejects(
        service.findPublicOne(draft.slug),
        (e) => e.getStatus() === 404,
      );
    },
  );
  await check(
    'scheduled and expired publications never leak through public list/detail',
    async () => {
      const future = {
        ...content(),
        debutPublication: new Date(Date.now() + 86400000).toISOString(),
      };
      const scheduled = (await service.create(actor, future)).projet;
      await service.publish(actor, scheduled.id, approval(scheduled));
      await assert.rejects(
        service.findPublicOne(scheduled.slug),
        (e) => e.getStatus() === 404,
      );
      assert.equal(
        (await service.findPublic('1', '24')).data.some(
          (r) => r.id === scheduled.id,
        ),
        false,
      );
      await db.projet.update({
        where: { id: scheduled.id },
        data: { debutPublication: null, finPublication: new Date(0) },
      });
      await assert.rejects(
        service.findPublicOne(scheduled.slug),
        (e) => e.getStatus() === 404,
      );
      assert.equal(
        (await service.findPublic('1', '24')).data.some(
          (r) => r.id === scheduled.id,
        ),
        false,
      );
    },
  );
  await check(
    'a removed product preserves original reference and invalidates the required line',
    async () => {
      const disposable = await db.produit.create({
        data: {
          categorieId: category.id,
          nomProduit: 'Disposable fictitious part',
          code: 'DELETE-' + suffix.slice(0, 8),
          prixDetail: 100,
          quantiteStock: 5,
        },
      });
      const value = content();
      value.lignes[0].produitId = disposable.id;
      value.lignes[0].referenceSouhaitee = disposable.code;
      const created = (await service.create(actor, value)).projet;
      await service.publish(actor, created.id, approval(created));
      await db.produit.delete({ where: { id: disposable.id } });
      const view = await service.findPublicOne(created.slug);
      assert.equal(view.lignes[0].produit, null);
      assert.equal(view.lignes[0].referenceAttendue, disposable.code);
      assert.equal(view.materielRequisDisponible, false);
    },
  );
  await check(
    'failed audit persistence rolls back project and its material lines',
    async () => {
      const value = content();
      const failing = new ProjetService(
        wrapTransactions((tx) => ({
          ...tx,
          projetEvent: {
            ...tx.projetEvent,
            create: () => {
              throw Error('INJECTED_AUDIT_FAILURE');
            },
          },
        })),
      );
      await assert.rejects(
        failing.create(actor, value),
        /INJECTED_AUDIT_FAILURE/,
      );
      assert.equal(await db.projet.count({ where: { slug: value.slug } }), 0);
      assert.equal(
        await db.projetEvent.count({ where: { requestId: value.requestId } }),
        0,
      );
    },
  );
  await check(
    'two publication reviewers race: one version and one audit commit',
    async () => {
      const created = (await service.create(actor, content())).projet;
      let arrivals = 0,
        release;
      const barrier = new Promise((resolve) => {
        release = resolve;
      });
      const racing = new ProjetService(
        wrapTransactions((tx) => ({
          ...tx,
          projet: {
            ...tx.projet,
            findUnique: async (args) => {
              const result = await tx.projet.findUnique(args);
              if (++arrivals === 2) release();
              await barrier;
              return result;
            },
          },
        })),
      );
      const results = await Promise.allSettled([
        racing.publish(actor, created.id, approval(created)),
        racing.publish(actor, created.id, approval(created)),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(
        results.find((r) => r.status === 'rejected').reason.getStatus(),
        409,
      );
      assert.equal((await service.findAdminOne(actor, created.id)).version, 2);
      assert.equal(
        await db.projetEvent.count({
          where: { projetId: created.id, action: 'PUBLICATION' },
        }),
        1,
      );
    },
  );
  await check(
    'concurrent creation and recovery commit only one project for a requestId',
    async () => {
      const value = content();
      const results = await Promise.allSettled([
        service.create(actor, value),
        service.create(actor, value),
      ]);
      assert.ok(results.some((r) => r.status === 'fulfilled'));
      assert.equal((await service.create(actor, value)).operation.rejoue, true);
      assert.equal(await db.projet.count({ where: { slug: value.slug } }), 1);
      assert.equal(
        await db.projetEvent.count({ where: { requestId: value.requestId } }),
        1,
      );
    },
  );
  await check(
    'audit receipts prevent silent deletion and recreation of the same operation',
    async () => {
      await assert.rejects(
        db.projet.delete({ where: { id: draft.id } }),
        (e) => e.code === 'P2003',
      );
      assert.equal(
        (await service.create(actor, attempt)).operation.rejoue,
        true,
      );
    },
  );
  await check(
    'project preparation/publication did not create orders or stock movements',
    async () => {
      assert.equal(await db.commande.count(), before.commands);
      assert.equal(await db.mouvementStock.count(), before.movements);
      assert.equal(
        (await db.produit.findUnique({ where: { id: product.id } }))
          .quantiteStock,
        before.physical,
      );
    },
  );
  console.log(
    JSON.stringify({
      checks,
      fixtures: 'fictitious',
      database: target.pathname.slice(1),
      remoteCalls: 0,
    }),
  );
}
run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
