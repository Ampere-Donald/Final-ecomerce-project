// Execute real search SQL in a read-only connection. Fixture CTEs exist only
// inside SELECT; no production tables, product values or extensions are changed.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { ProduitService } = require('../dist/src/produit/produit.service.js');
const { normalizeSalesSearch, normalizedSearchSql } = require('../dist/src/produit/search-normalization.js');
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--output'||!path.isAbsolute(args[1]))throw Error('Absolute proof directory required');
if(!process.env.DATABASE_URL)throw Error('Private DATABASE_URL required');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:2,
 connectionTimeoutMillis:15000,idleTimeoutMillis:5000,options:'-c default_transaction_read_only=on -c statement_timeout=15000'});
const report={date:new Date().toISOString(),readOnly:false,checks:[],queries:[],status:'failed'};
fs.mkdirSync(args[1],{recursive:true});
const save=phase=>{report.phase=phase;fs.writeFileSync(path.join(args[1],'search-database.json'),JSON.stringify(report,null,2));};
const fixtures=`WITH categorie(id,nom) AS (VALUES ('cables','Connectique'),('tools','Mesure & Test')),
produit(id,id_categorie,nom_produit,designation_en,marque,code_famille,code,quantite_stock,est_actif) AS (VALUES
('c1','cables','Câble HDMI mâle-mâle 15 m',NULL::text,'Générique','237','HDMI-15',2,TRUE),
('c2','cables','CABLE HDMI mâle-mâle 2 m',NULL,'Générique','237','HDMI-2',4,TRUE),
('c3','cables','Câble HDMI 4 m',NULL,'Générique','237','HDMI-4',1,TRUE),
('other','cables','Adaptateur HDMI',NULL,'Générique','208','HDMI-ADAPT',2,TRUE),
('inactive','cables','Câble HDMI inactif',NULL,'Générique','237','HDMI-OFF',2,FALSE),
('out','cables','Câble HDMI rupture',NULL,'Générique','237','HDMI-OUT',0,TRUE),
('m1','tools','MULTIMÈTRE numérique',NULL,'Fabricant fictif','000','DT83',2,TRUE),
('exact','tools','Transistor IRF510',NULL,'Fabricant fictif','123','IRF510',2,TRUE),
('suffix','tools','Transistor IRF510N',NULL,'Fabricant fictif','123','IRF510N',2,TRUE)) `;
(async()=>{
 let db;
 try{
  const setting=await pool.query('SHOW default_transaction_read_only');
  assert.equal(setting.rows[0].default_transaction_read_only,'on');report.readOnly=true;
  assert.equal((await pool.query('SHOW server_encoding')).rows[0].server_encoding,'UTF8');
  save('read-only connection checked');
  const examples=['Câble HDMI','CABLE HDMI','Câble HDMI','MULTIMÈTRE','IRF510N','IRF-510N','  %_ --  '];
  for(const value of examples){
   const sql=normalizedSearchSql('p.nom_produit');
   const r=await pool.query(`SELECT ${sql} AS key FROM (SELECT $1::text AS nom_produit) p`,[value]);
   assert.equal(r.rows[0].key,normalizeSalesSearch(value));
  }
  assert.throws(()=>normalizedSearchSql('p.nom_produit; DROP TABLE produit'));
  report.checks.push('JS/SQL normalization agrees for composed/decomposed/uppercase accents and reference suffixes; only fixed columns accepted');
  save('normalization checked');
  const mock={$queryRawUnsafe:async(sql,...values)=>(await pool.query(fixtures+sql,values)).rows};
  const service=new ProduitService(mock,null,null,null);
  const query=(q,category,stock)=>service.findSalesSearchCandidateIds(q,category,stock,20);
  const a=await query('câble HDMI'),b=await query('cable HDMI'),c=await query('CÂBLE HDMI');
  assert.deepEqual(a,b);assert.deepEqual(a,c);
  assert.deepEqual(new Set(a),new Set(['c1','c2','c3','out']));
  assert.deepEqual(new Set(await query('câble HDMI','cables',true)),new Set(['c1','c2','c3']));
  assert.deepEqual(await query('câble HDMI','tools'),[]);
  assert.deepEqual(await query('multimetre'),['m1']);
  assert.deepEqual(await query('multimètre'),['m1']);
  assert.deepEqual(await query('multimettr'),['m1']);
  assert.equal((await query('IRF510'))[0],'exact');
  assert.deepEqual(await query('IRF510N'),['suffix']);
  assert.deepEqual(await query('IRF-510N'),['suffix']);
  for(const value of ['NEWOTEG_ABSENT_72831','%_ --',"x'; DROP TABLE produit;--"])assert.deepEqual(await query(value),[]);
  report.checks.push('Real PostgreSQL candidate SQL: accent variants, typo, exact reference before suffix, category/stock/inactive filters and absent/injection-like input');
  save('fixture candidate SQL checked');
  // Same real public service as the controller, no AppModule or scheduled jobs.
  db=new PrismaClient({adapter:new PrismaPg(pool),log:[],transactionOptions:{maxWait:15000,timeout:30000}});
  const real=new ProduitService(db,null,null,null);
  for(const salesSearch of [false,true]){
   let previous;
   for(const search of ['câble HDMI','cable HDMI','CÂBLE HDMI']){
    save('reading public '+(salesSearch?'suggestions':'catalogue')+' '+search);
    const start=performance.now();
    const rows=await real.findAll({search,salesSearch,limit:8,publicPricingAt:new Date()});
    assert(rows.data.length>0,'Actual public cables required');
    const ids=rows.data.map(p=>p.id);
    if(previous)assert.deepEqual(ids,previous);
    previous=ids;
    report.queries.push({search,salesSearch,total:rows.meta.total,rows:ids.length,elapsedMs:Math.round(performance.now()-start)});
   }
  }
  report.checks.push('Existing catalogue: actual public service returns identical ordered IDs for accented/unaccented/uppercase requests in catalogue and suggestion modes');
  report.status='passed';
 }catch(error){report.failure=error.code||error.constructor?.name||'Search verification failed';process.exitCode=1;}
 finally{
  save('checks finished');
  if(db)await db.$disconnect();if(!pool.ending)await pool.end();
  save('connections closed');console.log(JSON.stringify(report));
 }
})();
