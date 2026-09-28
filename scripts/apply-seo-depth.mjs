import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY_TOOLS } from './priority-seo-data.mjs';
import { LONGTAIL_SEO } from './longtail-seo-data.mjs';

const DIST=path.resolve('dist');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toolsByRoute=new Map(PRIORITY_TOOLS.map(t=>[t.route,t]));

const categoryOf=route=>route.split('/')[0];
const inputHint=route=>{
  const c=categoryOf(route);
  if(c==='image') return '画像ファイルと、必要に応じてサイズ・形式・品質などの設定';
  if(c==='pdf') return '対象のPDFファイルと、結合順・ページ番号など必要な条件';
  if(c==='text') return '変換・確認したい文章や文字列';
  if(c==='web') return 'URL・文字列・色コードなど対象データと必要な設定';
  if(c==='developer') return 'JSON・CSVなど対象データと変換・整形条件';
  if(/work-hours|hourly-wage|overtime-pay/.test(route)) return '勤務時間・休憩・給与・時給・割増率など必要な勤務条件';
  if(/age|date-difference/.test(route)) return '生年月日や開始日・終了日などの日付';
  if(/loan-payment|monthly-investment/.test(route)) return '金額・利率・期間などシミュレーション条件';
  if(route.includes('fuel-cost')) return '走行距離・燃費・燃料単価';
  return '計算に必要な金額・割合・数値';
};

const checkHint=route=>{
  if(route==='image/compress') return '圧縮後の容量だけでなく、文字や細部が読める画質かも確認します。';
  if(route==='image/resize') return '縦横比と出力ピクセル数を確認し、必要以上の拡大を避けます。';
  if(route==='image/convert') return '透過の有無や利用先が対応する画像形式かを確認します。';
  if(route==='image/to-pdf') return '画像の順番・向き・ページの見え方を確認します。';
  if(route==='pdf/merge') return '結合前にファイル順を確認し、完成PDFのページ順も見直します。';
  if(route==='pdf/split') return '必要なページ番号と抽出範囲が合っているか確認します。';
  if(route==='pdf/delete-pages') return '削除対象のページ番号を確認し、元ファイルを残して作業します。';
  if(route==='text/character-count') return '空白や改行を数える条件によって文字数が変わるため、用途に合う数え方を確認します。';
  if(route==='text/word-count') return '日本語と英語では語句の区切り方が異なるため、用途に合う指標を確認します。';
  if(route==='text/find-replace') return '置換前に検索対象を確認し、意図しない文字列まで変わらないか見直します。';
  if(route==='text/kana-converter') return '漢字・英数字など変換対象外の文字が意図どおり残っているか確認します。';
  if(route==='text/remove-spaces') return '全角・半角のどちらを削除するか、改行を残すかを確認します。';
  if(route==='web/qr-code') return '生成後はスマホで実際に読み取り、URLや文字列が正しいか確認します。';
  if(route==='web/password-generator') return '生成後は安全な場所に保存し、同じパスワードの使い回しを避けます。';
  if(route==='web/url-encode') return 'エンコードとデコードの方向を確認し、変換後のURLを実際に確認します。';
  if(route==='web/base64') return 'Base64は暗号化ではないため、秘密情報の保護用途には使わないでください。';
  if(route==='web/color-converter') return '変換後の色コードだけでなく、背景色との見え方やコントラストも確認します。';
  if(route==='calculator/loan-payment') return '概算結果です。実際の金利方式・手数料・返済条件は契約先の資料を確認してください。';
  if(route==='calculator/monthly-investment') return '一定利率を仮定した試算であり、将来の運用成果を保証するものではありません。';
  if(route==='calculator/overtime-pay') return '実際の残業代は勤務先の規定や法定条件によって変わる場合があります。';
  if(route.startsWith('calculator/')) return '入力単位と条件を確認し、重要な用途では元データと計算結果を再確認します。';
  return '入力内容と出力結果が目的に合っているか確認します。';
};

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
  const g=compareGroups.find(x=>x.includes(route));
  return (g||[]).map(r=>toolsByRoute.get(r)).filter(Boolean).slice(0,4);
};

