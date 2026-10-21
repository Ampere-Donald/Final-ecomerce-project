// Owned fixture database + actual public controller/service/SQL. IPC replaces
// the HTTP transport only; never starts an application against shop data.
const assert=require('node:assert/strict'),path=require('node:path');
const {fork}=require('node:child_process');
module.exports=async({db,root,controller,annotate,ok,output})=>{
 const [owner]=await db.$queryRawUnsafe('SELECT current_database() AS name,host(inet_server_addr()) AS host,inet_server_port() AS port');
 assert.match(owner.name,/^newoteg_tech_[a-f0-9]{32}$/);assert.equal(owner.host,'127.0.0.1');assert.equal(owner.port,55439);
 const category=await db.categorie.create({data:{nom:'Browser search fixtures'}}),reference='NWT-741-P';
 const product=(nomProduit,more={})=>db.produit.create({data:{categorieId:category.id,nomProduit,prixDetail:1000,quantiteStock:4,cmupActuel:555,...more}});
 const exact=await product('ZZZ fixture exact code',{code:reference,prixDetail:3000});
 const manufacturer=await product('YYY fixture manufacturer',{prixDetail:2000});await annotate(manufacturer,'REFERENCE_FABRICANT',reference);
 const alias=await product('BBB fixture alias',{prixDetail:500});await annotate(alias,'ALIAS_RECHERCHE',reference);
 const named=await product('NWT 741 P');
 const approximate=await product('AAA fixture NWT 741 P module',{prixDetail:1500});
 const suffix=await product('Suffix fixture NWT 741 PB',{code:reference+'B',prixDetail:4000});
 const unavailable=await product('AAB fixture NWT 741 P unavailable',{quantiteStock:0});
 const archived=await product('Archived fixture NWT 741 P',{estActif:false});await annotate(archived,'REFERENCE_FABRICANT',reference);
 await new Promise((resolve,reject)=>{
  const child=fork(path.join(root,'../Font-end/tests/verify-catalogue-relevance.cjs'),[],{env:{...process.env,RELEVANCE_BROWSER_OUTPUT:path.join(output,'relevance-browser')},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  const timer=setTimeout(()=>{child.kill();reject(Error('Relevance browser timed out'))},180000);
  child.stdout.on('data',b=>process.stdout.write(b));child.stderr.on('data',b=>process.stderr.write(b));
  child.on('message',async message=>{
   if(message?.kind!=='catalogue-read')return;
   try{
    const p=new URLSearchParams(message.query);
    const data=await controller.findAll({},p.get('page'),p.get('limit'),p.get('search'),p.get('categoryId'),undefined,undefined,p.get('minPrice'),p.get('maxPrice'),p.get('inStock'),p.get('sort'),p.get('salesSearch'));
    assert(!JSON.stringify(data).includes('cmupActuel'));assert(!JSON.stringify(data).includes('reluParId'));
    if(child.connected)child.send({kind:'catalogue-response',id:message.id,data});
   }catch(error){if(child.connected)child.send({kind:'catalogue-response',id:message.id,error:error.message})}
  });
  child.once('error',error=>{clearTimeout(timer);reject(error)});
  child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Relevance browser failed'))});
  child.send({kind:'fixture',reference,category,exact:exact.id,manufacturer:manufacturer.id,alias:alias.id,named:named.id,approximate:approximate.id,suffix:suffix.id,unavailable:unavailable.id,archived:archived.id});
 });
 ok('Built catalogue uses actual public controller/SQL relevance by default, respects chosen sorts, stock and reference suffixes in FR/EN modern/legacy at three widths');
};
