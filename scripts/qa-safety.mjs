// Call before navigation: no QA visits or ad clicks may reach live collectors.
export async function protectQaPage(page){
 await page.addInitScript(()=>{try{localStorage.setItem('sugutsucool_analytics_optout','1');localStorage.setItem('ops_owner_excluded','1')}catch{}});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(/(?:^|\.)a8\.net$|(?:^|\.)afl\.rakuten\.co\.jp$|^r10\.to$/.test(u.hostname)||/analytics|\/api\/(central|ops-collect)|\/collect(?:$|\?)/.test(u.href))return route.fulfill({status:204,body:''});
  if(u.hostname==='factory-career-site.pages.dev')return route.fulfill({status:200,contentType:'application/javascript',body:''});
  if(u.pathname==='/api/rakuten')return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"disabled":true,"items":[]}'});
  if(process.env.QA_LOCAL_ORIGIN&&u.hostname==='sugutsucool.pages.dev'){
   const response=await route.fetch({url:new URL(u.pathname+u.search,process.env.QA_LOCAL_ORIGIN).href});return route.fulfill({response});
  }
  return route.continue();
 });
}
