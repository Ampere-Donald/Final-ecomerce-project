'use strict';
const {randomUUID,createHash}=require('node:crypto');
/** Stage documentary evidence only. Never changes public product columns. */
async function stageProposal(client,{proposal,batchId,actorId,operationId}) {
 const e=proposal?.enrichment;
 if(!proposal?.id || !batchId || !actorId || !operationId || !e || !Array.isArray(e.sources) || !e.proposed_changes || typeof e.status!=='string')throw Error('INVALID_STAGING_REQUEST');
 const flag=e.auto_publish_description_eligible;
 if(flag!==undefined && typeof flag!=='boolean')throw Error('INVALID_ELIGIBILITY');
 const status=flag===undefined?'classification_requise':flag?'enrichi_ia_a_verifier':'identification_insuffisante';
 const requestHash=createHash('sha256').update(JSON.stringify({proposal,batchId,actorId})).digest('hex');
 await client.query('BEGIN');
 try {
  const p=(await client.query('SELECT id,nom_produit,description FROM produit WHERE id=$1 FOR UPDATE',[proposal.id])).rows[0];
  if(!p)throw Error('PRODUCT_NOT_FOUND');
  const previous=(await client.query('SELECT * FROM documentary_event WHERE operation_id=$1',[operationId])).rows[0];
  if(previous){if(previous.action!=='import' || previous.after.requestHash!==requestHash)throw Error('IDEMPOTENCY_KEY_REUSED');await client.query('COMMIT');return {action:'already_staged',eventId:previous.id};}
  const before=(await client.query('SELECT * FROM product_documentary WHERE product_id=$1 FOR UPDATE',[p.id])).rows[0];
  if(before?.locked || before?.status==='valide_admin'){await client.query('ROLLBACK');return {action:'protected',productId:p.id};}
  const revision=(before?.revision || 0)+1;
  await client.query(`INSERT INTO product_documentary(product_id,revision,status,proposal,sources,uncertainties,batch_id)
   VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(product_id) DO UPDATE SET revision=EXCLUDED.revision,
   status=EXCLUDED.status,proposal=EXCLUDED.proposal,sources=EXCLUDED.sources,uncertainties=EXCLUDED.uncertainties,
   batch_id=EXCLUDED.batch_id,origin='ai',updated_at=CURRENT_TIMESTAMP`,[p.id,revision,status,JSON.stringify(e),JSON.stringify(e.sources),JSON.stringify(e.uncertainties || []),batchId]);
  const after=(await client.query('SELECT * FROM product_documentary WHERE product_id=$1',[p.id])).rows[0];
  const eventId=randomUUID();
  await client.query(`INSERT INTO documentary_event(id,operation_id,product_id,batch_id,action,actor_id,"before","after",revision_before,revision_after)
   VALUES($1,$2,$3,$4,'import',$5,$6,$7,$8,$9)`,[eventId,operationId,p.id,batchId,actorId,JSON.stringify({title:p.nom_produit,description:p.description,documentary:before || null}),JSON.stringify({title:p.nom_produit,description:p.description,documentary:after,requestHash}),(before?.revision || 0),revision]);
  await client.query('COMMIT');return {action:'staged',productId:p.id,status,revision};
 }catch(error){await client.query('ROLLBACK');throw error;}
}
module.exports={stageProposal};
