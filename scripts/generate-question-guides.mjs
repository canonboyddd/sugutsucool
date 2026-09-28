import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY_TOOLS } from './priority-seo-data.mjs';

const DIST=path.resolve('dist');
const BASE='https://sugutsucool.pages.dev';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonSafe=x=>JSON.stringify(x).replace(/</g,'\\u003c');
const toolMap=new Map(PRIORITY_TOOLS.map(t=>[t.route,t]));
const basicSlug=r=>r.replaceAll('/','-');
const catLabel=c=>({image:'画像',pdf:'PDF',text:'テキスト',web:'Web',calculator:'計算',developer:'開発'}[c]||'便利');

const TOPICS=[
{route:'image/compress',steps:['画像を選ぶ','目標容量や出力形式を決める','圧縮を実行する','容量と画質を確認して保存する'],checks:['文字や細部が読めるか','用途の容量上限を満たすか','元画像を残しているか'],questions:[
 {slug:'image-under-1mb',title:'画像を1MB以下にする方法',goal:'フォーム送信やメール添付の容量制限に合わせて画像を1MB以下へ軽くする',example:'3.8MBのスマホ写真を1MB以下へ圧縮する'},
 {slug:'compress-image-on-smartphone',title:'スマホで画像容量を小さくする方法',goal:'アプリを追加せずスマホのブラウザだけで画像容量を減らす',example:'iPhoneやAndroidで撮影した写真を送信しやすい容量へ調整する'}]},
{route:'image/resize',steps:['画像を選ぶ','必要な幅・高さを確認する','縦横比や拡大防止を設定する','リサイズ後のピクセル数を確認する'],checks:['縦横比が崩れていないか','必要以上に拡大していないか','掲載先の推奨サイズに合うか'],questions:[
 {slug:'resize-image-1080px',title:'画像サイズを1080pxにする方法',goal:'SNSやWeb掲載向けに画像の長辺・幅を1080pxへ揃える',example:'4000pxの写真を1080pxへ縮小する'},
 {slug:'resize-keep-aspect-ratio',title:'画像の縦横比を保って縮小する方法',goal:'画像を歪ませず元の比率を維持したまま小さくする',example:'横長写真を比率を保ったまま1200px幅へ変更する'}]},
{route:'image/convert',steps:['変換元画像を選ぶ','出力形式を選ぶ','透明背景の扱いを確認する','変換後画像を開いて確認する'],checks:['透過が必要か','利用先が形式に対応するか','画質と容量のバランス'],questions:[
 {slug:'png-to-jpg',title:'PNGをJPGに変換する方法',goal:'PNG画像を一般的なJPG形式へ変換して互換性や容量を調整する',example:'透過不要のPNG写真をJPGへ変換する'},
 {slug:'webp-to-jpg-png',title:'WebPをJPG・PNGに変換する方法',goal:'WebPを対応範囲の広いJPGまたはPNGへ変換する',example:'Webから保存したWebP画像を資料で使えるJPGへ変換する'}]},
{route:'pdf/merge',steps:['結合したいPDFを選ぶ','ファイル順を並べる','結合を実行する','完成PDFのページ順を確認する'],checks:['順番が正しいか','不要ページが混ざっていないか','完成PDFを実際に開けるか'],questions:[
 {slug:'merge-pdf-into-one',title:'PDFを1つにまとめる方法',goal:'複数のPDFを順番どおり1つのファイルへまとめる',example:'請求書や資料を1つのPDFへ統合する'},
 {slug:'merge-pdf-on-smartphone',title:'スマホでPDFを結合する方法',goal:'PCを使わずスマホのブラウザで複数PDFをまとめる',example:'スマホに保存した2つのPDFを1本化する'}]},
{route:'pdf/split',steps:['PDFを選ぶ','必要ページや範囲を決める','分割・抽出を実行する','出力PDFを確認する'],checks:['ページ番号が合っているか','元PDFを残しているか','必要なページが欠けていないか'],questions:[
 {slug:'extract-pages-from-pdf',title:'PDFから必要なページだけ取り出す方法',goal:'長いPDFから指定したページだけを新しいPDFとして保存する',example:'20ページの資料から3〜5ページだけ抽出する'},
 {slug:'split-pdf-by-page',title:'PDFをページごとに分割する方法',goal:'複数ページのPDFをページ単位に分けて整理する',example:'スキャンPDFを1ページずつ分ける'}]},
{route:'text/character-count',steps:['文章を貼り付ける','空白を含む・除く条件を確認する','文字数・行数を確認する','提出条件と照合する'],checks:['空白の扱い','改行の扱い','文字数制限の数え方'],questions:[
 {slug:'count-characters-without-spaces',title:'空白を除いて文字数を数える方法',goal:'全角・半角スペースを除外した実質的な文字数を確認する',example:'ESやレポートの指定字数を空白除外で確認する'},
 {slug:'count-report-characters',title:'レポートの文字数を正確に数える方法',goal:'レポート提出前に文字数・行数・空白有無をまとめて確認する',example:'2000字指定のレポートが条件内か確認する'}]},
{route:'text/word-count',steps:['文章を貼り付ける','単語・語句の数え方を確認する','単語数と文字数を見る','必要なら文章量を調整する'],checks:['日本語と英語で区切り方が違う','記号を含む場合の扱い','提出先の基準'],questions:[
 {slug:'count-english-words',title:'英文の単語数を数える方法',goal:'英作文や英文記事のワード数を素早く確認する',example:'500 words指定の英文レポートを確認する'},
 {slug:'count-japanese-terms',title:'日本語の語句数を確認する方法',goal:'日本語文章の語句数と文字数を一緒に確認する',example:'記事原稿の文章量を語句数でも把握する'}]},
{route:'text/find-replace',steps:['対象文章を貼る','検索文字列と置換文字列を入力する','条件を確認して置換する','全文を見直す'],checks:['意図しない部分まで一致していないか','大文字小文字の条件','元文章のバックアップ'],questions:[
 {slug:'replace-text-in-bulk',title:'文章を一括置換する方法',goal:'同じ表記をまとめて別の文字列へ変更する',example:'旧商品名を新商品名へ一括で置き換える'},
 {slug:'replace-case-sensitive',title:'大文字小文字を区別して置換する方法',goal:'英字の大文字小文字を区別して対象だけを置換する',example:'APIだけを置換しapiは残す'}]},
{route:'web/qr-code',steps:['URLまたは文章を入力する','サイズや誤り訂正などを設定する','QRコードを生成する','スマホで読み取り確認して保存する'],checks:['リンク先が正しいか','実際に読み取れるか','印刷時の余白が足りるか'],questions:[
 {slug:'make-qr-code-from-url',title:'URLからQRコードを作る方法',goal:'WebサイトやフォームURLを読み取れるQRコードへ変換する',example:'店舗ページのURLをチラシ用QRコードにする'},
 {slug:'save-qr-code-as-png',title:'QRコードをPNGで保存する方法',goal:'作成したQRコードを画像として保存し資料やSNSで使う',example:'生成したQRをPNGで保存してポスターへ配置する'}]},
{route:'web/password-generator',steps:['必要な文字数を決める','英大文字・小文字・数字・記号を選ぶ','候補を生成する','安全な場所へ保存する'],checks:['使い回していないか','十分な長さがあるか','サービス側の文字制限に合うか'],questions:[
 {slug:'create-strong-password',title:'強いパスワードを作る方法',goal:'推測されにくい十分な長さのランダムパスワードを作る',example:'16文字以上のランダムパスワードを生成する'},
 {slug:'password-with-symbols',title:'英数字・記号を混ぜたパスワードを作る方法',goal:'英字・数字・記号を組み合わせた候補を自動生成する',example:'大文字小文字・数字・記号入り20文字を作る'}]},
{route:'calculator/work-hours',steps:['出勤時刻を入力する','退勤時刻を入力する','休憩時間を入力する','実働時間を確認する'],checks:['日またぎ勤務か','休憩を二重に引いていないか','時刻と時間の単位'],questions:[
 {slug:'work-hours-minus-break',title:'勤務時間から休憩時間を引く方法',goal:'出勤から退勤までの時間から休憩を差し引いて実働時間を出す',example:'9:00〜18:00、休憩60分の実働を計算する'},
 {slug:'overnight-work-hours',title:'日をまたぐ勤務時間を計算する方法',goal:'夜勤など退勤が翌日になる勤務時間を正しく計算する',example:'22:00〜翌7:00、休憩1時間の実働を計算する'}]},
{route:'calculator/hourly-wage',steps:['給与額を入力する','対象期間の労働時間を入力する','時給換算を実行する','条件を変えて比較する'],checks:['総支給か手取りか','残業代を含めるか','労働時間の集計期間'],questions:[
 {slug:'monthly-salary-to-hourly',title:'月給から時給を計算する方法',goal:'月給と月間労働時間から時給換算の目安を出す',example:'月給25万円・月160時間を時給へ換算する'},
 {slug:'daily-wage-to-hourly',title:'日給から時給を計算する方法',goal:'日給と1日の実働時間から時給の目安を求める',example:'日給1万円・実働8時間の時給を確認する'}]},
{route:'calculator/overtime-pay',steps:['基本時給を確認する','残業時間を入力する','割増率を設定する','概算残業代を確認する'],checks:['勤務先の規定','深夜・休日割増の重複条件','固定残業代の扱い'],questions:[
 {slug:'calculate-overtime-pay',title:'残業代を計算する方法',goal:'時給・残業時間・割増率から残業代の目安を計算する',example:'時給1500円で残業10時間の概算を出す'},
 {slug:'late-night-overtime-pay',title:'深夜残業の目安を計算する方法',goal:'深夜帯を含む残業で割増条件を確認しながら目安額を出す',example:'22時以降の残業時間を含めて概算する'}]},
{route:'calculator/discount',steps:['元価格を入力する','割引率を入力する','割引後価格を計算する','必要なら税や追加割引も確認する'],checks:['%と円引きを混同していないか','連続割引は足し算ではない','税込・税抜の基準'],questions:[
 {slug:'calculate-30-percent-off',title:'30%オフの値段を計算する方法',goal:'元価格から30%割引した支払額をすぐ計算する',example:'4980円の30%オフ価格を確認する'},
 {slug:'calculate-double-discount',title:'2回連続割引の最終価格を計算する方法',goal:'10%オフの後にさらに20%オフなど連続割引を正しく計算する',example:'1万円を10%引き後さらに20%引きする'}]},
{route:'calculator/consumption-tax',steps:['金額を入力する','税率を選ぶ','税込・税抜の方向を選ぶ','税額と合計を確認する'],checks:['10%と軽減税率8%','端数処理','税込から逆算する方向'],questions:[
 {slug:'tax-exclusive-to-inclusive',title:'税抜から税込価格を計算する方法',goal:'税抜価格へ消費税を加えて税込価格を求める',example:'税抜1000円を10%税込へ計算する'},
 {slug:'tax-inclusive-to-exclusive',title:'税込から税抜価格を逆算する方法',goal:'税込価格から税抜本体価格と税額の目安を求める',example:'税込1100円から税抜価格を逆算する'}]},
{route:'calculator/loan-payment',steps:['借入額を入力する','金利を入力する','返済期間を入力する','月々返済額と総額を比較する'],checks:['金利方式','手数料やボーナス返済','実契約条件との差'],questions:[
 {slug:'home-loan-monthly-payment',title:'住宅ローンの月々返済額を計算する方法',goal:'借入額・金利・返済期間から月々の返済額の目安を確認する',example:'3000万円・年1%・35年の月額を試算する'},
 {slug:'compare-loan-interest-rates',title:'金利差で返済額がどれくらい変わるか比較する方法',goal:'同じ借入額でも金利を変えて総返済額と月額の差を見る',example:'年1%と年2%で返済額を比較する'}]},
{route:'calculator/monthly-investment',steps:['毎月の積立額を入力する','想定利率を入力する','期間を入力する','元本と試算額を比較する'],checks:['利率は保証ではない','手数料や税金を含むか','元本と運用益を分けて見る'],questions:[
 {slug:'monthly-10000-investment',title:'毎月1万円を積み立てた将来額を計算する方法',goal:'毎月1万円を一定期間積み立てた場合の元本と試算額を確認する',example:'毎月1万円を20年間積み立てた場合を試算する'},
 {slug:'compound-monthly-investment',title:'複利で積立シミュレーションする方法',goal:'一定利率を仮定し複利効果を含めた積立結果を比較する',example:'年3%と年5%で20年後の差を試算する'}]},
{route:'developer/json-formatter',steps:['JSONを貼り付ける','整形または検証を実行する','エラー位置を確認する','修正後に再検証する'],checks:['カンマ抜け','ダブルクォート','括弧の対応'],questions:[
 {slug:'find-json-error',title:'JSONエラーを見つけて整形する方法',goal:'読みにくいJSONを整形しながら構文エラーの原因を見つける',example:'APIレスポンスのJSON構文を確認する'},
 {slug:'format-json-readable',title:'JSONを見やすく整形する方法',goal:'1行のJSONをインデント付きで読みやすく表示する',example:'圧縮されたJSONを複数行へ整形する'}]},
{route:'developer/csv-json',steps:['変換元データを貼り付ける','CSVまたはJSONの方向を選ぶ','変換を実行する','列・キーの対応を確認する'],checks:['ヘッダー行','区切り文字','引用符内のカンマや改行'],questions:[
 {slug:'csv-to-json',title:'CSVをJSONに変換する方法',goal:'表形式のCSVをJSON配列へ変換して開発やデータ処理で使う',example:'商品一覧CSVをJSONへ変換する'},
 {slug:'json-to-csv',title:'JSONをCSVに変換する方法',goal:'JSON配列を表計算ソフトで扱いやすいCSVへ変換する',example:'API取得データをCSVへ変換する'}]},
{route:'web/base64',steps:['文字列を入力する','エンコードまたはデコードを選ぶ','変換を実行する','元データと結果を確認する'],checks:['Base64は暗号化ではない','文字コード','URL-safe形式との違い'],questions:[
 {slug:'text-to-base64',title:'文字列をBase64に変換する方法',goal:'日本語や英数字の文字列をBase64形式へエンコードする',example:'開発用テスト文字列をBase64化する'},
 {slug:'decode-base64-text',title:'Base64を元の文字列に戻す方法',goal:'Base64文字列をデコードして元のテキスト内容を確認する',example:'受け取ったBase64文字列を読める形へ戻す'}]}
];

