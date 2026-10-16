// Local, intercepted API only. Exercises the V3.1 interactions, not real orders.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.NEWOTEG_TEST_URL || 'http://127.0.0.1:5199';
if (new URL(base).hostname !== '127.0.0.1') throw Error('Local fixture only');
const output = process.env.NEWOTEG_TEST_OUTPUT || 'C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3-1/fixture';
const cats = ['Composants Électroniques','Audio & Son','Satellite & TV','Alimentation & Energie','Chargeurs & Power Banks','Piles & Batteries','Câbles & Connectique','Mesure & Test','Outillage'].map((nom,i)=>({id:'cat-'+i,nom}));
const rows = cats.flatMap((categorie,c)=>Array.from({length:20},(_,i)=>({id:`00000000-0000-4000-8000-${String(c*100+i).padStart(12,'0')}`,code:'REF-'+c+'-'+i,nomProduit:`CONDO TDA transistor MOSFET CARTE MERE TV ampli LED ${categorie.nom} ${i}`,estActif:true,prixPublic:1500,quantiteStock:8,categorieId:categorie.id,categorie,imageUrl:base+'/design-e/category-v2-components-144.webp',...(i===0?{imageUrl2:base+'/design-e/category-v2-power-144.webp'}:{})})));
const checks=[],errors=[],writes=[];const pass=name=>{checks.push(name);console.log('PASS '+name)};
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
 await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await ctx.route('**/api/**',r=>{
   const u=new URL(r.request().url());if(r.request().method()!=='GET'){writes.push(u.pathname);return r.abort()}
   if(u.pathname.endsWith('/categories'))return r.fulfill({json:cats});
   if(u.pathname.endsWith('/produits/populaires'))return r.fulfill({json:rows.slice(0,20)});
   if(/\/produits\/(arrivages|flash)$/.test(u.pathname))return r.fulfill({json:[]});
   const product=rows.find(p=>u.pathname.endsWith('/produits/'+p.id));if(product)return r.fulfill({json:product});
   if(u.pathname.endsWith('/produits')){const data=rows.filter(p=>!u.searchParams.has('categoryId')||p.categorieId===u.searchParams.get('categoryId'));return r.fulfill({json:{data:data.slice(0,Number(u.searchParams.get('limit'))||24),meta:{total:data.length,lastPage:1}}})}
   return r.fulfill({json:[]});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 const shot=async(name,locator)=>{if(locator){await page.evaluate(()=>document.activeElement?.blur());await locator.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-200));await locator.screenshot({path:path.join(output,name+'.png')});}else await page.screenshot({path:path.join(output,name+'.png'),fullPage:true})};
 try{
  await page.clock.install();await page.goto(base);await expect(page.locator('.e-home-selection .e-selection-card')).toHaveCount(5);
  await page.locator('[data-catalogue-trigger]').click();const menu=page.locator('.e-catalogue-panel');await expect(menu).toBeVisible();
  assert.ok((await menu.boundingBox()).height<400);await expect(menu.locator('.e-catalogue-subfamilies a')).toHaveCount(6);
  assert.ok((await menu.getByRole('link',{name:'Condensateurs',exact:true}).getAttribute('href')).includes('category=cat-0&search=CONDO'));
  await shot('mega-menu',menu);await page.keyboard.press('Escape');await expect(page.locator('[data-catalogue-trigger]')).toBeFocused();
  pass('Dense mega-menu, six scoped technical searches, keyboard dismissal and restored focus');
  const shelf=page.locator('[data-collection="capacitors"]'),track=shelf.locator('.e-carousel-track');await page.locator('.e-progressive').first().scrollIntoViewIfNeeded();await expect(shelf.locator('.e-product-card')).toHaveCount(12);await shelf.scrollIntoViewIfNeeded();await shot('shelf-before',shelf);
  await shelf.getByRole('button',{name:'Produits suivants'}).click();await page.clock.runFor(700);await expect.poll(()=>track.evaluate(n=>n.scrollLeft)).toBeGreaterThan(1000);await shot('shelf-after',shelf);
  await track.focus();await page.keyboard.press('Home');await expect.poll(()=>track.evaluate(n=>n.scrollLeft)).toBe(0);await page.keyboard.press('End');await page.clock.runFor(300);await expect(shelf.getByRole('button',{name:'Produits suivants'})).toBeDisabled();
  pass('Smooth grouped carousel, Home/End keys and edge feedback');
  const banner=page.locator('.e-banner-rotator').first();await banner.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await expect(banner).toHaveAttribute('data-rotation','running');await page.clock.runFor(250);await page.clock.runFor(9500);
  await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Équipez votre atelier');await expect.poll(()=>banner.locator('.e-banner-slide.is-active').evaluate(n=>getComputedStyle(n).opacity)).toBe('1');await shot('banner-automatic',banner);
  await banner.getByRole('button',{name:'Bannière suivante'}).click();await page.clock.runFor(200);await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Tout pour vos montages');
  await page.mouse.move(0,0);await page.clock.runFor(10000);await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Tout pour vos montages');
  await banner.getByRole('button',{name:'Reprendre les bannières'}).click();await expect(banner.getByRole('button',{name:'Suspendre les bannières'})).toBeVisible();await page.mouse.move(0,0);await expect(banner).toHaveAttribute('data-rotation','running');await page.clock.runFor(250);await page.clock.runFor(9500);await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Équipez votre atelier');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(banner.locator('[data-rotation-toggle]')).toHaveCount(0);await expect(banner).toHaveAttribute('data-rotation','paused');await page.clock.runFor(10000);await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Équipez votre atelier');
  assert.equal(await banner.locator('.e-banner-slide[aria-hidden=true]').getAttribute('inert'),'');
  pass('Automatic banner, manual pause/resume, inert inactive slide and reduced motion');
  await page.goto(base+'/catalogue?search=CONDO');await expect(page.locator('.e-catalog-grid .e-product-card').first()).toBeVisible();
  const first=await page.locator('.e-catalog-grid').boundingBox();assert.ok(first.y<500);await shot('catalogue-desktop');
  const order=await page.evaluate(()=>document.querySelector('.e-equivalence-entry').compareDocumentPosition(document.querySelector('.e-catalog-grid')));assert.ok(order&2);
  pass('Search products appear before secondary equivalence/advice blocks');
  for(const width of [360,390,412,768,1024,1440]){
   await page.setViewportSize({width,height:900});await page.goto(base);await expect(page.locator('.e-home-selection .e-selection-card').first()).toBeAttached();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await shot('home-'+width);
   await page.locator('.e-progressive').first().scrollIntoViewIfNeeded();await expect(shelf.locator('.e-product-card')).toHaveCount(12);await shelf.scrollIntoViewIfNeeded();await track.focus();await page.keyboard.press('ArrowRight');await page.clock.runFor(700);await expect.poll(()=>track.evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);await shot('carousel-'+width,shelf);
   await page.goto(base+'/catalogue?search=CONDO');await expect(page.locator('.e-catalog-grid .e-product-card').first()).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.ok((await page.locator('.e-catalog-grid').boundingBox()).y<550);
   assert.ok(await page.locator('.e-home-product-reference').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=12));assert.ok((await page.locator('.e-home-product-cta').first().boundingBox()).height>=44);
   if(width<760){const boxes=await page.locator('.e-product-card').evaluateAll(a=>a.slice(0,2).map(n=>n.getBoundingClientRect().y));assert.equal(boxes[0],boxes[1])}await shot('catalogue-'+width);
   await page.goto(base+'/product/'+rows[0].id);await expect(page.locator('.e-main-photo')).toBeVisible();await shot('product-'+width);
   const original=await page.locator('.e-main-photo').boundingBox();await page.locator('.e-main-photo').click();const viewer=page.getByRole('dialog');await expect(viewer).toBeVisible();
   assert.ok((await viewer.boundingBox()).width>original.width);await viewer.getByRole('button',{name:'Vue suivante'}).click();await expect(viewer.locator('.e-viewer-head span')).toHaveText('2 / 2');await page.keyboard.press('ArrowLeft');await expect(viewer.locator('.e-viewer-head span')).toHaveText('1 / 2');
   if(width===412){const stage=await viewer.locator('.e-viewer-stage').boundingBox(),cdp=await ctx.newCDPSession(page);const y=stage.y+stage.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(viewer.locator('.e-viewer-head span')).toHaveText('2 / 2');await page.keyboard.press('ArrowLeft');await cdp.detach();}
   await viewer.getByRole('button',{name:'Zoom 150 %'}).click();await expect(viewer.locator('.e-viewer-stage')).toHaveClass(/is-zoomed/);await page.screenshot({path:path.join(output,'gallery-'+width+'.png')});await page.keyboard.press('Escape');await expect(viewer).toHaveCount(0);await expect(page.locator('.e-main-photo')).toBeFocused();
   await page.locator('.e-purchase button.e-btn').click();await page.goto(base+'/panier');await expect(page.locator('main h1')).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await shot('cart-'+width);
  }
  pass('Home, catalogue, carousel, detail and enlarged multi-view gallery at 360/390/412/768/1024/1440');
  await page.goto(base+'/product/'+rows[1].id);await page.locator('.e-main-photo').click();const single=page.getByRole('dialog');await expect(single.locator('.e-viewer-head span')).toHaveText('1 / 1');assert.equal(await single.getByRole('button',{name:'Vue suivante'}).count(),0);await single.getByRole('button',{name:'Fermer la visionneuse'}).click();
  pass('Single-image viewer remains useful, clear close control');
  await page.setViewportSize({width:390,height:900});await page.goto(base);await page.getByRole('button',{name:'Ouvrir le menu'}).click();await page.getByRole('button',{name:'Explorer les familles'}).click();await expect(page.locator('.e-catalogue-panel')).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.keyboard.press('Escape');
  await page.locator('#header-product-search').fill('CONDO');await expect(page.getByRole('listbox',{name:'Suggestions de produits'})).toBeVisible();await page.locator('#header-product-search').press('Escape');
  await banner.scrollIntoViewIfNeeded();const rectangle=await banner.boundingBox(),cdp=await ctx.newCDPSession(page);const y=rectangle.y+rectangle.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:100,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Équipez votre atelier');await shot('banner-touch-390',banner);await cdp.detach();
  pass('Mobile drawer/search, native banner and gallery touch, cart at six widths');
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({checks,errors,writes,fixtureOnly:true},null,2));
 }catch(e){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:e.stack,checks,errors,writes},null,2));throw e}finally{await browser.close()}
})();

