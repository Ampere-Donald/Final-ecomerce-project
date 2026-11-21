'use strict';
const {randomUUID,createHash}=require('node:crypto');
const {proposedText}=require('./policy.cjs');
async function editDocument(client,request){
 const {productId,actorId,operationId,expectedRevision,text,validate=false}=request;
 if(!productId || !actorId || !operationId || !Number.isInteger(expectedRevision) || expectedRevision<0 || typeof validate!=='boolean')throw Error('INVALID_EDIT_REQUEST');
 if(Object.keys(text || {}).some(k=>!['display_title','short_description','description'].includes(k)))throw Error('UNAUTHORIZED_FIELD');
 const clean=proposedText({enrichment:{proposed_changes:text}});
 const requestHash=createHash('sha256').update(JSON.stringify({productId,actorId,expectedRevision,clean,validate})).digest('hex');
 await client.query('BEGIN');
 try{
  const p=(await client.query('SELECT id,nom_produit,description FROM produit WHERE id=$1 FOR UPDATE',[productId])).rows[0];
  if(!p)throw Error('PRODUCT_NOT_FOUND');
  const previous=(await client.query('SELECT * FROM documentary_event WHERE operation_id=$1',[operationId])).rows[0];
  if(previous){if(previous.action!==(validate?'validate':'edit') || previous.after.requestHash!==requestHash)throw Error('IDEMPOTENCY_KEY_REUSED');await client.query('COMMIT');return {action:'already_applied',eventId:previous.id};}
  const doc=(await client.query('SELECT * FROM product_documentary WHERE product_id=$1 FOR UPDATE',[productId])).rows[0];
  if((doc?.revision || 0)!==expectedRevision)throw Error('DOCUMENTARY_REVISION_CONFLICT');
  const status=validate?'valide_admin':(doc?.status==='valide_admin'?'valide_admin':'enrichi_ia_a_verifier');
  await client.query("SELECT set_config('newoteg.documentary_managed','true',true)");
    await client.query('UPDATE produit SET nom_produit=$2,description=$3,version=version+1 WHERE id=$1',[productId,clean.display_title,clean.description]);
  await client.query(`INSERT INTO product_documentary(product_id,revision,status,locked,short_description,origin,reviewed_at,reviewed_by)
   VALUES($1,$2,$3,true,$4,'admin',CURRENT_TIMESTAMP,$5)
   ON CONFLICT(product_id) DO UPDATE SET revision=EXCLUDED.revision,status=EXCLUDED.status,locked=true,
   short_description=EXCLUDED.short_description,origin='admin',updated_at=CURRENT_TIMESTAMP,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=EXCLUDED.reviewed_by`,[productId,expectedRevision+1,status,clean.short_description,actorId]);
  const afterDoc=(await client.query('SELECT * FROM product_documentary WHERE product_id=$1',[productId])).rows[0];
  const eventId=randomUUID();
  await client.query(`INSERT INTO documentary_event(id,operation_id,product_id,batch_id,action,actor_id,"before","after",revision_before,revision_after)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[eventId,operationId,productId,doc?.batch_id || null,validate?'validate':'edit',actorId,JSON.stringify({title:p.nom_produit,description:p.description,documentary:doc || null}),JSON.stringify({title:clean.display_title,description:clean.description,documentary:afterDoc,requestHash}),expectedRevision,expectedRevision+1]);
  await client.query('COMMIT');return {action:'saved',eventId,revision:expectedRevision+1,locked:true,status};
 }catch(error){await client.query('ROLLBACK');throw error;}
}
module.exports={editDocument};
