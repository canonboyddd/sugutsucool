import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../functions/api/rakuten.js',import.meta.url),'utf8');
const {onRequestGet}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={RAKUTEN_APP_ID:'qa-app',RAKUTEN_ACCESS_KEY:'qa-access',RAKUTEN_AFFILIATE_ID:'qa-affiliate'};
const request=tool=>new Request('https://sugutsucool.pages.dev/api/rakuten?tool='+encodeURIComponent(tool));
const product={itemName:'電力量計',itemPrice:2000,affiliateUrl:'https://hb.afl.rakuten.co.jp/hgc/qa/',mediumImageUrls:[{imageUrl:'https://thumbnail.image.rakuten.co.jp/test.jpg'}]};
test('Unrelated tools never request an advertisement or need credentials',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw new Error('upstream must not be called')};
 try{for(const tool of ['image/compress','text/character-count','developer/json-formatter','calculator/fuel-cost']){const r=await onRequestGet({request:request(tool),env:{}});assert.equal(r.status,200);assert.deepEqual((await r.json()).items,[])}}finally{globalThis.fetch=original}
});
test('Invalid tool and missing configuration have safe explicit responses',async()=>{
 assert.equal((await onRequestGet({request:request('../private'),env})).status,400);
 assert.equal((await onRequestGet({request:request('calculator/electricity-cost'),env:{}})).status,503);
});
test('Relevant search preserves configured IDs and emits only usable affiliate products',async()=>{
 const original=globalThis.fetch;let called;
 globalThis.fetch=async(url,options)=>{called={url:new URL(url),options};return Response.json({Items:[{Item:product},{Item:{...product,affiliateUrl:undefined,itemUrl:'https://item.rakuten.co.jp/store/item/'}},{Item:{...product,affiliateUrl:'https://evil.example/rakuten'}},{Item:{...product,itemPrice:'NaN'}},{Item:{...product,mediumImageUrls:[]}}]})};
 try{const r=await onRequestGet({request:request('calculator/electricity-cost'),env}),d=await r.json();assert.equal(r.status,200);assert.equal(d.items.length,1);assert.equal(called.url.searchParams.get('affiliateId'),env.RAKUTEN_AFFILIATE_ID);assert.equal(called.url.searchParams.get('applicationId'),env.RAKUTEN_APP_ID);assert.equal(called.options.headers.accessKey,env.RAKUTEN_ACCESS_KEY);assert.match(d.purpose,/消費電力/);assert.equal(d.items[0].url,product.affiliateUrl)}finally{globalThis.fetch=original}
});
test('Rate limits, malformed payloads and network failures fail closed without upstream details',async()=>{
 const original=globalThis.fetch;
 try{for(const mock of [()=>Response.json({error:'private-debug-data'},{status:429}),()=>new Response('invalid JSON'),()=>Promise.reject(new Error('private-debug-data'))]){globalThis.fetch=mock;const r=await onRequestGet({request:request('calculator/electricity-cost'),env});assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/private-debug-data/)}}finally{globalThis.fetch=original}
});
