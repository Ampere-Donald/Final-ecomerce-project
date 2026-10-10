// Load the packaged release guards without connecting to a database, running
// migrations, or importing main (which would start the application).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

function verifyReleaseImage(root) {
  const app = createRequire(path.join(root, 'package.json'));
  const { readReleaseContract } = app('./scripts/release-schema-contract.cjs');
  const { verifyMigrationHistory, verifyReleaseSchema } = app(
    './scripts/verify-release-schema.cjs',
  );
  const { startPreproduction } = app('./scripts/start-preproduction.cjs');
  assert.equal(typeof verifyMigrationHistory, 'function');
  assert.equal(typeof verifyReleaseSchema, 'function');
  assert.equal(typeof startPreproduction, 'function');
  const contract = readReleaseContract();
  fs.accessSync(path.join(root, 'dist/src/main.js'), fs.constants.R_OK);
  fs.accessSync(path.join(root, 'prisma.config.ts'), fs.constants.R_OK);
  return {
    status: 'passed',
    migrationSources: contract.sources.migrations.length,
    checks: [
      'Packaged migration guards and their dependencies load',
      'Release contract matches packaged schema and migrations',
      'Compiled application entry and Prisma configuration present',
    ],
    databaseConnected: false,
    migrationsRun: false,
    applicationStarted: false,
  };
}

module.exports = { verifyReleaseImage };
if (require.main === module) {
  assert.equal(process.getuid(), 1000, 'Container must use the node user');
  const root = process.cwd();
  assert.ok(!fs.existsSync(path.join(root, '.env')));
  assert.ok(!fs.existsSync(path.join(root, 'node_modules/@nestjs/cli')));
  fs.accessSync(
    path.join(root, 'node_modules/prisma/build/index.js'),
    fs.constants.R_OK,
  );
  console.log(JSON.stringify(verifyReleaseImage(root)));
}
