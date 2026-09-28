import { chromium, devices } from 'playwright';
import { EXPANSION_TOOLS } from './expansion-tools-data.mjs';
import fs from 'node:fs/promises';

const BASE=process.env.QA_BASE_URL||'https://sugutsucool.pages.dev';
const paths=EXPANSION_TOOLS.map(t=>`/${t[3]}/`);
const failures=[];
const browser=await chromium.launch({headless:true});

async function checkContext(context,label){
  for(const p of paths){
    const page=await context.newPage();
    const errs=[];page.on('pageerror',e=>errs.push(e.message));
    try{
      const res=await page.goto(BASE+p,{waitUntil:'domcontentloaded',timeout:30000});
      if(!res||res.status()>=400)throw new Error(`HTTP ${res?.status()}`);
      await page.locator('h1').first().waitFor({state:'visible',timeout:15000});
      if((await page.locator('.workbench').count())<1)throw new Error('workbench missing');
      if((await page.locator('input,textarea,select,button').count())<1)throw new Error('interactive control missing');
      const body=(await page.locator('.workbench').innerText()).trim();
      if(/準備中/.test(body))throw new Error('tool still marked preparing');
      if(label==='mobile'){
        const d=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
        if(d.sw-d.cw>6)throw new Error(`horizontal overflow ${d.sw-d.cw}px`);
      }
      if(errs.length)throw new Error(`pageerror: ${errs.join(' | ')}`);
      console.log(`PASS ${label} ${p}`);
    }catch(e){failures.push(`${label} ${p}: ${e.message}`);console.error(`FAIL ${label} ${p}: ${e.message}`)}
    await page.close();
  }
}

const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
await checkContext(desktop,'desktop');await desktop.close();
const mobile=await browser.newContext({...devices['iPhone 13']});
await checkContext(mobile,'mobile');await mobile.close();
await browser.close();

await fs.mkdir('qa-results',{recursive:true});
await fs.writeFile('qa-results/extra-40.json',JSON.stringify({base:BASE,total:paths.length,failures,checkedAt:new Date().toISOString()},null,2));
console.log(`EXTRA QA COMPLETE: ${paths.length} tools, failures=${failures.length}`);
if(failures.length)process.exit(1);
