import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY_TOOLS } from './priority-seo-data.mjs';
import { LONGTAIL_SEO } from './longtail-seo-data.mjs';

const DIST=path.resolve('dist');
const BASE='https://sugutsucool.pages.dev';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonSafe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const slugOf=route=>route.replaceAll('/','-');
const category=route=>route.split('/')[0];
const catLabel=c=>({image:'画像',pdf:'PDF',text:'テキスト',web:'Web',calculator:'計算',developer:'開発'}[c]||'便利ツール');
const byRoute=new Map(PRIORITY_TOOLS.map(t=>[t.route,t]));
const groups=[
 ['image/compress','image/resize','image/convert','image/to-pdf'],
 ['pdf/merge','pdf/split','pdf/delete-pages'],
 ['text/character-count','text/word-count','text/find-replace','text/kana-converter','text/remove-spaces'],
 ['web/qr-code','web/url-encode','web/base64','web/password-generator','web/color-converter'],
 ['calculator/work-hours','calculator/hourly-wage','calculator/overtime-pay'],
 ['calculator/discount','calculator/percentage','calculator/consumption-tax'],
 ['calculator/age','calculator/date-difference'],
 ['calculator/loan-payment','calculator/monthly-investment'],
 ['developer/json-formatter','developer/csv-json']
];
const related=route=>(groups.find(g=>g.includes(route))||[]).filter(r=>r!==route).map(r=>byRoute.get(r)).filter(Boolean).slice(0,3);
const mistakes=route=>{
 const c=category(route);
 if(c==='image')return ['元画像を残さず上書きする','容量だけを見て画質・解像度を確認しない','利用先に合わない形式で保存する'];
 if(c==='pdf')return ['ファイル順やページ番号を確認しない','元PDFを残さず編集する','出力後のページ順を確認しない'];
 if(c==='text')return ['変換前の文章を残さない','空白・改行・文字種の条件を確認しない','一部だけ見て全文の変換結果を確認しない'];
 if(c==='web')return ['入力形式や変換方向を取り違える','生成結果を実環境で確認しない','秘密情報を不用意に共有する'];
 if(c==='developer')return ['元データをバックアップしない','構文だけ確認して意味上の差分を見ない','変換結果をそのまま本番投入する'];
 return ['単位や期間を取り違える','概算を確定値として扱う','1パターンだけで判断する'];
};
const checks=tool=>[
 {t:'入力条件',d:`${tool.name}で使う値・ファイル・文字列が目的に合っているか確認します。`},
 {t:'出力内容',d:'結果だけでなく、単位・順番・形式・桁数なども確認します。'},
 {t:'比較',d:'必要に応じて条件を変え、複数パターンを比較します。'},
 {t:'保存前確認',d:'元データを残し、完成結果を開いてから利用します。'}
];
const warning=route=>{
 if(route==='calculator/loan-payment')return 'ローン結果は概算です。実際の金利方式、手数料、返済条件は契約先の資料を確認してください。';
 if(route==='calculator/monthly-investment')return '一定利率を仮定した試算です。将来の運用成果を保証するものではありません。';
 if(route==='calculator/overtime-pay')return '実際の残業代は勤務先の規定や適用条件により異なる場合があります。';
 if(route==='web/password-generator')return '生成したパスワードは安全な場所で管理し、サービス間で使い回さないでください。';
 return '重要な用途では、入力条件と出力結果をもう一度確認してから利用してください。';
};

