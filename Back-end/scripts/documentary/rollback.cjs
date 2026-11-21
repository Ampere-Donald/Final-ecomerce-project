'use strict';
const { randomUUID } = require('node:crypto');
/** Restore one publication event. Call sequentially per batch and report conflicts. */
async function rollbackEvent(client, {eventId,operationId,actorId}) {
  if(!eventId || !operationId || !actorId)throw Error('AUDIT_ID_REQUIRED');
  await client.query('BEGIN');
  try {
    const event=(await client.query("SELECT * FROM documentary_event WHERE id=$1 AND action='publish'",[eventId])).rows[0];
    if(!event)throw Error('PUBLICATION_EVENT_NOT_FOUND');
    const product=(await client.query('SELECT id,nom_produit,description FROM produit WHERE id=$1 FOR UPDATE',[event.product_id])).rows[0];
    const previous=(await client.query('SELECT * FROM documentary_event WHERE operation_id=$1',[operationId])).rows[0];
    if(previous){
      if(previous.action!=='rollback' || previous.after.restoredEventId!==eventId || previous.actor_id!==actorId)throw Error('IDEMPOTENCY_KEY_REUSED');
      await client.query('COMMIT');return {action:'already_restored',eventId:previous.id};
    }
    const doc=(await client.query('SELECT * FROM product_documentary WHERE product_id=$1 FOR UPDATE',[event.product_id])).rows[0];
    if(!product || !doc || doc.locked || doc.status==='valide_admin' || doc.revision!==event.revision_after || product.nom_produit!==event.after.title || product.description!==event.after.description) {
      await client.query('ROLLBACK');return {action:'conflict',reason:'changed_or_human_protected',productId:event.product_id};
    }
    const prior=event.before.documentary;
    const nextRevision=doc.revision+1;
    await client.query("SELECT set_config('newoteg.documentary_managed','true',true)");
    await client.query('UPDATE produit SET nom_produit=$2,description=$3,version=version+1 WHERE id=$1',[product.id,event.before.title,event.before.description]);
    await client.query(`UPDATE product_documentary SET revision=$2,status=$3,locked=$4,short_description=$5,
      proposal=$6,sources=$7,uncertainties=$8,origin='rollback',batch_id=$9,
      reviewed_at=$10,reviewed_by=$11,updated_at=CURRENT_TIMESTAMP WHERE product_id=$1`,[
      product.id,nextRevision,prior?.status || 'classification_requise',prior?.locked || false,
      prior?.short_description ?? null,prior?.proposal==null?null:JSON.stringify(prior.proposal),JSON.stringify(prior?.sources || []),JSON.stringify(prior?.uncertainties || []),prior?.batch_id ?? null,prior?.reviewed_at ?? null,prior?.reviewed_by ?? null]);
    const afterDoc=(await client.query('SELECT * FROM product_documentary WHERE product_id=$1',[product.id])).rows[0];
    const rollbackId=randomUUID();
    await client.query(`INSERT INTO documentary_event(id,operation_id,product_id,batch_id,action,actor_id,"before","after",revision_before,revision_after)
      VALUES($1,$2,$3,$4,'rollback',$5,$6,$7,$8,$9)`,[rollbackId,operationId,product.id,event.batch_id,actorId,
      JSON.stringify({title:product.nom_produit,description:product.description,documentary:doc}),
      JSON.stringify({title:event.before.title,description:event.before.description,documentary:afterDoc,restoredEventId:eventId}),doc.revision,nextRevision]);
    await client.query('COMMIT');return {action:'restored',eventId:rollbackId,revision:nextRevision};
  }catch(error){await client.query('ROLLBACK');throw error;}
}
module.exports={rollbackEvent};