const shortLead=t=>{
  const s=String(t.lead||'').split('。')[0];
  return s.endsWith('。')?s:`${s}。`;
};

const faqFor=(tool,queries)=>{
  const c=categoryOf(tool.route);
  const items=[
    {q:`${queries[0]}は無料で使えますか？`,a:`はい。SuguTsucoolの${tool.name}は登録不要で利用できます。入力条件を確認してから実行してください。`},
    {q:`${queries[1]}の用途でも使えますか？`,a:`${tool.name}は「${queries[1]}」を探している場合にも利用できます。${tool.examples[0]}などの用途を想定しています。`},
    {q:'スマホでも使えますか？',a:'スマホのブラウザからも利用できます。ファイルを扱うツールでは、端末のメモリやファイルサイズによって処理時間が変わる場合があります。'},
    {q:'入力した内容は保存されますか？',a:c==='calculator'?'計算はブラウザ上で行います。結果を重要な判断に使う場合は、入力条件と結果を再確認してください。':'主要な処理はブラウザ内で行う設計です。作業後は必要な結果だけを保存してください。'},
    {q:`${tool.name}を使うときの注意点は？`,a:checkHint(tool.route)}
  ];
  return items;
};

let applied=0;
for(const tool of PRIORITY_TOOLS){
  const queries=LONGTAIL_SEO[tool.route];
  if(!queries||queries.length<5) throw new Error(`long-tail queries missing: ${tool.route}`);
  const file=path.join(DIST,...tool.route.split('/'),'index.html');
  let html=await fs.readFile(file,'utf8');
  if(html.includes('data-seo-depth="1"')) continue;

  const intentRows=queries.slice(0,4).map((q,i)=>`<tr><th scope="row">${esc(q)}</th><td>${esc(tool.examples[i%tool.examples.length])}</td><td>${esc(i===0?checkHint(tool.route):`入力条件を変えて結果を比較し、${tool.name}の出力が目的に合うか確認します。`)}</td></tr>`).join('');
  const related=relatedFor(tool.route);
  const compareHtml=related.length>1?`<h2>似たツールとの違い</h2><div class="seo-compare-grid">${related.map(t=>`<a class="seo-compare-card${t.route===tool.route?' current':''}" href="/${t.route}/"><strong>${esc(t.name)}</strong><span>${esc(shortLead(t))}</span><small>${esc(t.primary)}</small></a>`).join('')}</div>`:'';
  const examples=tool.examples.map((x,i)=>`<article class="seo-example-card"><div class="seo-example-no">例 ${i+1}</div><h3>${esc(x)}</h3><p><b>入力するもの：</b>${esc(inputHint(tool.route))}</p><p><b>確認ポイント：</b>${esc(checkHint(tool.route))}</p></article>`).join('');
  const faqs=faqFor(tool,queries);
  const faqHtml=faqs.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('');

  const block=`<section class="seo-depth-content" data-seo-depth="1"><div class="seo-depth-label">検索意図を詳しく解説</div><h2>${esc(tool.name)}はどんな検索目的に向いている？</h2><p>同じ${esc(tool.name)}でも、検索する言葉によって目的は少しずつ異なります。下の表で「何をしたいか」と確認ポイントを整理できます。</p><div class="seo-table-wrap"><table class="seo-intent-table"><thead><tr><th>検索意図</th><th>具体的な使い方</th><th>確認ポイント</th></tr></thead><tbody>${intentRows}</tbody></table></div>${compareHtml}<h2>${esc(tool.name)}の具体的な利用例</h2><div class="seo-example-grid">${examples}</div><h2>${esc(tool.name)}でよくある質問</h2><div class="seo-depth-faq">${faqHtml}</div><h2>使う前に確認したいこと</h2><p class="seo-depth-note">${esc(checkHint(tool.route))} ${esc(tool.lead)}</p></section>`;
  html=html.replace('</main>',`${block}</main>`);
  await fs.writeFile(file,html);
  applied++;
}

if(applied!==PRIORITY_TOOLS.length) throw new Error(`expected ${PRIORITY_TOOLS.length} deep SEO pages, applied ${applied}`);
console.log(`SEO depth content applied to ${applied} priority tool pages.`);