const pageFor=tool=>{
 const qs=LONGTAIL_SEO[tool.route]||[]; if(qs.length<5)throw new Error(`missing longtail: ${tool.route}`);
 const slug=slugOf(tool.route)+'-tips', url=`${BASE}/guides/${slug}/`, toolUrl=`${BASE}/${tool.route}/`, rel=related(tool.route);
 const title=`${tool.name}の選び方・失敗対策｜比較ポイントと注意点｜SuguTsucool`;
 const desc=`${tool.name}で失敗しないための確認ポイント、よくあるミス、似たツールとの違い、${qs.slice(1,4).join('・')}の使い分けを解説します。`.slice(0,155);
 const faq=[
  {q:`${tool.name}を使う前に最初に確認することは？`,a:'入力形式・単位・ファイル順など、結果に影響する条件を最初に確認してください。'},
  {q:`${qs[2]}と${tool.name}は同じ用途ですか？`,a:`目的が近い場合でも設定や出力形式が異なることがあります。必要な結果から逆算して条件を選んでください。`},
  {q:'結果がおかしいときはどうすればいいですか？',a:'入力条件、単位、変換方向、ファイル順などを見直し、少ないデータで再実行して比較してください。'},
  {q:'スマホとPCで結果は変わりますか？',a:'基本的な処理内容は同じですが、大きなファイルでは端末性能やメモリによって処理時間が変わる場合があります。'}
 ];
 const article={'@context':'https://schema.org','@type':'Article',headline:`${tool.name}の選び方・失敗対策`,description:desc,mainEntityOfPage:url,inLanguage:'ja-JP',author:{'@type':'Organization',name:'SuguTsucool'},publisher:{'@type':'Organization',name:'SuguTsucool',url:`${BASE}/`}};
 const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'SuguTsucool',item:`${BASE}/`},{'@type':'ListItem',position:2,name:'使い方ガイド',item:`${BASE}/guides/`},{'@type':'ListItem',position:3,name:`${tool.name}の選び方・失敗対策`,item:url}]};
 const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))};
 const relRows=rel.map(t=>`<tr><th>${esc(t.name)}</th><td>${esc(t.primary)}</td><td>${esc(t.lead)}</td><td><a href="/${t.route}/">ツールを開く</a></td></tr>`).join('');
 const mistakesHtml=mistakes(tool.route).map((x,i)=>`<article class="guide-check-card"><b>失敗例 ${i+1}</b><span>${esc(x)}</span></article>`).join('');
 const checksHtml=checks(tool).map(x=>`<article class="guide-check-card"><b>${esc(x.t)}</b><span>${esc(x.d)}</span></article>`).join('');
 const intentHtml=qs.slice(1,5).map(q=>`<article class="guide-intent-card"><h3>${esc(q)}</h3><p>「${esc(q)}」で探している場合は、必要な出力形式・入力条件・確認したい結果を先に決めると、${esc(tool.name)}を使うべきか判断しやすくなります。</p></article>`).join('');
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:site_name" content="SuguTsucool"><meta property="og:title" content="${esc(title.replace('｜SuguTsucool',''))}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/mega.css"><link rel="stylesheet" href="/assets/guides.css"><script type="application/ld+json">${jsonSafe(article)}</script><script type="application/ld+json">${jsonSafe(crumbs)}</script><script type="application/ld+json">${jsonSafe(faqSchema)}</script></head><body data-related-tool="${esc(tool.route)}"><header class="site-header"><div class="container nav"><a class="brand" href="/">SuguTsu<span class="cool">cool</span></a><nav class="navlinks"><a href="/#tools">ツール</a><a href="/guides/">使い方ガイド</a><a href="/image/">画像</a><a href="/pdf/">PDF</a><a href="/text/">テキスト</a><a href="/web/">Web</a><a href="/calculator/">計算</a><a href="/developer/">開発</a></nav></div></header><main class="guide-page"><div class="container guide-container"><div class="breadcrumbs"><a href="/">トップ</a> / <a href="/guides/">使い方ガイド</a> / ${esc(tool.name)}の選び方</div><article><section class="guide-hero"><div class="guide-tips-kicker">${esc(catLabel(category(tool.route)))}ツールの失敗対策</div><h1>${esc(tool.name)}の選び方・失敗対策</h1><p>${esc(tool.lead)}</p><div class="guide-query-row">${qs.slice(0,5).map(q=>`<span>${esc(q)}</span>`).join('')}</div><div class="guide-secondary-links"><a class="btn primary guide-tool-cta" href="/${tool.route}/">${esc(tool.name)}を使う →</a><a class="btn ghost" href="/guides/${slugOf(tool.route)}/">基本の使い方を見る</a></div></section><section class="guide-section"><h2>まず確認する4項目</h2><div class="guide-check-grid">${checksHtml}</div></section><section class="guide-section"><h2>よくある失敗</h2><div class="guide-check-grid">${mistakesHtml}</div><p class="guide-note">${esc(warning(tool.route))}</p></section><section class="guide-section"><h2>検索目的ごとの選び方</h2><div class="guide-intent-grid">${intentHtml}</div></section>${relRows?`<section class="guide-section"><h2>似たツールとの比較</h2><div class="guide-tips-table-wrap"><table class="guide-tips-table"><thead><tr><th>ツール</th><th>検索目的</th><th>向いている用途</th><th></th></tr></thead><tbody>${relRows}</tbody></table></div></section>`:''}<section class="guide-section"><h2>よくある質問</h2><div class="guide-faq">${faq.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div></section><section class="guide-final-cta"><h2>${esc(tool.name)}で実際に確認する</h2><p>条件を整理したら、無料ツールを開いて実際のデータで試せます。</p><a class="btn primary guide-tool-cta" href="/${tool.route}/">${esc(tool.name)}を開く →</a></section></article></div></main><footer class="footer"><div class="container footer-inner"><div>© <span data-year></span> SuguTsucool</div><div class="footer-links"><a href="/guides/">使い方ガイド</a><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a></div></div></footer><script>document.querySelectorAll('[data-year]').forEach(x=>x.textContent=new Date().getFullYear())</script><script src="/assets/analytics-track.js"></script><script src="/assets/affiliate-tools.js" defer></script></body></html>`;
};

