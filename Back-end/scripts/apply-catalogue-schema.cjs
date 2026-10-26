// Apply ONLY the additive catalogue migration, after a fresh complete backup.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { Client } = require('pg');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
  quiet: true,
});
const backupArg = process.argv.find((a) => a.startsWith('--backup='))?.slice(9);
if (!backupArg) throw new Error('Sauvegarde requise : --backup=chemin');
const backup = JSON.parse(fs.readFileSync(path.resolve(backupArg), 'utf8'));
const url = new URL(process.env.DATABASE_URL);
if (
  backup.database?.host !== url.hostname ||
  !backup.tables?.produit ||
  !backup.tables?.categorie ||
  Date.now() - Date.parse(backup.createdAt) > 86400000
)
  throw new Error(
    'La sauvegarde ne correspond pas à la base ou date de plus de 24 h.',
  );
const migrationName = '20261024120000_catalogue_revision';
const sql = fs.readFileSync(
  path.join(__dirname, '../prisma/migrations', migrationName, 'migration.sql'),
  'utf8',
);
const checksum = createHash('sha256').update(sql).digest('hex');
const db = new Client({
  connectionString: url.href,
  ssl: ['localhost', '127.0.0.1'].includes(url.hostname)
    ? undefined
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
async function main() {
  await db.connect();
  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL lock_timeout = '10s'");
    const prior = (
      await db.query(
        'SELECT checksum,finished_at FROM _prisma_migrations WHERE migration_name=$1 AND rolled_back_at IS NULL',
        [migrationName],
      )
    ).rows;
    if (prior.some((p) => p.checksum !== checksum || !p.finished_at))
      throw new Error('Migration existante divergente ou interrompue.');
    const before = (
      await db.query(
        'SELECT count(*)::int AS produits,sum(quantite_stock)::bigint::text AS stock FROM produit',
      )
    ).rows[0];
    await db.query(sql);
    if (!prior.length)
      await db.query(
        'INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES($1,$2,NOW(),$3,NOW(),1)',
        [randomUUID(), checksum, migrationName],
      );
    const after = (
      await db.query(
        'SELECT count(*)::int AS produits,sum(quantite_stock)::bigint::text AS stock FROM produit',
      )
    ).rows[0];
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error('Le nombre d’articles ou le stock a changé.');
    await db.query('COMMIT');
    console.log(
      JSON.stringify({
        applied: true,
        migration: migrationName,
        before,
        after,
        backup: path.resolve(backupArg),
      }),
    );
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
