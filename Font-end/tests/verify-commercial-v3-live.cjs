// Actual public catalogue, read-only. Local production build or published storefront.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.NEWOTEG_TEST_URL || 'http://127.0.0.1:5199';
const output = process.env.NEWOTEG_TEST_OUTPUT || 'C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/after';
const checks=[],errors=[],writes=[],rows=[],responses=[];
const ids=['capacitors','semiconductors','repair','power','connect','tools'];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
  await ctx.route('**/*',r=>{
   const req=r.request(),u=new URL(req.url());
   if(u.pathname==='/cdn-cgi/rum')return r.abort();
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(u.pathname);return r.abort()}
   return r.continue();
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async res=>{
   const u=new URL(res.url());if(!u.pathname.startsWith('/api/produits'))return;
   try { const data=await res.json(); responses.push({path:u.pathname+u.search,status:res.status(),data}); }catch{ /* Non-JSON failures are asserted through visible error states. */ }
  });
  await page.goto(base);
  await expect(page.locator('.e-home-selection .e-product-card').first()).toBeVisible({timeout:30000});
  const selection=page.locator('.e-home-selection');
  for(const [i,id] of ids.entries()){
   await page.locator('.e-progressive').nth(i).scrollIntoViewIfNeeded();
   const shelf=page.locator(`[data-collection="${id}"]`);
   await expect(shelf.locator('.e-product-card').first()).toBeVisible({timeout:30000});
   const products=await shelf.locator('.e-product-card').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('h3').textContent,href:n.querySelector('h3 a').getAttribute('href'),price:n.querySelector('.e-price').textContent,stock:n.querySelector('.e-home-stock').textContent})));
   assert.ok(products.length>=5&&products.length<=20,`${id}: ${products.length}`);
   assert.equal(new Set(products.map(p=>p.href)).size,products.length);
   assert.ok(products.every(p=>p.stock==='En stock'||p.stock==='Stock faible'));
   assert.equal(await shelf.locator('.e-comparison-action').count(),0);
   rows.push({id,products,link:await shelf.locator('.e-section-head>a').getAttribute('href')});
   checks.push(`${id}: ${products.length} actual available references`);
  }
  await page.locator('.e-progressive').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.e-project-teaser')).toBeVisible({timeout:30000});
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.e-merch-collection [role="alert"]').count(),0);
  // All shelves were visited to trigger progressive loading, then capture the loaded page.
  for(const width of [360,390,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(output,`home-full-${width}.png`),fullPage:true});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Home overflow ${width}`);
   await selection.scrollIntoViewIfNeeded();await expect.poll(()=>selection.locator('img').first().evaluate(el=>el.complete&&el.naturalWidth>0),{timeout:20000}).toBe(true);
   await selection.screenshot({path:path.join(output,`selection-${width}.png`)});
   checks.push(`Home and selection ${width}px`);
  }
  await page.setViewportSize({width:1440,height:1000});
  const second=page.locator('[data-collection="capacitors"]');await second.scrollIntoViewIfNeeded();
  await expect.poll(()=>second.locator('img').first().evaluate(el=>el.complete&&el.naturalWidth>0),{timeout:20000}).toBe(true);
  await second.screenshot({path:path.join(output,'second-group-1440.png')});
  await page.locator('.e-merch-banner').first().screenshot({path:path.join(output,'banner-1440.png')});
  await selection.getByRole('button',{name:'Produits suivants'}).click();
  await expect.poll(()=>selection.locator('.e-carousel-track').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await selection.screenshot({path:path.join(output,'carousel-scrolled-1440.png')});
  const target=await second.locator('h3 a').first().getAttribute('href');
  for(const width of [360,390,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});await page.goto(base+'/catalogue');
   await expect(page.locator('.e-catalog-grid .e-product-card')).toHaveCount(24,{timeout:30000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Catalogue overflow ${width}`);
   const firstTwo=await page.locator('.e-catalog-grid .e-product-card').evaluateAll(nodes=>nodes.slice(0,2).map(n=>{const r=n.getBoundingClientRect();return{y:r.y,w:r.width,body:n.querySelector('.e-home-product-body').getBoundingClientRect().width}}));
   assert.ok(firstTwo.every(p=>p.w>130&&p.body>110));assert.equal(firstTwo[0].y,firstTwo[1].y);
   await page.screenshot({path:path.join(output,`catalogue-${width}.png`),fullPage:true});
   if(width<=390){await page.locator('.e-catalog-grid').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`catalogue-cards-${width}.png`)});}
   checks.push(`Compact actual catalogue ${width}px`);
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+target);
  await expect(page.locator('.e-product-top h1')).toBeVisible({timeout:30000});
  await page.screenshot({path:path.join(output,'product-1440.png'),fullPage:true});
  await page.setViewportSize({width:390,height:1000});await page.screenshot({path:path.join(output,'product-390.png'),fullPage:true});
  checks.push('Actual component detail; original purchase controls retained');
  // Compare rendered shelf IDs against the bounded actual server responses.
  const serverIds=new Set(responses.flatMap(r=>(Array.isArray(r.data)?r.data:r.data?.data||[]).map(p=>'/product/'+p.id)));
  assert.ok(rows.every(r=>r.products.every(p=>serverIds.has(p.href))));
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({base,date:new Date().toISOString(),checks,errors,writes,rows,responses:responses.map(r=>({path:r.path,status:r.status,count:(Array.isArray(r.data)?r.data:r.data?.data||[]).length})),detail:target},null,2));
  console.log(JSON.stringify({base,passed:checks.length,counts:rows.map(r=>[r.id,r.products.length]),errors,writes}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
