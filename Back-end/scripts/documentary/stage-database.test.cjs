const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');const {stageProposal}=require('./stage.cjs');
test('all 1933 real proposals staged without changing public data',async()=>{
 const input=process.env.DOCUMENTARY_TEST_INPUT;if(!input)throw Error('DOCUMENTARY_TEST_INPUT required');
 const proposals=fs.readFileSync(path.join(input,'propositions_cumulees_lots_01_a_19.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const rows=fs.readFileSync(path.join(input,'current-snapshot/catalogue_complet.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const db=new PGlite();try{
 await db.exec('CREATE TABLE produit(id TEXT PRIMARY KEY,nom_produit VARCHAR(150),description TEXT,version INTEGER DEFAULT 1,prix_detail DOUBLE PRECISION,quantite_stock INTEGER,image_url TEXT)');
 await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261114000000_documentary_workflow/migration.sql'),'utf8'));
 await db.query('INSERT INTO documentary_batch(id,source_sha256,source_name,actor_id) VALUES($1,$2,$3,$4)',['batch','stage-fixture','fixture','test']);
 for(const r of rows)await db.query('INSERT INTO produit(id,nom_produit,description,prix_detail,quantite_stock,image_url) VALUES($1,$2,$3,$4,$5,$6)',[r.id,r.original.title,r.original.description,r.commercial_snapshot.retail_price,r.commercial_snapshot.stock_quantity,r.images[0]?.url]);
 const original=(await db.query('SELECT * FROM produit ORDER BY id')).rows;
 for(const proposal of proposals){const request={proposal,batchId:'batch',actorId:'test',operationId:'stage-'+proposal.id};assert.equal((await stageProposal(db,request)).action,'staged');assert.equal((await stageProposal(db,request)).action,'already_staged');}
 assert.deepEqual((await db.query('SELECT * FROM produit ORDER BY id')).rows,original);
 const counts=(await db.query('SELECT status,count(*)::int n FROM product_documentary GROUP BY status ORDER BY status')).rows;
 assert.deepEqual(counts,[{status:'classification_requise',n:25},{status:'enrichi_ia_a_verifier',n:1510},{status:'identification_insuffisante',n:398}]);
 assert.equal((await db.query('SELECT count(*)::int n FROM documentary_event')).rows[0].n,1933);
 const first=proposals[0];await db.query('UPDATE product_documentary SET locked=true WHERE product_id=$1',[first.id]);
 assert.equal((await stageProposal(db,{proposal:first,batchId:'batch',actorId:'test',operationId:'different-operation'})).action,'protected');
 }finally{await db.close();}
});
