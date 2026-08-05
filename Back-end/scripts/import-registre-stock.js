#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Idempotent legacy-register importer.
 *
 * Default mode is a read-only dry run. Use --apply only after reviewing the
 * generated report and after taking a database backup.
 *
 * Rules agreed for this import:
 * - existing products keep their live stock (sales may already have happened);
 * - only genuinely new products receive the quantity from the register;
 * - USAGE INTERNE and USAGE MAISON rows are excluded upstream;
 * - register prices are intentional, even when wholesale is below cost;
 * - new codes use the historical 000 + four-digit sequence convention.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const args = process.argv.slice(2);
const rollbackOnly = args.includes('--rollback');
const apply = args.includes('--apply') || rollbackOnly;
const sourceArg = args.find((value) => value.startsWith('--source='));
const outputArg = args.find((value) => value.startsWith('--output='));
const sourcePath = path.resolve(
  sourceArg?.slice('--source='.length) ?? path.resolve(__dirname, '..', '..', 'tmp', 'registre_import', 'registre-stock.json'),
);
const outputPath = path.resolve(
  outputArg?.slice('--output='.length) ?? path.resolve(__dirname, '..', '..', 'output', 'imports', 'registre-stock-report.json'),
);

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL est absent. Import interrompu.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 15_000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

const supplierProfiles = {
  UZOBEST: { country: 'Nigeria', currency: 'NGN', address: null },
  CHIKASON: { country: 'Nigeria', currency: 'NGN', address: null },
  CHYDONE: { country: 'Nigeria', currency: 'NGN', address: null },
  CHIKAGO: { country: 'Nigeria', currency: 'NGN', address: null },
  'FOCUS — Marche Congo': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'BETA SARL': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'FAMILY REMOTE': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'TIEKA SARL — Mboppi': { country: 'Cameroun', currency: 'FCFA', address: 'Mboppi, Douala' },
  'MA ELYS SARL — Congo': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'HASSANA SARL — Congo': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'NEYO INTER — Congo': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'BORIS SHOP — Congo': { country: 'Cameroun', currency: 'FCFA', address: 'Marché Congo, Douala' },
  'SEVERIN — Camp Yabassi': { country: 'Cameroun', currency: 'FCFA', address: 'Camp Yabassi, Douala' },
};

