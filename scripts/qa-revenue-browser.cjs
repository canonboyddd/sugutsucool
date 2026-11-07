const {createRequire}=require('node:module');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const req=createRequire(process.env.QA_PLAYWRIGHT_PACKAGE||path.resolve('node_modules/playwright/package.json'));
const {chromium}=req('playwright');
const base=process.env.QA_BASE_URL||'https://sugutsucool.pages.dev';
const stage=process.env.QA_STAGE||'before';
const output=path.resolve('qa-results/revenue');
let activeBrowser;
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const browser=activeBrowser=await chromium.launch({headless:true,channel:process.env.QA_BROWSER_CHANNEL||undefined});
 const rows=[];
 for(const width of [375,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  // Every analytics/ASP request is intercepted before any page script runs.
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(/a8\.net$|afl\.rakuten\.co\.jp$|r10\.to$/.test(u.hostname)||/analytics|\/api\/(central|ops-collect)|\/collect(?:$|\?)/.test(u.href))return route.fulfill({status:204,body:''});
   if(u.hostname==='factory-career-site.pages.dev')return route.fulfill({status:200,contentType:'application/javascript',body:''});
   if(stage==='after'&&u.pathname==='/api/rakuten')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,keyword:'ワットチェッカー',purpose:'実際の消費電力を測り、計算の入力値を確かめる場合',items:[{name:'消費電力を測るワットチェッカー（QA商品）',price:2000,url:'https://hb.afl.rakuten.co.jp/hgc/qa/',image:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160"%3E%3Crect width="160" height="160" fill="%23e8eef8"/%3E%3C/svg%3E'}]})});
   return route.continue();
  });
  for(const p of ['/image/compress/','/calculator/electricity-cost/','/web/domain-extractor/']){
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base+p+'?qa=1',{waitUntil:'networkidle',timeout:45000});
   await page.waitForTimeout(400);
   await page.screenshot({path:path.join(output,`${stage}-${p.split('/').filter(Boolean).join('-')}-${width}.png`),fullPage:true});
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,title:document.title,ads:document.querySelectorAll('[data-affiliate]').length,h1:document.querySelector('h1')?.textContent,canonical:document.querySelector('link[rel=canonical]')?.href}));
   rows.push({path:p,width,status:response.status(),errors,...state});
   assert.equal(response.status(),200);assert.equal(state.overflow,false);assert.equal(errors.length,0);
   if(stage==='after'&&p==='/image/compress/')assert.equal(state.ads,0);
   if(stage==='after'&&p==='/web/domain-extractor/')assert.equal(state.ads,1);
   await page.close();
  }
  await context.close();
 }
 if(stage==='after'){
  for(const mode of ['api-failure','empty','broken-image']){
   const context=await browser.newContext({viewport:{width:375,height:900},serviceWorkers:'block'});
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(/a8\.net$|afl\.rakuten\.co\.jp$|r10\.to$/.test(u.hostname)||/analytics|\/api\/(central|ops-collect)|\/collect(?:$|\?)/.test(u.href))return route.fulfill({status:204,body:''});
    if(u.hostname==='factory-career-site.pages.dev')return route.fulfill({status:200,contentType:'application/javascript',body:''});
    if(u.hostname==='thumbnail.image.rakuten.co.jp')return route.fulfill({status:404,body:''});
    if(u.pathname==='/api/rakuten')return route.fulfill({status:mode==='api-failure'?502:200,contentType:'application/json',body:JSON.stringify({ok:mode!=='api-failure',items:mode==='broken-image'?[{name:'QA image failure',price:2000,url:'https://hb.afl.rakuten.co.jp/hgc/qa/',image:'https://thumbnail.image.rakuten.co.jp/broken-qa.jpg'}]:[]})});
    return route.continue();
   });
   const page=await context.newPage();await page.goto(base+'/calculator/electricity-cost/?qa=1',{waitUntil:'networkidle'});
   await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(250);
   assert.equal(await page.locator('.affiliate-tools').count(),0);
   await page.locator('#w').fill('1000');await page.locator('#h').fill('2');await page.locator('#p').fill('31');await page.locator('#go').click();assert.equal(await page.locator('#out').innerText(),'使用電力量: 2 kWh\n電気代の目安: 62円');
   rows.push({mode,advertisementRemoved:true,calculationPreserved:true});await context.close();
  }
 }
 await browser.close();
 await fs.writeFile(path.join(output,`${stage}-browser.json`),JSON.stringify({stage,base,rows,analyticsAndAspIntercepted:true},null,2));
 console.log(JSON.stringify({stage,checks:rows.length,passed:true}));
})().catch(async e=>{console.error(e);await activeBrowser?.close();process.exitCode=1});
