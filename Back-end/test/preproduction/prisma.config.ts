import { defineConfig } from 'prisma/config';

const database = process.env.REFONTE_MIGRATION_DB;
const major = process.env.REFONTE_REHEARSAL_PG_MAJOR || '17';
if (!['17', '18'].includes(major))
  throw new Error('Only isolated PostgreSQL 17/18 rehearsals are supported.');
const port = major === '18' ? 55440 : 55439;
if (!database || !/^newoteg_refonte_e_migrations_[a-z0-9_]+$/.test(database)) {
  throw new Error('An isolated rehearsal database name is required.');
}
// No dotenv and no production DATABASE_URL. Only the dedicated local cluster.
export default defineConfig({
  schema: '../../prisma/schema.prisma',
  migrations: { path: '../../prisma/migrations' },
  datasource: {
    url: `postgresql://refonte_test@127.0.0.1:${port}/${database}`,
  },
});
