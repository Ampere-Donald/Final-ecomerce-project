'use strict';
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

async function main() {
  const socket = process.env.DOCUMENTARY_NATIVE_SOCKET;
  if (!socket || !socket.startsWith('/tmp/newoteg-prisma.')) throw Error('EXPLICIT_ISOLATED_SOCKET_REQUIRED');
  const url = new URL('postgresql://documentary_test@localhost:55489/rehearsal');
  url.searchParams.set('host', socket);
  process.env.DATABASE_URL = url.href;
  require('tsconfig-paths').register({ baseUrl: path.join(process.cwd(), 'dist'), paths: { 'src/*': ['src/*'] } });
  const { DatabaseService } = require('../../dist/src/database/database.service');
  const { DocumentaryService } = require('../../dist/src/produit/documentary.service');
  const db = new DatabaseService();
  try {
    await db.onModuleInit();
    const service = new DocumentaryService(db);
    const list = await service.list('', '', '1');
    assert.equal(list.total, 7110);
    assert.equal(list.items.length, 50);
    const id = list.items[0].id;
    const before = await service.detail(id);
    const request = {
      operationId: randomUUID(), expectedRevision: before.revision,
      text: { display_title: before.nom_produit, short_description: 'Revue locale', description: 'Correction locale vérifiée' }, validate: true,
    };
    assert.equal((await service.edit(id, request, 'local-admin')).locked, true);
    assert.equal((await service.edit(id, request, 'local-admin')).action, 'already_applied');
    await assert.rejects(service.edit(id, { ...request, operationId: randomUUID() }, 'local-admin'), error => error.getStatus?.() === 409);
    const after = await service.detail(id);
    assert.equal(after.description, request.text.description);
    assert.equal(after.locked, true);
    assert.equal(after.history.length, 1);
    assert.equal(after.history[0].actor_id, 'local-admin');
    const report = { prisma_native_service_verified: true, catalogue_rows: list.total, pagination: true, editing: true, idempotence: true, stale_revision_409: true, history: true, production_written: false };
    fs.writeFileSync('/home/ampere/Documents/Windows/Newoteg/exports/catalog-integration-2026-11-14/verification_service_prisma_natif.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await db.onModuleDestroy(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
