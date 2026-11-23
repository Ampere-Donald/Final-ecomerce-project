const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {saveStructured}=require('./structured-store.cjs');
const {normalizeContent,publicContent,fingerprint}=require('./content.cjs');
const fixture=()=>({schemaVersion:1,family:'passifs',locales:{fr:{summary:'Condensateur pour un circuit documenté.',paragraphs:['Comparer la série et les exigences du montage.'],applications:['Filtrage selon le circuit.'],integration:[],replacement:['Vérifier la polarité.'],missing:['Dimensions à préciser.'],faq:[],documents:[{label:'Document de famille',url:'https://www.st.com/resource/en/datasheet/viper50a-e.pdf',scope:'family'}]}}});
test('structured publication: drafts, isolation, retries, revisions, rollback and protection',async()=>{
 const db=new PGlite();
 try{
  await db.exec('CREATE TABLE produit(id TEXT PRIMARY KEY,nom_produit TEXT,description TEXT,marque TEXT,reference_fabricant TEXT,est_actif BOOLEAN,prix_detail INTEGER,quantite_stock INTEGER,image_url TEXT)');
  for(const name of ['20261114000000_documentary_workflow','20261123000000_structured_documentary']) await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations',name,'migration.sql'),'utf8'));
  await db.query("INSERT INTO produit VALUES('p','Condensateur','Description existante','Marque',NULL,true,1500,7,'https://example.org/image.png')");
  const product=(await db.query("SELECT * FROM produit WHERE id='p'")).rows[0];
  const req={productId:'p',actorId:'test',operationId:'draft1',expectedRevision:0,action:'draft',content:fixture()};
  assert.equal((await saveStructured(db,req)).revision,1);
  assert.equal((await saveStructured(db,req)).action,'already_applied');
  let doc=(await db.query("SELECT * FROM product_documentary WHERE product_id='p'")).rows[0];
  assert.equal(doc.published_content,null);assert.ok(doc.draft_content);assert.equal(doc.locked,true);
  await assert.rejects(saveStructured(db,{...req,operationId:'stale'}),/REVISION_CONFLICT/);
  await assert.rejects(saveStructured(db,{...req,operationId:'automatic',expectedRevision:1,automatic:true}),/HUMAN_PROTECTED/);
  const pub={...req,action:'publish',expectedRevision:1,operationId:'publish1'};
  assert.equal((await saveStructured(db,pub)).revision,2);
  assert.equal((await saveStructured(db,pub)).action,'already_applied');
  doc=(await db.query("SELECT * FROM product_documentary WHERE product_id='p'")).rows[0];
  const visible=publicContent(doc.published_content,product);
  assert.deepEqual(visible,normalizeContent(fixture()));assert.equal(visible.productFingerprint,undefined);
  assert.equal(publicContent(doc.published_content,{...product,description:'Nouvelle description'}),null);
  assert.deepEqual((await db.query("SELECT * FROM produit WHERE id='p'")).rows[0],product);
  assert.equal((await saveStructured(db,{...pub,action:'rollback',operationId:'undo',expectedRevision:2})).revision,3);
  doc=(await db.query("SELECT * FROM product_documentary WHERE product_id='p'")).rows[0];assert.equal(doc.published_content,null);
  await assert.rejects(saveStructured(db,{...pub,action:'rollback',operationId:'undo2',expectedRevision:3}),/REVISION_CONFLICT/);
  await db.query("UPDATE produit SET marque='Autre' WHERE id='p'");
  await assert.rejects(saveStructured(db,{...req,operationId:'stale-product-draft',expectedRevision:3,expectedProductFingerprint:fingerprint(product)}),/SOURCE_CHANGED/);
  await assert.rejects(saveStructured(db,{...pub,operationId:'changed',expectedRevision:3}),/SOURCE_CHANGED/);
 }finally{await db.close();}
});
test('content contract rejects hidden fields, HTML and unsafe links',()=>{
 assert.throws(()=>normalizeContent({...fixture(),actorId:'private'}),/INVALID/);
 const html=fixture();html.locales.fr.summary='<script>alert(1)</script>';assert.throws(()=>normalizeContent(html),/INVALID/);
 for(const url of ['http://example.org/a','https://localhost/a','https://127.0.0.1/a','https://user:secret@example.org/a','https://example.org/a?token=secret']){
  const c=fixture();c.locales.fr.documents[0].url=url;assert.throws(()=>normalizeContent(c),/INVALID/);
 }
 assert.equal(fingerprint({id:'p',nomProduit:'Article',description:null}),fingerprint({id:'p',nom_produit:'Article',description:null}));
});
