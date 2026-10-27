// Dry run by default. Applying requires a recent, complete backup and rechecks every baseline.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { taxonomy, classify } = require('./catalogue-taxonomy.cjs');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
  quiet: true,
});
const arg = (key) =>
  process.argv
    .find((value) => value.startsWith(`--${key}=`))
    ?.slice(key.length + 3);
const apply = process.argv.includes('--apply');
const out = path.resolve(
  arg('output') ||
    path.join(
      __dirname,
      '../../output/catalogue-revision',
      `classification-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    ),
);
const url = new URL(process.env.DATABASE_URL);
const db = new Client({
  connectionString: url.href,
  ssl: ['localhost', '127.0.0.1'].includes(url.hostname)
    ? undefined
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
async function main() {
  let backup;
  if (apply) {
    if (!arg('backup'))
      throw new Error('Sauvegarde complète requise : --backup=chemin');
    backup = JSON.parse(fs.readFileSync(path.resolve(arg('backup')), 'utf8'));
    if (
      !backup.tables?.produit ||
      !backup.tables?.categorie ||
      Date.now() - Date.parse(backup.createdAt) > 86400000 ||
      backup.database?.host !== url.hostname
    )
      throw new Error(
        'La sauvegarde ne correspond pas à la base ou date de plus de 24 heures.',
      );
  }
  await db.connect();
  const products = (
    await db.query(
      `SELECT p.id,p.nom_produit,p.id_categorie,to_jsonb(p)->>'sous_categorie_id' AS sous_categorie_id,COALESCE((to_jsonb(p)->>'classement_revision')::int,1) AS classement_revision,c.nom AS categorie_nom FROM produit p JOIN categorie c ON c.id=p.id_categorie WHERE p.est_actif=true ORDER BY p.nom_produit,p.id`,
    )
  ).rows;
  const categories = (await db.query('SELECT id,nom FROM categorie')).rows;
  const plan = products.map((p) => ({
    produitId: p.id,
    nomProduit: p.nom_produit,
    avant: {
      categorieId: p.id_categorie,
      sousCategorieId: p.sous_categorie_id,
      revision: p.classement_revision,
    },
    propose: classify(p),
  }));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        applied: false,
        phase: 'PREPARED',
        plan,
      },
      null,
      2,
    ),
  );
  if (apply) {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try {
      const fingerprint = `SELECT md5(string_agg(jsonb_build_array(id,prix_detail,prix_demi_gros,prix_gros,prix_promo,fin_promo,quantite_stock,est_actif)::text,'' ORDER BY id)) AS empreinte FROM produit`;
      const before = (await db.query(fingerprint)).rows[0].empreinte;
      const seeds = [];
      for (const [parent, names] of Object.entries(taxonomy)) {
        const category = categories.find((c) => c.nom === parent);
        if (!category) continue;
        for (const nom of names) seeds.push({ id: randomUUID(), categorie_id: category.id, nom });
      }
      await db.query(`INSERT INTO sous_categorie(id,categorie_id,nom)
        SELECT id,categorie_id,nom FROM jsonb_to_recordset($1::jsonb) AS r(id text,categorie_id text,nom text)
        ON CONFLICT(categorie_id,nom) DO NOTHING`, [JSON.stringify(seeds)]);
      const subs = (
        await db.query('SELECT id,categorie_id,nom FROM sous_categorie')
      ).rows;
      const assignments = [];
      for (const item of plan) {
        if (!item.propose || item.avant.sousCategorieId) continue;
        const parent = categories.find((c) => c.nom === item.propose.categorie);
        const sub = subs.find(
          (s) =>
            s.categorie_id === parent?.id &&
            s.nom === item.propose.sousCategorie,
        );
        if (!sub)
          throw new Error(
            `Sous-catégorie manquante : ${item.propose.sousCategorie}`,
          );
        assignments.push({ id: item.produitId, categorie_id: parent.id, sous_categorie_id: sub.id, revision: item.avant.revision });
        item.applique = { categorieId: parent.id, sousCategorieId: sub.id };
      }
      const result = await db.query(`UPDATE produit p SET id_categorie=r.categorie_id,sous_categorie_id=r.sous_categorie_id,version=p.version+1
        FROM jsonb_to_recordset($1::jsonb) AS r(id text,categorie_id text,sous_categorie_id text,revision integer)
        WHERE p.id=r.id AND p.classement_revision=r.revision AND p.sous_categorie_id IS NULL AND p.est_actif=true`, [JSON.stringify(assignments)]);
      if (result.rowCount !== assignments.length) throw new Error('Classement concurrent détecté ; transaction annulée.');
      if ((await db.query(fingerprint)).rows[0].empreinte !== before)
        throw new Error(
          'Les prix, le stock ou l’activité ont changé ; classement annulé.',
        );
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }
  const report = {
    createdAt: new Date().toISOString(),
    applied: apply,
    backup: arg('backup') || null,
    products: plan.length,
    classifiable: plan.filter((p) => p.propose).length,
    classified: plan.filter((p) => p.applique).length,
    ambiguous: plan.filter((p) => !p.propose).length,
    plan,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      output: out,
      applied: apply,
      products: report.products,
      classifiable: report.classifiable,
      classified: report.classified,
      ambiguous: report.ambiguous,
    }),
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
