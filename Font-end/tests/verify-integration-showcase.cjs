// Read-only showcase against the local production Worker and actual catalogue.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {expect}=require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.NEWOTEG_TEST_URL||'http://127.0.0.1:5202',out=process.env.NEWOTEG_TEST_OUTPUT||'C:/Users/pc/Documents/Newoteg/output/implementation-work/v31-integration/showcase';
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'}),errors=[],writes=[];
  await context.route('**/*',r=>{if(new URL(r.request().url()).pathname==='/cdn-cgi/rum')return r.abort();if(!['GET','HEAD','OPTIONS'].includes(r.request().method())){writes.push(r.request().url());return r.abort()}return r.continue()});
  const page=await context.newPage(),scripts=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()==='script')scripts.push(new URL(r.url()).pathname)});
  const shot=async(name,node)=>{await page.evaluate(()=>document.activeElement?.blur());await node.evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+window.scrollY-200));await node.locator('img').evaluateAll(async images=>{await Promise.all(images.filter(img=>{const r=img.getBoundingClientRect();return r.right>0&&r.left<innerWidth}).map(img=>img.decode().catch(()=>{})))});await node.screenshot({path:path.join(out,name+'.png')})};
  await page.goto(base);assert.equal(await page.locator('#root').getAttribute('data-initial-home'),'fr');await expect(page.locator('.e-selection-card')).toHaveCount(5,{timeout:45000});
  assert.equal(scripts.some(p=>/^\/assets\/ProductCarousel-.*\.js$/.test(p)),false);
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'home-desktop.png')});
  await page.locator('.e-progressive').first().scrollIntoViewIfNeeded();const shelf=page.locator('[data-collection="capacitors"]'),track=shelf.locator('.e-carousel-track');
  await expect(shelf.locator('.e-product-card').first()).toBeVisible({timeout:45000});assert.ok(await shelf.locator('.e-product-card').count()>5);
  await expect.poll(()=>shelf.locator('img').first().evaluate(el=>el.complete&&el.naturalWidth>0),{timeout:30000}).toBe(true);
  await shot('shelf-before',shelf);await shelf.getByRole('button',{name:'Produits suivants'}).click();await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await shot('shelf-after',shelf);
  await page.setViewportSize({width:390,height:900});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'home-mobile.png')});
  await track.evaluate(el=>el.scrollLeft=0);await shot('carousel-mobile-before',shelf);
  const box=await track.boundingBox(),cdp=await context.newCDPSession(page),y=Math.min(700,box.y+100);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:320,y}]});
  for(const x of [280,230,180,130,80])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(50);
  await expect.poll(()=>track.evaluate(el=>{const step=el.firstElementChild.getBoundingClientRect().width+12;return Math.abs(el.scrollLeft-Math.round(el.scrollLeft/step)*step)})).toBeLessThan(2);
  await shot('carousel-mobile-after',shelf);await cdp.detach();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({base,status:'passed',initialHtml:true,fiveCardSelection:true,initialCarouselDeferred:true,actualShelf:true,touchScroll:await track.evaluate(el=>el.scrollLeft),errors,writes},null,2));console.log('PASS initial HTML, five-card selection, deferred carousel code, actual shelves, native mobile swipe and captures');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