const all=TOPICS.flatMap(t=>t.questions.map(q=>({...q,route:t.route,steps:t.steps,checks:t.checks})));
if(all.length!==40)throw new Error(`expected 40 question guides, got ${all.length}`);

function pageFor(item){
 const tool=toolMap.get(item.route); if(!tool)throw new Error(`priority tool missing: ${item.route}`);
 const category=item.route.split('/')[0],url=`${BASE}/guides/${item.slug}/`,toolUrl=`${BASE}/${item.route}/`;
 const desc=`${item.title}を無料オンラインツールで解説。${item.goal}ための手順、具体例、確認ポイント、よくある失敗をまとめています。`.slice(0,155);
 const faqs=[
  {q:`${item.title.replace(/方法$/,'にはどうすればいいですか？')}`,a:`${item.steps.join(' → ')}の順で進めると確認しやすくなります。`},
  {q:`${tool.name}は無料で使えますか？`,a:`はい。SuguTsucoolの${tool.name}は登録不要で利用できます。`},
  {q:'スマホでもできますか？',a:'ブラウザで利用できるためスマホからも使えます。大きなファイルでは端末性能により処理時間が変わる場合があります。'},
  {q:'結果を使う前に何を確認すればいいですか？',a:`${item.checks.join('、')}を確認してください。`}
 ];
 const article={'@context':'https://schema.org','@type':'Article',headline:item.title,description:desc,mainEntityOfPage:url,inLanguage:'ja-JP',author:{'@type':'Organization',name:'SuguTsucool'},publisher:{'@type':'Organization',name:'SuguTsucool',url:`${BASE}/`}};
 const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'SuguTsucool',item:`${BASE}/`},{'@type':'ListItem',position:2,name:'使い方ガイド',item:`${BASE}/guides/`},{'@type':'ListItem',position:3,name:item.title,item:url}]};
 const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqs.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))};
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.title)}｜無料オンライン｜SuguTsucool</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:site_name" content="SuguTsucool"><meta property="og:title" content="${esc(item.title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/assets/mega.css"><link rel="stylesheet" href="/assets/guides.css"><script type="application/ld+json">${jsonSafe(article)}</script><script type="application/ld+json">${jsonSafe(crumbs)}</script><script type="application/ld+json">${jsonSafe(faqSchema)}</script></head><body data-related-tool="${esc(item.route)}" data-question-guide="1"><header class="site-header"><div class="container nav"><a class="brand" href="/">SuguTsu<span class="cool">cool</span></a><nav class="navlinks"><a href="/#tools">ツール</a><a href="/guides/">使い方ガイド</a><a href="/${category}/">${esc(catLabel(category))}</a></nav><a class="mobile-home" href="/${item.route}/">ツールを使う</a></div></header><main class="guide-page"><div class="container guide-container"><div class="breadcrumbs"><a href="/">トップ</a> / <a href="/guides/">使い方ガイド</a> / ${esc(item.title)}</div><article><section class="guide-hero"><div class="guide-tips-kicker">検索質問に答える実践ガイド</div><h1>${esc(item.title)}</h1><p>${esc(item.goal)}方法を、実際の手順と確認ポイントに分けて説明します。</p><div class="guide-secondary-links"><a class="btn primary guide-tool-cta" href="/${item.route}/">${esc(tool.name)}を使う →</a><a class="btn ghost" href="/guides/${basicSlug(item.route)}/">基本ガイドを見る</a></div></section><section class="guide-section"><h2>${esc(item.title)}の手順</h2><ol class="guide-steps">${item.steps.map((s,i)=>`<li><b>STEP ${i+1}</b><span>${esc(s)}</span></li>`).join('')}</ol></section><section class="guide-section"><h2>具体例</h2><div class="guide-example"><span>例</span><h3>${esc(item.example)}</h3><p>条件を入力したら、出力結果だけでなく、用途に必要な容量・形式・単位・順番なども合わせて確認します。</p></div></section><section class="guide-section"><h2>失敗しないための確認ポイント</h2><div class="guide-check-grid">${item.checks.map(x=>`<article class="guide-check-card"><b>確認</b><span>${esc(x)}</span></article>`).join('')}</div><p class="guide-note">重要な用途では元データを残し、結果を実際の利用先でも確認してください。</p></section><section class="guide-section"><h2>関連する2つのガイド</h2><div class="guide-related-grid"><a href="/guides/${basicSlug(item.route)}/"><strong>${esc(tool.name)}の基本的な使い方</strong><span>基本手順・注意点を確認</span></a><a href="/guides/${basicSlug(item.route)}-tips/"><strong>${esc(tool.name)}の選び方・失敗対策</strong><span>比較・よくあるミスを確認</span></a></div></section><section class="guide-section"><h2>よくある質問</h2><div class="guide-faq">${faqs.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('')}</div></section><section class="guide-final-cta"><h2>${esc(tool.name)}で試す</h2><p>${esc(item.goal)}場合は、入力データを用意して無料ツールで確認できます。</p><a class="btn primary guide-tool-cta" href="/${item.route}/">${esc(tool.name)}を開く →</a></section></article></div></main><footer class="footer"><div class="container footer-inner"><div>© <span data-year></span> SuguTsucool</div><div class="footer-links"><a href="/guides/">使い方ガイド</a><a href="/privacy/">プライバシー</a><a href="/terms/">利用規約</a></div></div></footer><script>document.querySelectorAll('[data-year]').forEach(x=>x.textContent=new Date().getFullYear())</script><script src="/assets/analytics-track.js"></script><script src="/assets/affiliate-tools.js" defer></script></body></html>`;
}

const guidesDir=path.join(DIST,'guides');await fs.mkdir(guidesDir,{recursive:true});
for(const item of all){const dir=path.join(guidesDir,item.slug);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),pageFor(item));}

