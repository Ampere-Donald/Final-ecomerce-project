/**
 * Script d'import des articles XELEC dans la base de données NEWOTEG
 * 
 * Mapping XELEC → Prisma :
 *   code_famille → Catégorie (nom)
 *   nom/ref      → Produit (nomProduit)
 *   code         → VarianteProduit (codeVariante)
 *   prix_achat   → VarianteProduit (prixAchat)
 *   prix_vente_d → VarianteProduit (prixVente = prix vente détail)
 *   stock        → VarianteProduit (quantiteStock)
 *   alerte_stock → VarianteProduit (seuilAlerte)
 */

const XLSX = require('xlsx');
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

async function importXelec(filePath) {
  console.log(`\n📂 Lecture du fichier: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  
  console.log(`📊 ${rows.length} lignes trouvées dans la feuille "${sheetName}"`);
  
  if (rows.length === 0) {
    console.log('⚠️ Aucune donnée à importer.');
    return;
  }

  // Log sample row to verify column mapping
  console.log('📝 Exemple de ligne:', JSON.stringify(rows[0], null, 2));

  // Phase 1: Créer les catégories uniques (basées sur code_famille)
  const familleSet = new Map();
  for (const row of rows) {
    const codeFamille = String(row.code_famille || '').trim();
    if (codeFamille && !familleSet.has(codeFamille)) {
      familleSet.set(codeFamille, codeFamille);
    }
  }

  console.log(`\n🏷️  Phase 1: Création de ${familleSet.size} catégories...`);
  const categorieMap = new Map(); // codeFamille → categorieId

  for (const [codeFamille] of familleSet) {
    try {
      const res = await api.post('/categories', {
        nom: `XELEC-${codeFamille}`,
        description: `Famille XELEC code ${codeFamille}`
      });
      categorieMap.set(codeFamille, res.data.id);
      process.stdout.write('.');
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        // Catégorie déjà existante - essayer de la récupérer
        try {
          const existing = await api.get('/categories');
          const found = existing.data.find(c => c.nom === `XELEC-${codeFamille}`);
          if (found) {
            categorieMap.set(codeFamille, found.id);
            process.stdout.write('s');
          }
        } catch (e) {
          process.stdout.write('E');
        }
      } else {
        process.stdout.write('E');
        console.error(`\n❌ Erreur catégorie ${codeFamille}:`, err.response?.data || err.message);
      }
    }
  }
  console.log(`\n✅ ${categorieMap.size} catégories créées/trouvées.`);

  // Phase 2: Créer des produits et variantes
  console.log(`\n📦 Phase 2: Importation des produits et variantes...`);
  
  let importedProducts = 0;
  let importedVariantes = 0;
  let skipped = 0;
  let errors = 0;
  const produitMap = new Map(); // nom → produitId

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const codeFamille = String(row.code_famille || '').trim();
    const code = String(row.code || '').trim();
    const nom = String(row.nom || '').trim();
    const ref = String(row.ref || '').trim();
    const stock = parseInt(row.stock) || 0;
    const prixAchat = parseFloat(row.prix_achat) || 0;
    const prixVenteDetail = parseFloat(row.prix_vente_d) || 0;
    const alerteStock = parseInt(row.alerte_stock) || 5;

    if (!nom || !code) {
      skipped++;
      continue;
    }

    const categorieId = categorieMap.get(codeFamille);
    if (!categorieId) {
      skipped++;
      continue;
    }

    // Créer le produit si pas encore fait
    const produitKey = `${codeFamille}-${nom}`;
    let produitId = produitMap.get(produitKey);

    if (!produitId) {
      try {
        const prodRes = await api.post('/produits', {
          nomProduit: nom,
          marque: 'XELEC',
          categorieId: categorieId,
          description: ref !== nom ? `Ref: ${ref}` : null
        });
        produitId = prodRes.data.id;
        produitMap.set(produitKey, produitId);
        importedProducts++;
      } catch (err) {
        // Produit peut déjà exister (contrainte unique marque+nomProduit)
        if (err.response?.status === 409 || err.response?.status === 400 || err.response?.status === 500) {
          // Skip si le produit existe déjà - on va juste créer la variante
          // Chercher le produit existant
          try {
            const allProduits = await api.get('/produits');
            const found = allProduits.data.find(p => p.nomProduit === nom && p.marque === 'XELEC');
            if (found) {
              produitId = found.id;
              produitMap.set(produitKey, produitId);
            }
          } catch (e) {
            errors++;
            continue;
          }
        } else {
          errors++;
          continue;
        }
      }
    }

    if (!produitId) {
      errors++;
      continue;
    }

    // Créer la variante
    try {
      await api.post('/variantes-produit', {
        produitId: produitId,
        codeVariante: code,
        codeBarre: null,
        prixAchat: prixAchat,
        prixVente: prixVenteDetail,
        quantiteStock: stock,
        seuilAlerte: alerteStock,
      });
      importedVariantes++;
    } catch (err) {
      if (err.response?.status === 409 || err.response?.status === 400) {
        skipped++;
      } else {
        errors++;
      }
    }

    // Progress
    if ((i + 1) % 100 === 0) {
      console.log(`   📊 Progression: ${i + 1}/${rows.length} (${importedProducts} produits, ${importedVariantes} variantes, ${skipped} ignorés, ${errors} erreurs)`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ IMPORT TERMINÉ`);
  console.log(`   📦 Produits créés:   ${importedProducts}`);
  console.log(`   🔢 Variantes créées: ${importedVariantes}`);
  console.log(`   ⏭️  Ignorés:          ${skipped}`);
  console.log(`   ❌ Erreurs:           ${errors}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Exécuter l'import
const filePath = process.argv[2] || 'XELEC.xlsx';
importXelec(filePath).catch(err => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
