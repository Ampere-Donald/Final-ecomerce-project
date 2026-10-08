const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.NEWOTEG_TEST_URL || 'http://127.0.0.1:5190';
const output = process.env.NEWOTEG_TEST_OUTPUT || 'C:/Users/pc/Documents/Newoteg/output/implementation-work/captures/home-selection';
const cats = ['Câbles & Connectique','Alimentation & Energie','Chargeurs & Power Banks','Piles & Batteries','Mesure & Test','Outillage','Composants Électroniques'].map((nom,i)=>({id:'category-'+i,nom}));
const gridBlur = page => page.evaluate(() => document.activeElement?.blur());
const end = new Date(Date.now()+86400000).toISOString();
const fixtures = Array.from({length:6},(_,i)=>({ id:'fixture-'+i,code:'REF-'+i,nomProduit:'Composant de recette '+i,designationEn:'Test component '+i,estActif:true,quantiteStock:i===4?0:i===2?2:(i===1||i===5)?null:20,prixPublic:i===1?null:i===3?2900:4900+i*100,prixDetail:10000,categorieId:cats[0].id,categorie:cats[0],imageUrl:base+'/design-e/category-composants-144.webp',...(i===3?{offre:{prixCatalogue:3400,prixOffre:2900,fin:end}}:{})}));
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 const errors=[], writes=[], checks=[];
 let status=200, empty=false,delay=0;
 await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await ctx.route('**/api/**',async r=>{
  const req=r.request(),u=new URL(req.url());
  if(req.method()!=='GET'){writes.push(u.pathname);return r.abort()}
  if(u.pathname.endsWith('/categories'))return r.fulfill({json:cats});
  if(u.pathname.endsWith('/produits/populaires')){if(delay)await new Promise(res=>setTimeout(res,delay)); return r.fulfill({status,json:status===200?(empty?[]:fixtures):{message:'test'}})}
  const single=fixtures.find(p=>u.pathname.endsWith('/produits/'+p.id));
  if(single)return r.fulfill({json:single});
  if(u.pathname.endsWith('/produits')){
   const cat=u.searchParams.get('categoryId');
   return r.fulfill({json:{data:cat?[{...fixtures[0],id:'filtered-'+cat,code:cat,nomProduit:'Sélection '+cat,categorie:cats.find(c=>c.id===cat)}]:fixtures,meta:{total:cat?1:6,lastPage:1}}});
  }
  if(u.pathname.endsWith('/projets'))return r.fulfill({json:{data:[],meta:{total:0,lastPage:1}}});
  return r.fulfill({json:[]});
 });
 try{
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);
  const section=page.locator('.e-home-selection'),cards=section.locator('.e-home-product');
  await expect(cards).toHaveCount(5);
  await expect(section.locator('h2')).toHaveText('Notre sélection');
  assert.equal(await section.getByRole('button',{name:/Comparer|Ajouter/}).count(),0);
  assert.equal((await section.innerText()).includes('Se renseigner'),false);
  await expect(cards.nth(0).locator('.e-home-product-cta')).toHaveAttribute('href','/product/fixture-0');
  await expect(cards.nth(0).locator('.e-home-product-cta')).toHaveText('Voir le produit');
  await expect(cards.nth(1).locator('.e-price')).toHaveText('Prix à confirmer');
  await expect(cards.nth(1).locator('.e-home-stock')).toHaveText('À confirmer');
  await expect(cards.nth(2).locator('.e-home-stock')).toHaveText('Stock faible');
  await expect(cards.nth(3).locator('del')).toHaveText(/3\s*400\s+FCFA/);
  await expect(cards.nth(3).locator('.e-home-product-promo span')).toHaveText('−15 %');
  await expect(cards.nth(3).locator('.e-price')).toHaveText(/2\s*900\s+FCFA/);
  await expect(cards.nth(4).locator('.e-home-product-cta')).toHaveText('Voir les équivalents');
  const equiv=new URL(await cards.nth(4).locator('.e-home-product-cta').getAttribute('href'),base);
  assert.equal(equiv.searchParams.get('query'),'REF-4');assert.equal(equiv.searchParams.get('produitId'),'fixture-4');
  checks.push('Five maximum; stock, price, offer, detail and prefilled equivalence CTAs');
  const heart=cards.nth(0).getByRole('button');await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(cards).toHaveCount(5);await expect(cards.nth(0).getByRole('button')).toHaveAttribute('aria-pressed','true');
  await cards.nth(0).getByRole('button').click();await expect(cards.nth(0).getByRole('button')).toHaveAttribute('aria-pressed','false');
  checks.push('Favorites toggle and persist after reload');
  for(const [label,id] of [['Connecter','category-0'],['Alimenter','category-1'],['Mesurer & assembler','category-4'],['Réparer','category-6']]){
   await section.getByRole('button',{name:label,exact:true}).click();
   await expect(cards.first().locator('h3')).toContainText(id);
   await expect(section.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
  }
  await section.getByRole('button',{name:'Tous',exact:true}).click();await expect(cards).toHaveCount(5);
  checks.push('All four category filters replace API results; All restores selection');
  for(const width of [360,390,768,1000,1440]){
   await page.setViewportSize({width,height:1000});await page.evaluate(() => window.scrollTo(0, document.querySelector('.e-home-selection').offsetTop - 190));
   const geo=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),photo=n.querySelector('.e-home-product-photo').getBoundingClientRect(),cta=n.querySelector('.e-home-product-cta');return{x:r.x,y:r.y,w:r.width,h:r.height,photo:photo.height,cta:cta.getBoundingClientRect().width,color:getComputedStyle(cta).color,fit:getComputedStyle(n.querySelector('img')).objectFit}}));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   assert.ok(geo.every(r=>Math.abs(r.w-geo[0].w)<1&&Math.abs(r.h-geo[0].h)<1&&r.fit==='contain'));
   if(width>=1200)assert.ok(geo.every(r=>Math.abs(r.y-geo[0].y)<1));
   if(width>=761&&width<1200)assert.equal(geo.filter(r=>Math.abs(r.y-geo[0].y)<1).length,3);
   if(width<761){
    const grid=section.locator('.e-home-selection-grid');
    const ratio=await grid.evaluate(el=>el.clientWidth/el.firstElementChild.getBoundingClientRect().width);
    assert.ok(ratio>=1.1&&ratio<=1.3);
    await grid.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>grid.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
    await grid.evaluate(el=>el.scrollLeft=0);
   }
   assert.equal(geo[0].color,'rgb(255, 255, 255)');
   await gridBlur(page);
   await section.screenshot({path:path.join(output,'fixture-'+width+'.png')});
  }
  checks.push('Five responsive widths; desktop five, tablet three, mobile snap and keyboard scrolling; equal geometry');
  await page.setViewportSize({width:1440,height:1000});
  await cards.nth(4).locator('.e-home-product-cta').click();await expect(page).toHaveURL(equiv.href);
  await expect(page.locator('.e-equivalence-form textarea').first()).toHaveValue('REF-4');
  checks.push('Out-of-stock CTA opens actual equivalence page with reference');
  await page.goto(base+'/catalogue');
  await expect(page.locator('.e-product-grid .e-card')).toHaveCount(6);
  assert.equal(await page.locator('.e-home-product').count(),0);
  await expect(page.locator('.e-card').nth(1)).toContainText('Se renseigner');
  await expect(page.locator('.e-card').first().getByRole('button',{name:'Ajouter Composant de recette 0',exact:true})).toBeVisible();
  assert.ok(await page.locator('.e-card').first().getByRole('button',{name:/Comparer/}).count()>0);
  checks.push('Catalogue retains generic cards, advice and comparison');
  status=503;await page.goto(base);await expect(section.getByRole('alert')).toBeVisible();status=200;
  await section.getByRole('button',{name:'Réessayer',exact:true}).click();await expect(cards).toHaveCount(5);
  empty=true;await page.reload();await expect(section).toContainText('Aucune référence dans cette sélection');
  empty=false;delay=1000;await page.reload();await expect(section.getByRole('status')).toBeVisible();await expect(cards).toHaveCount(5);delay=0;
  checks.push('Error, retry, empty and loading states');
  fixtures[3].offre.fin = new Date(Date.now()+2000).toISOString();await page.reload();await expect(cards.nth(3).locator('del')).toHaveCount(1);await expect(cards.nth(3).locator('del')).toHaveCount(0,{timeout:5000});
  checks.push('Expired promotion loses crossed price and percentage without a reload');
  await page.getByRole('button',{name:'English',exact:true}).click();await expect(cards).toHaveCount(5);
  await expect(section.locator('h2')).toHaveText('Our selection');await expect(cards.nth(0).locator('h3')).toHaveText('Test component 0');
  await expect(cards.nth(4).locator('.e-home-product-cta')).toHaveText('View alternatives');
  checks.push('English names and CTAs');
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  fs.writeFileSync(path.join(output,'fixture-result.json'),JSON.stringify({checks,errors,writes,fixture:true},null,2));
  console.log(JSON.stringify({passed:checks.length,checks,errors,writes}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
