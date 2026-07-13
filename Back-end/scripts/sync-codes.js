/**
 * Script one-shot : associe code_famille + code aux produits de la DB
 * à partir du fichier XELEC.xlsx (matching par nom, insensible à la casse).
 *
 * Usage : node scripts/sync-codes.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const readXlsxFile = require('read-excel-file/node');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const XLSX_PATH = path.join(__dirname, '../../docs/XELEC.xlsx');
const normalize = (s) => String(s ?? '').trim().toLowerCase();

async function main() {
  // ── Lecture du fichier xlsx ───────────────────────────────────────────────
  const table = await readXlsxFile(XLSX_PATH);
  const headers = (table.shift() || []).map((value) => String(value ?? '').trim());
  const rows = table
    .filter((row) => row.some((value) => value !== null && value !== ''))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));

  console.log(`\n📂 Fichier : ${rows.length} articles`);

  // ── Détecter les doublons de nom dans xlsx ────────────────────────────────
  const xlsxByNom = new Map();
  const xlsxDoublons = new Set();
  for (const row of rows) {
    const key = normalize(row.nom);
    if (xlsxByNom.has(key)) {
      xlsxDoublons.add(key);
    } else {
      xlsxByNom.set(key, row);
    }
  }

  // ── Lecture des produits en DB ────────────────────────────────────────────
  const produits = await prisma.produit.findMany();
  console.log(`🗄️  Base de données : ${produits.length} produits\n`);

  const dbByNom = new Map();
  for (const p of produits) {
    dbByNom.set(normalize(p.nomProduit), p);
  }

  const matched = [];
  const nonMatchedXlsx = [];
  const doublonRows = [];

  for (const row of rows) {
    const key = normalize(row.nom);
    if (xlsxDoublons.has(key)) {
      doublonRows.push(row);
      continue;
    }
    const produit = dbByNom.get(key);
    if (produit) {
      matched.push({ produit, row });
    } else {
      nonMatchedXlsx.push(row);
    }
  }

  const matchedIds = new Set(matched.map(m => m.produit.id));
  const nonMatchedDb = produits.filter(p => !matchedIds.has(p.id));

  // ── Mise à jour des produits matchés ─────────────────────────────────────
  console.log(`⚙️  Mise à jour des produits matchés (${matched.length})...`);
  let updated = 0;
  for (const { produit, row } of matched) {
    await prisma.produit.update({
      where: { id: produit.id },
      data: {
        codeFamille: String(row.code_famille),
        code: String(row.code),
      },
    });
    updated++;
    if (updated % 100 === 0) process.stdout.write(`  ${updated}/${matched.length}\r`);
  }
  console.log(`✅ ${updated} produits mis à jour`);

  // ── Génération de codes pour les produits DB sans correspondance ──────────
  console.log(`\n⚙️  Génération de codes pour produits non trouvés dans xlsx (${nonMatchedDb.length})...`);
  let generated = 0;
  for (let i = 0; i < nonMatchedDb.length; i++) {
    const p = nonMatchedDb[i];
    const seq = String(i + 1).padStart(4, '0');
    await prisma.produit.update({
      where: { id: p.id },
      data: {
        codeFamille: '000',
        code: `000${seq}`,
      },
    });
    generated++;
  }
  console.log(`✅ ${generated} produits générés (code_famille=000)`);

  // ── Rapport ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  RAPPORT FINAL');
  console.log('═══════════════════════════════════════════');
  console.log(`  Articles xlsx          : ${rows.length}`);
  console.log(`  Produits DB            : ${produits.length}`);
  console.log(`  Matchés et mis à jour  : ${updated}`);
  console.log(`  Codes générés (DB∉xlsx): ${generated}`);
  console.log(`  Doublons xlsx ignorés  : ${doublonRows.length}`);
  console.log(`  Dans xlsx mais pas DB  : ${nonMatchedXlsx.length}`);

  if (doublonRows.length > 0) {
    const uniqueDoublonNoms = [...new Set(doublonRows.map(r => r.nom))];
    console.log(`\n⚠️  Noms dupliqués dans xlsx (${uniqueDoublonNoms.length} noms distincts) :`);
    uniqueDoublonNoms.slice(0, 15).forEach(n => console.log(`     • "${n}"`));
    if (uniqueDoublonNoms.length > 15) console.log(`     ... et ${uniqueDoublonNoms.length - 15} autres`);
  }

  if (nonMatchedXlsx.length > 0) {
    console.log(`\n⚠️  Articles xlsx sans correspondance en DB (${nonMatchedXlsx.length}) :`);
    nonMatchedXlsx.slice(0, 20).forEach(r =>
      console.log(`     • [${r.code_famille}/${r.code}] "${r.nom}"`)
    );
    if (nonMatchedXlsx.length > 20) console.log(`     ... et ${nonMatchedXlsx.length - 20} autres`);
  }

  if (nonMatchedDb.length > 0) {
    console.log(`\nℹ️  Produits DB avec code généré (000/XXXX) (${nonMatchedDb.length}) :`);
    nonMatchedDb.slice(0, 10).forEach((p, i) =>
      console.log(`     • [000/${String(i + 1).padStart(4, '0')}] "${p.nomProduit}"`)
    );
    if (nonMatchedDb.length > 10) console.log(`     ... et ${nonMatchedDb.length - 10} autres`);
  }

  console.log('\n═══════════════════════════════════════════\n');
}

main()
  .catch((err) => { console.error('❌ Erreur :', err.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); pool.end(); });
