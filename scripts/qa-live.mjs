import { chromium, devices } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const BASE = process.env.QA_BASE_URL || 'https://sugutsucool.pages.dev';
const paths = [
'/image/compress/','/image/resize/','/image/convert/','/image/rotate-flip/','/image/exif-remove/','/image/to-pdf/',
'/pdf/merge/','/pdf/split/','/pdf/delete-pages/','/pdf/reorder/',
'/text/character-count/','/text/dedupe-lines/','/text/remove-linebreaks/','/text/zenkaku-hankaku/','/text/sort-lines/','/text/word-count/','/text/case-convert/','/text/trim-whitespace/','/text/find-replace/','/text/add-line-numbers/','/text/reverse-lines/','/text/random-picker/',
'/web/qr-code/','/web/url-encode/','/web/base64/','/web/url-parser/','/web/html-escape/','/web/query-string/','/web/color-converter/','/web/unix-timestamp/','/web/password-generator/','/web/utm-builder/',
'/calculator/work-hours/','/calculator/discount/','/calculator/profit-margin/','/calculator/percentage/','/calculator/consumption-tax/','/calculator/percentage-change/','/calculator/average/','/calculator/date-difference/','/calculator/age/','/calculator/time-add/','/calculator/unit-length/','/calculator/unit-weight/','/calculator/temperature/',
'/developer/json-formatter/','/developer/uuid-generator/','/developer/hash-generator/','/developer/regex-tester/','/developer/csv-json/'
];

const failures = [];
const notes = [];
const fail = (name, msg) => { failures.push(`${name}: ${msg}`); console.error(`FAIL ${name}: ${msg}`); };
const pass = (name) => console.log(`PASS ${name}`);
const waitForUI = async page => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('h1').first().waitFor({state:'visible', timeout:15000});
  await page.waitForTimeout(700);
};

const browser = await chromium.launch({headless:true});
const desktop = await browser.newContext({viewport:{width:1440,height:1000}, acceptDownloads:true, permissions:['clipboard-read','clipboard-write']});

