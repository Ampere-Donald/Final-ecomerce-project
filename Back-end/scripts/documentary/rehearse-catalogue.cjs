'use strict';
// Complete catalogue rehearsal: PostgreSQL embedded in memory, no network database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {rollbackBatch}=require('./rollback-batch.cjs');const {PGlite}=require('@electric-sql/pglite');const {decide}=require('./policy.cjs');const {stageProposal}=require('./stage.cjs');const {publishCandidate}=require('./store.cjs');const {rollbackEvent}=require('./rollback.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=file=>fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
async function main(){
 if(process.argv[2]!=='--rehearse-local')throw Error('USE_EXPLICIT_REHEARSE_LOCAL');
 const input=process.env.DOCUMENTARY_TEST_INPUT;if(!input)throw Error('DOCUMENTARY_TEST_INPUT_REQUIRED');
 const output=path.resolve(process.env.DOCUMENTARY_REHEARSAL_OUTPUT || path.join(__dirname,'../../.local-postgres/documentary/runs',new Date().toISOString().replace(/[:.]/g,'-')));
 if(fs.existsSync(output))throw Error('OUTPUT_EXISTS');fs.mkdirSync(output,{recursive:true,mode:0o700});
 const proposalFile=path.join(input,'propositions_cumulees_lots_01_a_19.jsonl');const proposals=read(proposalFile);
 const original=new Map(read(path.resolve(input,'../catalog-enrichment/catalogue_complet.jsonl')).map(r=>[r.id,r]));
 const snapshot=read(path.join(input,'current-snapshot/catalogue_complet.jsonl'));
 if(proposals.length!==1933 || new Set(proposals.map(p=>p.id)).size!==1933 || snapshot.length!==1933)throw Error('CATALOGUE_COVERAGE_MISMATCH');
 const baseline=fs.readFileSync(path.join(__dirname,'../../.local-postgres/documentary/baseline.sql'),'utf8');if(baseline.length<50000)throw Error('BASELINE_SQL_REQUIRED');
 const db=new PGlite();let restored;const log=[];const events=[];
 try{
  await db.exec(baseline);
  const triggers=fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261028150000_catalogue_review_workflow/migration.sql'),'utf8');
  await db.exec(triggers.slice(triggers.indexOf('CREATE OR REPLACE FUNCTION')));
  await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261114000000_documentary_workflow/migration.sql'),'utf8'));
  for(const cat of new Map(snapshot.map(r=>[r.original.category.id,r.original.category])).values())await db.query('INSERT INTO categorie(id,nom,version) VALUES($1,$2,1)',[cat.id,cat.name]);
  for(const sub of new Map(snapshot.filter(r=>r.original.subcategory).map(r=>[r.original.subcategory.id,r.original.subcategory])).values())await db.query('INSERT INTO sous_categorie(id,nom,categorie_id) VALUES($1,$2,$3)',[sub.id,sub.name,sub.category_id]);
  for(const r of snapshot){const c=r.commercial_snapshot;const images=r.images;await db.query(`INSERT INTO produit(id,id_categorie,sous_categorie_id,nom_produit,description,date_ajout,code,code_famille,marque,prix_detail,prix_demi_gros,prix_gros,quantite_gros,prix_promo,fin_promo,quantite_stock,image_url,image_url2,image_url3,est_actif)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true)`,[r.id,r.original.category.id,r.original.subcategory?.id || null,r.original.title,r.original.description,r.created_at,r.internal_reference,r.family_code,r.original.brand,c.retail_price,c.semi_wholesale_price,c.wholesale_price,c.wholesale_quantity,c.promotion_price,c.promotion_end,c.stock_quantity,...['image_url','image_url2','image_url3'].map(k=>images.find(i=>i.source_field===k)?.stored_url || null)]);}
  const before=(await db.query('SELECT * FROM produit ORDER BY id')).rows;
  const archive=await db.dumpDataDir();const bytes=Buffer.from(await archive.arrayBuffer());fs.writeFileSync(path.join(output,'backup-fixtures-pglite.tar.gz'),bytes,{mode:0o600});
  restored=new PGlite({loadDataDir:archive});
  if(hash(JSON.stringify((await restored.query('SELECT * FROM produit ORDER BY id')).rows))!==hash(JSON.stringify(before)))throw Error('BACKUP_RESTORE_MISMATCH');
  const sourceHash=hash(fs.readFileSync(proposalFile));const batchId='local-'+sourceHash;
  await db.query('INSERT INTO documentary_batch(id,source_sha256,source_name,actor_id) VALUES($1,$2,$3,$4)',[batchId,sourceHash,'propositions_cumulees_lots_01_a_19.jsonl','local-rehearsal']);
  for(const p of proposals){
   const prior=original.get(p.id),now=snapshot.find(r=>r.id===p.id);if(!prior||!now)throw Error('UNKNOWN_UUID');
   const context={proposal:p,original:{id:prior.id,title:prior.original.title,description:prior.original.description},current:{id:now.id,title:now.original.title,description:now.original.description,active:now.active}};
   let decision;try{decision=decide(context);}catch(e){decision={action:'error',reason:e.message};}
   const staged=await stageProposal(db,{proposal:p,batchId,actorId:'local-rehearsal',operationId:'stage-'+sourceHash+'-'+p.id});
   let publication=null;
   if(decision.action==='candidate'){
    const req={proposal:p,original:context.original,batchId,actorId:'local-rehearsal',operationId:'publish-'+sourceHash+'-'+p.id};
    publication=await publishCandidate(db,req);
    if(publication.action==='published') {
      if((await publishCandidate(db,req)).action!=='already_applied')throw Error('PUBLICATION_NOT_IDEMPOTENT');
      events.push({eventId:publication.eventId,operationId:'rollback-'+sourceHash+'-'+p.id,actorId:'local-rehearsal'});
    } else if(publication.action==='conflict' || publication.action==='review') decision=publication;
    else throw Error('UNEXPECTED_PUBLICATION_RESULT');
   }
   log.push({id:p.id,internal_reference:p.internal_reference,decision:decision.action,reason:decision.reason || null,risks:decision.risks || [],staged:staged.action,published:publication?.action || null});
   if(log.length%250===0)console.log(JSON.stringify({processed:log.length,total:1933,mode:'LOCAL_ONLY'}));
  }
  const published=(await db.query('SELECT * FROM produit ORDER BY id')).rows;
  const immutable=rows=>rows.map(({nom_produit,description,version,identification_revision,identification_verifie_revision,identification_verifie_at,identification_verifie_par,...r})=>r);
  if(hash(JSON.stringify(immutable(before)))!==hash(JSON.stringify(immutable(published))))throw Error('FORBIDDEN_PRODUCT_CHANGE');
  const rolledBack=await rollbackBatch(db,{batchId,actorId:'local-rehearsal'});if((rolledBack.counts.restored || 0)!==events.length)throw Error('ROLLBACK_FAILED');const repeated=await rollbackBatch(db,{batchId,actorId:'local-rehearsal'});if((repeated.counts.already_restored || 0)!==events.length)throw Error('ROLLBACK_NOT_IDEMPOTENT');
  const after=(await db.query('SELECT * FROM produit ORDER BY id')).rows;
  const restoredContent=rows=>rows.map(({version,identification_revision,identification_verifie_revision,identification_verifie_at,identification_verifie_par,...r})=>r);
  if(hash(JSON.stringify(restoredContent(before)))!==hash(JSON.stringify(restoredContent(after))))throw Error('RESTORED_CONTENT_MISMATCH');
  const counts={};for(const r of log){const k=r.reason || r.decision;counts[k]=(counts[k]||0)+1;}
  const summary={mode:'LOCAL_ONLY',source_sha256:sourceHash,products:1933,decisions:counts,staged:log.length,published:events.length,restored:events.length,backup_restored:true,backup_sha256:hash(bytes),backup_scope:'Pinned complete schema with catalogue fixtures; empty customer and business-history tables. Not a production backup.',forbidden_product_changes:0,production_written:false};
  fs.writeFileSync(path.join(output,'decisions.jsonl'),log.map(r=>JSON.stringify(r)).join('\n')+'\n',{mode:0o600});fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({...summary,output}));
 }finally{if(restored)await restored.close();await db.close();}
}
main().catch(e=>{console.error(JSON.stringify({error:/^[A-Z_]+$/.test(e.message)?e.message:'LOCAL_REHEARSAL_FAILED',sqlstate:e.code || null,constraint:e.constraint || null,table:e.table || null,production_written:false}));process.exitCode=1;});
