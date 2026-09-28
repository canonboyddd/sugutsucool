import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY_TOOLS } from './priority-seo-data.mjs';
import { LONGTAIL_SEO } from './longtail-seo-data.mjs';

const DIST=path.resolve('dist');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const titleOverrides={
  'image/compress':'画像圧縮 無料｜JPG・PNG・WebPをオンラインで軽量化｜SuguTsucool',
  'pdf/merge':'PDF結合 無料｜複数PDFをオンラインで1つにまとめる｜SuguTsucool',
  'text/character-count':'文字数カウント 無料｜空白除外・行数も確認｜SuguTsucool',
  'web/qr-code':'QRコード作成 無料｜URLからオンライン生成｜SuguTsucool',
  'calculator/work-hours':'勤務時間計算｜休憩を引いた実働時間を無料計算｜SuguTsucool',
  'developer/json-formatter':'JSON整形 オンライン｜検証・圧縮・構文チェック無料｜SuguTsucool',
  'developer/csv-json':'CSV→JSON変換 オンライン｜無料・登録不要｜SuguTsucool'
};

const caution=route=>{
  if(route==='calculator/loan-payment') return '返済額は入力条件に基づく概算です。実際の返済条件・手数料・金利方式は契約先の情報をご確認ください。';
  if(route==='calculator/monthly-investment') return '計算結果は入力した利率を一定としたシミュレーションで、将来の運用成果を保証するものではありません。';
  if(route==='calculator/overtime-pay') return '残業代は入力条件から求める目安です。実際の賃金計算は勤務先の規定や適用条件をご確認ください。';
  return '';
};

const intentText=(tool,q,i)=>{
  const example=tool.examples[i%tool.examples.length];
  if(/無料|オンライン|登録不要/.test(q)) return `「${q}」で探している方は、${tool.name}をインストールせずブラウザから利用できます。${example}といった作業を、必要な設定を確認しながら進められます。`;
  if(/JPG|JPEG|PNG|WebP|PDF|CSV|JSON|Base64|HEX|RGB|HSL|URL|QR/.test(q)) return `「${q}」の用途では、対象の形式や入力内容を確認してから${tool.name}を実行してください。${example}のような変換・整理をすばやく行えます。`;
  if(/計算|返済|時給|残業|税|割引|積立|ガソリン|日数|年齢|実働/.test(q)) return `「${q}」を確認したいときは、必要な数値や日付を入力すると結果をすぐ確認できます。${example}のような場面で、条件を変えながら比較できます。`;
  return `「${q}」で探している場合も、この${tool.name}で対応できます。${example}など、目的に合わせて入力内容を整えて利用してください。`;
};

let applied=0;
for(const tool of PRIORITY_TOOLS){
  const queries=LONGTAIL_SEO[tool.route];
  if(!queries||queries.length<5) throw new Error(`long-tail queries missing: ${tool.route}`);
  const file=path.join(DIST,...tool.route.split('/'),'index.html');
  let html=await fs.readFile(file,'utf8');
  if(html.includes('data-longtail-seo="1"')) continue;

  const queryList=queries.map(q=>`<span class="longtail-query">${esc(q)}</span>`).join('');
  const intentBlocks=queries.map((q,i)=>`<article class="longtail-intent"><h3>${esc(q)}で探している方へ</h3><p>${esc(intentText(tool,q,i))}</p></article>`).join('');
  const note=caution(tool.route);
  const block=`<section class="longtail-seo-content" data-longtail-seo="1"><div class="longtail-label">検索語別ガイド</div><h2>${esc(queries[0])}を探している方へ</h2><p>${esc(tool.lead)}</p><div class="longtail-query-list" aria-label="${esc(tool.name)}の関連検索語">${queryList}</div><div class="longtail-intent-grid">${intentBlocks}</div>${note?`<p class="longtail-caution">${esc(note)}</p>`:''}</section>`;
  html=html.replace('</main>',`${block}</main>`);

  const title=titleOverrides[tool.route]||`${queries[0].replace(/\s+/g,'')}｜${tool.name}をオンラインで使う｜SuguTsucool`;
  const desc=`${tool.lead} ${queries.slice(0,3).join('・')}などの用途に対応。登録不要でブラウザから利用できます。`.slice(0,155);
  html=html.replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`);
  html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(desc)}">`);
  html=html.replace(/<meta property="og:title" content="[^"]*">/,`<meta property="og:title" content="${esc(title.replace('｜SuguTsucool',''))}">`);
  html=html.replace(/<meta property="og:description" content="[^"]*">/,`<meta property="og:description" content="${esc(desc)}">`);
  await fs.writeFile(file,html);
  applied++;
}

if(applied!==PRIORITY_TOOLS.length) throw new Error(`expected ${PRIORITY_TOOLS.length} long-tail pages, applied ${applied}`);
console.log(`Long-tail SEO applied to ${applied} priority tool pages.`);
