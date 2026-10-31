import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { productEditorialEntries } from '../src/storefront/productEditorialData.js';
import { productEnglishTranslations } from '../src/storefront/productEnglish.generated.js';
import { seoFamilies } from '../src/storefront/seoFamilies.js';
import { productSnapshot } from '../src/storefront/initialProduct.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=process.env.OUT?resolve(process.env.OUT):null;
if(out) await mkdir(out,{recursive:true});
const server=await createServer({root,configFile:false,plugins:[react()],server:{middlewareMode:true},appType:'custom',
  define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')}});
const report={at:new Date().toISOString(),status:'running',writes:0,source:'reviewed product identity fixtures; unknown price and stock',
  publicEnglishURLsVerified:false,checks:[]};
const decode=value=>value.replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
try {
  const {renderTranslationPreview}=await server.ssrLoadModule('/tests/render-product-translations.jsx');
  for(let index=0;index<productEditorialEntries.length;index++) {
    const entry=productEditorialEntries[index], copy=productEnglishTranslations.find(item=>item.id===entry.id).en;
    const family=seoFamilies[Math.floor(index/4)];
    const raw={id:entry.id,estActif:true,nomProduit:entry.expected.model,description:entry.expected.description,imageUrl:entry.expected.image,
      marque:entry.expected.brand,urlDatasheet:entry.expected.urlDatasheet,categorieId:family.category,sousCategorieId:family.subcategory,
      categorie:{id:family.category,nom:family.en},sousCategorie:{id:family.subcategory,nom:family.en},attributs:[],prixPublic:null,quantiteStock:null};
    const snapshot=productSnapshot(new URL('https://newoteg.com/product/'+entry.id),raw,Date.now());
    const html=renderTranslationPreview(snapshot);
    const visible=decode(html);
    assert(visible.includes(copy.name),entry.id+' name');assert(visible.includes(copy.description),entry.id+' description');
    assert(visible.includes(copy.title),entry.id+' note');assert(visible.includes(copy.summary),entry.id+' summary');
    for(const check of copy.checks) assert(visible.includes(check),entry.id+' check');
    assert(!visible.includes(entry.fr.summary),entry.id+' French review leaked into English component');
    const schema=JSON.parse(html.match(/data-product-schema="true">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@graph'][0].name,copy.name);assert.equal(schema['@graph'][0].description,copy.description);
    assert.equal(schema['@graph'][0].offers,undefined,'Unknown commercial values cannot become an offer');
    assert(visible.includes('Price to confirm'));assert(visible.includes('Ask for the price'));
    report.checks.push({id:entry.id,status:'passed',name:copy.name});
    if(out) await writeFile(join(out,entry.id+'.html'),html);
  }
  report.status='passed';
} catch(error) {report.status='failed';report.error=String(error);process.exitCode=1;}
finally {await server.close();if(out) await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));process.stdout.write(JSON.stringify(report,null,2)+'\n');}
