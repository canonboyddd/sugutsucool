import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY_TOOLS } from './priority-seo-data.mjs';
import { LONGTAIL_SEO } from './longtail-seo-data.mjs';

const DIST=path.resolve('dist');
const BASE='https://sugutsucool.pages.dev';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonSafe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const toolsByRoute=new Map(PRIORITY_TOOLS.map(t=>[t.route,t]));
const guideSlug=route=>route.replaceAll('/','-');
const categoryOf=route=>route.split('/')[0];
const categoryLabel=c=>({image:'画像',pdf:'PDF',text:'テキスト',web:'Web',calculator:'計算',developer:'開発'}[c]||'便利ツール');

const compareGroups=[
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
const relatedFor=route=>{
  const g=compareGroups.find(x=>x.includes(route))||[];
  return g.filter(r=>r!==route).map(r=>toolsByRoute.get(r)).filter(Boolean).slice(0,3);
};
const inputHint=route=>{
  const c=categoryOf(route);
  if(c==='image') return '対象画像を用意し、出力サイズ・形式・品質など必要な条件を確認します。';
  if(c==='pdf') return '対象PDFを用意し、ファイル順やページ番号など必要な条件を確認します。';
  if(c==='text') return '変換・確認したい文章を用意し、空白・改行など残したい条件を決めます。';
  if(c==='web') return 'URL・文字列・色コードなど対象データを用意し、変換方向や出力形式を確認します。';
  if(c==='developer') return 'JSON・CSVなど対象データを用意し、整形・変換後に必要な形式を確認します。';
  if(/work-hours|hourly-wage|overtime-pay/.test(route)) return '勤務時間、休憩、給与、時給、割増率など必要な条件を揃えます。';
  if(/age|date-difference/.test(route)) return '生年月日や開始日・終了日など、計算に必要な日付を揃えます。';
  if(/loan-payment|monthly-investment/.test(route)) return '金額・利率・期間など、比較したい条件を揃えます。';
  if(route.includes('fuel-cost')) return '走行距離・燃費・燃料単価を確認します。';
  return '計算に必要な金額・割合・数値を揃えます。';
};
const checkHint=route=>{
  if(route==='image/compress') return '圧縮後の容量だけでなく、文字や細部が読める画質かも確認してください。';
  if(route==='image/resize') return '縦横比と出力ピクセル数を確認し、必要以上の拡大を避けてください。';
  if(route==='image/convert') return '透過の有無と、利用先が変換後の画像形式に対応しているか確認してください。';
  if(route==='image/to-pdf') return '画像の順番・向き・ページの見え方を保存前に確認してください。';
  if(route==='pdf/merge') return '結合前のファイル順と、完成PDFのページ順を確認してください。';
  if(route==='pdf/split') return '必要なページ番号と抽出範囲が合っているか確認してください。';
  if(route==='pdf/delete-pages') return '削除対象のページ番号を確認し、元ファイルは残して作業してください。';
  if(route==='text/character-count') return '空白・改行を含むかで文字数が変わるため、提出条件に合う数え方を確認してください。';
  if(route==='text/word-count') return '日本語と英語では語句の区切り方が異なるため、用途に合う指標を確認してください。';
  if(route==='text/find-replace') return '置換対象を事前に確認し、意図しない文字列まで変わっていないか見直してください。';
  if(route==='text/kana-converter') return '漢字や英数字など、変換対象外の文字が意図どおり残っているか確認してください。';
  if(route==='text/remove-spaces') return '全角・半角のどちらを削除するか、改行を残すかを確認してください。';
  if(route==='web/qr-code') return '生成後にスマホで実際に読み取り、リンク先や文字列が正しいか確認してください。';
  if(route==='web/password-generator') return '生成後は安全な場所に保存し、同じパスワードの使い回しを避けてください。';
  if(route==='web/url-encode') return 'エンコードとデコードの方向を確認し、変換後のURLを実際に確認してください。';
  if(route==='web/base64') return 'Base64は暗号化ではありません。秘密情報の保護用途には使わないでください。';
  if(route==='web/color-converter') return '変換後の色コードだけでなく、背景色との見え方やコントラストも確認してください。';
  if(route==='calculator/loan-payment') return '結果は概算です。実際の金利方式・手数料・返済条件は契約先の資料を確認してください。';
  if(route==='calculator/monthly-investment') return '一定利率を仮定した試算であり、将来の運用成果を保証するものではありません。';
  if(route==='calculator/overtime-pay') return '実際の残業代は勤務先の規定や適用条件によって変わる場合があります。';
  if(route.startsWith('calculator/')) return '入力単位と条件を確認し、重要な用途では元データと計算結果を再確認してください。';
  return '入力内容と出力結果が目的に合っているか確認してください。';
};
const intentCopy=(tool,q,i)=>{
  const ex=tool.examples[i%tool.examples.length];
  if(/無料|オンライン|登録不要/.test(q)) return `会員登録やソフトのインストールをせず、ブラウザですぐ${tool.name}を使いたい検索意図です。${ex}のような作業を短時間で行いたい場合に向いています。`;
  if(/JPG|JPEG|PNG|WebP|PDF|CSV|JSON|Base64|HEX|RGB|HSL|URL|QR/i.test(q)) return `${q}のように形式や出力方法を指定して探している検索意図です。対象データの形式を確認してから実行し、変換後も内容が保たれているか確認します。`;
  if(/計算|返済|時給|残業|税|割引|積立|ガソリン|日数|年齢|実働/.test(q)) return `${q}の条件で数値を確認・比較したい検索意図です。入力値を変えながら複数パターンを試すと、条件差を把握しやすくなります。`;
  return `${q}という具体的な目的で${tool.name}を探している検索意図です。${ex}のような場面で、入力条件を確認しながら利用できます。`;
};
const mistakesFor=route=>{
  const c=categoryOf(route);
  if(c==='image') return ['元画像を上書きしてしまう','容量だけ見て画質や解像度を確認しない','用途に合わない画像形式で保存する'];
  if(c==='pdf') return ['元PDFを残さず編集する','ページ番号やファイル順を確認しない','完成PDFを開いて最終確認しない'];
  if(c==='text') return ['元テキストを残さず一括変換する','空白・改行・大文字小文字など条件を確認しない','変換後の一部だけ見て全文を確認しない'];
  if(c==='web') return ['変換方向や入力形式を取り違える','生成結果を実際の利用環境で確認しない','秘密情報を不用意に変換・共有する'];
  if(c==='developer') return ['元データのバックアップを残さない','構文エラーだけでなく意味上の差分を確認しない','変換後データをそのまま本番へ投入する'];
  return ['入力単位を取り違える','概算結果を確定値として扱う','条件を1パターンだけで判断する'];
};

const pageFor=tool=>{
  const queries=LONGTAIL_SEO[tool.route];
  if(!queries||queries.length<5) throw new Error(`long-tail queries missing: ${tool.route}`);
  const slug=guideSlug(tool.route), url=`${BASE}/guides/${slug}/`, toolUrl=`${BASE}/${tool.route}/`;
  const related=relatedFor(tool.route);
  const title=`${tool.name}の使い方｜${queries[0]}の手順・注意点・比較｜SuguTsucool`;
  const desc=`${tool.name}の使い方を、${queries.slice(0,3).join('・')}などの検索目的別に解説。具体例、注意点、似たツールとの違いまでまとめます。`.slice(0,155);
  const article={'@context':'https://schema.org','@type':'Article',headline:`${tool.name}の使い方ガイド`,description:desc,mainEntityOfPage:url,inLanguage:'ja-JP',author:{'@type':'Organization',name:'SuguTsucool'},publisher:{'@type':'Organization',name:'SuguTsucool',url:`${BASE}/`}};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'SuguTsucool',item:`${BASE}/`},{'@type':'ListItem',position:2,name:'使い方ガイド',item:`${BASE}/guides/`},{'@type':'ListItem',position:3,name:`${tool.name}の使い方`,item:url}]};
  const faqs=[
    {q:`${tool.name}は無料で使えますか？`,a:`はい。SuguTsucoolの${tool.name}は登録不要で利用できます。`},
    {q:'スマホでも使えますか？',a:'スマホのブラウザからも利用できます。ファイル処理では端末性能やファイルサイズによって処理時間が変わる場合があります。'},
    {q:`${queries[1]}の用途にも使えますか？`,a:`はい。「${queries[1]}」を目的にしている場合も、入力条件を確認しながら${tool.name}を利用できます。`},
    {q:'結果を使う前に何を確認すればいいですか？',a:checkHint(tool.route)}
  ];
  const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))};
  const relatedHtml=related.length?`<section class="guide-section"><h2>似たツールとの違い</h2><div class="guide-related-grid">${related.map(t=>`<a href="/${t.route}/"><strong>${esc(t.name)}</strong><span>${esc(t.lead)}</span><small>${esc(t.primary)}</small></a>`).join('')}</div></section>`:'';
  const queryRows=queries.slice(0,6).map((q,i)=>`<article class="guide-intent-card"><h3>${esc(q)}</h3><p>${esc(intentCopy(tool,q,i))}</p></article>`).join('');
  const exampleCards=tool.examples.map((x,i)=>`<article class="guide-example"><span>活用例 ${i+1}</span><h3>${esc(x)}</h3><p>${esc(inputHint(tool.route))}</p><p><b>確認：</b>${esc(checkHint(tool.route))}</p></article>`).join('');
  const mistakes=mistakesFor(tool.route).map(x=>`<li>${esc(x)}</li>`).join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:site_name" content="SuguTsucool"><meta property="og:title" content="${esc(title.replace('｜SuguTsucool',''))}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/mega.css"><script type="application/ld+json">${jsonSafe(article)}</script><script type="application/ld+json">${jsonSafe(crumbs)}</script><script type="application/ld+json">${jsonSafe(faqSchema)}</script></head><body><header class="site-header"><div class="container nav"><a class="brand" href="/">SuguTsu<span class="cool">cool</span></a><nav class="navlinks"><a href="/#tools">ツール</a><a href="/guides/">使い方ガイド</a><a href="/image/">画像</a><a href="/pdf/">PDF</a><a href="/text/">テキスト</a><a href="/web/">Web</a><a href="/calculator/">計算</a><a href="/developer/">開発</a></nav><a class="mobile-home" href="/guides/">ガイド一覧</a></div></header><main class="guide-page"><div class="container guide-container"><div class="breadcrumbs"><a href="/">トップ</a> / <a href="/guides/">使い方ガイド</a> / ${esc(tool.name)}</div><article><div class="guide-hero"><div class="guide-kicker">${esc(categoryLabel(categoryOf(tool.route)))}ツールの使い方</div><h1>${esc(tool.name)}の使い方ガイド</h1><p>${esc(tool.lead)}</p><div class="guide-query-row">${queries.slice(0,5).map(q=>`<span>${esc(q)}</span>`).join('')}</div><a class="btn primary guide-tool-cta" href="/${tool.route}/">${esc(tool.name)}を今すぐ使う →</a></div><section class="guide-section"><h2>${esc(tool.name)}はこんなときに便利</h2><div class="guide-examples">${exampleCards}</div></section><section class="guide-section"><h2>基本的な使い方</h2><ol class="guide-steps"><li><b>準備する</b><span>${esc(inputHint(tool.route))}</span></li><li><b>条件を設定する</b><span>目的に合わせて入力値やオプションを確認します。</span></li><li><b>実行する</b><span>${esc(tool.name)}を実行し、結果を確認します。</span></li><li><b>保存・利用する</b><span>${esc(checkHint(tool.route))}</span></li></ol></section><section class="guide-section"><h2>検索目的別の使い分け</h2><div class="guide-intent-grid">${queryRows}</div></section>${relatedHtml}<section class="guide-section"><h2>よくある失敗と対策</h2><ul class="guide-mistakes">${mistakes}</ul><p class="guide-note">${esc(checkHint(tool.route))}</p></section><section class="guide-section"><h2>${esc(tool.name)}のよくある質問</h2><div class="guide-faq">${faqs.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div></section><section class="guide-final-cta"><h2>実際に${esc(tool.name)}を使う</h2><p>説明を確認したら、無料ツールを開いて実際のデータで試せます。</p><a class="btn primary" href="/${tool.route}/">${esc(tool.name)}を開く →</a></section></article></div></main><footer class="footer"><div class="container footer-inner"><div>© <span data-year></span> SuguTsucool</div><div class="footer-links"><a href="/guides/">使い方ガイド</a><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a><a href="/contact/">お問い合わせ</a></div></div></footer><script>document.querySelectorAll('[data-year]').forEach(x=>x.textContent=new Date().getFullYear())</script><script src="/assets/analytics-track.js"></script></body></html>`;
};

