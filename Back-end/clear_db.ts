import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database cleanup...");
  
  // High-level tables with foreign keys first
  const tables = [
    'pendingImport',
    'notification',
    'newsletter',
    'favori',
    'ligneCommande',
    'ligneVente',
    'ligneAchat',
    'mouvementStock',
    'caisse',
    'commande',
    'vente',
    'achat',
    'valeurAttribut',
    'attribut',
    'produit',
    'categorie',
    'client',
    'fournisseur',
    'role'
  ];

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table].deleteMany({});
      console.log(`- Cleared ${table}: ${count.count} rows`);
    } catch (e: any) {
      console.log(`- Skipping ${table} (or error): ${e.message}`);
    }
  }

  console.log("Database cleanup finished!");
}

main()
  .catch(e => {
    console.error("Fatal error during cleanup:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
