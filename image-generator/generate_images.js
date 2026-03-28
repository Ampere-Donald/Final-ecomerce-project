require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const Replicate = require("replicate");
const axios = require("axios");
const sharp = require("sharp");
const config = require("./config.js");
const { getVisualDescription } = require("./product_dictionary.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function downloadImage(url, destPath) {
  const response = await axios({ url, method: "GET", responseType: "arraybuffer" });
  fs.writeFileSync(destPath, Buffer.from(response.data));
}

/**
 * Crée image2 (zoom centre) et image3 (crop décalé + léger flip)
 * à partir de image1, sans appel API supplémentaire.
 */
async function createVariations(image1Path, image2Path, image3Path) {
  const img = sharp(image1Path);
  const metadata = await img.metadata();
  const w = metadata.width;
  const h = metadata.height;

  // image2 : zoom centre (crop 20% de chaque côté, puis resize à la taille originale)
  const cropMargin = Math.floor(Math.min(w, h) * 0.15);
  await sharp(image1Path)
    .extract({
      left: cropMargin,
      top: cropMargin,
      width: w - cropMargin * 2,
      height: h - cropMargin * 2,
    })
    .resize(w, h)
    .webp({ quality: 80 })
    .toFile(image2Path);

  // image3 : crop décalé vers le haut-gauche + flip horizontal (simule un autre angle)
  const offsetX = Math.floor(w * 0.08);
  const offsetY = Math.floor(h * 0.05);
  await sharp(image1Path)
    .extract({
      left: offsetX,
      top: offsetY,
      width: w - offsetX * 2,
      height: h - offsetY * 2,
    })
    .resize(w, h)
    .flop() // miroir horizontal = simule un autre angle de vue
    .webp({ quality: 80 })
    .toFile(image3Path);
}

async function processCategoryCSV(csvPath, maxItems = 0) {
  const categoryName = path.basename(path.dirname(csvPath));
  console.log(`\n========================================`);
  console.log(`  Categorie : ${categoryName}`);
  console.log(`========================================`);

  const products = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv({ separator: "," }))
      .on("data", (data) => products.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  console.log(`${products.length} articles trouves.`);
  const limit = maxItems > 0 ? Math.min(maxItems, products.length) : products.length;
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < limit; i++) {
    const rawP = products[i];
    const p = {};
    for (const key in rawP) p[key.trim().replace(/^\uFEFF/, "")] = rawP[key];

    const productName = p.nomProduit || "Produit Inconnu";
    const safeName = productName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

    // Noms des 3 images
    const img1Name = p.image1 || `img1_${safeName}.webp`;
    const img2Name = p.image2 || `img2_${safeName}.webp`;
    const img3Name = p.image3 || `img3_${safeName}.webp`;

    const dir = path.dirname(csvPath);
    const img1Path = path.join(dir, img1Name);
    const img2Path = path.join(dir, img2Name);
    const img3Path = path.join(dir, img3Name);

    // Si image1 existe deja, on skip tout
    if (fs.existsSync(img1Path)) {
      skipped++;
      continue;
    }

    console.log(`\n  [${i + 1}/${limit}] "${productName}"`);

    // === ETAPE 1 : Generer image1 via Flux API ===
    const visualDesc = getVisualDescription(productName, categoryName);
    const prompt = `Ultra-realistic e-commerce product photography, photorealistic, 8k, shot on DSLR, studio lighting, pure white background. ${visualDesc}. The product is labeled "${productName}".`;

    try {
      const output = await replicate.run(config.MODEL, {
        input: { prompt: prompt, ...config.GENERATION_PARAMS },
      });

      const imageUrl = output[0];
      if (imageUrl) {
        await downloadImage(imageUrl, img1Path);
        console.log(`    img1 OK`);

        // === ETAPE 2 : Creer image2 (zoom) et image3 (angle) gratuitement ===
        await createVariations(img1Path, img2Path, img3Path);
        console.log(`    img2 OK (zoom)`);
        console.log(`    img3 OK (angle)`);

        generated++;
      } else {
        console.error("    ERREUR: pas d'image renvoyee");
      }
    } catch (err) {
      console.error("    ERREUR API:", err.message);
    }

    // Budget > 5$ => Plus de limitation stricte de Replicate
    // On met juste une micro-pause de sécurité de 0.5s
    await sleep(500);
  }

  console.log(`\n--- ${categoryName} termine ---`);
  console.log(`  Generes: ${generated} | Ignores: ${skipped} | Total: ${limit}`);
  return { generated, skipped };
}

async function main() {
  if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN.startsWith("r8_***")) {
    console.error("ERREUR: REPLICATE_API_TOKEN non configure dans .env");
    process.exit(1);
  }

  const args = process.argv.slice(2);

  // Mode "ALL" : toutes les categories
  if (args[0] === "ALL") {
    const categories = [
      "Loupe_and_Optique",       // 4 articles
      "Sans_categorie",          // 15 articles  
      "Ventilateurs",            // 30 articles
      "Mesure_and_Test",         // 42 articles
      "Informatique_and_Reseaux",// 65 articles
      "Piles_and_Batteries",     // 69 articles
      "Satellite_and_TV",        // 75 articles
      "Accessoires_electriques", // 79 articles
      "Chargeurs_and_Power_Banks",// 80 articles
      "Telecommandes",           // 144 articles
      "Outillage",               // 192 articles
      "Alimentation_and_Energie",// 292 articles
      "Cables_and_Connectique",  // 343 articles
      "Divers",                  // 553 articles
      "Audio_and_Son",           // 1379 articles
      "Composants_Electroniques",// 2913 articles
    ];

    let totalGen = 0;
    let totalSkip = 0;

    for (const cat of categories) {
      const csvPath = path.join(__dirname, `../_analysis/catalog_par_dossiers/${cat}/${cat}.csv`);
      if (fs.existsSync(csvPath)) {
        const result = await processCategoryCSV(csvPath, 0);
        totalGen += result.generated;
        totalSkip += result.skipped;
      } else {
        console.error(`CSV introuvable: ${cat}`);
      }
    }

    console.log(`\n============================`);
    console.log(`  TERMINE !`);
    console.log(`  Total generes: ${totalGen}`);
    console.log(`  Total ignores: ${totalSkip}`);
    console.log(`  Cout estime: ~$${(totalGen * 0.003).toFixed(2)}`);
    console.log(`============================`);
    return;
  }

  // Mode categorie unique
  if (args.length === 0) {
    console.log("Usage:");
    console.log("  node generate_images.js ALL              (toutes les categories)");
    console.log("  node generate_images.js <Categorie>      (une categorie)");
    console.log("  node generate_images.js <Categorie> 10   (limite a 10 articles)");
    process.exit(1);
  }

  const targetCategory = args[0];
  const limit = args[1] ? parseInt(args[1], 10) : 0;

  const csvPath = path.join(__dirname, `../_analysis/catalog_par_dossiers/${targetCategory}/${targetCategory}.csv`);
  if (fs.existsSync(csvPath)) {
    await processCategoryCSV(csvPath, limit);
  } else {
    console.error(`CSV introuvable: ${targetCategory}`);
  }
}

main();
