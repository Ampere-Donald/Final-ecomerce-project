/**
 * Script de mise à jour des prix et stocks depuis le fichier Excel XELEC
 * 
 * IMPORTANT : Ce script NE modifie PAS la categorieId des produits.
 * Il met uniquement à jour : prixGros, prixDetail, quantiteStock.
 * 
 * Mapping Excel → Prisma :
 *   nom          → Produit.nomProduit (clé de correspondance)
 *   prix_achat   → Produit.prixGros
 *   prix_vente_d → Produit.prixDetail
 *   stock        → Produit.quantiteStock
 * 
 * Usage :
 *   node update-prices-stock.js [chemin/vers/XELEC.xlsx]
 */

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function updatePricesAndStock(filePath) {
  console.log(`\n📂 Lecture du fichier: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`📊 ${rows.length} lignes trouvées dans la feuille "${sheetName}"`);

  if (rows.length === 0) {
    console.log('⚠️ Aucune donnée à traiter.');
    return;
  }

  // Afficher un exemple pour vérifier le mapping
  console.log('📝 Exemple de ligne:', JSON.stringify(rows[0], null, 2));

  // Récupérer tous les produits existants en BDD (une seule requête)
  const allProduits = await prisma.produit.findMany({
    select: { id: true, nomProduit: true, categorieId: true },
  });
  console.log(`📦 ${allProduits.length} produits en base de données.`);

  // Créer un index par nom (insensible à la casse + trim)
  const produitByName = new Map();
  for (const p of allProduits) {
    produitByName.set(p.nomProduit.trim().toLowerCase(), p);
  }

  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nom = String(row.nom || '').trim();
    const prixGros = parseFloat(row.prix_achat);
    const prixDetail = parseFloat(row.prix_vente_d);
    const stock = parseInt(row.stock);

    if (!nom) {
      skipped++;
      continue;
    }

    // Recherche par nom (insensible à la casse)
    const produit = produitByName.get(nom.toLowerCase());
    if (!produit) {
      notFound++;
      continue;
    }

    // Préparer les données de mise à jour (SANS toucher à categorieId)
    const updateData = {};
    if (!isNaN(prixGros)) updateData.prixGros = prixGros;
    if (!isNaN(prixDetail)) updateData.prixDetail = prixDetail;
    if (!isNaN(stock)) updateData.quantiteStock = stock;

    if (Object.keys(updateData).length === 0) {
      skipped++;
      continue;
    }

    try {
      await prisma.produit.update({
        where: { id: produit.id },
        data: updateData,
      });
      updated++;
    } catch (err) {
      errors++;
      console.error(`❌ Erreur pour "${nom}":`, err.message);
    }

    // Progression
    if ((i + 1) % 100 === 0) {
      console.log(`   📊 Progression: ${i + 1}/${rows.length} (${updated} mis à jour, ${notFound} non trouvés, ${skipped} ignorés, ${errors} erreurs)`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ MISE À JOUR TERMINÉE`);
  console.log(`   ✏️  Produits mis à jour:  ${updated}`);
  console.log(`   🔍 Non trouvés en BDD:   ${notFound}`);
  console.log(`   ⏭️  Ignorés (vides):      ${skipped}`);
  console.log(`   ❌ Erreurs:               ${errors}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Exécuter
const filePath = process.argv[2] || '../XELEC.xlsx';
updatePricesAndStock(filePath)
  .catch(err => {
    console.error('❌ Erreur fatale:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
