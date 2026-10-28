// Built browser transport contract. All API data is local to these contexts;
// no account, order or production API is contacted or mutated.
const {chromium}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {expect}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const local=process.env.CATALOGUE_TRANSPORT_BASE;
assert.equal(new URL(local).hostname,'127.0.0.1');
const out=process.env.CATALOGUE_TRANSPORT_OUTPUT;assert(out);fs.mkdirSync(out,{recursive:true});
const report={cases:[],errors:[],writes:[],fixtureOnly:true};
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const mode of [{origin:'https://newoteg.com',width:390},{origin:'https://www.newoteg.com',width:1440},
    {origin:'https://newoteg.com',width:390,legacy:true},
    {origin:'https://newoteg.com',width:390,path:'/catalogue/condensateurs'},{origin:local,width:390}]){
   const ctx=await browser.newContext({viewport:{width:mode.width,height:950}});
   const catalogueRequests=[],preflights=[];
   await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
   if(mode.legacy)await ctx.addInitScript(()=>{
    const supports=DOMTokenList.prototype.supports;
    DOMTokenList.prototype.supports=function(token){return token==='modulepreload'?false:supports.call(this,token)};
   });
   let descending=false;
   const row=()=>({id:'11111111-1111-4111-8111-111111111111',nomProduit:descending?'Updated fixture':'Proxy fixture',
    code:'FIXTURE',estActif:true,categorieId:'fixture',categorie:{id:'fixture',nom:'Fixture'},
    prixPublic:descending?7500:3500,quantiteStock:descending?0:3,imageUrl:'/product-images/fixture.webp'});
   await ctx.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.method()==='OPTIONS'){
     preflights.push(url.pathname);return route.fulfill({status:204,headers:{'access-control-allow-origin':mode.origin,
      'access-control-allow-headers':'X-Request-Id, Authorization','access-control-allow-methods':'GET'}});
    }
    if(req.method()!=='GET'){report.writes.push(url.pathname);return route.abort()}
    if(url.pathname.startsWith('/api/')){
     const publicRead=/^\/api\/(produits|categories)(?:\/|$)/.test(url.pathname);
     if(publicRead)catalogueRequests.push({origin:url.origin,path:url.pathname,query:url.search,requestId:Boolean(req.headers()['x-request-id'])});
     const headers={'access-control-allow-origin':mode.origin,'access-control-allow-credentials':'true'};
     if(url.pathname==='/api/produits'){
      descending=url.searchParams.get('sort')==='name_desc';
      return route.fulfill({headers,json:{data:[row()],meta:{total:1,lastPage:1}}});
     }
     if(url.pathname.startsWith('/api/produits/'))return route.fulfill({headers,json:row()});
     return route.fulfill({headers,json:url.pathname==='/api/categories'?[{id:'fixture',nom:'Fixture'}]:{actif:false}});
    }
    if(url.pathname==='/product-images/fixture.webp')return route.fulfill({contentType:'image/webp',
     body:fs.readFileSync(__dirname+'/../public/design-e/category-v2-tools.webp')});
    if(url.origin===mode.origin){
     const response=await route.fetch({url:local+url.pathname+url.search});
     if(mode.legacy&&req.resourceType()==='document')return route.fulfill({response,
      body:(await response.text()).replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/\snomodule/g,'')});
     return route.fulfill({response});
    }
    return route.abort();
   });
   const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&/hydration|startup/.test(m.text()))report.errors.push(m.text())});
   await page.goto(mode.origin+(mode.path||'/catalogue'));
   await expect(page.locator('link[rel="preconnect"][href="https://res.cloudinary.com"]')).toHaveCount(1);
   const card=page.locator('.e-product-card').first();
   await expect(card).toContainText('Proxy fixture');
   await expect(card.locator('img')).toHaveAttribute('src','https://api.newoteg.com/product-images/fixture.webp');
   await page.getByRole('combobox',{name:'Trier les produits',exact:true}).selectOption('name-desc');
   await expect(card).toContainText('Updated fixture');
   await expect(card.locator('.e-price')).toHaveText(/7\s*500\s*FCFA/);
   await expect(card.locator('.e-home-stock')).toHaveText('Rupture de stock');
   await card.locator('.e-home-product-heart').click();
   await expect(card.locator('.e-home-product-heart')).toHaveAttribute('aria-pressed','true');
   await page.reload();await expect(card.locator('.e-home-product-heart')).toHaveAttribute('aria-pressed','true');
   const expected=mode.origin===local?'https://api.newoteg.com':mode.origin;
   assert(catalogueRequests.length>=5);
   assert(catalogueRequests.every(request=>request.origin===expected),JSON.stringify(catalogueRequests));
   assert(catalogueRequests.some(request=>request.requestId),'Axios must still emit request identifiers');
   assert(catalogueRequests.some(request=>request.path.endsWith('/11111111-1111-4111-8111-111111111111')),'Saved favourites must refresh through the same transport');
   if(mode.origin!==local)assert.deepEqual(preflights,[],'Catalogue GETs must not need a CORS preflight');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   report.cases.push({...mode,proxy:mode.origin!==local,catalogueRequests,preflights,sortAndFreshPrices:true,favouritesRestored:true,mediaOriginPreserved:true});
   await ctx.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);report.status='passed';
  fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(error=>{console.error(error.message);process.exitCode=1});
