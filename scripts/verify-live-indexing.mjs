const BASE=(process.env.SITE_BASE_URL||'https://sugutsucool.pages.dev').replace(/\/$/,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function fetchReady(path,label){
  let last='';
  for(let i=0;i<6;i++){
    try{
      const r=await fetch(BASE+path,{cache:'no-store',headers:{'user-agent':'SuguTsucool-Live-Indexing-QA/1.0'}});
      if(r.ok)return r;
      last=`HTTP ${r.status}`;
    }catch(e){last=String(e.message||e)}
    await sleep(3000);
  }
  throw new Error(`${label} unavailable after deploy: ${last}`);
}

const homeRes=await fetchReady('/','home');
const home=await homeRes.text();
const xRobots=String(homeRes.headers.get('x-robots-tag')||'');
if(/noindex/i.test(xRobots))throw new Error(`production X-Robots-Tag contains noindex: ${xRobots}`);
const robotsMeta=home.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1]
  || home.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i)?.[1]
  || '';
if(/noindex/i.test(robotsMeta))throw new Error(`production meta robots contains noindex: ${robotsMeta}`);
const canonical=home.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
  || home.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
  || '';
if(canonical!==BASE+'/')throw new Error(`home canonical mismatch: ${canonical||'(missing)'}`);

const [robotsRes,sitemapRes]=await Promise.all([
  fetchReady('/robots.txt','robots.txt'),
  fetchReady('/sitemap.xml','sitemap.xml')
]);
const [robots,sitemap]=await Promise.all([robotsRes.text(),sitemapRes.text()]);
if(!robots.includes('User-agent: *')||!robots.includes('Allow: /'))throw new Error('robots.txt does not allow public crawling');
if(!robots.includes(`Sitemap: ${BASE}/sitemap.xml`))throw new Error('robots.txt sitemap URL mismatch');
if(!robots.includes('Disallow: /admin-seo/')||!robots.includes('Disallow: /admin-analytics/'))throw new Error('admin crawl exclusions missing');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(urls.length<251)throw new Error(`sitemap URL count too low: ${urls.length}`);
if(urls.some(u=>/\/admin-(seo|analytics)\//.test(u)))throw new Error('admin URL found in sitemap');
if(!urls.includes(BASE+'/'))throw new Error('homepage missing from sitemap');

console.log(JSON.stringify({
  homeStatus:homeRes.status,
  xRobots:xRobots||null,
  metaRobots:robotsMeta||null,
  canonical,
  robotsStatus:robotsRes.status,
  sitemapStatus:sitemapRes.status,
  sitemapUrls:urls.length,
  result:'indexable'
}));
