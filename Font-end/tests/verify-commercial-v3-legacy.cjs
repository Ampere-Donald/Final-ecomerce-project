// Exercise the transpiled legacy bundle in Edge with Android viewport/touch.
// This is a compatibility smoke test, not a physical Android device test.
const { chromium } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { expect } = require('C:/Users/pc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base='http://127.0.0.1:5199';
const output='C:/Users/pc/Documents/Newoteg/output/implementation-work/commercial-v3/legacy';
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('appLang','fr'));
  await ctx.route('**/*',r=>r.request().method()==='GET'?r.continue():r.abort());
  await ctx.route(base+'/',async r=>{
   const res=await r.fetch();
   const html=(await res.text()).replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'').replace(/\snomodule/g,'');
   await r.fulfill({response:res,body:html});
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await expect(page.locator('.e-home-selection .e-product-card').first()).toBeVisible({timeout:45000});
  const loaded=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
  assert.ok(loaded.some(n=>n.includes('/index-legacy-')&&n.endsWith('.js')));assert.ok(!loaded.some(n=>/\/index-(?!legacy).*\.js$/.test(n)));
  const track=page.locator('.e-home-selection .e-carousel-track');await track.scrollIntoViewIfNeeded();
  const box=await track.boundingBox(),client=await ctx.newCDPSession(page);
  const y=Math.max(220,Math.min(650,box.y+100)),start=box.x+box.width*.85,end=box.x+box.width*.2;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
  for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*i/8,y}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>track.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:output+'/touch-390.png'});assert.deepEqual(errors,[]);
  fs.writeFileSync(output+'/result.json',JSON.stringify({legacyBundle:true,nativeTouchScroll:true,errors,limits:'Modern Edge executing legacy JavaScript with mobile viewport/touch; not a physical Android device'},null,2));
  console.log('PASS legacy bundle, touch carousel, no overflow or JavaScript error');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
