'use strict';
// Updates only the three additive documentary tables in the existing release contract.
const fs=require('node:fs'),path=require('node:path');const {PGlite}=require('@electric-sql/pglite');
const {sourceIdentity,readStructure,assertFreshContract}=require('../release-schema-contract.cjs');
async function main(){
 if(process.argv[2]!=='--write-local-contract')throw Error('EXPLICIT_LOCAL_CONTRACT_FLAG_REQUIRED');
 const base=path.join(__dirname,'../release-schema.json');const contract=JSON.parse(fs.readFileSync(base,'utf8'));
 const names=new Set(['documentary_batch','product_documentary','documentary_event']);const db=new PGlite();
 try{
  await db.exec(fs.readFileSync(path.join(__dirname,'../../.local-postgres/documentary/baseline.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261114000000_documentary_workflow/migration.sql'),'utf8'));
  const structure=await readStructure(db);
  for(const kind of ['columns','constraints','indexes']){
   const rows=structure[kind].filter(r=>names.has(r.table_name));
   if(!rows.length)throw Error('DOCUMENTARY_STRUCTURE_MISSING');
   contract.structure[kind]=[...contract.structure[kind].filter(r=>!names.has(r.table_name)),...rows];
  }
  contract.sources=sourceIdentity();assertFreshContract(contract);
  fs.writeFileSync(base,JSON.stringify(contract,null,2)+'\n');
  console.log(JSON.stringify({updated_local_release_contract:true,tables:[...names],production_written:false}));
 }finally{await db.close();}
}
main().catch(()=>{console.error('LOCAL_CONTRACT_PREPARATION_FAILED');process.exitCode=1;});
