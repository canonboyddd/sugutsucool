import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=(process.env.QA_BASE_URL||'https://sugutsucool.pages.dev').replace(/\/$/,'');
const xml=await fetch(BASE+'/sitemap.xml').then(r=>{if(!r.ok)throw new Error('sitemap HTTP '+r.status);return r.text()});
const urls=[...xml.matchAll(/<loc>(https?:\/\/[^<]+\/guides\/[^<]*)<\/loc>/g)].map(m=>m[1]);
const detail=urls.filter(u=>new URL(u).pathname!=='/guides/');
if(detail.length<60)throw new Error(`expected at least 60 guide detail URLs, found ${detail.length}`);

const browser=await chromium.launch({headless:true});
const results=[];let failed=0;
async function check(url,viewport,label){
 const page=await browser.newPage({viewportSize:viewport});const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});const status=r?.status()||0;
  const data=await page.evaluate(()=>({title:document.title,desc:document.querySelector('meta[name="description"]')?.content||'',robots:document.querySelector('meta[name="robots"]')?.content||'',canonical:document.querySelector('link[rel="canonical"]')?.href||'',h1:document.querySelector('h1')?.textContent?.trim()||'',toolCta:[...document.querySelectorAll('a[href]')].some(a=>/^\/(image|pdf|text|web|calculator|developer)\//.test(a.getAttribute('href')||'')),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2}));
  const ok=status===200&&data.title.length>8&&data.desc.length>40&&data.canonical===url&&data.h1.length>2&&data.toolCta&&!/noindex/i.test(data.robots)&&!data.overflow&&errors.length===0;
  if(!ok)failed++;results.push({url,label,status,...data,errors,ok});
 }catch(e){failed++;results.push({url,label,ok:false,error:String(e.message||e)})}finally{await page.close()}
}
for(const u of detail)await check(u,{width:1366,height:900},'desktop');
for(const u of detail.filter((_,i)=>i%6===0))await check(u,{width:390,height:844},'mobile');
await browser.close();await fs.mkdir('qa-results',{recursive:true});await fs.writeFile('qa-results/guides.json',JSON.stringify({base:BASE,total:detail.length,checks:results.length,failed,results},null,2));
console.log(`Guide QA: ${detail.length} guides, ${results.length} checks, ${failed} failed`);if(failed)process.exit(1);
