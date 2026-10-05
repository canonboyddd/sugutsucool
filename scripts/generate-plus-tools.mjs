import fs from 'node:fs/promises';
import path from 'node:path';
import { PLUS_TOOLS } from './plus-tools-data.mjs';
import { EXPANSION_TOOLS } from './expansion-tools-data.mjs';

const DIST = path.resolve('dist');
const BASE = 'https://sugutsucool.pages.dev';
const ALL_TOOLS = [...PLUS_TOOLS, ...EXPANSION_TOOLS];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonSafe = x => JSON.stringify(x).replace(/</g,'\\u003c');
const useCase = category => ({
  text:'文章整理、SNS投稿、原稿チェック、データ整形など、文字を扱う日常作業を短時間で済ませたいときに便利です。',
  web:'Web制作、SEO確認、SNS運用、URL作成など、ブラウザまわりの作業をすぐ処理したいときに便利です。',
  calculator:'仕事・生活・お金・日付・単位など、電卓より少し複雑な計算をすぐ確認したいときに便利です。',
  developer:'開発・デバッグ・データ変換・コード確認を、インストール不要で素早く行いたいときに便利です。'
}[category] || '日常のちょっとした作業をブラウザだけで素早く終わらせたいときに便利です。');

const page = tool => {
  const [category, categoryLabel, name, route, icon, desc] = tool;
  const url = `${BASE}/${route}/`;
  const slug = route.split('/')[1];
  const related = ALL_TOOLS.filter(t=>t[0]===category && t[3]!==route).slice(0,6);
  const faq = [
    {q:`${name}は無料で使えますか？`,a:'はい。登録不要・無料で利用できます。'},
    {q:'入力したデータは外部へ送信されますか？',a:'このツールの主要な処理はブラウザ内で行います。入力内容を処理目的で外部サーバーへ送信しません。'},
    {q:`${name}の使い方は？`,a:'必要な値や文章を入力し、実行ボタンを押すだけです。結果はそのまま確認・コピーできます。'}
  ];
  const schema = {
    '@context':'https://schema.org','@type':'WebApplication',name,url,description:desc,
    applicationCategory:'UtilitiesApplication',operatingSystem:'Any',inLanguage:'ja-JP',isAccessibleForFree:true,
    offers:{'@type':'Offer',price:'0',priceCurrency:'JPY'},publisher:{'@type':'Organization',name:'SuguTsucool',url:`${BASE}/`}
  };
  const crumbs = {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'SuguTsucool',item:`${BASE}/`},
    {'@type':'ListItem',position:2,name:categoryLabel,item:`${BASE}/${category}/`},
    {'@type':'ListItem',position:3,name,item:url}
  ]};
  const faqSchema = {'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))};
  const relatedHtml = related.map(t=>`<a class="related-tool" href="/${t[3]}/"><span>${esc(t[4])}</span><strong>${esc(t[2])}</strong></a>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}｜無料・登録不要オンラインツール｜SuguTsucool</title><meta name="description" content="${esc(desc)} 無料・登録不要・インストール不要。スマホ/PC対応、ブラウザですぐ使えます。"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="SuguTsucool"><meta property="og:title" content="${esc(name)}｜無料オンラインツール"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/mega.css"><script type="application/ld+json">${jsonSafe(schema)}</script><script type="application/ld+json">${jsonSafe(crumbs)}</script><script type="application/ld+json">${jsonSafe(faqSchema)}</script></head><body data-tool-plus="${esc(slug)}"><header class="site-header"><div class="container nav"><a class="brand" href="/">SuguTsu<span class="cool">cool</span></a><nav class="navlinks"><a href="/#tools">ツール</a><a href="/image/">画像</a><a href="/pdf/">PDF</a><a href="/text/">テキスト</a><a href="/web/">Web</a><a href="/calculator/">計算</a><a href="/developer/">開発</a></nav><a class="mobile-home" href="/#tools">ツール一覧</a></div></header><main class="tool-page"><div class="container"><div class="breadcrumbs"><a href="/">トップ</a> / <a href="/${category}/">${esc(categoryLabel)}</a> / ${esc(name)}</div><div class="tool-head"><div><h1>${esc(name)}</h1><p>${esc(desc)}</p></div><span class="privacy-chip">🔒 ブラウザ内処理</span></div><section class="workbench" id="app"></section><section class="seo-content"><h2>${esc(name)}とは</h2><p>${esc(desc)} SuguTsucoolなら会員登録やソフトのインストールなしで、PC・スマホのブラウザからすぐ利用できます。</p><h2>こんなときに便利</h2><p>${esc(useCase(category))}</p><h2>使い方</h2><div class="steps"><div class="step"><b>1. 入力</b>必要な値や文章を入力します。</div><div class="step"><b>2. 実行</b>ボタンを押して処理します。</div><div class="step"><b>3. 利用</b>結果を確認し、必要に応じてコピーします。</div></div><h2>関連ツール</h2><div class="related-tools">${relatedHtml}</div><h2>よくある質問</h2>${faq.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</section></div></main><footer class="footer"><div class="container footer-inner"><div>© <span id="footerYear"></span> SuguTsucool</div><div class="footer-links"><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a><a href="/contact/">お問い合わせ</a></div></div></footer><script>document.getElementById('footerYear').textContent=new Date().getFullYear()</script><script src="/assets/tool-suite-plus.js"></script><script src="/assets/tool-suite-extra.js"></script><script src="/assets/tool-enhance.js"></script><script src="/assets/analytics-track.js"></script></body></html>`;
};

for (const tool of ALL_TOOLS) {
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
  const extra = JSON.stringify(ALL_TOOLS).slice(1,-1);
  catalog = catalog.replace(marker, `,${extra}];window.SUGU_TOOLS=T;`);
  await fs.writeFile(catalogPath,catalog);
}

const sitemapPath = path.join(DIST,'sitemap.xml');
let sitemap = await fs.readFile(sitemapPath,'utf8');
if (!sitemap.includes('/text/reverse-text/')) {
  const today = new Date().toISOString().slice(0,10);
  const urls = ALL_TOOLS.map(t=>`  <url><loc>${BASE}/${t[3]}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`).join('\n');
  sitemap = sitemap.replace('</urlset>', `${urls}\n</urlset>`);
  await fs.writeFile(sitemapPath,sitemap);
}

console.log(`Generated ${ALL_TOOLS.length} additional tools. Total target: ${50 + ALL_TOOLS.length}.`);
