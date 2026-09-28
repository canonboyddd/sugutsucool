import fs from 'node:fs/promises';
import path from 'node:path';

const DIST=path.resolve('dist');
const BASE='https://sugutsucool.pages.dev';
const sitemap=await fs.readFile(path.join(DIST,'sitemap.xml'),'utf8');
const robots=await fs.readFile(path.join(DIST,'robots.txt'),'utf8');
if(!robots.includes(`Sitemap: ${BASE}/sitemap.xml`))throw new Error('robots sitemap directive missing');
if(!robots.includes('Disallow: /admin-analytics/')||!robots.includes('Disallow: /admin-seo/'))throw new Error('admin crawl exclusions missing');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const unique=[...new Set(urls)];
if(unique.length!==urls.length)throw new Error(`duplicate sitemap URLs: ${urls.length-unique.length}`);
if(unique.length<220)throw new Error(`sitemap too small: ${unique.length}`);
let checked=0,guideCount=0,toolCount=0;
for(const u of unique){
 const x=new URL(u);if(x.origin!==BASE)throw new Error(`foreign sitemap origin: ${u}`);
 const rel=x.pathname==='/'?'index.html':path.join(x.pathname.replace(/^\//,''),'index.html');
 let html;try{html=await fs.readFile(path.join(DIST,rel),'utf8')}catch{throw new Error(`sitemap target missing: ${x.pathname}`)}
 if(/<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html))throw new Error(`noindex URL in sitemap: ${x.pathname}`);
 const canonical=html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1]||html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i)?.[1]||'';
 if(canonical&&canonical!==u)throw new Error(`canonical mismatch: ${x.pathname} -> ${canonical}`);
 if(x.pathname.startsWith('/guides/'))guideCount++;
 if(/^\/(image|pdf|text|web|calculator|developer)\/[^/]+\/$/.test(x.pathname))toolCount++;
 checked++;
}
if(guideCount<61)throw new Error(`expected guide index + 60 guides, found ${guideCount}`);
if(toolCount<150)throw new Error(`expected 150 tool URLs, found ${toolCount}`);
console.log(JSON.stringify({checked,toolCount,guideCount,robots:'ok',sitemap:'ok'}));
