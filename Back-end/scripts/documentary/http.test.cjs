const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {randomBytes,randomUUID}=require('node:crypto');
require('reflect-metadata');require('tsconfig-paths').register({baseUrl:path.join(process.cwd(),'dist'),paths:{'src/*':['src/*']}});
const {Test}=require('@nestjs/testing');const {ValidationPipe}=require('@nestjs/common');const {JwtModule,JwtService}=require('@nestjs/jwt');const {ConfigService}=require('@nestjs/config');const {PGlite}=require('@electric-sql/pglite');const request=require('supertest');
const {DocumentaryController}=require('../../dist/src/produit/documentary.controller');const {DocumentaryService}=require('../../dist/src/produit/documentary.service');const {DatabaseService}=require('../../dist/src/database/database.service');const {AdminJwtStrategy}=require('../../dist/src/admin-auth/admin-jwt.strategy');
test('HTTP admin authentication, role restrictions, validation and protected editing',async()=>{
 const db=new PGlite();let app;
 try{
 await db.exec('CREATE TABLE produit(id TEXT PRIMARY KEY,nom_produit VARCHAR(150),description TEXT,est_actif BOOLEAN DEFAULT true,version INTEGER DEFAULT 1,code TEXT,code_famille TEXT,prix_detail DOUBLE PRECISION)');
 await db.exec(fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261114000000_documentary_workflow/migration.sql'),'utf8'));
 const id=randomUUID();await db.query("INSERT INTO produit(id,nom_produit,description,code,code_famille,prix_detail) VALUES($1,'Pièce test','Texte initial','TEST-01','TEST',900)",[id]);
 const accounts={admin:{id:'admin',role:'ADMIN',isActive:true,sessionVersion:1},cashier:{id:'cashier',role:'CAISSIER',isActive:true,sessionVersion:1},change:{id:'change',role:'ADMIN',isActive:true,sessionVersion:1,mustChangeCredential:true}};
 const adapter={adminUser:{findUnique:async({where})=>accounts[where.id] || null},$queryRawUnsafe:async(sql,...args)=>(await db.query(sql,args)).rows,$executeRawUnsafe:async(sql,...args)=>(await db.query(sql,args)).affectedRows};
 adapter.$transaction=async fn=>{await db.query('BEGIN');try{const r=await fn(adapter);await db.query('COMMIT');return r;}catch(e){await db.query('ROLLBACK');throw e;}};
 const secret=randomBytes(32).toString('hex');
 const module=await Test.createTestingModule({imports:[JwtModule.register({secret})],controllers:[DocumentaryController],providers:[DocumentaryService,AdminJwtStrategy,{provide:DatabaseService,useValue:adapter},{provide:ConfigService,useValue:{getOrThrow:()=>secret}}]}).compile();
 app=module.createNestApplication();app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true}));await app.init();
 const jwt=module.get(JwtService);const token=(sub,extra={})=>jwt.sign({sub,type:'admin',sessionVersion:1,...extra});
 const api=request(app.getHttpServer());
 assert.equal((await api.get('/catalogue-documentary')).status,401);
 assert.equal((await api.get('/catalogue-documentary').auth(token('cashier',{role:'ADMIN'}),{type:'bearer'})).status,403);
 assert.equal((await api.get('/catalogue-documentary').auth(token('change'),{type:'bearer'})).status,403);
 assert.equal((await api.get('/catalogue-documentary').auth(token('admin',{sessionVersion:0}),{type:'bearer'})).status,401);
 const auth=token('admin');
 const list=await api.get('/catalogue-documentary?search=TEST-01').auth(auth,{type:'bearer'});assert.equal(list.status,200);assert.equal(list.body.total,1);assert.match(list.headers['cache-control'],/no-store/);
 assert.equal((await api.get('/catalogue-documentary?status=anything').auth(auth,{type:'bearer'})).status,400);
 const data={operationId:randomUUID(),expectedRevision:0,text:{display_title:'Pièce corrigée',short_description:'Résumé vérifié',description:'Correction humaine'},validate:true};
 assert.equal((await api.patch('/catalogue-documentary/'+id).auth(auth,{type:'bearer'}).send({...data,operationId:'invalid'})).status,400);
 assert.equal((await api.patch('/catalogue-documentary/'+id).auth(auth,{type:'bearer'}).send({...data,text:{...data.text,display_title:'x'.repeat(151)}})).status,400);
 const saved=await api.patch('/catalogue-documentary/'+id).auth(auth,{type:'bearer'}).send(data);assert.equal(saved.status,200);assert.equal(saved.body.locked,true);
 const repeated=await api.patch('/catalogue-documentary/'+id).auth(auth,{type:'bearer'}).send(data);assert.equal(repeated.body.action,'already_applied');
 assert.equal((await api.patch('/catalogue-documentary/'+id).auth(auth,{type:'bearer'}).send({...data,operationId:randomUUID()})).status,409);
 const detail=await api.get('/catalogue-documentary/'+id).auth(auth,{type:'bearer'});assert.equal(detail.status,200);assert.equal(detail.body.revision,1);assert.equal(detail.body.history.length,1);assert.equal(detail.body.history[0].actor_id,'admin');assert.equal(detail.body.status,'valide_admin');
 assert.equal((await db.query('SELECT prix_detail FROM produit WHERE id=$1',[id])).rows[0].prix_detail,900);
 }finally{if(app)await app.close();await db.close();}
});
