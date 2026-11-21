const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {editDocument}=require('./manual-edit.cjs');
const {PGlite}=require('@electric-sql/pglite');const {publishCandidate}=require('./store.cjs');const {rollbackEvent}=require('./rollback.cjs');const {proposedText,publicationRisks}=require('./policy.cjs');
test('isolated PostgreSQL: 25 real proposals, idempotence and restoration',async()=>{
 const input=process.env.DOCUMENTARY_TEST_INPUT;if(!input)throw Error('DOCUMENTARY_TEST_INPUT required; no database credentials used');
 const proposals=fs.readFileSync(path.join(input,'propositions_cumulees_lots_01_a_19.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(p=>{try{const text=proposedText(p);return p.enrichment.auto_publish_description_eligible===true && !publicationRisks(text).length;}catch{return false;}});
 const snapshot=new Map(fs.readFileSync(path.join(input,'current-snapshot/catalogue_complet.jsonl'),'utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return [r.id,r];}));
 const selected=Array.from({length:25},(_,i)=>proposals[Math.floor(i*proposals.length/25)]);
 const db=new PGlite();try{
 await db.exec('CREATE TABLE produit(id TEXT PRIMARY KEY,nom_produit VARCHAR(150),description TEXT,est_actif BOOLEAN,version INTEGER DEFAULT 1,prix_detail DOUBLE PRECISION,quantite_stock INTEGER,image_url TEXT)');
 await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261114000000_documentary_workflow/migration.sql'),'utf8'));
 await db.query('INSERT INTO documentary_batch(id,source_sha256,source_name,actor_id) VALUES($1,$2,$3,$4)',['batch','isolated-test','real-proposal-fixture','test']);
 const events=[];
 for(const proposal of selected){const r=snapshot.get(proposal.id);assert.ok(r);const before={id:r.id,title:r.original.title,description:r.original.description};
 await db.query('INSERT INTO produit(id,nom_produit,description,est_actif,prix_detail,quantite_stock,image_url) VALUES($1,$2,$3,true,$4,$5,$6)',[r.id,before.title,before.description,r.commercial_snapshot.retail_price,r.commercial_snapshot.stock_quantity,r.images[0]?.url]);
 const req={proposal,original:before,batchId:'batch',actorId:'test',operationId:'publish-'+r.id};
 const result=await publishCandidate(db,req);assert.equal(result.action,'published');assert.equal((await publishCandidate(db,req)).action,'already_applied');events.push({eventId:result.eventId,operationId:'rollback-'+r.id,actorId:'test',r});
 const actual=(await db.query('SELECT * FROM produit WHERE id=$1',[r.id])).rows[0];assert.equal(actual.prix_detail,r.commercial_snapshot.retail_price);assert.equal(actual.quantite_stock,r.commercial_snapshot.stock_quantity);assert.equal(actual.image_url,r.images[0]?.url);assert.equal(actual.description,proposal.enrichment.proposed_changes.description);
 }
 for(const e of events){assert.equal((await rollbackEvent(db,e)).action,'restored');assert.equal((await rollbackEvent(db,e)).action,'already_restored');const actual=(await db.query('SELECT * FROM produit WHERE id=$1',[e.r.id])).rows[0];assert.equal(actual.description,e.r.original.description);assert.equal(actual.nom_produit,e.r.original.title);}
 assert.equal((await db.query('SELECT count(*)::int n FROM documentary_event')).rows[0].n,50);
 const r=selected[0],current=snapshot.get(r.id);
 const edit={productId:r.id,actorId:'admin-test',operationId:'manual-test',expectedRevision:2,text:{display_title:current.original.title,short_description:'Correction humaine',description:'Texte corrigé par un administrateur'},validate:true};
 assert.equal((await editDocument(db,edit)).locked,true);
 assert.equal((await editDocument(db,edit)).action,'already_applied');
 await assert.rejects(editDocument(db,{...edit,operationId:'stale-edit'}),/DOCUMENTARY_REVISION_CONFLICT/);
 const retry={proposal:r,original:{id:r.id,title:edit.text.display_title,description:edit.text.description},batchId:'batch',actorId:'test',operationId:'reimport-protected'};
 assert.equal((await publishCandidate(db,retry)).reason,'human_protected');
 assert.equal((await rollbackEvent(db,{...events[0],operationId:'rollback-after-human-edit'})).action,'conflict');
 assert.equal((await db.query('SELECT description FROM produit WHERE id=$1',[r.id])).rows[0].description,edit.text.description);
 const legacy=selected[1];
 await db.query('BEGIN');
 await db.query("SELECT set_config('newoteg.documentary_actor','legacy-admin-test',true)");
 await db.query('UPDATE produit SET description=$2 WHERE id=$1',[legacy.id,'Correction via ancien formulaire']);
 await db.query('COMMIT');
 const protectedDoc=(await db.query('SELECT * FROM product_documentary WHERE product_id=$1',[legacy.id])).rows[0];
 assert.equal(protectedDoc.locked,true);assert.equal(protectedDoc.reviewed_by,'legacy-admin-test');
 assert.equal(protectedDoc.revision,3);
 const event=(await db.query("SELECT * FROM documentary_event WHERE product_id=$1 AND action='edit'",[legacy.id])).rows[0];
 assert.equal(event.actor_id,'legacy-admin-test');assert.equal(event.after.description,'Correction via ancien formulaire');
 const countBefore=(await db.query('SELECT count(*)::int n FROM documentary_event')).rows[0].n;
 await db.query('UPDATE produit SET prix_detail=prix_detail+1 WHERE id=$1',[legacy.id]);
 assert.equal((await db.query('SELECT count(*)::int n FROM documentary_event')).rows[0].n,countBefore);


 }finally{await db.close();}
});
