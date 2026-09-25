(function(){
  const DEFAULT_API='https://sugutsucool-analytics.super-canon-boy.workers.dev';
  const OPT_OUT_KEY='sugutsucool_analytics_optout';
  const API_KEY='sugutsucool_analytics_api';
  if(location.pathname.startsWith('/admin-analytics')) return;
  if(localStorage.getItem(OPT_OUT_KEY)==='1') return;

  const api=(localStorage.getItem(API_KEY)||DEFAULT_API).replace(/\/$/,'');
  const vidKey='sugutsucool_vid', sidKey='sugutsucool_sid', sidTsKey='sugutsucool_sid_ts';
  const now=Date.now();
  let visitor=localStorage.getItem(vidKey);
  if(!visitor){
    visitor=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now());
    localStorage.setItem(vidKey,visitor);
  }
  let session=sessionStorage.getItem(sidKey);
  const last=Number(sessionStorage.getItem(sidTsKey)||0);
  if(!session || !last || now-last>30*60*1000){
    session=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now());
    sessionStorage.setItem(sidKey,session);
  }
  sessionStorage.setItem(sidTsKey,String(now));

  function device(){const w=screen.width||innerWidth; if(w<768)return 'mobile'; if(w<1100)return 'tablet'; return 'desktop';}
  function toolName(){const h=document.querySelector('h1'); return h?h.textContent.trim():'';}
  function source(){
    try{
      if(!document.referrer)return 'direct';
      const u=new URL(document.referrer);
      if(u.hostname===location.hostname)return 'internal';
      if(/google\./i.test(u.hostname))return 'google';
      if(/bing\.com/i.test(u.hostname))return 'bing';
      if(/yahoo\./i.test(u.hostname))return 'yahoo';
      if(/x\.com|twitter\.com/i.test(u.hostname))return 'x';
      if(/instagram\.com/i.test(u.hostname))return 'instagram';
      if(/facebook\.com/i.test(u.hostname))return 'facebook';
      return u.hostname.replace(/^www\./,'');
    }catch(e){return 'other';}
  }

  function payload(eventType,extra){
    return {
      event_type:eventType,
      path:location.pathname,
      tool:toolName(),
      visitor_id:visitor,
      session_id:session,
      referrer:document.referrer||'',
      source:source(),
      device:device(),
      title:document.title,
      extra:extra||{}
    };
  }

  function post(body, useBeacon){
    const url=api+'/collect';
    const json=JSON.stringify(body);
    // Use text/plain so the cross-origin request remains a CORS "simple request".
    // This avoids the previous application/json beacon/preflight failure mode.
    if(useBeacon && navigator.sendBeacon){
      try{
        const ok=navigator.sendBeacon(url,new Blob([json],{type:'text/plain;charset=UTF-8'}));
        if(ok) return Promise.resolve(true);
      }catch(e){}
    }
    return fetch(url,{
      method:'POST',
      headers:{'content-type':'text/plain;charset=UTF-8'},
      body:json,
      keepalive:true,
      mode:'cors',
      credentials:'omit'
    }).then(r=>{
      if(!r.ok) throw new Error('analytics HTTP '+r.status);
      return true;
    }).catch(err=>{
      try{console.warn('[SuguTsucool Analytics]',err.message||err);}catch(e){}
      return false;
    });
  }

  function send(eventType,extra,opts){
    return post(payload(eventType,extra), !!(opts&&opts.beacon));
  }

  window.SuguTsucoolAnalytics={
    track:send,
    test(){return send('page_view',{test:true});},
    optOut(){localStorage.setItem(OPT_OUT_KEY,'1')},
    optIn(){localStorage.removeItem(OPT_OUT_KEY)}
  };

  // Page views are sent with fetch so delivery errors do not get silently swallowed by sendBeacon.
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>send('page_view'));
  }else{
    send('page_view');
  }

  document.addEventListener('click',function(e){
    const a=e.target.closest('a');
    const b=e.target.closest('button');
    if(a&&a.matches('[data-tool], .tool-card')) send('tool_open',{target:a.getAttribute('href')||'',label:(a.querySelector('h3')?.textContent||a.textContent||'').trim().slice(0,80)},{beacon:true});
    if(a&&a.hasAttribute('download')) send('download',{label:(a.textContent||'download').trim().slice(0,80)},{beacon:true});
    if(b){
      const label=(b.textContent||b.id||'button').trim().replace(/\s+/g,' ').slice(0,80);
      const id=b.id||'';
      if(/download|save|保存|ダウンロード/i.test(label+' '+id)) send('download',{label,id});
      else if(!/clear|クリア|reset|リセット/i.test(label+' '+id)) send('tool_action',{label,id});
    }
  },{passive:true});

  let searchTimer=null;
  const search=document.getElementById('toolSearch');
  if(search){
    search.addEventListener('input',()=>{
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>{
        const visible=[...document.querySelectorAll('[data-tool]')].filter(x=>getComputedStyle(x).display!=='none').length;
        send('search',{query_length:search.value.trim().length,results:visible});
      },800);
    });
  }

  const originalDownload=window.downloadBlob;
  if(typeof originalDownload==='function'){
    window.downloadBlob=function(blob,name){
      send('tool_complete',{filename_ext:(name&&name.includes('.'))?name.split('.').pop().slice(0,10):'',bytes:blob&&blob.size||0});
      return originalDownload.apply(this,arguments);
    };
  }

  window.addEventListener('error',e=>send('client_error',{message:String(e.message||'error').slice(0,160)}));
})();
