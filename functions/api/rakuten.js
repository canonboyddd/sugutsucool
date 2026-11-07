const PRODUCT_API='https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
const SITE_ORIGIN='https://sugutsucool.pages.dev';

// A tool category alone does not imply an intent to buy hardware. Only these
// explicit workflows have a useful next step involving a physical product.
const TOOL_PRODUCTS={
  'image/to-pdf':['ドキュメントスキャナー','紙の写真や書類を読み込んでからPDFにまとめる場合'],
  'pdf/merge':['ドキュメントスキャナー','紙の書類を読み込んでからPDFを結合する場合'],
  'pdf/reorder':['ドキュメントスキャナー','紙の書類を読み込んでからページを整理する場合'],
  'calculator/unit-length':['メジャー','実物の長さを測り、換算する入力値を確かめる場合'],
  'calculator/unit-weight':['デジタルスケール','実物の重さを測り、換算する入力値を確かめる場合'],
  'calculator/temperature':['温度計','実際の温度を測り、換算する入力値を確かめる場合'],
  'calculator/bmi':['体重計','体重を測り、計算の入力値を確かめる場合'],
  'calculator/ideal-weight':['体重計','体重の変化を記録する場合'],
  'calculator/pace':['ランニングウォッチ','走った距離と時間を記録してペースを確かめる場合'],
  'calculator/electricity-cost':['ワットチェッカー','実際の消費電力を測り、計算の入力値を確かめる場合']
};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900, stale-while-revalidate=3600',...headers}});
function safeUrl(value,affiliate=false){
  try{const u=new URL(value);if(u.protocol!=='https:')return '';if(affiliate)return u.hostname==='hb.afl.rakuten.co.jp'?u.href:'';return /(?:^|\.)rakuten\.(?:co\.jp|ne\.jp)$/.test(u.hostname)?u.href:''}catch{return ''}
}
function normalize(item){
  const images=item.mediumImageUrls||item.smallImageUrls||item.MediumImageUrls||item.SmallImageUrls||[];
  const first=Array.isArray(images)?images[0]:null;
  return {name:String(item.itemName||item.ItemName||'').slice(0,500),price:Number(item.itemPrice??item.ItemPrice??0),image:safeUrl(typeof first==='string'?first:first?.imageUrl||first?.ImageUrl||''),url:safeUrl(item.affiliateUrl||item.AffiliateUrl||'',true),shop:String(item.shopName||item.ShopName||'').slice(0,150)};
}
export async function onRequestGet({request,env}){
  const tool=(new URL(request.url).searchParams.get('tool')||'').replace(/^\/+|\/+$/g,'');
  if(!/^(image|pdf|text|web|calculator|developer)\/[a-z0-9-]+$/.test(tool))return json({ok:false,error:'invalid_tool'},400,{'cache-control':'no-store'});
  const product=TOOL_PRODUCTS[tool];
  if(!product)return json({ok:true,tool,disabled:true,items:[]});
  if(!env.RAKUTEN_APP_ID||!env.RAKUTEN_ACCESS_KEY||!env.RAKUTEN_AFFILIATE_ID)return json({ok:false,error:'rakuten_not_configured'},503,{'cache-control':'no-store'});
  const [keyword,purpose]=product,q=new URL(PRODUCT_API);
  for(const [key,value] of Object.entries({applicationId:env.RAKUTEN_APP_ID,affiliateId:env.RAKUTEN_AFFILIATE_ID,keyword,format:'json',formatVersion:'2',hits:'4',imageFlag:'1',sort:'-reviewCount'}))q.searchParams.set(key,value);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
    const r=await fetch(q,{signal:controller.signal,headers:{accessKey:env.RAKUTEN_ACCESS_KEY,origin:SITE_ORIGIN,referer:`${SITE_ORIGIN}/`,'user-agent':'SuguTsucool/1.1'}});
    if(!r.ok)return json({ok:false,error:r.status===429?'rakuten_rate_limited':'rakuten_upstream',status:r.status},502,{'cache-control':'no-store'});
    const data=await r.json(),raw=Array.isArray(data.items)?data.items:Array.isArray(data.Items)?data.Items:[];
    const items=raw.map(x=>x?.Item||x?.item||x).filter(x=>x&&typeof x==='object').map(normalize).filter(x=>x.name&&x.url&&x.image&&Number.isFinite(x.price)&&x.price>0).slice(0,4);
    return json({ok:true,tool,keyword,purpose,items});
  }catch{return json({ok:false,error:'rakuten_fetch_failed'},502,{'cache-control':'no-store'})}
  finally{clearTimeout(timer)}
}
