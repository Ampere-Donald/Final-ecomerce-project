'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {saveStructured}=require('./structured-store.cjs');
async function main(){
 if(process.argv[2]!=='--rollback-structured-run')throw Error('EXPLICIT_ROLLBACK_FLAG_REQUIRED');
 const [run,out]=process.argv.slice(3);
 if(!run||!out||!process.env.DOCUMENTARY_SOURCE_ENV)throw Error('RUN_AND_SOURCE_REQUIRED');
 const rows=fs.readFileSync(path.join(run,'results.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 const ids=[...new Set(rows.filter(r=>r.status==='published').map(r=>r.publication.eventId))].reverse();
 const cfg=require('dotenv').parse(fs.readFileSync(process.env.DOCUMENTARY_SOURCE_ENV));
 const db=new Client({connectionString:cfg.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 try{
  await db.connect();const results=[];
  for(const id of ids){
   const e=(await db.query(`SELECT * FROM documentary_event WHERE id=$1 AND "after"->>'kind'='structured-publish'`,[id])).rows[0];
   if(!e)throw Error('STRUCTURED_PUBLICATION_EVENT_REQUIRED');
   try{const result=await saveStructured(db,{productId:e.product_id,actorId:'owner-authorized-documentary-rollback',operationId:'structured-rollback-run:'+id,expectedRevision:e.revision_after,expectedProductFingerprint:e.after.documentary.published_content.productFingerprint,action:'rollback',automatic:true});results.push({id:e.product_id,...result});}
   catch(error){if(/^DOCUMENTARY_/.test(error.message))results.push({id:e.product_id,action:'held',reason:error.message});else throw error;}
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n',{mode:0o600});
  }
  console.log(JSON.stringify({products:results.length,held:results.filter(r=>r.action==='held').length}));
 }finally{await db.end();}
}
if(require.main===module)main().catch(e=>{console.error(/^[A-Z_]+$/.test(e.message)?e.message:'STRUCTURED_ROLLBACK_INTERRUPTED');process.exitCode=1;});
