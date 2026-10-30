// Actual application components, synthetic local responses only. No remote service access.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client} from '../tests/platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {defaultServices} from '../lib/services.ts';
import {defaultAppearance} from '../lib/appearance.ts';
import {appearanceWithMode,colorsFor,contrast} from '../lib/advanced-theme.ts';
import {chromium} from '@playwright/test';
const theme=process.env.DC_UI3_THEME??'dark';assert.ok(['light','dark'].includes(theme));
const appearance=appearanceWithMode(defaultAppearance,theme);
const rgbHex=value=>'#'+value.match(/[\d.]+/g).slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('');
const buttonRgb='rgb('+colorsFor(appearance).button.slice(1).match(/../g).map(part=>parseInt(part,16)).join(', ')+')';
const runtime=resolve('.sites-runtime');await mkdir(runtime,{recursive:true});
const fixture=await mkdtemp(join(runtime,'ui3-browser-'));
const evidence=resolve(process.env.DC_UI3_EVIDENCE??join(runtime,'ui3-evidence'));await mkdir(evidence,{recursive:true});
const imports=[...(await readFile('app/layout.tsx','utf8')).matchAll(/import '\.\/(.+\.css)';/g)].map(m=>`import '../../app/${m[1]}';`).join('\n');
await writeFile(join(fixture,'index.html'),'<html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import Page from '../../app/page';import {ThemeProvider} from '../../components/theme-provider';import {LanguageProvider} from '../../components/language-provider';${imports}\ncreateRoot(document.getElementById('root')).render(<ThemeProvider><LanguageProvider><Page/></LanguageProvider></ThemeProvider>);`);
const now=new Date().toISOString();
const item={exerciseId:'bench',sets:3,reps:10,unit:'reps',weight:20,notes:'',targetRpe:7};
const active={id:'synthetic-ui3-session',status:'active',planMode:'self',items:[{...item,name:'לחיצת חזה — שם תרגיל ארוך לבדיקת פריסה',results:[{done:true,amount:10,weight:20,actualRpe:7},{done:false,amount:10,weight:20},{done:false,amount:10,weight:20}]}],startedAt:now,finishedAt:null,before:0,after:null,plannedSets:3,completedSets:1,version:1};
const history=[1,3,6,12].map((days,i)=>({...active,id:'synthetic-history-'+i,status:'completed',startedAt:new Date(Date.now()-days*86400000).toISOString(),finishedAt:new Date(Date.now()-days*86400000+1800000).toISOString(),completedSets:3,after:1,items:active.items.map(item=>({...item,results:item.results.map(r=>({...r,done:true,weight:30-i*2,actualRpe:7}))}))}));
const feed={active,history,stats:{total:4,week:3,sets:12}};
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const access={mode:'self',canBuild:true,canStart:true,selfUntil:'2099-01-01',programId:null,programTitle:null};
const onboarding={intake:{answers:{name:'חשבון בדיקה מקומי'},completed:true,tourCompleted:true,version:1,updatedAt:now},consents:{terms:true,privacy:true,health:true,team:true},consentRevision:'2026-09-28.1',reviews:[],team:[],staffRole:null,canAdmin:false,trainingBlocked:false};
const responses={
 '/api/preferences/appearance':{ownerId:'synthetic-ui3',version:1,appearance},
 '/api/account':{signedIn:true,canManageServices:false,careRole:null},
 '/api/program':{items:[item],access,split:null,workoutPreference:{mode:'fixed',version:0}},
 '/api/training':feed,'/api/logs':{logs:[]},'/api/favorites':{favorites:[]},'/api/onboarding':onboarding,
 '/api/media':{videos:[],canManageDemo:false},
 '/api/exercises':{items:[],assigned:[],canCreate:false},'/api/messages':{threads:[]},
 '/api/services':{services:defaultServices},'/api/notifications':{enabled:false,items:[]},
 '/api/activity':{accountScope:'synthetic-ui3',connection:null,days:[{date:day,timezone:'Asia/Jerusalem',startAt:now,endAt:now,steps:8420,observedAt:now,partial:true,method:'healthkit_cumulative',provenance:['Synthetic fixture']}],goal:{dailyTarget:10000,weeklyTarget:8000,version:1},shares:[],summary:{today:8420,weeklyAverage:8420,observedDays:1}},
 '/api/wellness':{records:[{id:'synthetic-readiness',kind:'readiness',slot:day,day,data:{sleep:7,energy:7,stress:3,note:''},version:1,authorName:'Synthetic trainee',updatedAt:now},{id:'synthetic-rehab',kind:'rehab',slot:day,day,data:{region:'כתף',side:'שמאל',motion:'הרמה קדמית',response:'ללא אימון',pain:4,rom:90,functionScore:6,note:'נתון בדיקה סינתטי'},version:1,authorName:'Synthetic trainee',updatedAt:now}],self:true,canNutrition:false,canPlan:false,canReturn:false,today:day,summary:null,nutritionShared:false},
 '/api/care':{profile:{userId:'synthetic',name:'חשבון בדיקה מקומי',goal:'בדיקת ממשק',experience:'מתחיל',equipment:'משקולות',days:3,version:1,updatedAt:now},connections:[{id:'synthetic-coach',name:'מאמן בדיקה',role:'coach'}],notes:[],programs:[],activeProgramId:null,checkins:[],training:feed,canViewMedical:false,canViewNutrition:false,viewerRole:null,week:day},
 '/api/appointments':{appointments:[{id:'synthetic-appointment',clientId:'synthetic',clientName:'חשבון בדיקה',serviceId:'medical-video',title:'פגישת בדיקה סינתטית',provider:'tamir',duration:30,priceAgorot:30000,preference:'מועד בדיקה',state:'scheduled',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+88200000).toISOString(),meetingUrl:'https://example.test/synthetic-consultation',staffNote:'',paymentState:'unpaid',paymentReference:'',version:1,createdAt:now,updatedAt:now,calendarStatus:'error'}],nextOffset:null,total:1},
};
const server=await createServer({configFile:false,cacheDir:resolve('.sites-runtime/ui3-vite-cache'),define:{'process.env.NEXT_PUBLIC_DC_ANATOMY_TARGET':JSON.stringify('local-development')},resolve:{alias:{'@':resolve('.')}},root:fixture,publicDir:resolve('public'),plugins:[react()],server:{host:'127.0.0.1',port:37866,strictPort:true,fs:{allow:[resolve('.')]}}});
let browser,trainingFixture;const cleanups=[],errors=[],checks=[],workoutChecks=[];
try{
 await server.listen();browser=await chromium.launch({executablePath:process.env.DC_CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(u.hostname!=='127.0.0.1')return route.abort();
  if(u.pathname==='/api/training'&&trainingFixture){
   try{const json=r.method()==='GET'?await trainingFixture.training.feed(client.userId):r.method()==='PATCH'?{session:await trainingFixture.training.patch(client.userId,r.postDataJSON())}:null;
    return route.fulfill({status:json?200:405,json:json??{error:'Unsupported synthetic training operation'}});
   }catch(e){return route.fulfill({status:e.status??400,json:{error:e.message}});}
  }
  if(u.pathname.startsWith('/api/')){
   if(r.method()!=='GET')return route.fulfill({status:405,json:{error:'Synthetic screenshot fixture does not accept mutations'}});
   const value=responses[u.pathname];return route.fulfill({status:value?200:401,json:value??{error:'No synthetic data for this resource'}});
  }
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(120000);page.setDefaultNavigationTimeout(120000);page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message);});
 const screenshotResponses=structuredClone(responses);
 // Actual React save/edit/resume/finish flow backed by a disposable SQLite store.
 delete responses['/api/user-management'];responses['/api/account']={signedIn:true,canManageServices:false,careRole:null};
 for(const language of ['he','en'])for(const width of [390,1440]){
  for(const close of cleanups.splice(0))close();
  trainingFixture=platform({after:fn=>cleanups.push(fn)});await trainingFixture.connect();
  await trainingFixture.training.savePlan(client.userId,{...defaultPrescription('bench'),sets:3,reps:10,weight:20,targetRpe:8});
  await trainingFixture.training.start(client.userId,{requestId:randomUUID(),before:0});
  responses['/api/program']={...responses['/api/program'],items:await trainingFixture.training.getPlan(client.userId)};
  await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:37866/?lang=${language}#workout`);await page.reload();
  await page.locator('.session-exercise .exercise-disclosure-toggle').first().click();
  const first=page.locator('.set-line').first(),fields=()=>first.locator('.smart-set-fields input');
  await fields().nth(0).fill('60');await fields().nth(1).fill('10');await fields().nth(2).fill('6');
  assert.notEqual(await first.locator('.smart-set-metrics strong').textContent(),'—');
  await first.locator('.set-save').click();await first.locator('.set-save.saved').waitFor();
  let persisted=(await trainingFixture.training.feed(client.userId)).active;
  assert.equal(persisted.completedSets,1);assert.equal(persisted.items[0].results[0].weight,60);assert.equal(persisted.items[0].results[0].actualRpe,6);assert.ok(persisted.items[0].results[1].weight>60,'Lower actual RPE must suggest more load for the next set');
  await page.reload();await page.locator('.session-exercise .exercise-disclosure-toggle').first().click();
  assert.equal(await fields().nth(0).inputValue(),'60');assert.equal(await fields().nth(2).inputValue(),'6');
  await fields().nth(0).fill('61.5');await first.locator('.set-save').click();await first.locator('.set-save.saved').waitFor();
  assert.equal((await trainingFixture.training.feed(client.userId)).active.items[0].results[0].weight,61.5);
  await page.screenshot({path:join(evidence,`workout-saved-set-${width}-${language}.png`),fullPage:true});
  await page.locator('.finish-card .button.primary').click();const dialog=page.getByRole('dialog');
  await dialog.locator('input').first().fill('0');await dialog.locator('button[type=submit]').click();await page.locator('.workout-saved').waitFor();
  await page.locator('.workout-saved .button.primary').click();await page.locator('#workout-history-list').click();
  persisted=await trainingFixture.training.feed(client.userId);assert.equal(persisted.active,null);assert.equal(persisted.history.length,1);assert.equal(persisted.history[0].completedSets,1);assert.equal(persisted.history[0].items[0].results[0].weight,61.5);
  await page.screenshot({path:join(evidence,`workout-history-${width}-${language}.png`),fullPage:true});
  workoutChecks.push({language,width,save:true,edit:true,reload:true,finish:true,history:true,nextLoad:true});console.log('PASS SQLite workout save/edit/reload/finish/history/next-load',theme,language,width);
 }
 trainingFixture=null;for(const close of cleanups.splice(0))close();Object.assign(responses,screenshotResponses);
 for(const width of (process.env.DC_UI3_QUICK?[390]:[320,375,390,430,768,1024,1440])){
  await page.setViewportSize({width,height:900});
  for(const section of (process.env.DC_UI3_SECTIONS?.split(',')??['home','plan','workout','history','learn','library','details','recovery','consult','care','more'])){
   await page.goto(`http://127.0.0.1:37866/?lang=he#${section==='details'?'library?exercise=bench':section}`);await page.locator('.dc-ui3').waitFor();await page.waitForFunction(mode=>document.documentElement.classList.contains(mode),theme);await page.waitForTimeout(900);if(section==='workout')await page.locator('.session-exercise .exercise-disclosure-toggle').first().click();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${section} overflows at ${width}`);
   await page.evaluate(()=>scrollTo(0,0));
   if(section==='home'){if(width<=760){const nav=await page.locator('.mobile-bottom-nav').evaluate(el=>({text:getComputedStyle(el.querySelector('button.active')).color,background:getComputedStyle(el).backgroundColor}));assert.ok(contrast(rgbHex(nav.text),rgbHex(nav.background))>=4.5,'Active navigation text contrast in '+theme+': '+JSON.stringify(nav));}const hero=await page.locator('.dc-premium-hero').evaluate(el=>({heading:getComputedStyle(el.querySelector('h2')).color,background:getComputedStyle(el).getPropertyValue('--dc-background').trim(),body:getComputedStyle(el.querySelector('p')).color}));assert.equal(hero.heading,'rgb(255, 255, 255)','Image hero heading must stay readable in '+theme);assert.equal(hero.body,'rgb(197, 212, 223)','Image hero description must stay readable in '+theme);assert.equal(hero.background,'#030b14','Narrow image overlay must retain its dark background');const colors=await page.locator('.dc-premium-hero .button').evaluate(el=>({background:getComputedStyle(el).backgroundColor,button:getComputedStyle(el).getPropertyValue('--dc-button').trim()}));assert.equal(colors.background,buttonRgb,JSON.stringify(colors));assert.equal(colors.button.toLowerCase(),colorsFor(appearance).button.toLowerCase(),JSON.stringify(colors));}
   if(section==='details')assert.equal(await page.locator('.care-gate').count(),0,'Exercise detail must load, not show a sign-in gate');if(section==='history'){const labels=await page.locator('.progress-sort-card .training-metrics > div > span').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(labels.length>0);assert.ok(labels.every(w=>w>=96),'Consistency metric labels must remain readable: '+labels.join(','));}await page.screenshot({path:join(evidence,`${section}-${width}.png`),fullPage:true});if(section==='home')await page.screenshot({path:join(evidence,`home-${width}-viewport.png`)});if(section==='history'){await page.locator('.activity-card').screenshot({path:join(evidence,`cardio-${width}.png`),style:'.topbar,.mobile-bottom-nav{visibility:hidden!important}'});await page.locator('.performance-panel').screenshot({path:join(evidence,`strength-${width}.png`),style:'.topbar,.mobile-bottom-nav{visibility:hidden!important}'});}checks.push({section,width,overflow});
  }
 }
 await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:37866/?lang=he#workout');await page.getByRole('region',{name:'טיימר מנוחה'}).waitFor();
 const timer=page.getByRole('region',{name:'טיימר מנוחה'});await timer.getByRole('button',{name:'התחלה',exact:true}).click();await page.waitForTimeout(1200);assert.notEqual(await timer.locator('output').textContent(),'01:30');await timer.getByRole('button',{name:'השהיה',exact:true}).click();const paused=await timer.locator('output').textContent();await page.waitForTimeout(1100);assert.equal(await timer.locator('output').textContent(),paused);await timer.getByRole('button',{name:'איפוס',exact:true}).click();assert.equal(await timer.locator('output').textContent(),'01:30');
 for(const width of (process.env.DC_UI3_QUICK?[390]:[320,375,390,430,768,1024,1440])){await page.setViewportSize({width,height:900});for(const section of (process.env.DC_UI3_SECTIONS?.split(',')??['home','plan','workout','history','learn','library','details','recovery','consult','care','more'])){await page.goto(`http://127.0.0.1:37866/?lang=en#${section==='details'?'library?exercise=bench':section}`);await page.locator('.dc-ui3').waitFor();await page.waitForFunction(mode=>document.documentElement.classList.contains(mode),theme);await page.waitForTimeout(800);assert.equal(await page.locator('html').getAttribute('dir'),'ltr');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(section==='details')assert.equal(await page.locator('.care-gate').count(),0,'Exercise detail must load, not show a sign-in gate');if(section==='history'){const labels=await page.locator('.progress-sort-card .training-metrics > div > span').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width));assert.ok(labels.length>0);assert.ok(labels.every(w=>w>=96),'Consistency metric labels must remain readable: '+labels.join(','));}await page.screenshot({path:join(evidence,`${section}-${width}-en.png`),fullPage:true});checks.push({section,width,language:'en',overflow:false});}}
 await page.setViewportSize({width:390,height:900});
 responses['/api/onboarding'].trainingBlocked=true;
 await page.goto('http://127.0.0.1:37866/?lang=he#home');await page.reload();await page.locator('.dc-premium-hero').waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('.dc-premium-hero').getByRole('button',{name:'ליצירת קשר עם הצוות',exact:true}).count(),1);assert.equal(await page.locator('.dc-premium-hero .button').count(),1);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(evidence,'home-blocked-390.png')});
 responses['/api/onboarding'].trainingBlocked=false;responses['/api/activity'].summary.today=null;responses['/api/wellness'].records=[];
 await page.reload();await page.locator('.dc-premium-hero').waitFor();await page.waitForTimeout(500);assert.equal(await page.locator('.dc-ui3-rings strong').nth(1).textContent(),'—');assert.equal(await page.locator('.dc-ui3-rings strong').nth(2).textContent(),'—');await page.screenshot({path:join(evidence,'home-empty-390.png')});

 // Exercise the actual shared Premium shell for staff, not only isolated components.
 responses['/api/account']={signedIn:true,canManageServices:false,careRole:'coach'};
 responses['/api/dashboard']={role:'coach',canAdmin:false,newUsers:1,unread:0,clients:[{id:'synthetic-client',name:'Synthetic QA Trainee',phone:'',goal:'Strength training',createdAt:now,unread:0,appointments:[],activity:null}],reviews:[],requests:[],audit:[]};
 responses['/api/staff-review-queue']={items:[],limited:false};
 responses['/api/team-tasks']={tasks:[],options:[],limited:false,selfEmail:'qa-coach@example.test',today:day};
 responses['/api/user-management']={users:[{user_id:'synthetic-client',display_name:'Synthetic QA Trainee',email:'qa-trainee@example.test',role:'trainee',approval:'approved',status:'active',coach_id:'synthetic-coach',coach_name:'Synthetic QA Coach',guidance_mode:'coached',version:1,joined_at:Date.now(),secretary:0,owner:0,can_edit:true}],coaches:[{user_id:'synthetic-coach',display_name:'Synthetic QA Coach'}],hasMore:false,coachesTruncated:false,permission:'owner',viewerId:'synthetic-owner'};
 for(const width of (process.env.DC_UI3_QUICK?[390]:[320,375,390,430,768,1024,1440]))for(const language of ['he','en'])for(const section of ['dashboard','users']){
  responses['/api/account']={signedIn:true,canManageServices:section==='users',careRole:section==='users'?'clinician':'coach'};
  await page.setViewportSize({width,height:900});
  await page.goto(`http://127.0.0.1:37866/?lang=${language}#${section}`);
  await page.locator('.dc-ui3').waitFor();await page.waitForFunction(mode=>document.documentElement.classList.contains(mode),theme);
  await page.getByText('Synthetic QA Trainee',{exact:true}).waitFor();
  assert.equal(await page.locator('.care-gate').count(),0,`${section} must load synthetic staff data`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${section} ${language} ${width}`);
  await page.screenshot({path:join(evidence,`${section}-${width}-${language}.png`),fullPage:true});checks.push({section,width,language,overflow:false});
 }

 assert.deepEqual(errors,[]);
 await writeFile(join(evidence,'results.json'),JSON.stringify({theme,checks,workoutChecks,timer:'start/pause/reset passed',errors},null,2));console.log(JSON.stringify({theme,screenshots:checks.length,workoutChecks,evidence,timer:'passed',errors}));
}finally{for(const close of cleanups)close();await browser?.close();await server.close();await rm(fixture,{recursive:true,force:true});}
