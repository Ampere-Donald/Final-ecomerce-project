import { defineConfig } from 'prisma/config';
import path from 'node:path';

const database = process.env.REFONTE_MIGRATION_DB;
if (
  !database ||
  !/^newoteg_refonte_e_migrations_repair_[0-9]+$/.test(database)
) {
  throw new Error('A disposable local repair rehearsal database is required.');
}
export default defineConfig({
  schema: '../../prisma/schema.prisma',
  migrations: {
    path: path.resolve(
      __dirname,
      '../../../.local-postgres/refonte-e/migrations',
      database,
      'migrations',
    ),
  },
  datasource: { url: `postgresql://refonte_test@127.0.0.1:55439/${database}` },
});
