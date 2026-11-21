'use strict';
const {rollbackEvent}=require('./rollback.cjs');
async function rollbackBatch(client,{batchId,actorId}){
 if(typeof batchId!=='string'||!batchId||typeof actorId!=='string'||!actorId)throw Error('AUDIT_ID_REQUIRED');
 const events=(await client.query("SELECT id,product_id FROM documentary_event WHERE batch_id=$1 AND action='publish' ORDER BY created_at DESC,id DESC",[batchId])).rows;
 const results=[];
 for(const event of events){
  try{results.push({productId:event.product_id,publicationEventId:event.id,...await rollbackEvent(client,{eventId:event.id,operationId:'rollback-batch:'+batchId+':'+event.id,actorId})});}
  catch(error){results.push({productId:event.product_id,publicationEventId:event.id,action:'error',reason:/^[A-Z_]+$/.test(error.message)?error.message:'ROLLBACK_EVENT_FAILED',sqlstate:error.code || null});}
 }
 const counts={};for(const r of results)counts[r.action]=(counts[r.action]||0)+1;
 return {batchId,events:events.length,counts,results};
}
module.exports={rollbackBatch};
