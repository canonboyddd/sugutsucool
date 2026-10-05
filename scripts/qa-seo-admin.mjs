import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE=(process.env.QA_BASE_URL||'https://sugutsucool.pages.dev').replace(/\/$/,'');
const results=[];let failed=0;
const push=(name,ok,detail={})=>{results.push({name,ok,...detail});if(!ok)failed++};

try{
  const r=await fetch(BASE+'/data/seo-priority.json',{cache:'no-store'});
  const text=await r.text();
  let cfg=null;try{cfg=JSON.parse(text)}catch{}
  const schema=!!cfg&&cfg.version===1&&typeof cfg.active==='boolean'&&Array.isArray(cfg.priority)&&Number(cfg.min_sample_tool_pv)>=20;
  const rowsOk=!cfg?.active||((cfg.priority?.length||0)>=5&&cfg.priority.every(x=>typeof x.path==='string'&&x.path.startsWith('/')&&Number.isFinite(Number(x.score))));
  push('priority-json',r.status===200&&schema&&rowsOk,{status:r.status,active:cfg?.active,items:cfg?.priority?.length||0,minSample:cfg?.min_sample_tool_pv});
}catch(e){push('priority-json',false,{error:String(e.message||e)})}

try{
  const [robotsRes,sitemapRes]=await Promise.all([
    fetch(BASE+'/robots.txt',{cache:'no-store'}),
    fetch(BASE+'/sitemap.xml',{cache:'no-store'})
  ]);
  const [robots,sitemap]=await Promise.all([robotsRes.text(),sitemapRes.text()]);
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  const sitemapOk=sitemapRes.status===200&&urls.length>=251&&!urls.some(u=>/\/admin-(seo|analytics)\//.test(u));
  const robotsOk=robotsRes.status===200&&robots.includes(`Sitemap: ${BASE}/sitemap.xml`)&&robots.includes('Disallow: /admin-seo/')&&robots.includes('Disallow: /admin-analytics/');
  push('live-crawl-files',robotsOk&&sitemapOk,{robotsStatus:robotsRes.status,sitemapStatus:sitemapRes.status,urlCount:urls.length,robotsOk,sitemapOk});
}catch(e){push('live-crawl-files',false,{error:String(e.message||e)})}

const browser=await chromium.launch({headless:true});
async function checkPage(path,type){
  const page=await browser.newPage({viewportSize:{width:390,height:844}});const errors=[];let priorityStatus=null;
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{if(r.url().includes('/data/seo-priority.json'))priorityStatus=r.status()});
  try{
    const r=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:45000});const status=r?.status()||0;
    const headers=await r?.allHeaders?.()||{};
    const xRobots=String(headers['x-robots-tag']||'');
    if(type==='home'){
      await page.waitForFunction(()=>document.querySelectorAll('[data-catalog] [data-category]').length>=150,{timeout:30000});
      await page.waitForTimeout(250);
    }else{
      await page.waitForSelector('#baseFile',{timeout:15000});
    }
    const data=await page.evaluate((kind)=>kind==='home'?{
      title:document.title,
      robots:document.querySelector('meta[name="robots"]')?.content||'',
      canonical:document.querySelector('link[rel="canonical"]')?.href||'',
      cards:document.querySelectorAll('[data-catalog] [data-category]').length,
      badge:!!document.querySelector('.seo-priority-badge'),
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
    }:{
      title:document.title,
      robots:document.querySelector('meta[name="robots"]')?.content||'',
      baseFile:!!document.querySelector('#baseFile'),
      gscFile:!!document.querySelector('#gscFile'),
      build:!!document.querySelector('#build'),
      download:!!document.querySelector('#download'),
      overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+2
    },type);
    const ok=type==='home'
      ? status===200&&data.cards>=150&&priorityStatus===200&&!/noindex/i.test(data.robots)&&!/noindex/i.test(xRobots)&&data.canonical===BASE+'/'&&!data.overflow&&errors.length===0
      : status===200&&/noindex/i.test(data.robots)&&data.baseFile&&data.gscFile&&data.build&&data.download&&!data.overflow&&errors.length===0;
    push(type,ok,{status,priorityStatus,xRobots,...data,errors});
  }catch(e){push(type,false,{error:String(e.message||e)})}finally{await page.close()}
}
await checkPage('/','home');
await checkPage('/admin-seo/gsc-import.html','gsc-import');
await browser.close();

await fs.mkdir('qa-results',{recursive:true});
await fs.writeFile('qa-results/seo-admin.json',JSON.stringify({base:BASE,failed,results},null,2));
console.log(`SEO admin QA: ${results.length} checks, ${failed} failed`);
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`,r);
if(failed)process.exit(1);
