import fs from 'node:fs/promises';
import path from 'node:path';
import { PLUS_TOOLS } from './plus-tools-data.mjs';

const DIST = path.resolve('dist');
const BASE = 'https://sugutsucool.pages.dev';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonSafe = x => JSON.stringify(x).replace(/</g,'\\u003c');

const page = tool => {
  const [category, categoryLabel, name, route, icon, desc] = tool;
  const url = `${BASE}/${route}/`;
  const schema = {
    '@context':'https://schema.org','@type':'WebApplication',name,url,description:desc,
    applicationCategory:'UtilitiesApplication',operatingSystem:'Any',inLanguage:'ja-JP',isAccessibleForFree:true,
    offers:{'@type':'Offer',price:'0',priceCurrency:'JPY'},publisher:{'@type':'Organization',name:'SuguTsucool',url:`${BASE}/`}
  };
  const crumbs = {
    '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'SuguTsucool',item:`${BASE}/`},
      {'@type':'ListItem',position:2,name:categoryLabel,item:`${BASE}/${category}/`},
      {'@type':'ListItem',position:3,name,item:url}
    ]
  };
  const slug = route.split('/')[1];
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}｜無料オンラインツール｜SuguTsucool</title><meta name="description" content="${esc(desc)} 登録不要・インストール不要で無料。ブラウザ内で処理します。"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="SuguTsucool"><meta property="og:title" content="${esc(name)}｜SuguTsucool"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/mega.css"><script type="application/ld+json">${jsonSafe(schema)}</script><script type="application/ld+json">${jsonSafe(crumbs)}</script></head><body data-tool-plus="${esc(slug)}"><header class="site-header"><div class="container nav"><a class="brand" href="/">SuguTsu<span class="cool">cool</span></a><nav class="navlinks"><a href="/#tools">ツール</a><a href="/image/">画像</a><a href="/pdf/">PDF</a><a href="/text/">テキスト</a><a href="/web/">Web</a><a href="/calculator/">計算</a><a href="/developer/">開発</a></nav><a class="mobile-home" href="/#tools">ツール一覧</a></div></header><main class="tool-page"><div class="container"><div class="breadcrumbs"><a href="/">トップ</a> / <a href="/${category}/">${esc(categoryLabel)}</a> / ${esc(name)}</div><div class="tool-head"><div><h1>${esc(name)}</h1><p>${esc(desc)}</p></div><span class="privacy-chip">🔒 ブラウザ内処理</span></div><section class="workbench" id="app"></section><div class="ad-slot">広告スペース</div><section class="howto"><h2>使い方</h2><div class="steps"><div class="step"><b>1. 入力</b>必要な値や文章を入力します。</div><div class="step"><b>2. 実行</b>ボタンを押して処理します。</div><div class="step"><b>3. 利用</b>結果を確認・コピー・保存します。</div></div></section></div></main><footer class="footer"><div class="container footer-inner"><div>© <span id="y"></span> SuguTsucool</div><div class="footer-links"><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a><a href="/contact/">お問い合わせ</a></div></div></footer><script>document.getElementById('y').textContent=new Date().getFullYear()</script><script src="/assets/tool-suite-plus.js"></script><script src="/assets/tool-enhance.js"></script><script src="/assets/analytics-track.js"></script></body></html>`;
};

for (const tool of PLUS_TOOLS) {
  const route = tool[3];
  const dir = path.join(DIST, ...route.split('/'));
  await fs.mkdir(dir, { recursive:true });
  await fs.writeFile(path.join(dir, 'index.html'), page(tool));
}

const catalogPath = path.join(DIST,'assets','catalog.js');
let catalog = await fs.readFile(catalogPath,'utf8');
const marker = '];window.SUGU_TOOLS=T;';
if (!catalog.includes(marker)) throw new Error('catalog marker not found');
if (!catalog.includes('text/reverse-text')) {
  const extra = JSON.stringify(PLUS_TOOLS).slice(1,-1);
  catalog = catalog.replace(marker, `,${extra}];window.SUGU_TOOLS=T;`);
  await fs.writeFile(catalogPath,catalog);
}

const sitemapPath = path.join(DIST,'sitemap.xml');
let sitemap = await fs.readFile(sitemapPath,'utf8');
if (!sitemap.includes('/text/reverse-text/')) {
  const today = new Date().toISOString().slice(0,10);
  const urls = PLUS_TOOLS.map(t=>`  <url><loc>${BASE}/${t[3]}/</loc><lastmod>${today}</lastmod></url>`).join('\n');
  sitemap = sitemap.replace('</urlset>', `${urls}\n</urlset>`);
  await fs.writeFile(sitemapPath,sitemap);
}

console.log(`Generated ${PLUS_TOOLS.length} additional tools. Total target: ${50 + PLUS_TOOLS.length}.`);
