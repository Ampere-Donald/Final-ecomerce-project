/**
 * build-import-zips.js
 * Génère un ZIP par catégorie prêt à importer via l'admin.
 * Chaque ZIP contient un CSV filtré (produits avec images seulement) + les images.
 * Les catégories > 150 MB sont découpées en 2 parties.
 */

const fs   = require('fs');
const path = require('path');
const csv  = require('csv-parser');
const { execSync } = require('child_process');

const BASE_DIR   = path.join(__dirname, '../_analysis/catalog_par_dossiers');
const OUTPUT_DIR = path.join(__dirname, '../import-zips');
const MAX_MB     = 75;

const CATEGORIES = [
  'Loupe_and_Optique',
  'Sans_categorie',
  'Ventilateurs',
  'Mesure_and_Test',
  'Informatique_and_Reseaux',
  'Piles_and_Batteries',
  'Satellite_and_TV',
  'Accessoires_electriques',
  'Chargeurs_and_Power_Banks',
  'Telecommandes',
  'Outillage',
  'Alimentation_and_Energie',
  'Cables_and_Connectique',
  'Divers',
  'Audio_and_Son',
  'Composants_Electroniques',
];

// ── helpers ──────────────────────────────────────────────────────────────────

function readCsvRows(csvPath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(csvPath)
      .pipe(csv({ separator: ',', mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '') }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function csvEscape(val) {
  const s = String(val ?? '');
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(headers, rows, destPath) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h] ?? '')).join(','));
  }
  fs.writeFileSync(destPath, lines.join('\n'), 'utf8');
}

function buildZip(zipPath, files) {
  const listFile = zipPath + '.lst';
  fs.writeFileSync(listFile, files.join('\n'), 'utf8');
  execSync(`zip -j "${zipPath}" -@ < "${listFile}"`, { stdio: 'pipe' });
  fs.unlinkSync(listFile);
  return fs.statSync(zipPath).size / (1024 * 1024);
}

async function processCategory(catName, rows, catDir, suffix = '') {
  const label   = catName + (suffix ? `_${suffix}` : '');
  const csvDest = path.join(OUTPUT_DIR, `${label}.csv`);
  const zipDest = path.join(OUTPUT_DIR, `${label}.zip`);

  const headers = rows.length ? Object.keys(rows[0]) : [];
  writeCsv(headers, rows, csvDest);

  // Collect image files that actually exist on disk
  const imageFiles = [];
  for (const row of rows) {
    for (const col of ['image1', 'image2', 'image3']) {
      const name = (row[col] || '').trim();
      if (!name) continue;
      const p = path.join(catDir, name);
      if (fs.existsSync(p)) imageFiles.push(p);
    }
  }

  const sizeMB = buildZip(zipDest, [csvDest, ...imageFiles]);
  fs.unlinkSync(csvDest); // CSV is inside the ZIP now

  console.log(`  ✅ ${label}.zip  — ${rows.length} produits, ${imageFiles.length} images, ${sizeMB.toFixed(1)} MB`);
  return sizeMB;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalZips = 0;
  let totalProducts = 0;
  let totalImages = 0;

  for (const catName of CATEGORIES) {
    const catDir  = path.join(BASE_DIR, catName);
    const csvPath = path.join(catDir, `${catName}.csv`);

    if (!fs.existsSync(csvPath)) {
      console.log(`\n[${catName}] ⚠️  CSV introuvable, ignoré.`);
      continue;
    }

    console.log(`\n[${catName}]`);
    const allRows = await readCsvRows(csvPath);

    // Keep only products whose img1 file exists
    const withImages = allRows.filter(row => {
      const img1 = (row['image1'] || '').trim();
      return img1 && fs.existsSync(path.join(catDir, img1));
    });

    const noImg = allRows.length - withImages.length;
    console.log(`  ${withImages.length}/${allRows.length} avec images  (${noImg} sans image ignorés)`);

    if (withImages.length === 0) {
      console.log('  → rien à exporter.');
      continue;
    }

    // Estimate folder size (du -sm) to decide if split needed
    const duOut   = execSync(`du -sm "${catDir}"`, { encoding: 'utf8' });
    const folderMB = parseFloat(duOut.split('\t')[0]);

    if (folderMB > MAX_MB) {
      const half  = Math.ceil(withImages.length / 2);
      await processCategory(catName, withImages.slice(0, half),  catDir, 'part1');
      await processCategory(catName, withImages.slice(half),      catDir, 'part2');
      totalZips += 2;
    } else {
      await processCategory(catName, withImages, catDir);
      totalZips += 1;
    }

    totalProducts += withImages.length;

    // Count image files contributed
    for (const row of withImages) {
      for (const col of ['image1', 'image2', 'image3']) {
        const name = (row[col] || '').trim();
        if (name && fs.existsSync(path.join(catDir, name))) totalImages++;
      }
    }
  }

  console.log('\n════════════════════════════════════');
  console.log(`  ZIPs générés  : ${totalZips}`);
  console.log(`  Produits      : ${totalProducts}`);
  console.log(`  Images totales: ${totalImages}`);
  console.log(`  Dossier       : ${OUTPUT_DIR}`);
  console.log('════════════════════════════════════');
}

main().catch(err => { console.error(err); process.exit(1); });
