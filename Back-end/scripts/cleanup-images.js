/**
 * Script de nettoyage des imageUrl invalides
 * 
 * Ce script vérifie chaque produit dans la BDD dont imageUrl est défini,
 * vérifie si le fichier existe réellement dans le dossier /uploads,
 * et remet imageUrl à NULL pour ceux dont le fichier est manquant.
 * 
 * Usage: node scripts/cleanup-images.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function cleanupInvalidImages() {
  console.log('🔍 Recherche des produits avec imageUrl...');
  
  const produits = await prisma.produit.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, nomProduit: true, imageUrl: true },
  });

  console.log(`📦 ${produits.length} produits avec une imageUrl trouvés.\n`);

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  let cleaned = 0;
  let valid = 0;
  const invalidProducts = [];

  for (const prod of produits) {
    // imageUrl est comme "/uploads/photo.png" → on vérifie si le fichier existe
    const filename = path.basename(prod.imageUrl);
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      invalidProducts.push({ id: prod.id, nom: prod.nomProduit, imageUrl: prod.imageUrl });
    } else {
      valid++;
    }
  }

  if (invalidProducts.length === 0) {
    console.log('✅ Aucune imageUrl invalide trouvée. Tout est propre !');
    return;
  }

  console.log(`⚠️  ${invalidProducts.length} produit(s) avec une imageUrl invalide :\n`);
  invalidProducts.forEach(p => {
    console.log(`   - [${p.id.slice(0,8)}] ${p.nom} → ${p.imageUrl}`);
  });

  console.log('\n🧹 Nettoyage en cours...');
  
  const ids = invalidProducts.map(p => p.id);
  const result = await prisma.produit.updateMany({
    where: { id: { in: ids } },
    data: { imageUrl: null },
  });

  console.log(`\n✅ ${result.count} imageUrl remis à NULL.`);
  console.log(`✅ ${valid} produits avec des images valides conservés.\n`);
  console.log('Opération terminée ! Rechargez l\'interface Admin pour voir les changements.');
}

cleanupInvalidImages()
  .catch(e => {
    console.error('❌ Erreur :', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