const guidesDir=path.join(DIST,'guides');
await fs.mkdir(guidesDir,{recursive:true});
for(const tool of PRIORITY_TOOLS){
  const slug=guideSlug(tool.route), dir=path.join(guidesDir,slug);
  await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'index.html'),pageFor(tool));

  const toolFile=path.join(DIST,...tool.route.split('/'),'index.html');
  let toolHtml=await fs.readFile(toolFile,'utf8');
  if(!toolHtml.includes('data-seo-guide-link="1"')){
    const link=`<section class="tool-guide-link" data-seo-guide-link="1"><div><strong>${esc(tool.name)}の詳しい使い方</strong><span>手順・検索目的別の使い分け・注意点・似たツールとの違いを解説しています。</span></div><a href="/guides/${slug}/">使い方ガイドを見る →</a></section>`;
    toolHtml=toolHtml.replace('</main>',`${link}</main>`);
    await fs.writeFile(toolFile,toolHtml);
  }
}

const grouped=Object.groupBy?Object.groupBy(PRIORITY_TOOLS,t=>categoryOf(t.route)):PRIORITY_TOOLS.reduce((a,t)=>((a[categoryOf(t.route)]??=[]).push(t),a),{});
const groupHtml=Object.entries(grouped).map(([cat,tools])=>`<section class="guide-index-group"><h2>${esc(categoryLabel(cat))}</h2><div class="guide-index-grid">${tools.map(t=>`<a href="/guides/${guideSlug(t.route)}/"><span>${esc(t.icon)}</span><div><strong>${esc(t.name)}</strong><small>${esc(t.primary)}</small><p>${esc(t.lead)}</p></div></a>`).join('')}</div></section>`).join('');
const indexDesc='画像圧縮、PDF結合、文字数カウント、QRコード、勤務時間、JSON整形など、SuguTsucoolの定番ツール30種類の使い方・注意点・比較をまとめたガイドです。';
const guideIndex=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>無料オンラインツールの使い方ガイド｜SuguTsucool</title><meta name="description" content="${esc(indexDesc)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${BASE}/guides/"><meta property="og:type" content="website"><meta property="og:site_name" content="SuguTsucool"><meta property="og:title" content="無料オンラインツールの使い方ガイド"><meta property="og:description" content="${esc(indexDesc)}"><meta property="og:url" content="${BASE}/guides/"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/mega.css"></head><body><header class="site-header"><div class="container nav"><a class="brand" href="/">SuguTsu<span class="cool">cool</span></a><nav class="navlinks"><a href="/#tools">ツール</a><a href="/guides/">使い方ガイド</a><a href="/image/">画像</a><a href="/pdf/">PDF</a><a href="/text/">テキスト</a><a href="/web/">Web</a><a href="/calculator/">計算</a><a href="/developer/">開発</a></nav></div></header><main><div class="container guide-container"><div class="guide-index-hero"><span>30 GUIDE PAGES</span><h1>無料オンラインツールの使い方ガイド</h1><p>${esc(indexDesc)}</p></div>${groupHtml}</div></main><footer class="footer"><div class="container footer-inner"><div>© <span data-year></span> SuguTsucool</div><div class="footer-links"><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a><a href="/contact/">お問い合わせ</a></div></div></footer><script>document.querySelectorAll('[data-year]').forEach(x=>x.textContent=new Date().getFullYear())</script><script src="/assets/analytics-track.js"></script></body></html>`;
await fs.writeFile(path.join(guidesDir,'index.html'),guideIndex);