for(const topic of TOPICS){
 const tool=toolMap.get(topic.route);if(!tool)throw new Error(`priority tool missing: ${topic.route}`);
 const toolFile=path.join(DIST,...topic.route.split('/'),'index.html');let h=await fs.readFile(toolFile,'utf8');
 if(!h.includes('data-question-guide-links="1"')){const links=topic.questions.map(q=>`<a href="/guides/${q.slug}/">${esc(q.title)} →</a>`).join('');const block=`<section class="tool-question-guides" data-question-guide-links="1"><div><strong>${esc(tool.name)}のよく検索される疑問</strong><span>具体的なやり方を検索質問別に解説します。</span></div><div>${links}</div></section>`;h=h.replace('</main>',`${block}</main>`);await fs.writeFile(toolFile,h)}
}

const indexPath=path.join(guidesDir,'index.html');let index=await fs.readFile(indexPath,'utf8');
if(!index.includes('data-question-guides="1"')){const cards=all.map(x=>`<a href="/guides/${x.slug}/"><span>Q</span><div><strong>${esc(x.title)}</strong><small>${esc(toolMap.get(x.route)?.name||'')}</small><p>${esc(x.goal)}</p></div></a>`).join('');const section=`<section class="guide-index-group" data-question-guides="1"><h2>検索質問から探す 40ガイド</h2><div class="guide-index-grid">${cards}</div></section>`;index=index.replace('</main>',`${section}</main>`)}
index=index.replace(/60 GUIDE PAGES/g,'100 GUIDE PAGES').replace(/全60ガイド/g,'全100ガイド').replace(/60ページ/g,'100ページ');await fs.writeFile(indexPath,index);

const sitemapPath=path.join(DIST,'sitemap.xml');let sitemap=await fs.readFile(sitemapPath,'utf8');const today=new Date().toISOString().slice(0,10);const missing=all.filter(x=>!sitemap.includes(`/guides/${x.slug}/`));if(missing.length){const entries=missing.map(x=>`  <url><loc>${BASE}/guides/${x.slug}/</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq></url>`).join('\n');sitemap=sitemap.replace('</urlset>',`${entries}\n</urlset>`);await fs.writeFile(sitemapPath,sitemap)}

console.log(`Generated ${all.length} question-focused SEO guides. Guide library target: 100 pages.`);
