'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const { stageProposal } = require('./stage.cjs');
const { publishCandidate } = require('./store.cjs');
async function main() {
  if (process.argv[2] !== '--owner-authorized-production') throw Error('EXPLICIT_PUBLICATION_FLAG_REQUIRED');
  const input = process.env.DOCUMENTARY_INPUT_DIR;
  const sourceEnv = process.env.DOCUMENTARY_SOURCE_ENV;
  const backupReport = process.env.DOCUMENTARY_VERIFIED_BACKUP;
  if (!input || !sourceEnv || !backupReport) throw Error('INPUT_AND_VERIFIED_BACKUP_REQUIRED');
  const proof = JSON.parse(fs.readFileSync(backupReport, 'utf8'));
  if (!proof.native_restore_verified) throw Error('BACKUP_RESTORE_NOT_VERIFIED');
  const read = file => fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const source = path.join(input, 'propositions_cumulees_lots_01_a_19.jsonl');
  const proposals = read(source);
  const original = new Map(read(path.resolve(input, '../catalog-enrichment/catalogue_complet.jsonl')).map(p => [p.id, p]));
  if (proposals.length !== 1933 || new Set(proposals.map(p => p.id)).size !== 1933) throw Error('PROPOSAL_COVERAGE_ERROR');
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const batchId = 'documentary-' + sourceHash;
  const config = require('dotenv').parse(fs.readFileSync(sourceEnv));
  const db = new Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  const output = path.join(input, 'production-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(output, { mode: 0o700 });
  const logFile = path.join(output, 'results.jsonl');
  const actorId = 'owner-authorized-documentary-import';
  const counts = {};
  try {
    await db.connect();
    if (!(await db.query("SELECT to_regclass('public.product_documentary') AS table_name")).rows[0].table_name) throw Error('DOCUMENTARY_MIGRATION_REQUIRED');
    await db.query('INSERT INTO documentary_batch(id,source_sha256,source_name,actor_id) VALUES($1,$2,$3,$4) ON CONFLICT(source_sha256) DO NOTHING', [batchId, sourceHash, path.basename(source), actorId]);
    for (const proposal of proposals) {
      const prior = original.get(proposal.id);
      if (!prior || prior.original.title !== proposal.original_title || prior.source_fingerprint_sha256 !== proposal.source_fingerprint_sha256) throw Error('ORIGINAL_SNAPSHOT_MISMATCH');
      const request = { proposal, batchId, actorId, original: { id: prior.id, title: prior.original.title, description: prior.original.description } };
      const staged = await stageProposal(db, { ...request, operationId: 'stage:' + batchId + ':' + proposal.id });
      const result = await publishCandidate(db, { ...request, operationId: 'publish:' + batchId + ':' + proposal.id });
      const decision = result.reason || result.action;
      counts[decision] = (counts[decision] || 0) + 1;
      fs.appendFileSync(logFile, JSON.stringify({ id: proposal.id, staged, publication: result }) + '\n', { mode: 0o600 });
    }
    const report = { batchId, products: proposals.length, counts, source_sha256: sourceHash, owner_authorized: true, output };
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify(report));
  } finally { await db.end(); }
}
main().catch(error => { console.error(JSON.stringify({ error: /^[A-Z_]+$/.test(error.message) ? error.message : 'PUBLICATION_INTERRUPTED', sqlstate: error.code || null, note: 'Committed operations are journaled and idempotent. Inspect the run log before retrying.' })); process.exitCode = 1; });
