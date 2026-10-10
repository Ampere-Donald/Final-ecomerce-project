// Owned local PostgreSQL only. Rehearse additive migration, dump/restore,
// actual HTTP guards/DTOs and concurrent annotation using synthetic fixtures.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{randomUUID,randomBytes}=require('node:crypto');
const {Client,Pool}=require('pg'),{PrismaPg}=require('@prisma/adapter-pg'),{PrismaClient}=require('@prisma/client');
const {readStructure,compareStructure,sourceIdentity}=require('./release-schema-contract.cjs');
const url=new URL(process.env.NEWOTEG_TECHNICAL_TEST_DATABASE_URL||'');
if(url.protocol!=='postgresql:'||url.hostname!=='127.0.0.1'||url.port!=='55439'||url.pathname!=='/postgres'||url.username!=='quote_test')
 throw Error('Explicit owned local quote_test cluster required');
const root=path.resolve(__dirname,'..'),id=randomUUID().replaceAll('-','');
const names=['newoteg_tech_'+id,'newoteg_tech_restore_'+id,'newoteg_tech_expected_'+id];
for(const name of names)assert.match(name,/^newoteg_tech_(?:(?:restore|expected)_)?[a-f0-9]{32}$/);
const output=path.resolve(process.env.NEWOTEG_TECHNICAL_TEST_OUTPUT||path.join(root,'.local-postgres/technical',id));
fs.mkdirSync(output,{recursive:true});
const report={date:new Date().toISOString(),checks:[],status:'failed',ownedDatabasesRemoved:false};
const owner=new Client({connectionString:url.href});let app,db,pool,ownerConnected=false;const connections=[];
const baseEnv={};for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','COMSPEC','PATHEXT','APPDATA','LOCALAPPDATA'])if(process.env[key])baseEnv[key]=process.env[key];
baseEnv.DOTENV_CONFIG_PATH=path.join(output,'absent.env');
const ok=name=>{report.checks.push(name);console.log('PASS '+name)};
function run(command,args){const r=spawnSync(command,args,{cwd:output,env:baseEnv,encoding:'utf8',timeout:120000});if(r.status!==0)throw Error('Owned database preparation failed: '+path.basename(command));return r.stdout}
function schemaSql(schema,file){const config=path.join(output,'prisma.config.ts');fs.writeFileSync(config,'export default '+JSON.stringify({schema,datasource:{url:url.href}})+';');
 run(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','diff','--from-empty','--to-schema',schema,'--script','--output',file,'--config',config]);return fs.readFileSync(file,'utf8')}
async function connect(name){const u=new URL(url);u.pathname='/'+name;const c=new Client({connectionString:u.href});await c.connect();connections.push(c);return c}
(async()=>{
 try{
  await owner.connect();ownerConnected=true;for(const name of names)await owner.query('CREATE DATABASE "'+name+'"');
  const oldSchema=path.join(output,'baseline.prisma');
  const baseline=spawnSync('git',['show','7e5ec507ce510c552408bd337d71a782550b6cc2:Back-end/prisma/schema.prisma'],{cwd:root,encoding:'utf8'});
  if(baseline.status!==0)throw Error('Baseline schema missing');fs.writeFileSync(oldSchema,baseline.stdout);
  const c=await connect(names[0]);await c.query(schemaSql(oldSchema,path.join(output,'baseline.sql')));
  const category=randomUUID(),product=randomUUID(),attribute=randomUUID(),value=randomUUID();
  await c.query('INSERT INTO categorie(id,nom) VALUES($1,$2)',[category,'Fixture technique']);
  await c.query('INSERT INTO produit(id,id_categorie,nom_produit,prix_detail,quantite_stock,cmup_actuel) VALUES($1,$2,$3,1000,3,555)',[product,category,'Fixture alimentation']);
  await c.query('INSERT INTO attribut(id,id_produit,nom_attribut,type_attribut) VALUES($1,$2,$3,$4)',[attribute,product,'Courant','TEXTE']);
  await c.query('INSERT INTO valeur_attribut(id,id_attribut,valeur) VALUES($1,$2,$3)',[value,attribute,'1000 mA']);
  const before=(await c.query('SELECT * FROM valeur_attribut ORDER BY id')).rows;
  const dump=path.join(output,'baseline-backup.sql'),pg='C:/Program Files/PostgreSQL/17/bin/';
  run(pg+'pg_dump.exe',['--host=127.0.0.1','--port=55439','--username=quote_test','--no-owner','--no-acl','--format=plain','--file='+dump,names[0]]);
  const restored=await connect(names[1]);
  run(pg+'psql.exe',['--host=127.0.0.1','--port=55439','--username=quote_test','--set=ON_ERROR_STOP=1','--file='+dump,names[1]]);
  assert.deepEqual((await restored.query('SELECT * FROM valeur_attribut ORDER BY id')).rows,before);ok('Owned synthetic baseline dump restores exactly');
  const migration=fs.readFileSync(path.join(root,'prisma/migrations/20261010210000_technical_provenance/migration.sql'),'utf8');
  for(const target of [c,restored]){await target.query('BEGIN');await target.query(migration);await target.query('COMMIT');
   assert.deepEqual((await target.query('SELECT * FROM valeur_attribut ORDER BY id')).rows,before);
   assert.equal((await target.query('SELECT count(*)::int AS n FROM documentation_valeur')).rows[0].n,0)}
  ok('Exact additive migration preserves source rows and creates no validation in original/restored fixtures');
  const expected=await connect(names[2]);await expected.query(schemaSql(path.join(root,'prisma/schema.prisma'),path.join(output,'expected.sql')));
  const structure=await readStructure(c),targetStructure=await readStructure(expected);
  assert.deepEqual(compareStructure(targetStructure,structure),[]);assert.deepEqual(compareStructure(structure,targetStructure),[]);
  assert.deepEqual(compareStructure(structure,await readStructure(restored)),[]);ok('Migrated/restored structure matches the candidate Prisma schema');
  const conn=new URL(url);conn.pathname='/'+names[0];pool=new Pool({connectionString:conn.href,max:5});db=new PrismaClient({adapter:new PrismaPg(pool)});
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,names[0]);
  const load=name=>require(path.join(root,'dist/src',name));
  const {Test}=require('@nestjs/testing'),{ValidationPipe}=require('@nestjs/common'),{PassportModule}=require('@nestjs/passport');
  const {ConfigService}=require('@nestjs/config'),{JwtService}=require('@nestjs/jwt');
  const {DatabaseService}=load('database/database.service'),{AdminJwtStrategy}=load('admin-auth/admin-jwt.strategy');
  const {ValeurAttributController}=load('valeur-attribut/valeur-attribut.controller'),{ValeurAttributService}=load('valeur-attribut/valeur-attribut.service');
  const {DocumentationValeurService}=load('valeur-attribut/documentation-valeur.service');
  const {AttributController}=load('attribut/attribut.controller'),{AttributService}=load('attribut/attribut.service');
  const secret=randomBytes(48).toString('hex');
  const module=await Test.createTestingModule({imports:[PassportModule],controllers:[ValeurAttributController,AttributController],providers:[
   ValeurAttributService,DocumentationValeurService,AttributService,AdminJwtStrategy,
   {provide:DatabaseService,useValue:db},{provide:ConfigService,useValue:new ConfigService({JWT_SECRET:secret})}]}).compile();
  app=module.createNestApplication({logger:false});app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true}));await app.listen(0,'127.0.0.1');
  const base=await app.getUrl(),jwt=new JwtService({secret}),tokens={};
  for(const role of ['ADMIN','VENDEUR']){const a=await db.adminUser.create({data:{nom:'Fixture '+role,role,isActive:true}});tokens[role]=jwt.sign({sub:a.id,type:'admin',sessionVersion:0,role})}
  async function request(method,route,body,token){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()}}
  const endpoint='/valeurs-attribut/'+value+'/documentation',input={version:0,valeurVersion:1,attributVersion:1,produitVersion:1,etat:'A_VERIFIER',uniteSource:'mA',valeurNormalisee:'1',uniteNormalisee:'A',sourceUrl:'https://manufacturer.example/fixture.pdf',sourceDocument:'Fixture only',sourceRepere:'Page 1, tableau 2',motif:'Synthetic test relecture, not a real approval',confirmerRelecture:true};
  assert.equal((await request('PATCH',endpoint,input)).status,401);
  assert.equal((await request('PATCH',endpoint,input,tokens.VENDEUR)).status,403);
  assert.equal((await request('GET',endpoint+'-admin',undefined,tokens.VENDEUR)).status,403);
  assert.equal((await request('GET',endpoint)).data.etat,'A_VERIFIER');ok('Actual admin JWT/roles protect edits and private provenance; anonymous reads remain unverified');
  assert.equal((await request('PATCH',endpoint,{...input,etat:'DOCUMENTE'},tokens.ADMIN)).status,400);
  assert.equal((await request('POST',endpoint+'/relire',{...input,confirmerRelecture:false},tokens.ADMIN)).status,400);
  assert.equal((await request('POST',endpoint+'/relire',{...input,sourceRepere:''},tokens.ADMIN)).status,400);
  assert.equal((await db.documentationValeur.count()),0);ok('DTO/review refusals cannot stamp a review or create a record');
  const draft=await request('PATCH',endpoint,input,tokens.ADMIN);assert.equal(draft.status,200);assert.equal(draft.data.etat,'A_VERIFIER');
  const concurrent=await Promise.all([request('POST',endpoint+'/relire',{...input,version:1},tokens.ADMIN),request('PATCH',endpoint,{...input,version:1,conditions:'Conflicting edit'},tokens.ADMIN)]);
  assert.deepEqual(concurrent.map(r=>r.status===201?200:r.status).sort((a,b)=>a-b),[200,409]);
  // A POST success is 201 in Nest; normalize only the HTTP success category.
  assert.equal(concurrent.filter(r=>[200,201].includes(r.status)).length,1);assert.equal(concurrent.filter(r=>r.status===409).length,1);
  let current=await request('GET',endpoint+'-admin',undefined,tokens.ADMIN);
  if(current.data.documentation.etat!=='DOCUMENTE'){
   const reviewed=await request('POST',endpoint+'/relire',{...input,version:current.data.documentation.version},tokens.ADMIN);assert.equal(reviewed.status,201)}
  const visible=await request('GET',endpoint);assert.equal(visible.data.etat,'DOCUMENTE');assert(!JSON.stringify(visible.data).includes('reluParId'));assert.equal(visible.data.uniteSource,'mA');
  const p=await db.produit.findUnique({where:{id:product},include:{attributs:{include:{valeurs:{include:{documentation:true}}}}}});
  const {masquerCouts}=load('produit/public-product');const publicProduct=masquerCouts(p);assert(!JSON.stringify(publicProduct).includes('reluParId'));assert(!('cmupActuel' in publicProduct));
  ok('Concurrent real PostgreSQL writes have one winner; reviewed public source hides reviewer identity and cost');
  const attributes=await request('GET','/attributs');assert(!JSON.stringify(attributes.data).includes('cmupActuel'));assert(!JSON.stringify(attributes.data).includes('dernierCout'));ok('Public attribute endpoints exclude internal product fields');
  assert.equal((await request('PATCH','/valeurs-attribut/'+value,{valeur:'2 A'},tokens.ADMIN)).status,200);
  assert.deepEqual((await request('GET',endpoint)).data,{etat:'A_VERIFIER',obsolete:true});
  current=await request('GET',endpoint+'-admin',undefined,tokens.ADMIN);
  assert.equal(current.data.documentation.valeurSource,'1000 mA');
  const reread=await request('POST',endpoint+'/relire',{...input,version:current.data.documentation.version,valeurVersion:2,valeurNormalisee:'2'},tokens.ADMIN);assert.equal(reread.status,201);
  assert.equal((await request('PATCH','/attributs/'+attribute,{nomAttribut:'Courant de sortie'},tokens.ADMIN)).status,200);
  assert.deepEqual((await request('GET',endpoint)).data,{etat:'A_VERIFIER',obsolete:true});ok('Real legacy value/name edits invalidate review without deleting the original proof');
  current=await request('GET',endpoint+'-admin',undefined,tokens.ADMIN);
  assert.equal((await request('POST',endpoint+'/relire',{...input,version:current.data.documentation.version,valeurVersion:2,attributVersion:2,valeurNormalisee:'2'},tokens.ADMIN)).status,201);
  await db.produit.update({where:{id:product},data:{marque:'Another fixture manufacturer',version:{increment:1}}});
  assert.deepEqual((await request('GET',endpoint)).data,{etat:'A_VERIFIER',obsolete:true});ok('Product identity/version changes also invalidate the review');
  await db.valeurAttribut.delete({where:{id:value}});assert.equal(await db.documentationValeur.count(),0);ok('Value deletion cascades its optional documentation');
  // Merge only the newly rehearsed table/enum into the reviewed release contract.
  if(process.argv.includes('--update-contract')){
   const file=path.join(__dirname,'release-schema.json'),contract=JSON.parse(fs.readFileSync(file,'utf8'));
   contract.sources=sourceIdentity();
   for(const kind of ['columns','constraints','indexes','enums']){
    const isNew=row=>kind==='enums'?row.name==='EtatDonneeTechnique':row.table_name==='documentation_valeur';
    contract.structure[kind]=[...contract.structure[kind].filter(row=>!isNew(row)),...targetStructure[kind].filter(isNew)];
   }
   fs.writeFileSync(file,JSON.stringify(contract,null,2)+'\n');ok('Release contract retains historical definitions and adds only rehearsed table/enum');
  }
  report.status='passed';
 }catch(error){report.failure=error.message;process.exitCode=1;console.error(error.message)}
 finally{
  if(app)await app.close();if(db)await db.$disconnect();if(pool&&!pool.ending)await pool.end();for(const c of connections)await c.end();
  if(ownerConnected){
   for(const name of names){const exists=(await owner.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount;if(exists)await owner.query('DROP DATABASE "'+name+'"')}
   const remaining=(await owner.query('SELECT datname FROM pg_database WHERE datname=ANY($1::text[])',[names])).rows;assert.equal(remaining.length,0);report.ownedDatabasesRemoved=true;
  }
  await owner.end();
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }
})();