const manualAliases = new Map([
  ['CHARGEUR DE PILE JIABAO A636', 'CHARGEUR DE PILE JIA BAO A636'],
  ['CORDON IMPRIMANTE USB 3M', "CORDON D IMPRIMANTE USB 3M"],
  ['TOURNEVIS JAUNE NOIR JEU 6 PCES KULITE', 'TOURNEVIS JAUNE NOIR JEUX DE 6PCES KULITE'],
  ['TOURNEVIS PORTABLE JEU 6 PCES 91024', 'TOURNEVIS PORTABLE JEUX DE 06 PIECES 91024'],
  ['MULTIMETRE DT9205A DIGITAL', 'MULTIMETRE DT9205ADIGITAL'],
  ['BATTERIE RECHARGEABLE 12V 7AH', 'BATERIE RECHARGEABLE 12V 7AH'],
  ['CONDO 10V 2.2UF', 'CONDO 2.2UF 10V'],
  ['CONDO 25V 470UF', 'CONDO 470UF 25V'],
  ['CONDO 450V 22UF', 'CONDO 22UF 450V'],
  ['INTER ON OFF ROND 3PAT PM 3POS', 'INT ON OFF 3PAT 3 POS PM'],
  ['FICHE JACK 3.5 ST PLASTIQUE', 'FICHE JK 3.5 ST MAL EN PLASTIQ'],
  ['TOURNEVIS PORTABLE LOUPE JEU 9 PCES', 'PORTABLE TOURNEVIS LOUPE JEUX DE 09PIECES'],
  ['CHARGEUR LAPTOP IN 110 220VAC OUT 12 24V 4.5A MY', 'CHARGEUR LAPTOP REGLABLE 1.5 24V MY 120W'],
  ['CHARGEUR LAPTOP IN 110 220VAC OUT 12 24V 4.5A MY 15200W', 'CHARGEUR LAPTOP REGLABLE 1.5 24V MY 120W'],
  ['VARISTANCE 20D 471K', 'VARISTANC VDR 20D471K'],
  ['VARISTANCE 14D 471K', 'VARISTANC VDR 14D471K'],
  ['VARISTANCE 10D 471K', 'VARISTANC VDR 10D471K'],
  ['RESISTANCE VARIABLE 2K', 'RESIST VAR 2KR'],
  ['DIODE 10A10', 'DIODE REDRES 10A10'],
  ['ALIMENTATION ETANCHE 12V 16A 200W', 'ALIMENTATIN STABILISEE ETANCHE 12 V 16A 200W'],
  ['CHARGEUR BATTERIE INTELLIGENT 12V 40A 100AH', 'CHARGEUR DE BATTERIE 12V 40AH 1000AH INTELLIGENT CHARGER'],
  ['CHARGEUR C T WYDQ 28 2AH', 'CHARGEUR DE BATTERIE C T YDQ 28'],
  ['CHARGEUR WYDQ 155 40 100AH', 'CHARGEUR DE BATTERIE C T WYDQ155'],
  ['PINCE BATTERIE GM ROUGE', 'PINCE BATTERY GM ROUGE'],
  ['PINCE BATTERIE GM NOIR', 'PINCE BATTERY GM NOIR'],
  ['CABLE 2 CROCODILES 2 BANANES', 'CABLE 2 CROCODILE 2BANANES'],
  ['BATTERIE RECHARGEABLE 6V 4.5AH GUANSAEING', 'BATTERIE RECHARGEABLE 6V 4.5 GUANSAEING'],
  ['CHARGEUR DE PILE 4 PILES RECHARGEABLE JIABAO A 613', 'CHARGEUR DE PILE 04 PILE RECH JIABAO A 613'],
  ['CHEUILLES VIS N8', 'CHEUILLES VISN 8'],
  ['CONDO JAUNE 22UF 250V', 'CONDO 22UF 250V'],
  ['VENT 220V 8X8', 'VENTILO AMPLI 220V 8X8'],
  ['TESTEUR DE LED 0 A 300V', 'TESTEUR DE LED'],
  ['ADAPTATEUR 1JACK 2RCA', 'ADAPT JK 2RCA FEM'],
]);

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[’']/g, ' ')
    .replace(/,/g, '.')
    .replace(/[^A-Z0-9.]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function canonical(value) {
  let text = normalize(value)
    .replace(/\bALIMENTATIN\b/g, 'ALIMENTATION')
    .replace(/\bALIMT?\b/g, 'ALIMENTATION')
    .replace(/\bCONDENSATEUR\b/g, 'CONDO')
    .replace(/\bRECH\b/g, 'RECHARGEABLE')
    .replace(/\bPATTES?\b|\bPIEDS?\b/g, 'PAT')
    .replace(/\bFILS\b/g, 'FIL')
    .replace(/\bMODELE?\b/g, 'MODEL')
    .replace(/\bPOUSSOIRE\b/g, 'POUSSOIR')
    .replace(/\bMARON\b/g, 'MARRON')
    .replace(/\bBATTERY\b/g, 'BATTERIE')
    .replace(/\bJEUX\b/g, 'JEU')
    .replace(/\bUNIVERSELLE\b/g, 'UNIVERSEL')
    .replace(/\bRGE\b/g, 'ROUGE')
    .replace(/\bNOIRE\b/g, 'NOIR')
    .replace(/\bBLEUE\b/g, 'BLEU')
    .replace(/\bLOT\s*\d+\b/g, ' ')
    .replace(/\b2E\s+LOT\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function compact(value) {
  return canonical(value).replace(/[^A-Z0-9]/g, '');
}

function tokens(value) {
  return new Set(canonical(value).split(' ').filter(Boolean));
}

function numericTokens(value) {
  return new Set(canonical(value).match(/\d+(?:\.\d+)?(?:[A-Z]+)?/g) ?? []);
}

function intersectionRatio(left, right) {
  if (left.size === 0 && right.size === 0) return 1;
  const union = new Set([...left, ...right]);
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / Math.max(union.size, 1);
}

function diceCoefficient(left, right) {
  const a = canonical(left);
  const b = canonical(right);
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const pairs = new Map();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = a.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = b.slice(index, index + 2);
    const count = pairs.get(pair) ?? 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      overlap += 1;
    }
  }
  return (2 * overlap) / (a.length + b.length - 2);
}

function priceCompatibility(group, product) {
  const pairs = [
    [group.wholesalePrice, product.prix_gros],
    [group.semiWholesalePrice, product.prix_demi_gros],
    [group.retailPrice, product.prix_detail],
  ].filter(([source, target]) => source != null && target != null);
  if (pairs.length === 0) return 0.5;
  return pairs.filter(([source, target]) => Math.abs(Number(source) - Number(target)) < 0.01).length / pairs.length;
}

function matchScore(group, product) {
  const tokenScore = intersectionRatio(tokens(group.designation), tokens(product.nom_produit));
  const nameScore = 0.55 * diceCoefficient(group.designation, product.nom_produit) + 0.45 * tokenScore;
  const numberScore = intersectionRatio(numericTokens(group.designation), numericTokens(product.nom_produit));
  const priceScore = priceCompatibility(group, product);
  return 0.58 * nameScore + 0.17 * numberScore + 0.25 * priceScore;
}

function chooseCategory(designation, categoryByName) {
  const name = canonical(designation);
  const rules = [
    ['Télécommandes', /\bTELECOMMANDE\b/],
    ['Ventilateurs', /\bVENTILATEUR\b|\bVENTILO\b|^VENT\b/],
    ['Piles & Batteries', /\bPILE\b|\bBATTERIE\b/],
    ['Chargeurs & Power Banks', /\bCHARGEUR\b|\bPOWER ?BANK\b/],
    ['Satellite & TV', /\bLNB\b|\bPARABOLE\b|\bTETE L B\b|\bCOMBO TV\b/],
    ['Loupe & Optique', /\bLOUPE\b/],
    ['Mesure & Test', /\bMULTIMETRE\b|\bTESTEUR\b|\bDETECTEUR\b/],
    ['Outillage', /\bTOURNEVIS\b|\bFER A SOUDER\b|\bPINCE\b|\bCISEAU\b|\bPISTOLET\b|\bSCOTCH\b/],
    ['Informatique & Réseaux', /\bSOURIS\b|\bRESEAU\b|\bRJ45\b|\bDISQUE DUR\b|\bIMPRIMANTE\b/],
    ['Audio & Son', /\bMP3\b|\bBLUETOOTH\b|\bCARTE SON\b|\bAMPLI\b|\bMICRO\b|\bWOOFER\b/],
    ['Câbles & Connectique', /\bCABLE\b|\bCORDON\b|\bFICHE\b|\bJACK\b|\bRCA\b|\bVGA\b|\bUSB\b|\bADAPTATEUR\b|\bRACCORD\b/],
    ['Alimentation & Energie', /\bALIMENTATION\b|\bCONVERTISSEUR\b|\bCONTROLEUR DE CHARGE\b|\bREGULATEUR TENSION\b/],
    ['Accessoires électriques', /\bRALLONGE\b|\bPRISE\b|\bINTERRUPTEUR\b|\bINTER ON OFF\b|\bPARAFOUDRE\b/],
    [
      'Composants Électroniques',
      /\bCONDO\b|\bRESISTANCE\b|\bVARISTANCE\b|\bDIODE\b|\bTDA\b|\bTRANSISTOR\b|\bRELAIS\b|\bNTC\b|\bTHERMISTANCE\b|\bFUSIBLE\b|\bBOBINE\b|\bMOTEUR\b|\bPOT\b|\bBOUTON\b|\bLDR\b|\bDIAC\b|\bCARTE MERE\b/,
    ],
  ];
  for (const [category, matcher] of rules) {
    if (matcher.test(name) && categoryByName.has(normalize(category))) return categoryByName.get(normalize(category));
  }
  return categoryByName.get(normalize('Divers')) ?? [...categoryByName.values()][0];
}

function aggregateRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = canonical(row.designation);
    const current = grouped.get(key) ?? {
      key,
      designation: row.designation.replace(/\s+lot\s+\d+$/i, '').replace(/\s+\(2e lot\)$/i, ''),
      rows: [],
      quantity: 0,
      totalCostFcfa: 0,
    };
    current.rows.push(row);
    current.quantity += Number(row.quantity ?? 0);
    current.totalCostFcfa += Number(row.totalPurchaseFcfa ?? 0);
    current.wholesalePrice = row.wholesalePrice ?? current.wholesalePrice ?? null;
    current.semiWholesalePrice = row.semiWholesalePrice ?? current.semiWholesalePrice ?? null;
    current.retailPrice = row.retailPrice ?? current.retailPrice ?? null;
    current.lastRow = row;
    grouped.set(key, current);
  }
  for (const group of grouped.values()) {
    group.weightedUnitCostFcfa = group.quantity > 0 ? group.totalCostFcfa / group.quantity : 0;
  }
  return [...grouped.values()];
}

