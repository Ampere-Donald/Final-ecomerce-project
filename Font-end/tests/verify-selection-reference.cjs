// Fixtures are local only. The live mode blocks all writes and uses real catalogue data.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.NEWOTEG_TEST_URL || 'http://127.0.0.1:5201';
const live = process.env.NEWOTEG_SELECTION_LIVE === '1';
if (!live && new URL(base).hostname !== '127.0.0.1') throw Error('Fixtures require localhost');
const output = process.env.NEWOTEG_TEST_OUTPUT || 'C:/Users/pc/Documents/Newoteg/output/implementation-work/selection-reference/fixture';
const categories = ['Composants Électroniques','Câbles & Connectique','Alimentation & Energie','Mesure & Test','Outillage'].map((nom,i)=>({id:'cat-'+i,nom}));
const products = categories.flatMap((categorie,c)=>Array.from({length:8},(_,i)=>({id:`00000000-0000-4000-8000-${String(c*100+i).padStart(12,'0')}`,code:'REF-'+c+'-'+i,nomProduit:'Composant '+c+'-'+i,designationEn:'Part '+c+'-'+i,estActif:true,prixPublic:1000+i*100,quantiteStock:10,categorie,categorieId:categorie.id,imageUrl:base+'/design-e/category-composants-144.webp'})));
products[1].prixPublic=null;products[1].quantiteStock=null;products[2].quantiteStock=0;products[3].quantiteStock=2;
products[4].prixPublic=2900;products[4].offre={prixCatalogue:3400,prixOffre:2900,fin:'2099-01-01T00:00:00Z'};
let mode='normal';const checks=[],errors=[],writes=[],requests=[],geometry=[];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{if(!localStorage.getItem('appLang'))localStorage.setItem('appLang','fr')});
  await ctx.route('**/*',r=>{
   const req=r.request(),u=new URL(req.url());
   if(u.pathname==='/cdn-cgi/rum')return r.abort();
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(u.pathname);return r.abort()}
   if(!live&&u.origin!==base)return r.abort();
   return r.continue();
  });
  if(!live)await ctx.route('**/api/**',r=>{
   const u=new URL(r.request().url());requests.push(u.pathname+u.search);
   if(u.pathname.endsWith('/categories'))return r.fulfill({json:categories});
   if(u.pathname.endsWith('/produits/populaires'))return mode==='error'?r.fulfill({status:503,json:{message:'Unavailable'}}):r.fulfill({json:mode==='empty'?[]:products.slice(0,8)});
   const detail=products.find(p=>u.pathname.endsWith('/produits/'+p.id));if(detail)return r.fulfill({json:detail});
   if(u.pathname.endsWith('/produits')){
    const rows=products.filter(p=>!u.searchParams.has('categoryId')||p.categorieId===u.searchParams.get('categoryId'));
    const limit=Number(u.searchParams.get('limit'))||24;return r.fulfill({json:{data:rows.slice(0,limit),meta:{total:rows.length,lastPage:2}}});
   }
   return r.fulfill({json:[]});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);const section=page.locator('.e-selection-premium'),cards=section.locator('.e-selection-card'),track=section.locator('.e-selection-track');
  await expect(cards).toHaveCount(5,{timeout:45000});await expect(section.locator('h2')).toHaveText('Notre sélection');
  assert.equal(await section.locator('.e-comparison-action').count(),0);assert.equal(await section.getByText('Se renseigner',{exact:true}).count(),0);
  if(!live){
   await expect(cards.nth(1).locator('.e-price')).toHaveText('Prix à confirmer');await expect(cards.nth(1).locator('.e-selection-stock')).toHaveText('À confirmer');
   await expect(cards.nth(2).locator('.e-selection-cta')).toHaveText('Voir les équivalents');
   await expect(cards.nth(3).locator('.e-selection-stock')).toHaveText('Stock faible');await expect(cards.nth(4).locator('del')).toHaveText(/3\s*400/);
   await expect(cards.nth(4).locator('.e-selection-promo')).toContainText('15 %');assert.equal(await cards.first().locator('del').count(),0);
   await expect(cards.first().locator('.e-selection-cta')).toHaveAttribute('href','/product/'+products[0].id);
   const heart=cards.first().locator('.e-selection-heart');await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
   await page.reload();await expect(heart).toHaveAttribute('aria-pressed','true');
   await cards.nth(2).locator('.e-selection-cta').click();await expect(page.locator('.e-equivalence-form textarea').first()).toHaveValue(products[2].code);await page.goto(base);
   checks.push('Genuine stock/unknown price/validated offer; favorites persist; detail and equivalents routes');
  }
  for(const label of ['Connecter','Alimenter','Mesurer & assembler','Réparer']){
   await section.getByRole('button',{name:label,exact:true}).click();
   try{await expect(cards.first()).toBeVisible({timeout:45000})}catch(e){console.error('Filter:',label,await section.innerText());throw e}
   assert.ok(await cards.count()<=5);await expect(section.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
   if(!live)assert.ok(!(await cards.first().locator('h3').innerText()).includes('Composant 0-0')||label==='Réparer');
  }
  await section.getByRole('button',{name:'Tous',exact:true}).click();await expect(cards).toHaveCount(5);
  checks.push('Five category-based filters change real product queries');
  for(const width of [360,390,412,768,1000,1440]){
   await page.setViewportSize({width,height:1000});await section.scrollIntoViewIfNeeded();
   const g=await cards.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),cta=n.querySelector('.e-selection-cta').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,ctaY:cta.y,ctaHeight:cta.height,image:n.querySelector('.e-selection-photo').getBoundingClientRect().height}}));
   assert.ok(g.every(p=>Math.abs(p.width-g[0].width)<1&&Math.abs(p.height-g[0].height)<1&&Math.abs(p.ctaY-g[0].ctaY)<1&&p.ctaHeight>=44));
   if(width>=1200)assert.ok(g.every(p=>p.y===g[0].y)&&g[4].x+g[4].width<=width);
   else {const visible=await track.evaluate(el=>(el.clientWidth+12)/(el.firstElementChild.getBoundingClientRect().width+12));assert.ok(width<=760?visible>1.1&&visible<1.3:Math.abs(visible-3)<.03);await track.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await track.press('Home');}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await expect.poll(()=>section.locator('img').first().evaluate(el=>el.complete)).toBe(true);
   await page.evaluate(()=>document.activeElement?.blur());
   await section.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-210));
   await section.screenshot({path:path.join(output,`selection-${width}.png`)});geometry.push({width,cards:g});
  }
  checks.push('Equal cards, aligned price/actions, 5/3/1.2 layout; six widths and keyboard');
  await page.goto(base+'/catalogue');await expect(page.locator('.e-catalog-grid .e-product-card').first()).toBeVisible({timeout:45000});
  assert.equal(await page.locator('.e-selection-card').count(),0);await expect(page.locator('.e-catalog-grid .e-compare-toggle').first()).toBeVisible();
  await page.getByRole('button',{name:'Vue liste',exact:true}).click();await expect(page.locator('.e-catalog-grid')).toHaveClass(/e-list/);
  await page.getByRole('button',{name:'Vue grille',exact:true}).click();await page.locator('.e-catalog-grid .e-compare-toggle').first().click();
  await page.screenshot({path:path.join(output,'catalogue-1440.png')});checks.push('Catalogue shared cards, grid/list and comparison remain functional');
  if(!live){
   await page.goto(base);await page.evaluate(()=>localStorage.setItem('appLang','en'));await page.reload();await expect(section.locator('h2')).toHaveText('Our selection');
   mode='empty';await page.reload();await expect(section.getByText('No products in this selection.',{exact:false})).toBeVisible();
   mode='error';await page.reload();await expect(section.getByRole('button',{name:'Try again',exact:true})).toBeVisible();
   mode='normal';await section.getByRole('button',{name:'Try again',exact:true}).click();await expect(cards).toHaveCount(5);
   checks.push('English copy, empty/error/retry states');
  }
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({base,live,status:'passed',checks,geometry,requests,errors,writes},null,2));console.log(JSON.stringify({status:'passed',checks}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
