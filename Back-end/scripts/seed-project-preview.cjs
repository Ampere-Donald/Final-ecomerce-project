// Opt-in fictitious preview. Never loads .env and refuses any other database.
const connectionString = process.env.NEWOTEG_PROJECT_TEST_DATABASE_URL;
if (!connectionString)
  throw Error('Explicit local fixture database URL required.');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error('Refusing a database outside the isolated acceptance cluster.');
process.env.DATABASE_URL = connectionString;
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
const { ProjetService } = require('../dist/src/projet/projet.service');
const pool = new Pool({ connectionString });
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { maxWait: 10000, timeout: 20000 },
});
const service = new ProjetService(db);
const slug = 'demonstration-liste-materiel';
const title = 'Démonstration — composer une liste de matériel';
const ids = [
  '19f0fdc7-80b6-49df-98c2-b161c18557d1',
  '19f0fdc7-80b6-49df-98c2-b161c18557d2',
  '19f0fdc7-80b6-49df-98c2-b161c18557d3',
];
let admin,
  ownedAdmin = false;
(async () => {
  try {
    const products = await db.produit.findMany({ where: { id: { in: ids } } });
    if (
      products.length !== 3 ||
      products.some(
        (p) =>
          p.categorieId !== '19f0fdc7-80b6-49df-98c2-b161c18557d0' ||
          !p.code.startsWith('DEMO-CMP-'),
      )
    )
      throw Error(
        'Initialize the guarded fictitious comparator products first.',
      );
    admin = await db.adminUser.findUnique({
      where: { username: 'fixture_project_preview' },
    });
    if (
      admin &&
      (admin.nom !== 'Recette fictive — aperçu projet' ||
        admin.role !== 'ADMIN')
    )
      throw Error('Fixture administrator identity conflict.');
    ownedAdmin = true;
    admin = admin
      ? await db.adminUser.update({
          where: { id: admin.id },
          data: { isActive: true },
        })
      : await db.adminUser.create({
          data: {
            nom: 'Recette fictive — aperçu projet',
            username: 'fixture_project_preview',
            role: 'ADMIN',
          },
        });
    const actor = { id: admin.id, role: admin.role };
    const existing = await db.projet.findUnique({ where: { slug } });
    if (existing && existing.titre !== title)
      throw Error('Fixture project identity conflict.');
    let row;
    if (!existing)
      row = (
        await service.create(actor, {
          requestId: randomUUID(),
          slug,
          titre: title,
          titreEn: 'Demonstration — assemble a material list',
          resume:
            'Projet fictif de recette locale : sélection, quantités, accessoires et panier.',
          resumeEn:
            'Fictitious local test project: selection, quantities, accessories and cart.',
          objectif:
            'Démontrer le parcours client. Cette liste ne décrit pas un montage électronique réel et ne valide aucune compatibilité.',
          prerequis:
            'Données de démonstration uniquement. Pour un vrai projet, NEWOTEG doit relire la documentation et les références.',
          contraintes:
            'Les prix et stocks sont fictifs. Les connecteurs et longueurs ne sont pas des preuves de compatibilité. Ne pas utiliser comme un kit réel.',
          niveau: 'DEBUTANT',
          imageUrl: '/design-e/hdmi-5m.webp',
          ordre: 0,
          documents: [
            {
              titre: 'Document fictif — non destiné à un montage',
              url: 'https://example.com/project-preview.pdf',
            },
          ],
          lignes: ids.map((id, i) => ({
            produitId: id,
            referenceSouhaitee: products.find((p) => p.id === id).code,
            role: [
              'Liaison fictive principale',
              'Liaison fictive secondaire',
              'Accessoire facultatif de recette',
            ][i],
            quantite: i === 0 ? 2 : 1,
            necessaire: i < 2,
          })),
        })
      ).projet;
    else row = await service.findAdminOne(actor, existing.id);
    if (row.statut !== 'PUBLIE') {
      row = (
        await service.publish(actor, row.id, {
          requestId: randomUUID(),
          version: row.version,
          referencesVerifiees: true,
          materielEtQuantitesVerifies: true,
          contraintesEtDocumentsVerifies: true,
          noteValidation:
            'Recette fictive uniquement : validation du parcours logiciel, aucune compatibilité électronique réelle approuvée.',
          verifications: row.lignes.map((l) => ({
            ligneId: l.id,
            empreinteTechnique: l.empreinteActuelle,
          })),
        })
      ).projet;
    }
    const publicRow = await service.findPublicOne(slug);
    if (!publicRow.validationActuelle)
      throw Error(
        'Preview technical signature changed; explicit fixture review required.',
      );
    console.log(
      'Fictitious local project preview ready; product prices and stocks preserved.',
    );
    console.log('http://127.0.0.1:5187/projets/' + slug);
  } finally {
    if (ownedAdmin && admin)
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