function findTemperatureFuse(group, products) {
  const match = canonical(group.designation).match(/^FUSIBLE THERMIQUE (\d+)C$/);
  if (!match) return null;
  const temperature = match[1];
  return products.find((product) => {
    const name = canonical(product.nom_produit);
    return name.includes('FUSIBLE THERM') && new RegExp(`(?:KSD|RF|F)${temperature}C`).test(compact(name));
  }) ?? null;
}

function findManualAlias(group, products) {
  const alias = manualAliases.get(canonical(group.designation));
  if (!alias) return null;
  const target = compact(alias);
  return products.find((product) => compact(product.nom_produit) === target) ?? null;
}

function matchGroups(groups, products) {
  const exactMap = new Map();
  for (const product of products) {
    const key = canonical(product.nom_produit);
    const list = exactMap.get(key) ?? [];
    list.push(product);
    exactMap.set(key, list);
  }

  return groups.map((group) => {
    const exact = exactMap.get(canonical(group.designation)) ?? [];
    if (exact.length > 0) {
      exact.sort((left, right) => priceCompatibility(group, right) - priceCompatibility(group, left));
      return { group, product: exact[0], confidence: 1, method: 'exact' };
    }

    const manual = findManualAlias(group, products) ?? findTemperatureFuse(group, products);
    if (manual) return { group, product: manual, confidence: 0.99, method: 'alias' };

    const candidates = products
      .map((product) => ({ product, score: matchScore(group, product) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
    const top = candidates[0];
    const margin = top ? top.score - (candidates[1]?.score ?? 0) : 0;
    const topNumberScore = top ? intersectionRatio(numericTokens(group.designation), numericTokens(top.product.nom_produit)) : 0;
    const topPriceScore = top ? priceCompatibility(group, top.product) : 0;
    const safe = top && top.score >= 0.74 && (margin >= 0.035 || (topNumberScore === 1 && topPriceScore === 1));
    return {
      group,
      product: safe ? top.product : null,
      confidence: top?.score ?? 0,
      method: safe ? 'fuzzy-safe' : 'new',
      candidates: candidates.map(({ product, score }) => ({ id: product.id, name: product.nom_produit, score })),
    };
  });
}

async function createSupplier(client, supplierName, profile) {
  const id = crypto.randomUUID();
  await client.query(
    `INSERT INTO fournisseur
      (id, nom_entreprise, adresse, pays, devise_defaut, version)
     VALUES ($1, $2, $3, $4, $5::"Devise", 1)`,
    [id, supplierName, profile.address, profile.country, profile.currency],
  );
  return { id, nom_entreprise: supplierName };
}

async function nextFallbackCode(client) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('newoteg:produit-code:000'))");
  const result = await client.query("SELECT code FROM produit WHERE code_famille = '000'");
  let max = 0;
  for (const row of result.rows) {
    const match = String(row.code ?? '').match(/^000(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  const next = max + 1;
  return `000${String(next).padStart(4, '0')}`;
}

async function applyImport(client, matches, suppliers, categories) {
  const createdProducts = [];
  const updatedProducts = [];
  for (const match of matches) {
    const { group } = match;
    const last = group.lastRow;
    const supplier = suppliers.get(normalize(last.supplier));
    if (!supplier) throw new Error(`Fournisseur introuvable: ${last.supplier}`);

    if (match.product) {
      await client.query(
        `UPDATE produit SET
          prix_gros = COALESCE($2, prix_gros),
          prix_demi_gros = COALESCE($3, prix_demi_gros),
          prix_detail = COALESCE($4, prix_detail),
          dernier_cout_achat_fcfa = $5,
          derniere_devise_achat = $6::"Devise",
          dernier_fournisseur_id = $7,
          dernier_achat_at = COALESCE($8::timestamptz, dernier_achat_at),
          cmup_actuel = CASE WHEN cmup_actuel = 0 THEN $9 ELSE cmup_actuel END,
          version = version + 1
         WHERE id = $1`,
        [
          match.product.id,
          group.wholesalePrice,
          group.semiWholesalePrice,
          group.retailPrice,
          last.unitCostFcfa ?? group.weightedUnitCostFcfa,
          last.purchaseCurrency,
          supplier.id,
          last.purchaseDate,
          group.weightedUnitCostFcfa,
        ],
      );
      updatedProducts.push({ id: match.product.id, name: match.product.nom_produit, stockPreserved: match.product.quantite_stock });
      continue;
    }

    const category = chooseCategory(group.designation, categories);
    const code = await nextFallbackCode(client);
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO produit (
        id, id_categorie, nom_produit, marque, description, date_ajout, version,
        prix_detail, prix_demi_gros, prix_gros, quantite_stock, seuil_alerte,
        cmup_actuel, dernier_cout_achat_fcfa, derniere_devise_achat,
        dernier_fournisseur_id, dernier_achat_at, code_famille, code
       ) VALUES (
        $1, $2, $3, $4, $5, now(), 1,
        $6, $7, $8, $9, 5,
        $10, $11, $12::"Devise", $13, $14::timestamptz, '000', $15
       )`,
      [
        id,
        category.id,
        group.designation,
        'Générique',
        `Import registre 2026 — fournisseur ${last.supplier}`,
        group.retailPrice,
        group.semiWholesalePrice,
        group.wholesalePrice,
        group.quantity,
        group.weightedUnitCostFcfa,
        last.unitCostFcfa ?? group.weightedUnitCostFcfa,
        last.purchaseCurrency,
        supplier.id,
        last.purchaseDate,
        code,
      ],
    );
    createdProducts.push({ id, name: group.designation, stock: group.quantity, family: '000', code, category: category.nom });
  }
  return { createdProducts, updatedProducts };
}

async function main() {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (source.excludedRows?.length !== 3 || source.rows.some((row) => row.excluded)) {
    throw new Error('La vérification des exclusions usage interne/maison a échoué.');
  }

  const client = await pool.connect();
  try {
    const productsResult = await client.query(
      `SELECT id, nom_produit, prix_gros, prix_demi_gros, prix_detail, quantite_stock, code_famille, code FROM produit`,
    );
    const suppliersResult = await client.query(`SELECT id, nom_entreprise, pays, devise_defaut FROM fournisseur`);
    const categoriesResult = await client.query(`SELECT id, nom FROM categorie`);
    const products = productsResult.rows;
    const groups = aggregateRows(source.rows);
    const matches = matchGroups(groups, products);
    const supplierNames = [...new Set(source.rows.map((row) => row.supplier))];
    const existingSupplierMap = new Map(suppliersResult.rows.map((supplier) => [normalize(supplier.nom_entreprise), supplier]));
    const categoryMap = new Map(categoriesResult.rows.map((category) => [normalize(category.nom), category]));

    const report = {
      generatedAt: new Date().toISOString(),
      mode: rollbackOnly ? 'transaction-test-rollback' : apply ? 'apply' : 'dry-run',
      source: path.basename(sourcePath),
      rules: source.rules,
      validation: {
        sourceRows: source.rows.length,
        excludedRows: source.excludedRows.length,
        uniqueGroups: groups.length,
        actualLocalRowsTotalFcfa: source.rows
          .filter((row) => row.country === 'Cameroun')
          .reduce((total, row) => total + Number(row.totalPurchaseFcfa ?? 0), 0),
        statedLocalSummaryFcfa: 4_529_970,
        note: 'Le détail des lignes locales dépasse le récapitulatif du PDF de 242 500 FCFA. Les produits sont importés selon les lignes détaillées.',
      },
      plan: {
        existingProductsToUpdateWithoutStockChange: matches.filter((match) => match.product).length,
        newProductsToCreateWithRegisterStock: matches.filter((match) => !match.product).length,
        suppliersToCreate: supplierNames.filter((name) => !existingSupplierMap.has(normalize(name))),
      },
      matches: matches.map((match) => ({
        sourceName: match.group.designation,
        registerQuantity: match.group.quantity,
        action: match.product ? 'update-preserve-stock' : 'create-with-register-stock',
        targetId: match.product?.id ?? null,
        targetName: match.product?.nom_produit ?? null,
        currentStock: match.product?.quantite_stock ?? null,
        confidence: Number(match.confidence.toFixed(4)),
        method: match.method,
        candidates: match.candidates ?? [],
      })),
      applied: null,
    };

    if (apply) {
      await client.query('BEGIN');
      try {
        const supplierMap = new Map(existingSupplierMap);
        for (const name of supplierNames) {
          const key = normalize(name);
          if (supplierMap.has(key)) continue;
          const defaultProfile = { country: 'Cameroun', currency: 'FCFA', address: null };
          supplierMap.set(key, await createSupplier(client, name, supplierProfiles[name] ?? defaultProfile));
        }
        report.applied = await applyImport(client, matches, supplierMap, categoryMap);
        await client.query(rollbackOnly ? 'ROLLBACK' : 'COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(JSON.stringify({ mode: report.mode, ...report.plan, report: outputPath }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  await pool.end().catch(() => undefined);
  process.exitCode = 1;
});
