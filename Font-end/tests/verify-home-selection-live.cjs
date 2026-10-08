// Read-only verification against the shop's actual public API; no catalogue fixtures.
const { chromium }=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect }=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NEWOTEG_TEST_URL||'http://127.0.0.1:5199';
const output=process.env.NEWOTEG_TEST_OUTPUT||'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/home-selection';
(async()=>{
 const res=await fetch('https://api.newoteg.com/api/produits/populaires');assert.equal(res.status,200);
 const products=(await res.json()).slice(0,5);assert.equal(products.length,5);
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 const writes=[],errors=[],checks=[];
 await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
 await ctx.route('**/*',r=>{if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){writes.push(new URL(r.request().url()).pathname);return r.abort()}return r.continue()});
 try{
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);const section=page.locator('.e-home-selection'),cards=section.locator('.e-home-product');
  await expect(cards).toHaveCount(5,{timeout:30000});
  await expect(section.locator('h2')).toHaveText('Notre sélection');
  for(let i=0;i<5;i++){
   await expect(cards.nth(i).locator('h3')).toHaveText(products[i].nomProduit);
   await expect(cards.nth(i).locator('.e-home-product-cta')).toHaveAttribute('href','/product/'+products[i].id);
  }
  checks.push('Actual API selection IDs and names match public response');
  for(const width of [360,390,768,1000,1440]){
   await page.setViewportSize({width,height:1100});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const g=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
   if(width===1440)assert.ok(g.every(r=>Math.abs(r.y-g[0].y)<1&&Math.abs(r.w-g[0].w)<1&&Math.abs(r.h-g[0].h)<1));
   await page.evaluate(()=>window.scrollTo(0,document.querySelector('.e-home-selection').offsetTop-190));
   await expect.poll(()=>cards.first().locator('img').evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true,{timeout:20000});
   await page.screenshot({path:path.join(output,'live-viewport-'+width+'.png')});
   if(width===1440)await section.screenshot({path:path.join(output,'live-section-1440.png')});
   checks.push('Real catalogue layout '+width+' px');
  }
  for(const label of ['Connecter','Alimenter','Mesurer & assembler','Réparer']){
   await section.getByRole('button',{name:label,exact:true}).click();
   await expect(cards).toHaveCount(5,{timeout:30000});
   checks.push('Live category filter '+label);
  }
  await page.goto(base+'/catalogue');await expect(page.locator('.e-catalog-grid .e-card').first()).toBeVisible({timeout:30000});
  assert.equal(await page.locator('.e-home-product').count(),0);checks.push('Real catalogue retains standard cards');
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,base.startsWith('https:')?'production-result.json':'live-result.json'),JSON.stringify({base,checks,errors,writes,products:products.map(p=>({id:p.id,name:p.nomProduit,price:p.prixPublic,stock:p.quantiteStock}))},null,2));
  console.log(JSON.stringify({base,passed:checks.length,checks,errors,writes}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