for (const p of paths) {
  const name = `smoke ${p}`;
  const page = await desktop.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  try {
    const res = await page.goto(BASE + p, {waitUntil:'domcontentloaded', timeout:30000});
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status()}`);
    await waitForUI(page);
    if ((await page.locator('h1').count()) < 1) throw new Error('h1 missing');
    if ((await page.locator('.workbench').count()) < 1) throw new Error('workbench missing');
    if ((await page.locator('input,textarea,select,button').count()) < 1) throw new Error('interactive control missing');
    if (pageErrors.length) throw new Error(`pageerror: ${pageErrors.join(' | ')}`);
    pass(name);
  } catch (e) { fail(name, e.message); }
  await page.close();
}

// Temporary files for file-processing tools.
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sugutsucool-qa-'));
const png = new PNG({width:80,height:80});
for (let y=0;y<80;y++) for (let x=0;x<80;x++) {
  const i=(y*80+x)*4; png.data[i]=x*3; png.data[i+1]=y*3; png.data[i+2]=160; png.data[i+3]=255;
}
const pngPath = path.join(tmp,'sample.png');
await fs.writeFile(pngPath, PNG.sync.write(png));
const makePdf = async (file, text) => {
  const d=await PDFDocument.create(); const pg=d.addPage([320,240]); pg.drawText(text,{x:40,y:120,size:20});
  await fs.writeFile(file, await d.save());
};
const pdf1=path.join(tmp,'one.pdf'), pdf2=path.join(tmp,'two.pdf');
await makePdf(pdf1,'PDF ONE'); await makePdf(pdf2,'PDF TWO');

async function keyTest(name, route, fn) {
  const page = await desktop.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  try {
    const res=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:30000});
    if(!res||res.status()>=400) throw new Error(`HTTP ${res?.status()}`);
    await waitForUI(page); await fn(page);
    if(errs.length) throw new Error(`pageerror: ${errs.join(' | ')}`);
    pass(name);
  } catch(e){ fail(name,e.message); }
  await page.close();
}

await keyTest('image compression real run','/image/compress/',async page=>{
  await page.locator('#file').setInputFiles(pngPath);
  await page.locator('#targetKb').fill('20');
  await page.locator('#run').click();
  await page.locator('#result.show').waitFor({timeout:15000});
  const after=await page.locator('#after').textContent();
  if(!after || after.trim()==='-') throw new Error('compressed size not produced');
  const dl=page.waitForEvent('download',{timeout:10000}); await page.locator('#download').click(); await dl;
});

await keyTest('PDF merge real run','/pdf/merge/',async page=>{
  await page.locator('#file').setInputFiles([pdf1,pdf2]);
  const dl=page.waitForEvent('download',{timeout:15000}); await page.locator('#run').click(); const d=await dl;
  if(!/\.pdf$/i.test(d.suggestedFilename())) throw new Error('PDF download missing');
  const status=(await page.locator('#status').textContent())||''; if(!/結合|完了/.test(status)) throw new Error(`unexpected status: ${status}`);
});

await keyTest('QR generation real run','/web/qr-code/',async page=>{
  await page.locator('#text').fill('https://sugutsucool.pages.dev/');
  await page.locator('#run').click();
  await page.locator('#result.show').waitFor({timeout:10000});
  const w=await page.locator('#canvas').evaluate(c=>c.width); if(w<100) throw new Error('QR canvas not rendered');
  const dl=page.waitForEvent('download',{timeout:10000}); await page.locator('#download').click(); await dl;
});

await keyTest('work-hours calculation','/calculator/work-hours/',async page=>{
  await page.locator('#start').fill('09:00'); await page.locator('#end').fill('18:00'); await page.locator('#break').fill('60'); await page.locator('#run').click();
  const net=(await page.locator('#net').textContent())||''; if(!/8時間0分/.test(net)) throw new Error(`wrong net: ${net}`);
});

await keyTest('JSON format + copy + save','/developer/json-formatter/',async page=>{
  await page.locator('#s').fill('{"a":1,"b":{"c":2}}'); await page.locator('#p').click();
  const out=(await page.locator('#out').textContent())||''; if(!out.includes('"c": 2')) throw new Error('formatted JSON missing');
  await page.locator('[data-boost="copy"]').click();
  const clip=await page.evaluate(()=>navigator.clipboard.readText()); if(!clip.includes('"a": 1')) throw new Error('copy failed');
  const dl=page.waitForEvent('download',{timeout:10000}); await page.locator('[data-boost="save"]').click(); await dl;
});

await keyTest('CSV to JSON quoted cell','/developer/csv-json/',async page=>{
  await page.locator('#s').fill('name,note\nAlice,"hello,world"\nBob,test');
  await page.locator('#go').click();
  const out=(await page.locator('#out').textContent())||'';
  if(!out.includes('hello,world')) throw new Error(`quoted comma parsing failed: ${out.slice(0,120)}`);
});

// Mobile QA for all 50 pages: visible workbench and no meaningful horizontal overflow.
const mobile = await browser.newContext({...devices['iPhone 13'], acceptDownloads:true});
for (const p of paths) {
  const name=`mobile ${p}`; const page=await mobile.newPage();
  try {
    const res=await page.goto(BASE+p,{waitUntil:'domcontentloaded',timeout:30000}); if(!res||res.status()>=400) throw new Error(`HTTP ${res?.status()}`);
    await waitForUI(page);
    const dims=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    if(dims.sw-dims.cw>6) throw new Error(`horizontal overflow ${dims.sw-dims.cw}px`);
    if(!(await page.locator('.workbench').isVisible())) throw new Error('workbench hidden');
    pass(name);
  } catch(e){ fail(name,e.message); }
  await page.close();
}
await mobile.close(); await desktop.close(); await browser.close();

const summary={base:BASE,totalTools:paths.length,failures,notes,checkedAt:new Date().toISOString()};
await fs.mkdir('qa-results',{recursive:true}); await fs.writeFile('qa-results/summary.json',JSON.stringify(summary,null,2));
console.log(`\nQA COMPLETE: ${paths.length} tools, failures=${failures.length}`);
if(failures.length){ console.error(failures.join('\n')); process.exit(1); }
