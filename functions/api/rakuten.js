const PRODUCT_API='https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';

const TOOL_KEYWORDS={
  'image/compress':'外付けSSD',
  'image/resize':'SDカード',
  'image/convert':'カードリーダー',
  'image/rotate-flip':'外付けSSD',
  'image/exif-remove':'SDカード',
  'image/to-pdf':'スキャナー',
  'pdf/merge':'スキャナー',
  'pdf/split':'プリンター',
  'pdf/delete-pages':'外付けSSD',
  'pdf/reorder':'スキャナー',
  'text/character-count':'キーボード',
  'text/dedupe-lines':'キーボード',
  'text/remove-linebreaks':'キーボード',
  'text/zenkaku-hankaku':'キーボード',
  'text/sort-lines':'キーボード',
  'text/word-count':'キーボード',
  'text/case-convert':'キーボード',
  'text/trim-whitespace':'キーボード',
  'text/find-replace':'キーボード',
  'text/add-line-numbers':'キーボード',
  'text/reverse-lines':'キーボード',
  'text/random-picker':'マウス',
  'web/qr-code':'スマホスタンド',
  'web/url-encode':'USBハブ',
  'web/base64':'USBハブ',
  'web/url-parser':'USBハブ',
  'web/html-escape':'キーボード',
  'web/query-string':'キーボード',
  'web/color-converter':'モニター',
  'web/unix-timestamp':'キーボード',
  'web/password-generator':'セキュリティキー',
  'web/utm-builder':'キーボード',
  'calculator/work-hours':'ワイヤレスマウス',
  'calculator/discount':'電卓',
  'calculator/profit-margin':'電卓',
  'calculator/percentage':'電卓',
  'calculator/consumption-tax':'電卓',
  'calculator/percentage-change':'電卓',
  'calculator/average':'電卓',
  'calculator/date-difference':'デスクカレンダー',
  'calculator/age':'電卓',
  'calculator/time-add':'デジタル時計',
  'calculator/unit-length':'メジャー',
  'calculator/unit-weight':'デジタルスケール',
  'calculator/temperature':'温度計',
  'developer/json-formatter':'キーボード',
  'developer/uuid-generator':'キーボード',
  'developer/hash-generator':'セキュリティキー',
  'developer/regex-tester':'キーボード',
  'developer/csv-json':'キーボード'
};

const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=900',...headers}});
const firstImage=item=>{
  const a=item.mediumImageUrls||item.smallImageUrls||[];
  const x=Array.isArray(a)?a[0]:null;
  return typeof x==='string'?x:(x?.imageUrl||'');
};
const normalize=item=>({
  name:item.itemName||'',
  price:Number(item.itemPrice||0),
  image:firstImage(item),
  url:item.affiliateUrl||item.itemUrl||'',
  shop:item.shopName||'',
  reviewAverage:Number(item.reviewAverage||0),
  reviewCount:Number(item.reviewCount||0)
});

export async function onRequestGet({request,env}){
  if(!env.RAKUTEN_APP_ID||!env.RAKUTEN_ACCESS_KEY||!env.RAKUTEN_AFFILIATE_ID){
    return json({ok:false,error:'rakuten_not_configured'},503,{'cache-control':'no-store'});
  }
  const u=new URL(request.url);
  const tool=(u.searchParams.get('tool')||'').replace(/^\/+|\/+$/g,'');
  const keyword=TOOL_KEYWORDS[tool];
  if(!keyword)return json({ok:false,error:'unknown_tool'},400,{'cache-control':'no-store'});
  const q=new URL(PRODUCT_API);
  q.searchParams.set('applicationId',env.RAKUTEN_APP_ID);
  q.searchParams.set('affiliateId',env.RAKUTEN_AFFILIATE_ID);
  q.searchParams.set('keyword',keyword);
  q.searchParams.set('format','json');
  q.searchParams.set('formatVersion','2');
  q.searchParams.set('hits','4');
  q.searchParams.set('imageFlag','1');
  q.searchParams.set('availability','1');
  q.searchParams.set('sort','-reviewCount');
  try{
    const r=await fetch(q,{headers:{accessKey:env.RAKUTEN_ACCESS_KEY,'user-agent':'SuguTsucool/1.0'}});
    if(!r.ok)return json({ok:false,error:'rakuten_upstream',status:r.status},502,{'cache-control':'no-store'});
    const data=await r.json();
    const raw=Array.isArray(data.items)?data.items:[];
    const items=raw.map(x=>x?.Item||x).map(normalize).filter(x=>x.name&&x.url).slice(0,4);
    return json({ok:true,tool,keyword,items});
  }catch(e){
    return json({ok:false,error:'rakuten_fetch_failed'},502,{'cache-control':'no-store'});
  }
}
