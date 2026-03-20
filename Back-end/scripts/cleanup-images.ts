import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const VALID_FILES = [
  '/uploads/arduino_uno.png',
  '/uploads/condensateur_470uf.png',
  '/uploads/dht22.png',
  '/uploads/diode_1n4007.png',
  '/uploads/esp32.png',
  '/uploads/fer_souder.png',
  '/uploads/file-1773854968131-317318496.png',
  '/uploads/file-1773855052075-179093876.jpg',
  '/uploads/irf3205.png',
  '/uploads/led_rouge.png',
  '/uploads/lm7805.png',
  '/uploads/ne555.png',
];

async function cleanupInvalidImages() {
  console.log('🔍 Recherche des produits avec une imageUrl invalide...\n');

  const produits = await prisma.produit.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, nomProduit: true, imageUrl: true },
  });

  console.log(`📦 ${produits.length} produit(s) avec une imageUrl dans la BDD.`);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  const invalid: { id: string; nom: string; imageUrl: string }[] = [];

  for (const prod of produits) {
    if (!prod.imageUrl) continue;
    const filename = path.basename(prod.imageUrl);
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      invalid.push({ id: prod.id, nom: prod.nomProduit, imageUrl: prod.imageUrl });
    }
  }

  if (invalid.length === 0) {
    console.log('\n✅ Aucune imageUrl invalide ! Tout est propre.\n');
    return;
  }

  console.log(`\n⚠️  ${invalid.length} produit(s) avec imageUrl invalide :\n`);
  invalid.forEach(p => console.log(`   ✗ [${p.id.slice(0, 8)}] ${p.nom} → ${p.imageUrl}`));

  console.log('\n🧹 Nettoyage en cours...');
  const ids = invalid.map(p => p.id);
  const result = await prisma.produit.updateMany({
    where: { id: { in: ids } },
    data: { imageUrl: null },
  });

  console.log(`\n✅ ${result.count} produit(s) nettoyés (imageUrl → NULL).`);
  console.log(`✅ ${produits.length - invalid.length} produit(s) conservés avec images valides.\n`);
}

cleanupInvalidImages()
  .catch(e => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