const sitemapPath=path.join(DIST,'sitemap.xml');
let sitemap=await fs.readFile(sitemapPath,'utf8');
if(!sitemap.includes('/guides/')){
  const today=new Date().toISOString().slice(0,10);
  const guideUrls=[`${BASE}/guides/`,...PRIORITY_TOOLS.map(t=>`${BASE}/guides/${guideSlug(t.route)}/`)];
  const entries=guideUrls.map(u=>`  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`).join('\n');
  sitemap=sitemap.replace('</urlset>',`${entries}\n</urlset>`);
  await fs.writeFile(sitemapPath,sitemap);
}

const homePath=path.join(DIST,'index.html');
let home=await fs.readFile(homePath,'utf8');
if(!home.includes('id="guideFeature"')){
  const featured=PRIORITY_TOOLS.slice(0,8).map(t=>`<a class="home-guide-card" href="/guides/${guideSlug(t.route)}/"><span>${esc(t.icon)}</span><strong>${esc(t.name)}の使い方</strong><small>${esc(t.primary)}</small></a>`).join('');
  const section=`<section class="section home-guide-section" id="guideFeature"><div class="container"><div class="section-title-row"><div><h2>使い方・比較ガイド</h2><div class="section-sub">定番30ツールを検索目的別に詳しく解説</div></div><a class="section-sub" href="/guides/">全30ガイドを見る →</a></div><div class="home-guide-grid">${featured}</div></div></section>`;
  home=home.replace('<section class="section" id="tools">',`${section}<section class="section" id="tools">`);
  await fs.writeFile(homePath,home);
}

console.log(`Generated ${PRIORITY_TOOLS.length} SEO guide pages + guide index, backlinks, sitemap and homepage links.`);
