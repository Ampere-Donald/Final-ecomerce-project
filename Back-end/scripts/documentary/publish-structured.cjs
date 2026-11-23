'use strict';
const fs = require('node:fs'),
  path = require('node:path'),
  { createHash } = require('node:crypto');
const { Client } = require('pg');
const { fingerprint, normalizeContent } = require('./content.cjs');
const { saveStructured } = require('./structured-store.cjs');
const { sourceConsistencyRisks } = require('./source-consistency.cjs');
const sha = (x) => createHash('sha256').update(x).digest('hex');
async function publish(file, snapshot, output) {
  const backup = process.env.DOCUMENTARY_VERIFIED_BACKUP,
    source = process.env.DOCUMENTARY_SOURCE_ENV;
  if (!source || !backup) throw Error('VERIFIED_BACKUP_AND_SOURCE_REQUIRED');
  const proof = JSON.parse(fs.readFileSync(backup, 'utf8'));
  if (
    !proof.native_restore_verified ||
    Date.now() - fs.statSync(backup).mtimeMs > 86400000
  )
    throw Error('FRESH_RESTORABLE_BACKUP_REQUIRED');
  for (const [name, digest] of Object.entries(proof.archives || {}))
    if (sha(fs.readFileSync(path.join(path.dirname(backup), name))) !== digest)
      throw Error('BACKUP_ARCHIVE_MISMATCH');
  const items = fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(JSON.parse);
  if (
    !items.length ||
    items.length > 50 ||
    new Set(items.map((p) => p.id)).size !== items.length
  )
    throw Error('INVALID_BATCH_SIZE_OR_IDENTIFIERS');
  const originals = new Map(
    fs
      .readFileSync(snapshot, 'utf8')
      .trim()
      .split('\n')
      .map((l) => {
        const p = JSON.parse(l);
        return [p.id, p];
      }),
  );
  for (const item of items) {
    normalizeContent(item.content);
    if (
      item.review?.status !== 'ready' ||
      item.review.contentSha256 !== sha(JSON.stringify(item.content))
    )
      throw Error('REVIEWED_CONTENT_REQUIRED');
    if (!originals.has(item.id)) throw Error('SNAPSHOT_ID_REQUIRED');
    if (sourceConsistencyRisks(originals.get(item.id), [item.content.locales.fr.summary,...item.content.locales.fr.paragraphs].join(' ')).length)
      throw Error('DOCUMENTARY_INCONSISTENT_SOURCE');
  }
  if (
    !proof.archives?.['schema.dump'] ||
    !proof.archives?.['catalogue-data.dump']
  )
    throw Error('BACKUP_ARCHIVES_REQUIRED');
  const cfg = require('dotenv').parse(fs.readFileSync(source));
  const connection = {
    connectionString: cfg.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  };
  const db = new Client(connection);
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const results = [];
  try {
    await db.connect();
    let next = 0,
      failure;
    await Promise.all(
      Array.from({ length: Math.min(8, items.length) }, async () => {
        const db = new Client(connection);
        try {
          await db.connect();
          while (!failure && next < items.length) {
            const item = items[next++];
            const before = (
              await db.query(
                'SELECT id,nom_produit,description,marque,reference_fabricant,est_actif FROM produit WHERE id=$1',
                [item.id],
              )
            ).rows[0];
            const original = originals.get(item.id);
            const expected = {
              id: original.id,
              nom_produit: original.original.title,
              description: original.original.description,
              marque: original.original.brand,
              reference_fabricant: original.original.manufacturer_reference,
            };
            if (
              !before?.est_actif ||
              fingerprint(expected) !== fingerprint(before)
            ) {
              results.push({ id: item.id, status: 'held_source_changed' });
              continue;
            }
            const doc = (
              await db.query(
                'SELECT * FROM product_documentary WHERE product_id=$1',
                [item.id],
              )
            ).rows[0];
            fs.appendFileSync(
              path.join(output, 'before.jsonl'),
              JSON.stringify({ id: item.id, documentary: doc || null }) + '\n',
              { mode: 0o600 },
            );
            const key =
              'structured:' + item.id + ':' + sha(JSON.stringify(item.content));
            const prior = (
              await db.query(
                'SELECT revision_before FROM documentary_event WHERE operation_id=$1',
                [key + ':draft'],
              )
            ).rows[0];
            try {
              const draft = await saveStructured(db, {
                productId: item.id,
                actorId: 'owner-authorized-catalogue-enrichment',
                operationId: key + ':draft',
                expectedRevision: prior?.revision_before ?? doc?.revision ?? 0,
                action: 'draft',
                content: item.content,
                automatic: true,
                expectedProductFingerprint:fingerprint(expected),
              });
              const current = (
                await db.query(
                  'SELECT revision FROM product_documentary WHERE product_id=$1',
                  [item.id],
                )
              ).rows[0];
              const replay = (
                await db.query(
                  'SELECT revision_before FROM documentary_event WHERE operation_id=$1',
                  [key + ':publish'],
                )
              ).rows[0];
              const publication = await saveStructured(db, {
                productId: item.id,
                actorId: 'owner-authorized-catalogue-enrichment',
                operationId: key + ':publish',
                expectedRevision: replay?.revision_before ?? current.revision,
                action: 'publish',
                automatic: true,
                expectedProductFingerprint:fingerprint(expected),
              });
              const result = {
                id: item.id,
                status: 'published',
                draft,
                publication,
              };
              results.push(result);
              fs.appendFileSync(
                path.join(output, 'results.jsonl'),
                JSON.stringify(result) + '\n',
                { mode: 0o600 },
              );
            } catch (e) {
              if (
                /DOCUMENTARY_(HUMAN_PROTECTED|REVISION_CONFLICT|SOURCE_CHANGED)/.test(
                  e.message,
                )
              ) {
                const result = {
                  id: item.id,
                  status: 'held',
                  reason: e.message,
                };
                results.push(result);
                fs.appendFileSync(
                  path.join(output, 'results.jsonl'),
                  JSON.stringify(result) + '\n',
                  { mode: 0o600 },
                );
              } else throw e;
            }
          }
        } catch (error) {
          failure ||= error;
        } finally {
          await db.end();
        }
      }),
    );
    if (failure) throw failure;
    const report = {
      batch: path.basename(file),
      products: items.length,
      counts: results.reduce(
        (r, x) => ((r[x.status] = (r[x.status] || 0) + 1), r),
        {},
      ),
      results,
    };
    fs.writeFileSync(
      path.join(output, 'summary.json'),
      JSON.stringify(report, null, 2) + '\n',
      { mode: 0o600 },
    );
    return report;
  } finally {
    await db.end();
  }
}
if (require.main === module) {
  if (process.argv[2] !== '--publish-reviewed-batch')
    throw Error('EXPLICIT_PUBLICATION_FLAG_REQUIRED');
  publish(...process.argv.slice(3))
    .then((r) =>
      console.log(JSON.stringify({ products: r.products, counts: r.counts })),
    )
    .catch((e) => {
      console.error(
        JSON.stringify({
          error: /^[A-Z_]+$/.test(e.message)
            ? e.message
            : 'STRUCTURED_PUBLICATION_INTERRUPTED',
          sqlstate: e.code || null,
        }),
      );
      process.exitCode = 1;
    });
}
module.exports = { publish };
