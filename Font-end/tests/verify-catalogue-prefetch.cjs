// Built modern/legacy browser paths. Public API fixtures only; no shop writes.
const {chromium}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {expect}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.PREFETCH_TEST_BASE||'http://127.0.0.1:5237';
assert.equal(new URL(base).hostname,'127.0.0.1');
const out=process.env.PREFETCH_TEST_OUTPUT;assert(out);fs.mkdirSync(out,{recursive:true});
const row=(name)=>({id:'11111111-1111-4111-8111-111111111111',nomProduit:name,code:'TEST',estActif:true,categorieId:'test',categorie:{id:'test',nom:'Fixture'},prixPublic:3500,quantiteStock:3,imageUrl:'https://res.cloudinary.com/dm4ij9sxg/image/upload/v123/produits/prefetch-fixture.webp'});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const report={checks:[],errors:[],writes:[],fixtureOnly:true};
 const releases=[];
 try{
  for(const legacy of [false,true])for(const width of [390,768,1440]){
   const ctx=await browser.newContext({viewport:{width,height:1000}});
   let release,releaseStyles;const gate=new Promise(resolve=>{release=resolve});
   const stylesGate=new Promise(resolve=>{releaseStyles=resolve});
   releases.push(release,releaseStyles);
   let productReads=0,categoryReads=0,imageReads=0;
   await ctx.route('**/assets/*.js',async r=>{await gate;await r.continue()});
   await ctx.route('**/assets/*.css',async r=>{await stylesGate;await r.continue()});
   await ctx.route('https://res.cloudinary.com/**',r=>{
    imageReads++;return r.fulfill({contentType:'image/webp',body:fs.readFileSync(__dirname+'/../public/design-e/hero-scene-v2-960.webp')});
   });
   await ctx.route('**/*',async r=>{
    const req=r.request(),u=new URL(req.url());
    if(req.method()!=='GET'){report.writes.push(u.pathname);return r.abort()}
    if(u.pathname.startsWith('/api/')){
     if(u.pathname==='/api/produits'){
      productReads++;return r.fulfill({json:{data:[row(u.searchParams.get('sort')==='name_desc'?'B fixture':'A fixture')],meta:{total:1,lastPage:1}}});
     }
     if(u.pathname==='/api/categories'){categoryReads++;return r.fulfill({json:[{id:'test',nom:'Fixture'}]})}
     return r.fulfill({json:u.pathname==='/api/parcours/disponibilite'?{actif:false}:[]});
    }
    if(legacy&&req.resourceType()==='document'){
     const response=await r.fetch();return r.fulfill({response,body:(await response.text()).replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/\snomodule/g,'')});
    }
    return r.fallback();
   });
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(base+'/catalogue?search=NE555',{waitUntil:'commit'});
   await expect.poll(()=>productReads).toBe(1);await expect.poll(()=>categoryReads).toBe(1);
   await expect.poll(()=>imageReads).toBe(1);
   assert.equal(await page.locator('#root').innerHTML(),'');
   assert.equal(await page.evaluate(()=>localStorage.getItem('__newotegCataloguePrefetch')),null);
   releaseStyles();
   release();await expect(page.locator('.e-product-card').first()).toContainText('A fixture');
   assert.equal(productReads,1,'React must reuse the early product read');
   assert.equal(categoryReads,1,'React must reuse the early category read');
   await page.locator('.e-product-card img').first().evaluate(img=>img.decode());
   assert.equal(imageReads,1,'The card must reuse the exact responsive image preload');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.getByRole('combobox',{name:'Trier les produits'}).selectOption('name-desc');
   await expect(page.locator('.e-product-card').first()).toContainText('B fixture');assert.equal(productReads,2);
   await page.screenshot({path:out+'/'+(legacy?'legacy':'modern')+'-'+width+'.png',fullPage:false});
   report.checks.push({legacy,width,readsBeforeStyles:true,earlyReadsReused:true,imagePreloadReused:true,filterRefetched:true});await ctx.close();
  }
  for(const failure of ['unavailable','malformed']){
   const ctx=await browser.newContext();let reads=0;
   await ctx.route('**/api/**',r=>{
    const u=new URL(r.request().url());if(r.request().method()!=='GET'){report.writes.push(u.pathname);return r.abort()}
    if(u.pathname==='/api/produits'){
     reads++;if(reads===1)return failure==='unavailable'?r.fulfill({status:503,json:{message:'Fixture unavailable'}}):r.fulfill({json:{wrongShape:true}});
     return r.fulfill({json:{data:[row('Recovered fixture')],meta:{total:1,lastPage:1}}});
    }
    return r.fulfill({json:u.pathname==='/api/categories'?[]:{actif:false}});
   });
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(base+'/catalogue');
   if(failure==='malformed')await page.getByRole('button',{name:'Réessayer',exact:true}).click();
   await expect(page.locator('.e-product-card').first()).toContainText('Recovered fixture');assert.equal(reads,2);
   report.checks.push({failure,recovered:true,reads});await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);
  fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{for(const release of releases)release();await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
