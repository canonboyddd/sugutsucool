import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=path.resolve(process.argv.find(x=>x.startsWith('--root='))?.slice(7)||'dist');
const PUBLIC_FORBIDDEN=[
  '広告スペース',
  '実データ優先',
  '検索ニーズが明確な30ツール',
  '管理者向け',
  '運営者向け'
];

async function walk(dir){
  const entries=await fs.readdir(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...await walk(full));
    else if(entry.isFile()&&entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const files=await walk(ROOT);
let changed=0;
const leaks=[];

for(const file of files){
  const rel=path.relative(ROOT,file).replaceAll('\\','/');
  const isAdmin=rel.startsWith('admin-seo/')||rel.startsWith('admin-analytics/');
  let html=await fs.readFile(file,'utf8');
  const before=html;

  // Remove visible placeholders that are meant for site operators, not visitors.
  html=html.replace(/<div\b[^>]*class=["'][^"']*\bad-slot\b[^"']*["'][^>]*>\s*広告スペース\s*<\/div>/gi,'');
  html=html.replace(/<p\b[^>]*class=["'][^"']*\bdesc\b[^"']*["'][^>]*>\s*広告スペース\s*<\/p>/gi,'');

  if(html!==before){
    await fs.writeFile(file,html);
    changed++;
  }

  if(!isAdmin){
    for(const phrase of PUBLIC_FORBIDDEN){
      if(html.includes(phrase)) leaks.push({file:rel,kind:'forbidden-copy',value:phrase});
    }
    const adminLinks=[...html.matchAll(/href=["']([^"']*\/admin-(?:seo|analytics)\/[^"']*)["']/gi)].map(m=>m[1]);
    for(const href of adminLinks) leaks.push({file:rel,kind:'public-admin-link',value:href});
  }
}

console.log(JSON.stringify({checked:files.length,changed,forbiddenLeaks:leaks.length,leaks:leaks.slice(0,50)},null,2));
if(leaks.length){
  throw new Error(`Public UI leak guard failed with ${leaks.length} issue(s)`);
}