const guidesDir=path.join(DIST,'guides'); await fs.mkdir(guidesDir,{recursive:true});
for(const tool of PRIORITY_TOOLS){
 const slug=slugOf(tool.route), tipsSlug=slug+'-tips';
 const dir=path.join(guidesDir,tipsSlug); await fs.mkdir(dir,{recursive:true}); await fs.writeFile(path.join(dir,'index.html'),pageFor(tool));
 const original=path.join(guidesDir,slug,'index.html');
 try{let h=await fs.readFile(original,'utf8'); if(!h.includes('/assets/guides.css'))h=h.replace('</head>','<link rel="stylesheet" href="/assets/guides.css"></head>'); if(!h.includes('data-related-tool='))h=h.replace('<body>','<body data-related-tool="'+esc(tool.route)+'">'); if(!h.includes('/assets/affiliate-tools.js'))h=h.replace('</body>','<script src="/assets/affiliate-tools.js" defer></script></body>'); await fs.writeFile(original,h)}catch{}
 const toolFile=path.join(DIST,...tool.route.split('/'),'index.html'); let th=await fs.readFile(toolFile,'utf8');
 if(!th.includes('data-seo-guide-extra-link="1"')){const block=`<section class="tool-guide-extra-link" data-seo-guide-extra-link="1"><div><strong>${esc(tool.name)}の選び方・失敗対策</strong><span>よくあるミス、比較ポイント、検索目的ごとの選び方を確認できます。</span></div><a href="/guides/${tipsSlug}/">失敗対策ガイドを見る →</a></section>`; th=th.replace('</main>',`${block}</main>`); await fs.writeFile(toolFile,th)}
}

const indexFile=path.join(guidesDir,'index.html'); let index=await fs.readFile(indexFile,'utf8');
if(!index.includes('data-guide-plus="1"')){const cards=PRIORITY_TOOLS.map(t=>`<a href="/guides/${slugOf(t.route)}-tips/"><span>${esc(t.icon)}</span><div><strong>${esc(t.name)}の選び方・失敗対策</strong><small>${esc((LONGTAIL_SEO[t.route]||[])[1]||t.primary)}</small><p>比較ポイント、よくある失敗、使う前の確認項目をまとめています。</p></div></a>`).join(''); const section=`<section class="guide-index-group" data-guide-plus="1"><h2>選び方・失敗対策ガイド</h2><div class="guide-index-grid">${cards}</div></section>`; index=index.replace('</main>',`${section}</main>`).replaceAll('30 GUIDE PAGES','60 GUIDE PAGES').replaceAll('定番30ツール','定番30ツール・全60記事'); if(!index.includes('/assets/guides.css'))index=index.replace('</head>','<link rel="stylesheet" href="/assets/guides.css"></head>'); await fs.writeFile(indexFile,index)}

const sitemapFile=path.join(DIST,'sitemap.xml'); let sitemap=await fs.readFile(sitemapFile,'utf8'); const today=new Date().toISOString().slice(0,10);
for(const tool of PRIORITY_TOOLS){const u=`${BASE}/guides/${slugOf(tool.route)}-tips/`; if(!sitemap.includes(u))sitemap=sitemap.replace('</urlset>',`  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>\n</urlset>`)}
await fs.writeFile(sitemapFile,sitemap);

const homeFile=path.join(DIST,'index.html'); let home=await fs.readFile(homeFile,'utf8'); home=home.replaceAll('全30ガイドを見る','全60ガイドを見る').replaceAll('定番30ツールを検索目的別に詳しく解説','定番30ツールを60本の使い方・比較記事で詳しく解説'); await fs.writeFile(homeFile,home);
console.log('Generated 30 additional SEO guides. Guide library total: 60.');