import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY_TOOLS } from './priority-seo-data.mjs';

const DIST=path.resolve('dist');
const BASE='https://sugutsucool.pages.dev';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonSafe=x=>JSON.stringify(x).replace(/</g,'\\u003c');

const answerFor=(tool,q,i)=>{
  if(i===0) return `${tool.name}はブラウザでそのまま利用できます。用途に合わせて入力値や設定を調整し、結果を確認してください。`;
  return `${tool.name}は入力内容を確認しながら利用できます。重要な用途では、変換後・計算後の結果もあわせて確認してください。`;
};

for(const tool of PRIORITY_TOOLS){
  const file=path.join(DIST,...tool.route.split('/'),'index.html');
  let html;
  try{html=await fs.readFile(file,'utf8')}catch{throw new Error(`priority page missing: ${tool.route}`)}
  if(html.includes('data-priority-seo="1"')) continue;
  const faq=tool.faq.map((q,i)=>({q,a:answerFor(tool,q,i)}));
  const faqSchema={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))};
  const keywordHtml=[tool.primary,...tool.secondary].map(k=>`<span class="seo-keyword">${esc(k)}</span>`).join('');
  const useHtml=tool.examples.map(x=>`<li>${esc(x)}</li>`).join('');
  const faqHtml=faq.map(x=>`<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('');
  const block=`<section class="priority-seo-content" data-priority-seo="1"><div class="priority-badge">検索ニーズの高い定番ツール</div><h2>${esc(tool.name)}を無料で使う</h2><p>${esc(tool.lead)}</p><div class="seo-keywords" aria-label="関連キーワード">${keywordHtml}</div><h2>${esc(tool.name)}の主な使い方</h2><ul>${useHtml}</ul><h2>よく検索される使い方・質問</h2>${faqHtml}<p class="seo-note">SuguTsucoolでは、会員登録やソフトのインストールなしでこのツールを利用できます。処理結果は用途に合わせて確認してからご利用ください。</p></section><script type="application/ld+json">${jsonSafe(faqSchema)}</script>`;
  html=html.replace('</main>',`${block}</main>`);
  const desc=`${tool.lead} ${tool.primary}を探している方にも使いやすい、登録不要のSuguTsucool。`;
  html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${esc(desc.slice(0,155))}">`);
  await fs.writeFile(file,html);
}

const indexFile=path.join(DIST,'index.html');
let home=await fs.readFile(indexFile,'utf8');
home=home.replaceAll('110種類','150種類').replaceAll('公開中 110ツール','公開中 150ツール').replace(/<b>110<\/b><span>無料ツール<\/span>/,'<b>150</b><span>無料ツール</span>');
home=home.replace('📝 テキスト 27','📝 テキスト 35').replace('🌐 Web 25','🌐 Web 33').replace('🧮 計算 33','🧮 計算 51').replace('💻 開発 15','💻 開発 21');
if(!home.includes('id="priorityTools"')){
  const cards=PRIORITY_TOOLS.slice(0,12).map(t=>`<a class="priority-card" href="/${t.route}/"><span>${esc(t.icon)}</span><strong>${esc(t.name)}</strong><small>${esc(t.primary)}</small></a>`).join('');
  const links=PRIORITY_TOOLS.slice(12).map(t=>`<a href="/${t.route}/">${esc(t.name)}</a>`).join('');
  const section=`<section class="section priority-section" id="priorityTools"><div class="container"><div class="section-title-row"><div><h2>よく使われる定番ツール</h2><div class="section-sub">検索ニーズが明確な30ツールを優先掲載</div></div><a class="section-sub" href="#tools">全150ツールを見る</a></div><div class="priority-grid">${cards}</div><div class="priority-links">${links}</div></div></section>`;
  home=home.replace('<section class="section" id="tools">',`${section}<section class="section" id="tools">`);
}
await fs.writeFile(indexFile,home);
console.log(`Priority SEO applied to ${PRIORITY_TOOLS.length} tools and homepage.`);
