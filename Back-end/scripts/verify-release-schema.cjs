const { Client } = require('pg');

async function verifyReleaseSchema(db) {
  const result = await db.query(`
    SELECT
      to_regclass('public.commande_request') IS NOT NULL AS request_table,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
        AND table_name='produit' AND column_name='est_actif' AND data_type='boolean' AND is_nullable='NO') AS active_flag,
      EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.commande_request')
        AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (request_id)') AS request_primary_key,
      EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.commande_request')
        AND contype='f' AND confrelid=to_regclass('public.commande') AND confdeltype='n') AS retained_request,
      NOT EXISTS (SELECT 1 FROM public._prisma_migrations
        WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS no_failed_migration
  `);
  const missing = Object.entries(result.rows[0])
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  if (missing.length)
    throw new Error(`Release schema incomplete: ${missing.join(', ')}`);
  return result.rows[0];
}
module.exports = { verifyReleaseSchema };
if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  (async () => {
    try {
      await db.connect();
      await verifyReleaseSchema(db);
      console.log('Release schema checks passed.');
    } finally {
      await db.end();
    }
  })().catch(() => {
    console.error('Release schema validation failed. Application not started.');
    process.exitCode = 1;
  });
}
