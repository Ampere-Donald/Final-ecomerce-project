'use strict';
const { randomUUID, createHash } = require('node:crypto');
const { decide } = require('./policy.cjs');
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Internal adapter. Caller supplies an isolated client; no connection or deployment here. */
async function publishCandidate(client, request) {
  const { proposal, original, batchId, actorId, operationId } = request;
  if (!batchId || !actorId || !operationId) throw Error('AUDIT_ID_REQUIRED');
  const requestHash = digest({ proposal, original, batchId, actorId });
  await client.query('BEGIN');
  try {
    const p = (await client.query("SELECT id, nom_produit, description, est_actif, to_jsonb(p)->>'marque' AS marque FROM produit p WHERE id=$1 FOR UPDATE", [proposal.id])).rows[0];
    if (!p) throw Error('PRODUCT_NOT_FOUND');
    const previous = (await client.query('SELECT * FROM documentary_event WHERE operation_id=$1', [operationId])).rows[0];
    if (previous) {
      if (previous.action !== 'publish' || previous.after.requestHash !== requestHash) throw Error('IDEMPOTENCY_KEY_REUSED');
      await client.query('COMMIT');
      return { action: 'already_applied', eventId: previous.id };
    }
    const doc = (await client.query('SELECT * FROM product_documentary WHERE product_id=$1 FOR UPDATE', [p.id])).rows[0];
    const result = decide({ proposal, original, current: { id:p.id, title:p.nom_produit, description:p.description, active:p.est_actif }, document:doc });
    if (result.action !== 'candidate') { await client.query('ROLLBACK'); return result; }
    if (p.marque != null && result.text.display_title !== p.nom_produit) {
      const collision = (await client.query('SELECT id FROM produit WHERE marque=$1 AND nom_produit=$2 AND id<>$3 LIMIT 1', [p.marque,result.text.display_title,p.id])).rows[0];
      if (collision) { await client.query('ROLLBACK'); return {action:'conflict',reason:'title_brand_collision'}; }
    }
    const before = { title:p.nom_produit, description:p.description, documentary:doc || null };
    const revision = doc?.revision || 0;
    await client.query(`INSERT INTO product_documentary(product_id, revision, status, short_description, proposal, sources, uncertainties, batch_id)
      VALUES($1,$2,'enrichi_ia_a_verifier',$3,$4,$5,$6,$7)
      ON CONFLICT(product_id) DO UPDATE SET revision=EXCLUDED.revision,status=EXCLUDED.status,
      short_description=EXCLUDED.short_description,proposal=EXCLUDED.proposal,sources=EXCLUDED.sources,
      uncertainties=EXCLUDED.uncertainties,batch_id=EXCLUDED.batch_id,origin='ai',updated_at=CURRENT_TIMESTAMP`,
      [p.id,revision+1,result.text.short_description,JSON.stringify(proposal.enrichment),JSON.stringify(proposal.enrichment.sources),JSON.stringify(proposal.enrichment.uncertainties || []),batchId]);
    await client.query("SELECT set_config('newoteg.documentary_managed','true',true)");
    await client.query('UPDATE produit SET nom_produit=$2,description=$3,version=version+1 WHERE id=$1', [p.id,result.text.display_title,result.text.description]);
    const afterDoc = (await client.query('SELECT * FROM product_documentary WHERE product_id=$1',[p.id])).rows[0];
    const eventId=randomUUID();
    await client.query(`INSERT INTO documentary_event(id,operation_id,product_id,batch_id,action,actor_id,"before","after",revision_before,revision_after)
      VALUES($1,$2,$3,$4,'publish',$5,$6,$7,$8,$9)`, [eventId,operationId,p.id,batchId,actorId,JSON.stringify(before),JSON.stringify({title:result.text.display_title,description:result.text.description,documentary:afterDoc,requestHash}),revision,revision+1]);
    await client.query('COMMIT');
    return { action:'published',eventId,revision:revision+1 };
  } catch (error) { await client.query('ROLLBACK'); if(error.code==='23505' && ['produit_marque_nom_produit_key','unique_produit'].includes(error.constraint)) return {action:'conflict',reason:'title_brand_collision'}; throw error; }
}
module.exports = { publishCandidate };
