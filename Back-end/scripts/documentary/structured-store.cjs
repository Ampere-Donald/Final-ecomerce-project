'use strict';
const { randomUUID, createHash } = require('node:crypto');
const { normalizeContent, fingerprint } = require('./content.cjs');
async function saveStructured(client, request) {
  const {
    productId,
    actorId,
    operationId,
    expectedRevision,
    action,
    automatic = false,
    expectedProductFingerprint,
  } = request;
  if (
    !productId ||
    !actorId ||
    !operationId ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    !['draft', 'publish', 'rollback'].includes(action) ||
    typeof automatic !== 'boolean'
  )
    throw Error('INVALID_CONTENT_REQUEST');
  const content = action === 'draft' ? normalizeContent(request.content) : null;
  const requestHash = createHash('sha256')
    .update(
      JSON.stringify({
        productId,
        actorId,
        expectedRevision,
        action,
        content,
        automatic,
        expectedProductFingerprint,
      }),
    )
    .digest('hex');
  await client.query('BEGIN');
  try {
    const p = (
      await client.query(
        'SELECT id,nom_produit,description,marque,reference_fabricant,est_actif FROM produit WHERE id=$1 FOR UPDATE',
        [productId],
      )
    ).rows[0];
    if (!p) throw Error('PRODUCT_NOT_FOUND');
    const prior = (
      await client.query(
        'SELECT * FROM documentary_event WHERE operation_id=$1',
        [operationId],
      )
    ).rows[0];
    if (prior) {
      if (
        prior.after.requestHash !== requestHash ||
        prior.after.kind !== 'structured-' + action
      )
        throw Error('IDEMPOTENCY_KEY_REUSED');
      await client.query('COMMIT');
      return { action: 'already_applied', eventId: prior.id };
    }
    const before = (
      await client.query(
        'SELECT * FROM product_documentary WHERE product_id=$1 FOR UPDATE',
        [productId],
      )
    ).rows[0];
    if ((before?.revision || 0) !== expectedRevision)
      throw Error('DOCUMENTARY_REVISION_CONFLICT');
    if (automatic && before?.locked) throw Error('DOCUMENTARY_HUMAN_PROTECTED');
    if ((automatic && !expectedProductFingerprint) || (expectedProductFingerprint && expectedProductFingerprint!==fingerprint(p))) throw Error('DOCUMENTARY_SOURCE_CHANGED');
    let published = before?.published_content || null,
      draft = before?.draft_content || null;
    if (action === 'draft')
      draft = { ...content, productFingerprint: fingerprint(p) };
    if (action === 'publish') {
      if (!p.est_actif) throw Error('INVALID_CONTENT_INACTIVE_PRODUCT');
      if (!draft || draft.productFingerprint !== fingerprint(p))
        throw Error('DOCUMENTARY_SOURCE_CHANGED');
      published = {
        ...normalizeContent({
          schemaVersion: draft.schemaVersion,
          family: draft.family,
          locales: draft.locales,
        }),
        productFingerprint: draft.productFingerprint,
      };
    }
    if (action === 'rollback') {
      const last = (
        await client.query(
          `SELECT * FROM documentary_event WHERE product_id=$1 AND "after"->>'kind'='structured-publish' ORDER BY created_at DESC,id DESC LIMIT 1`,
          [productId],
        )
      ).rows[0];
      if (
        !last ||
        last.revision_after !== expectedRevision ||
        JSON.stringify(last.after.documentary.published_content) !==
          JSON.stringify(published)
      )
        throw Error('DOCUMENTARY_REVISION_CONFLICT');
      published = last.before.documentary?.published_content || null;
    }
    await client.query(
      `INSERT INTO product_documentary(product_id,revision,draft_content,published_content,published_at,locked,origin)
      VALUES($1,$2,$3,$4,CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE NULL END,$6,$7)
      ON CONFLICT(product_id) DO UPDATE SET revision=EXCLUDED.revision,draft_content=EXCLUDED.draft_content,published_content=EXCLUDED.published_content,
      published_at=CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE product_documentary.published_at END,
      locked=product_documentary.locked OR EXCLUDED.locked,origin=EXCLUDED.origin,updated_at=CURRENT_TIMESTAMP`,
      [
        productId,
        expectedRevision + 1,
        draft ? JSON.stringify(draft) : null,
        published ? JSON.stringify(published) : null,
        action !== 'draft',
        !automatic,
        automatic ? 'ai' : 'admin',
      ],
    );
    const after = (
      await client.query(
        'SELECT * FROM product_documentary WHERE product_id=$1',
        [productId],
      )
    ).rows[0];
    const eventId = randomUUID();
    await client.query(
      `INSERT INTO documentary_event(id,operation_id,product_id,batch_id,action,actor_id,"before","after",revision_before,revision_after) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        eventId,
        operationId,
        productId,
        before?.batch_id || null,
        action === 'draft'
          ? 'edit'
          : action === 'publish'
            ? 'publish'
            : 'rollback',
        actorId,
        JSON.stringify({ documentary: before || null }),
        JSON.stringify({
          kind: 'structured-' + action,
          documentary: after,
          requestHash,
        }),
        expectedRevision,
        expectedRevision + 1,
      ],
    );
    await client.query('COMMIT');
    return { action, revision: expectedRevision + 1, eventId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
module.exports = { saveStructured };
