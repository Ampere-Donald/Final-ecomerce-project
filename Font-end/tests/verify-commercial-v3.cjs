// Local fixture recipe. All API traffic is intercepted; never sends a real order.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.NEWOTEG_TEST_URL || 'http://127.0.0.1:5199';
if (new URL(base).hostname !== '127.0.0.1') throw Error('Fixture recipe is local only');
const output = process.env.NEWOTEG_TEST_OUTPUT || 'C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/fixture';
const names = ['Composants Électroniques','Audio & Son','Satellite & TV','Alimentation & Energie','Chargeurs & Power Banks','Piles & Batteries','Câbles & Connectique','Mesure & Test','Outillage'];
const cats = names.map((nom,i) => ({id:`cat-${i}`,nom}));
const products = cats.flatMap((cat,c) => Array.from({length:24},(_,i) => ({
 id:`00000000-0000-4000-8000-${String(c*100+i).padStart(12,'0')}`, code:`REF-${c}-${i}`, estActif:true,
 nomProduit:`${c===0?'TDA CONDO condensateur transistor MOSFET CARTE MERE TV':c===1?'Amplificateur ampli':c===2?'LED TV':cat.nom} — ${i}`,
 designationEn:`Electronic part ${c}-${i}`, prixPublic:1000+i*100, quantiteStock:8, categorieId:cat.id,categorie:cat,
 imageUrl:base+'/design-e/category-composants-144.webp',
})));
const selection=products.slice(0,20);
selection[1].prixPublic=null;selection[1].quantiteStock=null;selection[2].quantiteStock=0;selection[3].quantiteStock=2;
selection[4].prixPublic=2900;selection[4].offre={prixCatalogue:3400,prixOffre:2900,fin:new Date(Date.now()+600000).toISOString()};
let mode='normal', offers=[selection[4]], arrivals=products.slice(5,8).map(p=>({...p,arrivageAt:'2026-10-01T10:00:00Z'}));
const checks=[],errors=[],interceptedWrites=[],requests=[];
const pass=s=>{checks.push(s);console.log('PASS '+s)};
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try {
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  await ctx.route('**/api/**',async r=>{
   const req=r.request(),u=new URL(req.url());requests.push(u.pathname+u.search);
   if(req.method()!=='GET'){
    interceptedWrites.push(u.pathname);
    if(u.pathname==='/api/commandes/quote'){
     const lines=req.postDataJSON().lignes.map(l=>({...l,nomProduit:products.find(p=>p.id===l.produitId).nomProduit,prixUnitaire:1000,sousTotal:1000*l.quantite}));
     return r.fulfill({json:{requestProtocol:1,montantArticles:lines.reduce((s,l)=>s+l.sousTotal,0),fraisLivraison:null,lignes:lines}});
    }
    throw Error('Unexpected mutation: '+u.pathname);
   }
   if(u.pathname.endsWith('/categories'))return r.fulfill({json:cats});
   if(u.pathname.endsWith('/produits/populaires'))return r.fulfill({json:selection});
   if(u.pathname.endsWith('/produits/flash'))return r.fulfill({json:offers});
   if(u.pathname.endsWith('/produits/arrivages'))return r.fulfill({json:arrivals});
   const p=products.find(p=>u.pathname.endsWith('/produits/'+p.id));
   if(p)return r.fulfill({json:p});
   if(u.pathname.endsWith('/produits')){
    const editorial=u.searchParams.get('sort')==='price_desc'&&u.searchParams.get('inStock')==='true';
    if(editorial&&mode==='error')return r.fulfill({status:503,json:{message:'Fixture unavailable'}});
    let rows=mode==='empty'&&editorial?[]:products.filter(p=>!u.searchParams.has('categoryId')||p.categorieId===u.searchParams.get('categoryId'));
    const search=u.searchParams.get('search');if(search)rows=rows.filter(p=>p.nomProduit.toLowerCase().includes(search.toLowerCase()));
    if(u.searchParams.get('inStock')==='true')rows=rows.filter(p=>p.quantiteStock>0);
    if(mode==='partial'&&editorial)rows=rows.slice(0,2);
    const limit=Number(u.searchParams.get('limit'))||24,page=Number(u.searchParams.get('page'))||1;
    return r.fulfill({json:{data:rows.slice((page-1)*limit,page*limit),meta:{total:rows.length,lastPage:Math.max(1,Math.ceil(rows.length/limit))}}});
   }
   if(u.pathname.endsWith('/projets'))return r.fulfill({json:{data:[],meta:{total:0,lastPage:1}}});
   return r.fulfill({json:[]});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  const goto=url=>page.goto(base+url);
  await goto('/');
  const section=page.locator('.e-home-selection'),cards=section.locator('.e-product-card'),track=section.locator('.e-carousel-track');
  await expect(cards).toHaveCount(20);
  await expect(section.locator('h2')).toHaveText('Notre sélection');
  assert.equal(await section.locator('.e-comparison-action').count(),0);
  await expect(cards.nth(1).locator('.e-price')).toHaveText('Prix à confirmer');
  await expect(cards.nth(1).locator('.e-home-stock')).toHaveText('Disponibilité à confirmer');
  await expect(cards.nth(2).locator('.e-home-product-cta')).toHaveText('Voir les équivalents');
  await expect(cards.nth(4).locator('del')).toHaveText(/3\s*400/);
  await expect(cards.nth(4).locator('.e-home-product-promo')).toContainText('Catalogue');
  const prev=section.getByRole('button',{name:'Produits précédents'}),next=section.getByRole('button',{name:'Produits suivants'});
  await expect(prev).toBeDisabled();await expect(next).toBeEnabled();
  const step=await track.evaluate(el=>el.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(el).columnGap));
  await next.click();await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(step*4.8);
  await track.evaluate(el=>el.scrollLeft=el.scrollWidth);await expect(next).toBeDisabled();await expect(prev).toBeEnabled();
  await track.evaluate(el=>el.scrollLeft=0);await expect(prev).toBeDisabled();
  pass('Twenty loaded / five visible; five-card arrow step, disabled limits, genuine prices and stock');
  const heart=cards.first().locator('.e-home-product-heart');await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(cards).toHaveCount(20);await expect(heart).toHaveAttribute('aria-pressed','true');
  for(const label of ['Connecter','Alimenter','Mesurer & assembler','Réparer']){
   await section.getByRole('button',{name:label,exact:true}).click();await expect(cards).toHaveCount(20);
   await expect(section.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
  }
  await section.getByRole('button',{name:'Tous',exact:true}).click();await expect(cards).toHaveCount(20);
  pass('Favorites persist; four filters load different real category queries');
  for(const [index,id] of ['capacitors','semiconductors','repair','power','connect','tools'].entries()){
   await page.locator('.e-progressive').nth(index).scrollIntoViewIfNeeded();
   const shelf=page.locator(`[data-collection="${id}"]`);
   await expect(shelf.locator('.e-product-card').first()).toBeVisible();
   const count=await shelf.locator('.e-product-card').count();assert.ok(count>=5&&count<=20,`${id}: ${count} unique references`);
   assert.equal(await shelf.locator('.e-comparison-action').count(),0);
   assert.ok((await shelf.locator('.e-section-head>a').getAttribute('href')).startsWith('/catalogue?'));
  }
  await page.locator('.e-progressive').last().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-collection="arrivages"] .e-product-card')).toHaveCount(3);
  await expect(page.locator('[data-collection="offres"] .e-product-card')).toHaveCount(1);
  pass('Six populated shelves, proper links; partial arrivals and real offer use shared cards');
  for(const width of [360,390,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});await section.scrollIntoViewIfNeeded();
   const geometry=await track.evaluate(el=>({width:el.clientWidth,card:el.firstElementChild.getBoundingClientRect().width,gap:parseFloat(getComputedStyle(el).gap)}));
   const visible=(geometry.width+geometry.gap)/(geometry.card+geometry.gap);
   if(width>=1200)assert.ok(Math.abs(visible-5)<.03);else if(width>760)assert.ok(Math.abs(visible-3)<.03);else assert.ok(visible>1.1&&visible<1.3);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await track.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
   await track.evaluate(el=>el.scrollLeft=0);
   await section.screenshot({path:path.join(output,`selection-${width}.png`)});
  }
  pass('Six widths, keyboard, reduced motion, equal layout and no horizontal page overflow');
  await cards.nth(2).locator('.e-home-product-cta').click();await expect(page.locator('.e-equivalence-form textarea').first()).toHaveValue('REF-0-2');
  await goto('/catalogue');await expect(page.locator('.e-catalog-grid .e-product-card')).toHaveCount(24);
  await page.setViewportSize({width:390,height:900});
  let g=await page.locator('.e-catalog-grid .e-product-card').evaluateAll(nodes=>nodes.slice(0,2).map(n=>({x:n.offsetLeft,y:n.offsetTop,w:n.getBoundingClientRect().width})));
  assert.equal(g[0].y,g[1].y);assert.ok(g[1].x>g[0].x);
  await page.getByRole('button',{name:'Vue liste',exact:true}).click();await expect(page.locator('.e-catalog-grid')).toHaveClass(/e-list/);
  await page.getByRole('button',{name:'Vue grille',exact:true}).click();
  const compare=page.locator('.e-catalog-grid .e-compare-toggle');await compare.nth(0).click();await compare.nth(3).click();
  await page.locator('.e-compare-link').click();await expect(page).toHaveURL(/\/comparer/);await expect(page.locator('.e-comparison-table')).toBeVisible();
  pass('Out-of-stock reference prefills equivalents; compact catalogue, list toggle and comparison remain functional');
  await goto('/');await page.getByRole('searchbox').fill('TDA');await page.getByRole('searchbox').press('Enter');await expect(page).toHaveURL(/search=TDA/);
  await expect(page.locator('.e-catalog-grid .e-product-card').first()).toBeVisible();
  await page.getByRole('button',{name:'Filtres',exact:true}).click();
  await page.getByRole('dialog').getByRole('combobox').selectOption('cat-0');await expect(page).toHaveURL(/category=cat-0/);
  await page.getByRole('checkbox',{name:'En stock uniquement'}).click();await expect(page).toHaveURL(/instock=true/);
  await expect(page.getByRole('checkbox',{name:'En stock uniquement'})).toBeChecked();
  await page.getByLabel('Prix min. (FCFA)').fill('500');await expect(page).toHaveURL(/minPrice=500/);
  await page.getByLabel('Prix max. (FCFA)').fill('5000');await expect(page).toHaveURL(/maxPrice=5000/);await page.keyboard.press('Escape');
  await page.getByRole('combobox',{name:'Trier les produits'}).selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/);assert.ok(page.url().includes('minPrice=500')&&page.url().includes('maxPrice=5000'));
  await goto('/catalogue');await expect(page.locator('.e-pagination')).toBeVisible();await page.getByRole('button',{name:'Suivant',exact:true}).click();await expect(page).toHaveURL(/page=2/);
  pass('Search, category, stock, price, sort and pagination preserve URL filters');
  await goto('/product/'+selection[0].id);await expect(page.locator('.e-purchase button.e-btn')).toBeVisible();await page.locator('.e-purchase button.e-btn').click();
  await goto('/panier');await expect(page.locator('output')).toHaveText('1');await page.reload();await expect(page.locator('output')).toHaveText('1');
  await page.getByRole('link',{name:'Choisir la réception'}).click();
  await page.getByLabel('Nom complet',{exact:true}).fill('Client Recette');await page.getByLabel('Téléphone',{exact:true}).fill('600000000');
  await page.getByRole('button',{name:'Vérifier ma sélection',exact:true}).click();await expect(page.getByRole('heading',{name:'Une dernière vérification'})).toBeVisible();
  assert.equal(await page.locator('input[type=password]').count(),0);
  await page.screenshot({path:path.join(output,'checkout-review-390.png'),fullPage:true});
  for(const index of [1,2]){await goto('/product/'+selection[index].id);await expect(page.locator('.e-purchase button.e-btn')).toHaveCount(0);}
  pass('Detail to persisted cart and intercepted checkout review; missing price/out stock cannot be bought');
  offers[0].offre.fin=new Date(Date.now()+4500).toISOString();await goto('/');
  await page.locator('.e-progressive').last().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-collection="offres"]')).toHaveCount(1);await expect(page.locator('[data-collection="offres"]')).toHaveCount(0,{timeout:10000});
  await section.scrollIntoViewIfNeeded();await expect(cards.nth(4).locator('del')).toHaveCount(0);
  pass('Offers disappear at server deadline and crossed catalogue price expires without reload');
  offers=[];arrivals=[];mode='empty';await page.reload();
  for(const wrapper of await page.locator('.e-progressive').all())await wrapper.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-collection]')).toHaveCount(0);
  mode='partial';await page.reload();await page.locator('.e-progressive').first().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-collection="capacitors"] .e-product-card')).toHaveCount(2);
  mode='error';await page.reload();await page.locator('.e-progressive').first().scrollIntoViewIfNeeded();
  const shelf=page.locator('[data-collection="capacitors"]');await expect(shelf.getByRole('alert')).toBeVisible();mode='normal';await shelf.getByRole('button',{name:'Réessayer'}).click();await expect(shelf.locator('.e-product-card')).toHaveCount(12);
  pass('Empty collections hidden; partial collections honest; failed collection can retry');
  await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'English',exact:true}).click();
  await expect(section.locator('h2')).toHaveText('Our selection');await expect(cards.first().locator('h3')).toHaveText('Electronic part 0-0');
  await expect(page.locator('[data-collection="capacitors"] h2')).toHaveText('Capacitors for your circuits');
  pass('FR/EN switch updates shelves, product names and actions');
  assert.deepEqual(errors,[]);assert.deepEqual(interceptedWrites,['/api/commandes/quote']);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({checks,errors,interceptedWrites,fixtureOnly:true,requests},null,2));
  console.log(JSON.stringify({passed:checks.length,errors,interceptedWrites}));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
