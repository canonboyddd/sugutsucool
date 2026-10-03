(function(){
  const DEFAULT_API='https://sugutsucool-analytics.super-canon-boy.workers.dev';
  const OPT_OUT_KEY='sugutsucool_analytics_optout';
  const API_KEY='sugutsucool_analytics_api';
  if(location.pathname.startsWith('/admin-analytics')||location.pathname.startsWith('/admin-seo')) return;
  if(localStorage.getItem(OPT_OUT_KEY)==='1') return;

  const api=(localStorage.getItem(API_KEY)||DEFAULT_API).replace(/\/$/,'');
  const vidKey='sugutsucool_vid', sidKey='sugutsucool_sid', sidTsKey='sugutsucool_sid_ts';
  const now=Date.now();
  let visitor=localStorage.getItem(vidKey);
  if(!visitor){visitor=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now());localStorage.setItem(vidKey,visitor)}
  let session=sessionStorage.getItem(sidKey);
  const last=Number(sessionStorage.getItem(sidTsKey)||0);
  if(!session || !last || now-last>30*60*1000){session=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now());sessionStorage.setItem(sidKey,session)}
  sessionStorage.setItem(sidTsKey,String(now));

  function device(){const w=screen.width||innerWidth; if(w<768)return 'mobile'; if(w<1100)return 'tablet'; return 'desktop'}
  function toolName(){const h=document.querySelector('h1'); return h?h.textContent.trim():''}
  function toolPath(){const m=location.pathname.match(/^\/(image|pdf|text|web|calculator|developer)\/([^/]+)\/?$/);return m?m[1]+'/'+m[2]:''}
  function guideInfo(){const m=location.pathname.match(/^\/guides\/([^/]+)\/?$/);if(!m)return {slug:'',related:''};let related=document.body?.dataset?.relatedTool||'';if(!related){let s=m[1].replace(/-tips$/,'');const cats=['calculator','developer','image','pdf','text','web'];const c=cats.find(x=>s.startsWith(x+'-'));if(c)related=c+'/'+s.slice(c.length+1)}return {slug:m[1],related}}
  function pageKind(){if(location.pathname==='/')return 'home';if(/^\/guides\/?$/.test(location.pathname))return 'guide_index';if(/^\/guides\//.test(location.pathname))return 'guide';if(toolPath())return 'tool';if(/^\/(image|pdf|text|web|calculator|developer)\/?$/.test(location.pathname))return 'category';return 'content'}
  function source(){try{if(!document.referrer)return 'direct';const u=new URL(document.referrer);if(u.hostname===location.hostname)return 'internal';if(/google\./i.test(u.hostname))return 'google';if(/bing\.com/i.test(u.hostname))return 'bing';if(/yahoo\./i.test(u.hostname))return 'yahoo';if(/x\.com|twitter\.com/i.test(u.hostname))return 'x';if(/instagram\.com/i.test(u.hostname))return 'instagram';if(/facebook\.com/i.test(u.hostname))return 'facebook';return u.hostname.replace(/^www\./,'')}catch(e){return 'other'}}
  const g=()=>guideInfo();
  function baseExtra(){const gi=g();return {tool_path:toolPath(),page_kind:pageKind(),guide_slug:gi.slug,related_tool:gi.related}}
  function payload(eventType,extra){return {event_type:eventType,path:location.pathname,tool:toolName(),visitor_id:visitor,session_id:session,referrer:document.referrer||'',source:source(),device:device(),title:document.title,extra:{...baseExtra(),...(extra||{})}}}
  function post(body,useBeacon){const url=api+'/collect',json=JSON.stringify(body);if(useBeacon&&navigator.sendBeacon){try{const ok=navigator.sendBeacon(url,new Blob([json],{type:'text/plain;charset=UTF-8'}));if(ok)return Promise.resolve(true)}catch(e){}}return fetch(url,{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body:json,keepalive:true,mode:'cors',credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('analytics HTTP '+r.status);return true}).catch(err=>{try{console.warn('[SuguTsucool Analytics]',err.message||err)}catch(e){}return false})}
  function central(eventType,extra){
    if(eventType!=='page_view'&&eventType!=='affiliate_click')return;
    try{
      const q=new URLSearchParams({site_key:'sugutsucool',event_name:eventType,browser_id:visitor,session_id:session,page_path:location.pathname,page_title:document.title,referrer:document.referrer||'',device_type:device(),program:eventType==='affiliate_click'?String(extra?.network||''):'',placement:eventType==='affiliate_click'?String(extra?.label||'').slice(0,160):''});
      const img=new Image(1,1);(window.__suguCentralPixels||(window.__suguCentralPixels=[])).push(img);img.onload=img.onerror=()=>{const a=window.__suguCentralPixels||[];const i=a.indexOf(img);if(i>=0)a.splice(i,1)};img.src='https://factory-career-site.pages.dev/api/central/collect?'+q.toString();
    }catch(e){}
  }
  function send(eventType,extra,opts){return post(payload(eventType,extra),!!(opts&&opts.beacon))}
  window.SuguTsucoolAnalytics={track:send,test(){return send('page_view',{test:true})},optOut(){localStorage.setItem(OPT_OUT_KEY,'1')},optIn(){localStorage.removeItem(OPT_OUT_KEY)}};

  const pageView=()=>send('page_view');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pageView);else pageView();

  document.addEventListener('click',function(e){
    const a=e.target.closest('a'),b=e.target.closest('button');
    if(a){
      const href=a.getAttribute('href')||'';
      const label=(a.querySelector('h3')?.textContent||a.querySelector('strong')?.textContent||a.textContent||'').trim().replace(/\s+/g,' ').slice(0,100);
      const affiliate=a.dataset.affiliate||'';
      if(affiliate) send('affiliate_click',{network:affiliate,label:a.dataset.affiliateLabel||label,target:href},{beacon:true});
      else{
        try{
          const u=new URL(a.href,location.href),internal=u.hostname===location.hostname;
          if(internal){
            const from=pageKind(),to=/^\/guides\//.test(u.pathname)?'guide':/^\/(image|pdf|text|web|calculator|developer)\/[^/]+\/?$/.test(u.pathname)?'tool':'internal';
            if(from==='guide'&&to==='tool')send('guide_to_tool',{target:u.pathname,label,related_tool:g().related},{beacon:true});
            else if(from==='tool'&&to==='guide')send('tool_to_guide',{target:u.pathname,label},{beacon:true});
            else if(a.matches('[data-tool], .tool-card'))send('tool_open',{target:href,label},{beacon:true});
            else if(to!=='internal')send('internal_click',{from_kind:from,to_kind:to,target:u.pathname,label},{beacon:true});
          }else if(/^https?:$/.test(u.protocol))send('external_click',{host:u.hostname.replace(/^www\./,''),label,target:u.pathname.slice(0,120)},{beacon:true});
        }catch(_){ }
      }
      if(a.hasAttribute('download'))send('download',{label:label||'download'},{beacon:true});
    }
    if(b){const label=(b.textContent||b.id||'button').trim().replace(/\s+/g,' ').slice(0,80),id=b.id||'';if(/download|save|保存|ダウンロード/i.test(label+' '+id))send('download',{label,id});else if(!/clear|クリア|reset|リセット/i.test(label+' '+id))send('tool_action',{label,id})}
  },{passive:true});

  document.addEventListener('toggle',e=>{const d=e.target;if(d?.tagName==='DETAILS'&&d.open){const q=d.querySelector('summary')?.textContent?.trim().slice(0,140)||'';send('faq_open',{question:q})}},true);
  let searchTimer=null;const search=document.getElementById('toolSearch');if(search)search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{const visible=[...document.querySelectorAll('[data-tool]')].filter(x=>getComputedStyle(x).display!=='none').length;send('search',{query_length:search.value.trim().length,results:visible})},800)});
  const originalDownload=window.downloadBlob;if(typeof originalDownload==='function')window.downloadBlob=function(blob,name){send('tool_complete',{filename_ext:(name&&name.includes('.'))?name.split('.').pop().slice(0,10):'',bytes:blob&&blob.size||0});return originalDownload.apply(this,arguments)};
  window.addEventListener('error',e=>send('client_error',{kind:'error',message:String(e.message||'error').slice(0,180)}));
  window.addEventListener('unhandledrejection',e=>send('client_error',{kind:'promise',message:String(e.reason?.message||e.reason||'unhandled rejection').slice(0,180)}));

  const depths=new Set();let scrollTimer=0;window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight),pct=Math.round(scrollY/max*100);[50,90].forEach(n=>{if(pct>=n&&!depths.has(n)){depths.add(n);send('scroll_depth',{percent:n})}})},250)},{passive:true});
  setTimeout(()=>{if(document.visibilityState==='visible')send('engaged_30s')},30000);

  const related=toolPath()||g().related;
  if(related&&!document.querySelector('script[data-sugu-affiliate]')&&!document.querySelector('script[src="/assets/affiliate-tools.js"]')){const s=document.createElement('script');s.src='/assets/affiliate-tools.js';s.defer=true;s.dataset.suguAffiliate='1';document.body.appendChild(s)}
})();