import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),dist=path.join(root,'dist');
// Match the existing deploy workflow without deleting an existing build.
try{await fs.access(dist);throw new Error('dist already exists; choose a fresh checkout or archive the build first')}catch(e){if(e.code!=='ENOENT')throw e}
await fs.mkdir(dist);
const excluded=new Set(['.git','.github','README.md','functions','scripts','qa-results','dist','node_modules','reports']);
for(const entry of await fs.readdir(root))if(!excluded.has(entry))await fs.cp(path.join(root,entry),path.join(dist,entry),{recursive:true});
for(const script of ['generate-plus-tools','apply-priority-seo','apply-longtail-seo','apply-seo-depth','generate-seo-guides','generate-seo-guides-plus','generate-question-guides','sanitize-public-ui','verify-indexability']){
 const r=spawnSync(process.execPath,[`scripts/${script}.mjs`,...(script==='sanitize-public-ui'?['--root=dist']:[])],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
