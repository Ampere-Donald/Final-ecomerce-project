// Opt-in fictitious preview data. Refuses any database outside the local acceptance cluster.
const connectionString = process.env.NEWOTEG_ACCEPTANCE_TEST_DATABASE_URL;
if (!connectionString) throw Error('Explicit local test database required.');
const target = new URL(connectionString);
if (
  target.protocol !== 'postgresql:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55439' ||
  target.pathname !== '/newoteg_quote_acceptance_test'
)
  throw Error('Refusing a database outside the isolated acceptance cluster.');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const categoryId = '19f0fdc7-80b6-49df-98c2-b161c18557d0';
const fixtures = [
  ['19f0fdc7-80b6-49df-98c2-b161c18557d1', 'A', '5 m', 3500],
  ['19f0fdc7-80b6-49df-98c2-b161c18557d2', 'B', '2 m', 2500],
  ['19f0fdc7-80b6-49df-98c2-b161c18557d3', 'C', '5 m', 4200],
];
(async () => {
  try {
    await db.$transaction(async (tx) => {
      const category = await tx.categorie.findUnique({
        where: { id: categoryId },
      });
      if (category && category.nom !== 'Démonstration du comparateur')
        throw Error('Fixture category identity conflict.');
      if (!category)
        await tx.categorie.create({
          data: {
            id: categoryId,
            nom: 'Démonstration du comparateur',
            description: 'Données fictives pour la recette locale uniquement.',
          },
        });
      for (const [id, suffix, length, price] of fixtures) {
        const existing = await tx.produit.findUnique({ where: { id } });
        if (existing) {
          if (
            existing.categorieId !== categoryId ||
            existing.code !== 'DEMO-CMP-' + suffix
          )
            throw Error('Fixture product identity conflict.');
          continue;
        }
        const characteristics = [
          ['Longueur', length],
          ['Connecteur', 'HDMI mâle / mâle'],
          ['Broches', '19'],
        ];
        if (suffix === 'A') characteristics.push(['Blindage', 'Double']);
        await tx.produit.create({
          data: {
            id,
            categorieId: categoryId,
            codeFamille: 'DEMO-CMP',
            code: 'DEMO-CMP-' + suffix,
            nomProduit: 'Câble de démonstration ' + suffix,
            designationEn: 'Demonstration cable ' + suffix,
            marque: 'Recette fictive',
            description:
              'Référence fictive pour tester le comparateur. Prix, stock et caractéristiques de démonstration ; aucun produit boutique correspondant.',
            estActif: true,
            prixDetail: price,
            quantiteStock: 12,
            imageUrl: 'http://127.0.0.1:5187/design-e/hdmi-5m.webp',
            attributs: {
              create: characteristics.map(([nomAttribut, valeur]) => ({
                nomAttribut,
                typeAttribut: 'TEXTE',
                valeurs: { create: [{ valeur }] },
              })),
            },
          },
        });
      }
    });
    console.log(
      'Fictitious comparison preview ready; existing prices and stocks preserved.',
    );
    console.log('http://127.0.0.1:5187/catalogue?category=' + categoryId);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
