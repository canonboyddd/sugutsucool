const {createRequire}=require('node:module');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const req=createRequire(process.env.QA_PLAYWRIGHT_PACKAGE||path.resolve('node_modules/playwright/package.json'));
const {chromium}=req('playwright');
(async()=>{
 const script=await fs.readFile('assets/analytics-track.js','utf8');
 const browser=await chromium.launch({headless:true,channel:process.env.QA_BROWSER_CHANNEL||undefined});
 const results=[];
 try{for(const mode of ['human','qa','bot','owner']){
  const context=await browser.newContext({userAgent:mode==='bot'?'ExampleCrawler/1.0':'Mozilla/5.0 Chrome/130 Safari/537.36'}),events=[];
  // This fixture intentionally simulates a normal browser. All URLs, including
  // the collector and the external ad, are fulfilled locally before navigation.
  await context.addInitScript(mode=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});if(mode==='owner')localStorage.setItem('ops_owner_excluded','1')},mode);
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/assets/analytics-track.js')return route.fulfill({status:200,contentType:'application/javascript',body:script});
   if(u.hostname==='sugutsucool.pages.dev'&&u.pathname==='/content/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><h1>QA fixture</h1><a id="cta" href="https://px.a8.net/qa" target="_blank" data-affiliate="a8" data-program="onamae-domain" data-placement="fixture" data-variant="control">条件を確認</a><script src="/assets/analytics-track.js"></script><script src="/assets/analytics-track.js"></script>'});
   if(u.hostname==='sugutsucool-analytics.super-canon-boy.workers.dev'&&u.pathname==='/collect')events.push(JSON.parse(route.request().postData()));
   return route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/javascript',body:''});
  });
  const page=await context.newPage();await page.goto('https://sugutsucool.pages.dev/content/'+(mode==='qa'?'?qa=1':''));await page.waitForTimeout(200);
  await page.evaluate(()=>document.querySelector('#cta').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})));
  await page.waitForTimeout(100);assert.equal(events.filter(e=>e.event_type==='affiliate_click').length,0);
  await page.locator('#cta').click();await page.waitForTimeout(200);
  if(mode==='human'){assert.equal(events.filter(e=>e.event_type==='page_view').length,1);const clicks=events.filter(e=>e.event_type==='affiliate_click');assert.equal(clicks.length,1);assert.equal(clicks[0].extra.placement,'fixture');assert.equal(clicks[0].extra.variant,'control')}else assert.equal(events.length,0);
  results.push({mode,events:events.length,passed:true});await context.close();
 }}finally{await browser.close()}
 await fs.mkdir('qa-results/revenue',{recursive:true});await fs.writeFile('qa-results/revenue/events.json',JSON.stringify({results,allNetworkFulfilledLocally:true},null,2));
 console.log(JSON.stringify({checks:results.length,passed:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
