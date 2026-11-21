const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {PGlite}=require('@electric-sql/pglite');
const {stageProposal}=require('./stage.cjs');const {publishCandidate}=require('./store.cjs');const {rollbackEvent}=require('./rollback.cjs');const {proposedText,publicationRisks}=require('./policy.cjs');
test('complete pinned schema, existing revision trigger, documentary migration and backup restoration',async()=>{
 const input=process.env.DOCUMENTARY_TEST_INPUT;if(!input)throw Error('DOCUMENTARY_TEST_INPUT required');
 const sql=fs.readFileSync(path.join(__dirname,'../../.local-postgres/documentary/baseline.sql'),'utf8');assert.ok(sql.length>50000);
 let db=new PGlite();let restored;
 try{
 await db.exec(sql);
 const oldMigration=fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261028150000_catalogue_review_workflow/migration.sql'),'utf8');
 await db.exec(oldMigration.slice(oldMigration.indexOf('CREATE OR REPLACE FUNCTION')));
 await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261114000000_documentary_workflow/migration.sql'),'utf8'));
 const tables=(await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows;assert.ok(tables.length>40);
 const proposals=fs.readFileSync(path.join(input,'propositions_cumulees_lots_01_a_19.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(p=>{try{const text=proposedText(p);return p.enrichment.auto_publish_description_eligible===true && !publicationRisks(text).length;}catch{return false;}});
 const snapshot=new Map(fs.readFileSync(path.join(input,'current-snapshot/catalogue_complet.jsonl'),'utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return [r.id,r];}));
 const sample=Array.from({length:25},(_,i)=>proposals[Math.floor(i*proposals.length/25)]);
 await db.query("INSERT INTO categorie(id,nom,version) VALUES('fixture-category','Test local',1)");
 await db.query("INSERT INTO documentary_batch(id,source_sha256,source_name,actor_id) VALUES('batch','schema-test','fixture','test')");
 const selected=[];
 for(const p of sample){const r=snapshot.get(p.id);await db.query(`INSERT INTO produit(id,id_categorie,nom_produit,description,date_ajout,version,prix_detail,quantite_stock,image_url) VALUES($1,'fixture-category',$2,$3,CURRENT_TIMESTAMP,1,$4,$5,$6)`,[r.id,r.original.title,r.original.description,r.commercial_snapshot.retail_price,r.commercial_snapshot.stock_quantity,r.images[0]?.url]);selected.push({p,r});}
 const before=(await db.query('SELECT * FROM produit ORDER BY id')).rows;
 const archive=await db.dumpDataDir();
 restored=new PGlite({loadDataDir:archive});
 assert.deepEqual((await restored.query('SELECT * FROM produit ORDER BY id')).rows,before);
 assert.equal((await restored.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n,tables.length);
 const events=[];
 for(const {p,r} of selected){await stageProposal(db,{proposal:p,batchId:'batch',actorId:'test',operationId:'stage-'+p.id});const result=await publishCandidate(db,{proposal:p,original:{id:r.id,title:r.original.title,description:r.original.description},batchId:'batch',actorId:'test',operationId:'publish-'+p.id});assert.equal(result.action,'published');events.push({eventId:result.eventId,operationId:'restore-'+p.id,actorId:'test'});}
 for(const e of events)assert.equal((await rollbackEvent(db,e)).action,'restored');
 const after=(await db.query('SELECT * FROM produit ORDER BY id')).rows;
 for(let i=0;i<after.length;i++){
   const p=sample.find(p=>p.id===before[i].id);
   const changesTitle=p.enrichment.proposed_changes.display_title!==before[i].nom_produit;
   assert.equal(after[i].identification_revision,before[i].identification_revision+(changesTitle?2:0));
   assert.equal(after[i].version,before[i].version+2);
 }
 const content=rows=>rows.map(({version,identification_revision,...rest})=>rest);
 assert.deepEqual(content(after),content(before));
 }finally{if(restored)await restored.close();await db.close();}
});
