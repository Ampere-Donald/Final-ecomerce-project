// Read-only real catalogue/browser checks. No cart, checkout, analytics or message writes.
const { chromium }=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect }=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NEWOTEG_TEST_URL||'http://127.0.0.1:5199', output=process.env.NEWOTEG_TEST_OUTPUT||'C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3-1/actual-refinement';
const checks=[],errors=[],writes=[],geometry=[];
(async()=>{
 fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});let page;
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('appLang','fr'));
  await context.route('**/*',r=>{if(new URL(r.request().url()).pathname==='/cdn-cgi/rum')return r.abort();if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){writes.push(r.request().url());return r.abort()}return r.continue()});
  page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  await expect(page.locator('.e-commerce-hero')).toBeVisible();await page.screenshot({path:path.join(output,'home-desktop.png')});
  await page.locator('[data-catalogue-trigger]').click();const menu=page.locator('.e-catalogue-panel');await expect(menu.locator('.e-catalogue-subfamilies a')).toHaveCount(6,{timeout:40000});const menuBox=await menu.boundingBox();assert.ok(menuBox.height<420);await menu.screenshot({path:path.join(output,'mega-menu.png')});await page.keyboard.press('Escape');checks.push('Real compact mega-menu and scoped technical searches');
  const banner=page.locator('.e-banner-rotator').first();await banner.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-200));await banner.screenshot({path:path.join(output,'banner-components.png')});await banner.getByRole('button',{name:'Bannière suivante'}).click();await expect(banner.locator('.e-banner-slide.is-active')).toContainText('Équipez votre atelier');await banner.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-200));await banner.screenshot({path:path.join(output,'banner-workshop.png')});checks.push('Real responsive banners and manual navigation');
  for(const width of [360,390,412,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto(base+'/catalogue?search=cond');await expect(page.locator('.e-catalog-grid .e-product-card').first()).toBeVisible({timeout:45000});
   const result=await page.locator('.e-catalog-grid').boundingBox();assert.ok(result.y<550);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:path.join(output,'catalogue-'+width+'.png')});
   const reference=await page.locator('.e-home-product-reference').first().evaluate(n=>getComputedStyle(n).fontSize);assert.ok(parseFloat(reference)>=12);
   const target=await page.locator('.e-catalog-grid .e-product-card').filter({has:page.locator('img')}).first().locator('h3 a').getAttribute('href');
   await page.goto(base+target);await expect(page.locator('.e-main-photo')).toBeVisible({timeout:40000});await expect.poll(()=>page.locator('.e-main-photo img').evaluate(n=>n.complete&&n.naturalWidth>0),{timeout:30000}).toBe(true);
   await page.screenshot({path:path.join(output,'product-'+width+'.png')});const small=await page.locator('.e-main-photo').boundingBox();await page.locator('.e-main-photo').click();const viewer=page.getByRole('dialog');await expect(viewer).toBeVisible();await expect.poll(()=>viewer.locator('.e-viewer-canvas img').evaluate(n=>n.complete&&n.naturalWidth>0),{timeout:30000}).toBe(true);
   const big=await viewer.boundingBox();assert.ok(big.width>small.width);await page.screenshot({path:path.join(output,'gallery-fit-'+width+'.png')});await viewer.getByRole('button',{name:'Zoom 150 %'}).click();await expect(viewer.locator('.e-viewer-stage')).toHaveClass(/is-zoomed/);await page.screenshot({path:path.join(output,'gallery-zoom-'+width+'.png')});await page.keyboard.press('Escape');await expect(page.locator('.e-main-photo')).toBeFocused();
   geometry.push({width,resultsTop:result.y,original:small,viewer:big,referenceFont:reference});checks.push('Actual catalogue/detail/gallery '+width+'px');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({base,checks,errors,writes,geometry,menuBox},null,2));console.log(JSON.stringify({passed:checks.length,errors,writes,geometry}));
 }catch(e){if(page)await page.screenshot({path:path.join(output,'failure.png')});fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({error:e.stack,checks,errors,writes},null,2));throw e}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
