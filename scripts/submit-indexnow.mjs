const BASE=(process.env.INDEXNOW_BASE_URL||'https://sugutsucool.pages.dev').replace(/\/$/,'');
const KEY=process.env.INDEXNOW_KEY||'0dadd301dab16f2cf1e3293f3f30a161';
const KEY_LOCATION=`${BASE}/${KEY}.txt`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url,label){
  let last='';
  for(let i=0;i<6;i++){
    try{const r=await fetch(url,{cache:'no-store'});if(r.ok)return r;last=`HTTP ${r.status}`}catch(e){last=String(e.message||e)}
    await sleep(5000);
  }
  throw new Error(`${label} unavailable: ${last}`);
}
const sitemap=await get(`${BASE}/sitemap.xml`,'sitemap');
const xml=await sitemap.text();
const urls=[...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m=>m[1]);
if(!urls.length)throw new Error('no URLs found in sitemap');
const keyCheck=await get(KEY_LOCATION,'IndexNow key file');
const keyText=(await keyCheck.text()).trim();
if(keyText!==KEY)throw new Error('IndexNow key file content mismatch');
const body={host:new URL(BASE).host,key:KEY,keyLocation:KEY_LOCATION,urlList:urls.slice(0,10000)};
let lastStatus=0,lastText='';
for(let i=0;i<6;i++){
  const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify(body)});
  lastStatus=r.status;lastText=await r.text();
  console.log(`IndexNow attempt ${i+1}: ${r.status} ${r.statusText}; submitted ${body.urlList.length} URLs`);
  if(lastText)console.log(lastText.slice(0,1000));
  if([200,202].includes(r.status))process.exit(0);
  if(r.status===403&&/SiteVerificationNotCompleted/i.test(lastText)){await sleep(10000);continue}
  throw new Error(`IndexNow submission failed: HTTP ${r.status}`);
}
throw new Error(`IndexNow verification did not complete after retries: HTTP ${lastStatus} ${lastText.slice(0,300)}`);
