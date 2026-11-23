'use strict';
// Catalog-only data backup. Source uses a read-only exported transaction snapshot.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {spawn}=require('node:child_process');const {Client}=require('pg');const dotenv=require('dotenv');
const root=path.resolve(__dirname,'../..');
function run(bin,args,env){return new Promise((resolve,reject)=>{const p=spawn(bin,args,{env,stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',d=>{error+=d.toString();});p.once('error',()=>reject(Error('BINARY_START_FAILED')));p.once('close',code=>code===0?resolve():reject(Object.assign(Error('NATIVE_COMMAND_FAILED'),{binary:path.basename(bin),diagnostic:error.split('\n').find(l=>/error|fatal/i.test(l))?.replace(/"[^"]*"|'[^']*'/g,'[withheld]').slice(0,200)})));});}
async function main(){
 if(process.argv[2]!=='--backup-catalogue-readonly')throw Error('EXPLICIT_READONLY_FLAG_REQUIRED');
 if(!process.env.DOCUMENTARY_SOURCE_ENV)throw Error('SOURCE_ENV_PATH_REQUIRED');
 const sourceConfig=dotenv.parse(fs.readFileSync(process.env.DOCUMENTARY_SOURCE_ENV));const url=new URL(sourceConfig.DATABASE_URL);
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');const archiveRoot=path.join(root,'.local-postgres/documentary/native-backups');const reuse=process.env.DOCUMENTARY_RESTORE_EXISTING;const out=reuse?path.resolve(reuse):path.join(archiveRoot,stamp);if(reuse && !out.startsWith(archiveRoot+path.sep))throw Error('RESTORE_PATH_NOT_ALLOWED');fs.mkdirSync(out,{recursive:true,mode:0o700});
 const cluster=path.join(out,reuse?'cluster-restore-'+stamp:'cluster');
 const prefix=path.join(root,'.local-postgres/tools/extracted/usr');const bin=name=>path.join(prefix,'bin',name);
 const env={...process.env,LD_LIBRARY_PATH:path.join(prefix,'lib'),PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15',PGOPTIONS:'-c default_transaction_read_only=on -c timezone=UTC'};
 delete env.DATABASE_URL;
 const source=new Client({connectionString:sourceConfig.DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});let started=false;let local;
 const pw=crypto.randomBytes(32).toString('hex');const pwfile=path.join(out,'local-password');fs.writeFileSync(pwfile,pw,{mode:0o600});
 const localEnv={...process.env,LD_LIBRARY_PATH:path.join(prefix,'lib'),PGHOST:'127.0.0.1',PGPORT:'55487',PGUSER:'documentary_restore',PGPASSWORD:pw,PGDATABASE:'catalogue_restore',PGSSLMODE:'disable',PGOPTIONS:'-c timezone=UTC'};delete localEnv.DATABASE_URL;
 const tables=['categorie','sous_categorie','produit','attribut','valeur_attribut'];const sourceState={};let extensions=[];
 const fingerprint=async(db,table)=>(await db.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY id),'')) AS digest FROM public."${table}" t`)).rows[0];
 try{
  await source.connect();await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');await source.query("SET LOCAL TIME ZONE 'UTC'");
  if((await source.query('SHOW transaction_read_only')).rows[0].transaction_read_only!=='on')throw Error('SOURCE_NOT_READONLY');
  if((await source.query('SELECT count(*)::int n FROM pg_foreign_server')).rows[0].n)throw Error('FOREIGN_SERVER_SCHEMA_REQUIRES_PRIVATE_REVIEW');
  extensions=(await source.query("SELECT e.extname,n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname<>'plpgsql' ORDER BY e.extname")).rows;
  const snapshot=(await source.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
  for(const table of tables)sourceState[table]=await fingerprint(source,table);
  if(!reuse)await run(bin('pg_dump'),['--format=custom','--schema-only','--schema=public','--no-owner','--no-acl',`--snapshot=${snapshot}`,`--file=${path.join(out,'schema.dump')}`],env);
  if(!reuse)await run(bin('pg_dump'),['--format=custom','--data-only','--no-owner','--no-acl',...tables.map(t=>'--table=public.'+t),`--snapshot=${snapshot}`,`--file=${path.join(out,'catalogue-data.dump')}`],env);
  fs.writeFileSync(path.join(out,'source-catalogue-manifest.json'),JSON.stringify({observed_at:new Date().toISOString(),source_read_only:true,tables:sourceState,reused_archives:Boolean(reuse)},null,2)+'\n',{mode:0o600});
  for(const name of ['schema.dump','catalogue-data.dump'])fs.chmodSync(path.join(out,name),0o600);
  await source.query('ROLLBACK');await source.end();
  if(!fs.existsSync(path.join(cluster,'PG_VERSION')))await run(bin('initdb'),['-D',cluster,'-L',path.join(prefix,'share/postgresql'),'-U','documentary_restore','--auth=scram-sha-256','--pwfile='+pwfile,'--locale=C.UTF-8','--encoding=UTF8'],localEnv);
  await run(bin('pg_ctl'),['-D',cluster,'-l',path.join(out,'server.log'),'-o',"-h 127.0.0.1 -p 55487 -c unix_socket_directories=''",'-w','start'],localEnv);started=true;
  await run(bin('createdb'),['catalogue_restore'],{...localEnv,PGDATABASE:'postgres'});
  await run(bin('pg_restore'),['--section=pre-data','--clean','--if-exists','--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname=catalogue_restore',path.join(out,'schema.dump')],localEnv);
  local=new Client({host:'127.0.0.1',port:55487,user:'documentary_restore',password:pw,database:'catalogue_restore'});await local.connect();await local.query("SET TIME ZONE 'UTC'");
  for(const ext of extensions){
   if(!/^[a-z_][a-z0-9_]*$/i.test(ext.extname)||!/^[a-z_][a-z0-9_]*$/i.test(ext.nspname))throw Error('UNEXPECTED_EXTENSION_IDENTIFIER');
   await local.query(`CREATE SCHEMA IF NOT EXISTS "${ext.nspname}"`);
   await local.query(`CREATE EXTENSION IF NOT EXISTS "${ext.extname}" WITH SCHEMA "${ext.nspname}"`);
  }
  await run(bin('pg_restore'),['--section=post-data','--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname=catalogue_restore',path.join(out,'schema.dump')],localEnv);
  await run(bin('pg_restore'),['--exit-on-error','--single-transaction','--disable-triggers','--no-owner','--no-acl','--dbname=catalogue_restore',path.join(out,'catalogue-data.dump')],localEnv);

  const restoredState={};for(const table of tables){restoredState[table]=await fingerprint(local,table);if(JSON.stringify(restoredState[table])!==JSON.stringify(sourceState[table]))throw Error('RESTORE_FINGERPRINT_MISMATCH');}
  const clients=(await local.query('SELECT count(*)::int n FROM client')).rows[0].n;if(clients!==0)throw Error('CLIENT_DATA_MUST_BE_ABSENT');
  let structuredMigrationVerified=false;
  if(process.env.DOCUMENTARY_VERIFY_STRUCTURED_LOCAL==='1'){
   const {readStructure,compareStructure,readReleaseContract}=require('../release-schema-contract.cjs');
   const columns=await local.query("SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_documentary' AND column_name='published_content'");
   if(!columns.rows.length)await local.query(fs.readFileSync(path.join(root,'prisma/migrations/20261123000000_structured_documentary/migration.sql'),'utf8'));
   const differences=compareStructure(readReleaseContract().structure,await readStructure(local));
   if(differences.length){fs.writeFileSync(path.join(out,'local-schema-differences.json'),JSON.stringify(differences,null,2),{mode:0o600});throw Error('LOCAL_STRUCTURED_SCHEMA_CONTRACT_MISMATCH');}
   structuredMigrationVerified=true;
  }
  const report={structured_migration_verified_locally:structuredMigrationVerified,scope:'Catalogue tables only; public schema metadata. Not a full production business-data backup.',source_read_only:true,source_snapshot_consistent:!reuse,restored_matches_readonly_source_fingerprints:true,required_extensions:extensions,source_tables:sourceState,restored_tables:restoredState,customer_rows_exported:0,native_restore_verified:true,production_written:false,archives:Object.fromEntries(['schema.dump','catalogue-data.dump'].map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex')]))};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({native_restore_verified:true,products:sourceState.produit.count,customer_rows_exported:0,production_written:false,output:out}));
 }finally{
  try{await source.end();}catch{}if(local)await local.end();if(started)await run(bin('pg_ctl'),['-D',cluster,'-m','fast','-w','stop'],localEnv);
  if(fs.existsSync(pwfile))fs.unlinkSync(pwfile);
 }
}
main().catch(e=>{console.error(JSON.stringify({error:/^[A-Z_]+$/.test(e.message)?e.message:'CATALOGUE_BACKUP_FAILED',binary:e.binary || null,diagnostic:e.diagnostic || null,production_written:false}));process.exitCode=1;});
