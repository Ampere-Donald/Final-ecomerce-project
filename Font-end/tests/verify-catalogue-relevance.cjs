const {chromium}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {expect}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
assert(process.send,'Owned database recipe IPC required');
const base=process.env.RELEVANCE_STOREFRONT_BASE;assert(base&&new URL(base).hostname==='127.0.0.1');
const output=process.env.RELEVANCE_BROWSER_OUTPUT;assert(output);
let nextId=0;const pending=new Map();
function read(query){return new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});process.send({kind:'catalogue-read',id,query})})}
process.on('message',message=>{
 if(message?.kind!=='catalogue-response')return;
 const call=pending.get(message.id);if(!call)return;pending.delete(message.id);
 if(message.error)call.reject(Error(message.error));else call.resolve(message.data);
});
process.once('message',async fixture=>{
 assert.equal(fixture.kind,'fixture');
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const report={checks:[],errors:[],writes:[],realControllerAndSql:true,fixtureTransport:true};fs.mkdirSync(output,{recursive:true});
 try{
  for(const legacy of [false,true])for(const lang of ['fr','en'])for(const width of [390,768,1440]){
   const ctx=await browser.newContext({viewport:{width,height:1000}});await ctx.addInitScript(lang=>localStorage.setItem('appLang',lang),lang);
   const requests=[];
   await ctx.route('**/*',async r=>{
    const q=r.request(),u=new URL(q.url());
    if(q.method()!=='GET'){report.writes.push(u.pathname);return r.abort()}
    if(u.pathname.startsWith('/api/')){
     if(u.pathname==='/api/produits'){
      const data=await read(u.search.slice(1));requests.push({params:Object.fromEntries(u.searchParams),ids:data.data.map(p=>p.id)});return r.fulfill({json:data});
     }
     return r.fulfill({json:u.pathname==='/api/categories'?[fixture.category]:u.pathname==='/api/parcours/disponibilite'?{actif:false}:[]});
    }
    if(legacy&&q.resourceType()==='document'){
     const response=await r.fetch();return r.fulfill({response,body:(await response.text()).replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/\snomodule/g,'')});
    }
    if(u.origin!==base)return r.abort();return r.continue();
   });
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   const url=base+'/catalogue?'+new URLSearchParams({search:fixture.reference,category:fixture.category.id});
   await page.goto(url);const sort=page.getByRole('combobox',{name:lang==='fr'?'Trier les produits':'Sort products'});
   const cards=page.locator('.e-catalog-grid .e-product-card');
   await expect(cards.first()).toContainText('ZZZ fixture exact code');await expect(sort).toHaveValue('relevance');
   assert.equal(requests[0].params.sort,'relevance');assert.equal(requests.length,1,'Early catalogue request must be reused');
   assert.deepEqual(requests[0].ids.slice(0,4),[fixture.exact,fixture.manufacturer,fixture.named,fixture.alias]);
   assert(!requests[0].ids.includes(fixture.archived));
   await sort.selectOption('name-asc');await expect(cards.first()).toContainText('AAA fixture');
   await sort.selectOption('price-asc');await expect(cards.first()).toContainText('BBB fixture alias');
   await sort.selectOption('relevance');await expect(cards.first()).toContainText('ZZZ fixture exact code');
   await page.getByRole('button',{name:lang==='fr'?'Filtres':'Filters',exact:true}).click();
   const dialog=page.getByRole('dialog'),stock=dialog.getByRole('checkbox');
   // Router commits controlled query state asynchronously after the click.
   await stock.click();await expect(stock).toBeChecked();await expect(page).toHaveURL(/instock=true/);
   await dialog.getByRole('button',{name:lang==='fr'?'Voir les résultats':'View results',exact:true}).click();
   await expect.poll(()=>requests.filter(r=>r.params.inStock==='true').length).toBeGreaterThan(0);
   const stocked=requests.filter(r=>r.params.inStock==='true').at(-1);assert(!stocked.ids.includes(fixture.unavailable));assert.equal(stocked.ids[0],fixture.exact);
   await page.locator('#header-product-search').fill(fixture.reference+'B');await page.locator('#header-product-search').press('Enter');
   await expect(cards.first()).toContainText('Suffix fixture');await expect(sort).toHaveValue('relevance');
   assert.equal(requests.at(-1).params.search,fixture.reference+'B');assert.equal(requests.at(-1).ids[0],fixture.suffix);
   assert(!requests.at(-1).ids.includes(fixture.exact));
   await page.getByRole('button',{name:(lang==='fr'?'Effacer ':'Remove ')+fixture.reference+'B',exact:true}).click();
   await expect(sort).toHaveValue('name-asc');await expect(sort.locator('option[value=relevance]')).toHaveCount(0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(!legacy&&lang==='fr')await page.screenshot({path:output+'/catalogue-'+width+'.png',fullPage:false});
   report.checks.push({legacy,lang,width,exactFirst:true,explicitSorts:true,stockFilter:true,suffixPreserved:true,clearRestoresAlphabetical:true});
   await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);fs.writeFileSync(output+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }catch(error){fs.writeFileSync(output+'/failure.json',JSON.stringify({error:error.message,...report},null,2));throw error}
 finally{await browser.close();process.disconnect()}
});
