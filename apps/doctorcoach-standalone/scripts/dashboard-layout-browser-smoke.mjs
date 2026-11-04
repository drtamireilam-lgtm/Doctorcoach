// Real team/trainee/program components and app styles; synthetic local data only.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,rm,realpath} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
import {defaultAppearance} from '../lib/appearance.ts';
import {appearanceWithMode} from '../lib/advanced-theme.ts';
const record=process.env.DC_DASHBOARD_RECORD==='1';
const runtime=resolve('.sites-runtime'),evidence=resolve(process.env.DC_DASHBOARD_EVIDENCE??join(runtime,'dashboard-layout'));
await mkdir(evidence,{recursive:true});
const fixture=await mkdtemp(join(runtime,'dashboard-fixture-'));
const imports=[...(await readFile('app/layout.tsx','utf8')).matchAll(/import '\.\/(.+\.css)';/g)].map(m=>`import '../../app/${m[1]}';`).join('\n');
await writeFile(join(fixture,'index.html'),'<html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {TeamWorkspace,CareWorkspace} from '../../components/care-workspace';import {ThemeProvider} from '../../components/theme-provider';import {LanguageProvider,Localize} from '../../components/language-provider';${imports}
const trainee=new URLSearchParams(location.search).get('surface')==='trainee';
createRoot(document.getElementById('root')).render(<ThemeProvider><LanguageProvider><Localize><div className="app-shell dc-ui3" dir="rtl"><aside className="sidebar" aria-hidden="true">DoctorCoach</aside><div className="main-area"><main className="content">{trainee?<CareWorkspace onPlanChanged={()=>{}}/>:<TeamWorkspace/>}</main></div></div></Localize></LanguageProvider></ThemeProvider>);`);
const now='2026-11-04T08:00:00Z',clientId='synthetic-layout-client';
const item={exerciseId:'bench',occurrenceId:'synthetic-occurrence',dayId:'1',sets:3,reps:10,unit:'reps',weight:62.5,targetRpe:8,effortScale:'rir',notes:'הנחיית מאמן ארוכה לבדיקת קריאות ושמירת מילים שלמות במסכי תוכניות האימון'};
const program={id:'synthetic-program',clientId,title:'תוכנית אימונים אישית לשיפור כוח ותנועה לאורך השבוע',authorName:'מאמן בדיקה סינתטי',authorEmail:'synthetic@example.invalid',items:[item],createdAt:now,appliedAt:now};
const training={active:null,history:[],stats:{total:0,week:0,sets:0}};
const bundle={profile:{userId:clientId,name:'מתאמן בדיקה עם שם ארוך',goal:'תוכנית כוח והתקדמות הדרגתית',experience:'מתחיל',equipment:'חדר כושר',days:3,version:1,updatedAt:now},connections:[],notes:[],programs:[program],activeProgramId:program.id,checkins:[],training,canViewMedical:false,canViewNutrition:false,canManagePrograms:true,viewerRole:'coach',week:'2026-W45'};
const draft={draft:null,version:0,updatedAt:null};
let theme='dark';const errors=[],checks=[],unexpected=[];
const server=await createServer({configFile:false,cacheDir:join(runtime,'dashboard-vite-cache'),root:fixture,publicDir:resolve('public'),plugins:[react()],resolve:{alias:{'@':resolve('.')}},server:{host:'127.0.0.1',port:37868,strictPort:true,fs:{allow:[resolve('.'),await realpath('node_modules')]}}});
let browser;
try{
 await server.listen();browser=await chromium.launch({executablePath:process.env.DC_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname!=='127.0.0.1')return route.abort();
  if(!url.pathname.startsWith('/api/'))return route.continue();
  let body;
  if(url.pathname==='/api/preferences/appearance')body={ownerId:'synthetic-layout',version:1,appearance:appearanceWithMode(defaultAppearance,theme)};
  else if(url.pathname==='/api/care/team')body=url.searchParams.has('client')?bundle:{me:{email:'synthetic@example.invalid',name:'מאמן בדיקה',role:'coach'},canManage:false,staff:[],clients:[{userId:clientId,name:bundle.profile.name,goal:bundle.profile.goal,pendingCheckins:2,pendingVideos:1}]};
  else if(url.pathname==='/api/care')body=bundle;
  else if(url.pathname==='/api/care/draft'){
   if(request.method()!=='GET'){const p=request.postDataJSON();assert.equal(p.action,'save');draft.draft={requestId:p.requestId,title:p.title,items:p.items,revisionOf:p.revisionOf};draft.version++;draft.updatedAt=now;}
   body=draft;
  }
  else if(url.pathname==='/api/exercises')body={items:[],assigned:[],canCreate:false};
  else if(url.pathname==='/api/import-mappings')body={items:[]};
  else if(url.pathname.includes('template'))body={templates:[]};
  else{unexpected.push(url.pathname);body={};}
  return route.fulfill({json:body});
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
 const widths=process.env.DC_DASHBOARD_QUICK?[320,390]:[320,375,390,430,768,1024,1440];
 const languages=process.env.DC_DASHBOARD_LANGUAGE?[process.env.DC_DASHBOARD_LANGUAGE]:process.env.DC_DASHBOARD_QUICK?['he']:['he','en'];
 assert.ok(languages.every(lang=>['he','en'].includes(lang)));
 for(theme of (process.env.DC_DASHBOARD_QUICK?['dark']:['dark','light']))for(const lang of languages)for(const width of widths){
  await page.setViewportSize({width,height:1000});
  for(const surface of ['team','editor','trainee']){
   Object.assign(draft,{draft:null,version:0,updatedAt:null});
   const hash=surface==='editor'?`#team?client=${clientId}&tab=programs`:'#team';
   await page.goto(`http://127.0.0.1:37868/?lang=${lang}&surface=${surface==='trainee'?'trainee':'team'}${hash}`);
   await page.waitForFunction(mode=>document.documentElement.classList.contains(mode),theme);
   assert.equal(await page.locator('html').getAttribute('dir'),lang==='he'?'rtl':'ltr');
   if(surface==='team')await page.locator('.care-client').waitFor();
   if(surface==='editor'){
    const form=page.locator('form').filter({has:page.locator('.program-draft-status')});
    await form.waitFor();
    await form.locator(':scope>.button.secondary').click();
    await page.locator('.program-exercise-editor>summary').click();
    await page.locator('.program-draft-status.saved').waitFor();
    assert.equal(await page.locator('.program-exercise-fields .care-grid.four').isVisible(),true);
   }
   if(surface==='trainee'){
    await page.locator('.file-hub button').nth(4).click();
    await page.locator('.file-sharing>summary').click();
    await page.locator('.care-dose-list .exercise-disclosure-toggle').click();
    assert.equal(await page.locator('.care-dose-list .exercise-disclosure-body').isVisible(),true);
   }
   await page.screenshot({path:join(evidence,`${surface}-${theme}-${lang}-${width}.png`),fullPage:true});
   const metrics=await page.evaluate(()=>{
    const broken=[],clipped=[],brokenDetails=[];
    const visible=element=>{
     if(!element?.getClientRects().length||element.closest('[hidden]')||getComputedStyle(element).visibility!=='visible')return false;
     // Closed details can retain descendant layout boxes in Chromium.
     for(let parent=element;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open&&!parent.querySelector(':scope>summary')?.contains(element))return false;
     return true;
    };
    for(const root of document.querySelectorAll('.content button,.care-client h2,.care-row h3,.program-exercise-fields label,.program-exercise-fields [data-slot=select-value],.program-exercise-heading,.care-dose-list')){
     if(!visible(root))continue;
     // Button scrollHeight can include the tab indicator pseudo-element.
     if(root.scrollWidth>root.clientWidth+1||(root.matches('[data-slot=select-value]')&&root.scrollHeight>root.clientHeight+1))clipped.push(root.textContent.trim());
     const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
     while((node=walker.nextNode()))for(const match of node.textContent.matchAll(/[א-ת]{4,14}|[A-Za-z]{4,14}/g)){
      if(!visible(node.parentElement))continue;
      const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
      const rects=[...range.getClientRects()].filter(r=>r.width>0),lines=new Set(rects.map(r=>Math.round(r.y)));
      if(lines.size>1){broken.push(match[0]);brokenDetails.push({word:match[0],text:root.textContent.trim(),className:root.className,width:root.clientWidth});}
      const bounds=root.getBoundingClientRect();
      if(root.matches('button,[data-slot=select-value]')&&rects.some(r=>r.top<bounds.top-1||r.bottom>bounds.bottom+1))clipped.push(root.textContent.trim());
     }
    }
    return {overflow:document.documentElement.scrollWidth>innerWidth,broken:[...new Set(broken)],brokenDetails,clipped:[...new Set(clipped)],fields:[...document.querySelectorAll('.program-exercise-fields .care-grid.four>.care-field')].map(el=>Math.round(el.getBoundingClientRect().width))};
   });
   checks.push({surface,theme,lang,width,...metrics});
   if(!record){assert.equal(metrics.overflow,false,JSON.stringify(checks.at(-1)));assert.deepEqual(metrics.broken,[],JSON.stringify(checks.at(-1)));assert.deepEqual(metrics.clipped,[],JSON.stringify(checks.at(-1)));}
  }
 }
 if(process.env.CI){assert.equal(record,false,'CI must assert layout');assert.equal(checks.length,84,'CI must run the full layout matrix');}
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log(JSON.stringify({checks,errors,unexpected:[...new Set(unexpected)]},null,2));
}finally{
 await writeFile(join(evidence,'results.json'),JSON.stringify({checks,errors,unexpected:[...new Set(unexpected)]},null,2));
 await browser?.close();await server.close();await rm(fixture,{recursive:true,force:true});
}
