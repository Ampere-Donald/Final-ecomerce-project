// Local, anonymous visual QA only. Never reads .env or connects to a database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [snapshot,prepared,photo]=process.argv.slice(2);
if(!snapshot||!prepared)throw Error('Pass a catalogue JSONL and prepared JSONL');
const read=p=>fs.readFileSync(p,'utf8').trim().split('\n').map(JSON.parse);
const contents=new Map(read(prepared).map(p=>[p.id,p.content]));
const products=read(snapshot).map(p=>({id:p.id,nomProduit:p.original.title,description:p.original.description,designationEn:p.original.english_designation,code:p.internal_reference,categorieId:p.original.category?.id,categorie:{id:p.original.category?.id,nom:p.original.category?.name},sousCategorieId:p.original.subcategory?.id,sousCategorie:p.original.subcategory?{id:p.original.subcategory.id,nom:p.original.subcategory.name}:null,marque:p.original.brand,prixDetail:p.commercial_snapshot.retail_price,quantiteStock:p.commercial_snapshot.stock_quantity,seuilAlerte:5,estActif:true,imageUrl:photo&&String(p.internal_reference)==='123458'?'/__knowledge-preview-photo':p.images[0]?.url,attributs:[],documentationProduit:contents.get(p.id)||null}));
const categories=[...new Map(products.map(p=>[p.categorie.id,p.categorie])).values()];
const server=await createServer({root,configFile:false,plugins:[react(),{name:'knowledge-preview-fixtures',configureServer(server){server.middlewares.use((req,res,next)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 if(u.pathname==='/__knowledge-preview-photo'&&photo){res.setHeader('Content-Type','image/jpeg');fs.createReadStream(photo).pipe(res);return;}
 if(!u.pathname.startsWith('/api/'))return next();
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({message:'Preview only; mutations disabled.'}));return;}
 const detail=u.pathname.match(/^\/api\/produits\/([^/]+)$/);
 const body=detail?products.find(p=>p.id===detail[1]):u.pathname==='/api/produits'?{data:products.slice(0,5),meta:{total:products.length,lastPage:1}}:u.pathname==='/api/categories'?categories:u.pathname.includes('avis')?{data:[],meta:{total:0,lastPage:1}}:[];
 if(detail&&!body)res.statusCode=404;
 res.end(JSON.stringify(body||{message:'Produit introuvable'}));
 });}}],define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')},server:{host:'127.0.0.1',port:5198,strictPort:true}});
await server.listen();
console.log(JSON.stringify({preview:'http://127.0.0.1:5198/product/'+products.find(p=>String(p.code)==='123458')?.id,productionWritten:false}));
