// Browser simulation + real built handlers + disposable local D1/R2 only.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {pilotRuntime} from './fixtures/pilot-runtime.mjs';
import {importFile} from './fixtures/pilot-import-files.mjs';
import {defaultPrescription} from '../../lib/training.ts';

const evidence=resolve(process.env.DC_PILOT_EVIDENCE??'.sites-runtime/pilot-evidence');await mkdir(evidence,{recursive:true});
const report={testedAt:new Date().toISOString(),checkoutSha:process.env.DC_PILOT_CHECKOUT_SHA??null,prHeadSha:process.env.DC_PILOT_PR_HEAD_SHA??null,scope:'Local synthetic browser simulation; real built Worker handlers and disposable D1/R2; no live account/provider/device acceptance',checks:[],failures:[],browserErrors:[],externalRequests:[],transportErrors:[]};
const he=JSON.parse(await readFile(new URL('../../lib/locales/he.json',import.meta.url))),en=JSON.parse(await readFile(new URL('../../lib/locales/en.json',import.meta.url)));
// Labels implemented directly in bilingual components or the extended dictionary.
const bilingualLabels={
 'השוויתי למקור ובדקתי שהשורות והעמודות בטבלה נכונות':'I compared the extracted rows and columns with the source',
 'קריאה ובדיקת שורות התוכנית':'Read and review program rows',
 'אני מאשר החלפת הטיוטה שבעורך בתוכנית המיובאת':'I approve replacing the editor draft with the imported program',
 'בדקתי את התצוגה המקדימה: ימי האימון, התרגילים וכל ערכי התוכנית נכונים':'I reviewed the workout days, exercises and all program values',
 'שמור תוכנית אימון':'Save workout program',
 'תיאום מועד':'Schedule consultation',
 'בדיקת כל ימי התוכנית לפני פרסום':'Review all program days before publishing',
 'הייעוץ אושר, אך הסנכרון ל-Google Calendar נכשל.':'The consultation was approved, but Google Calendar synchronization failed.',
};
const label=(s,lang)=>lang==='he'?s:bilingualLabels[s]??en[he.indexOf(s)]??s;
const selectedLanguage=process.env.DC_PILOT_LANGUAGE;assert.ok(!selectedLanguage||['he','en'].includes(selectedLanguage),'DC_PILOT_LANGUAGE must be he or en');
const matrix=[{lang:'he',width:390},{lang:'en',width:1440}].filter(value=>!selectedLanguage||value.lang===selectedLanguage);report.matrix=matrix;
let stage='startup',browser;
const check=(name,details={})=>{report.checks.push({name,...details});console.log('PASS',name);};
const saveReport=()=>writeFile(resolve(evidence,'results.json'),JSON.stringify(report,null,2));
async function api(page,path,body,method=body===undefined?'GET':'POST'){
 return page.evaluate(async({path,body,method})=>{const r=await fetch(path,{method,headers:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,value:await r.json()};},{path,body,method});
}
async function json(page,path,body,method){const r=await api(page,path,body,method);assert.equal(r.status,200,path+': '+JSON.stringify(r.value));return r.value;}
async function login(page,r,key,lang,section){
 await page.goto(r.origin+'/auth/signin?lang='+lang+'&return_to='+encodeURIComponent('/?lang='+lang+'#'+section));
 // The explicit local resend check can leave a pending code challenge. Wait
 // for sign-in initialization, then use the existing switch-email UI.
 await page.waitForFunction(()=>{const button=document.querySelector('#email-form button');return button&&!button.disabled;});
 if(await page.locator('#code-form').isVisible())await page.locator('#switch-email').click();
 await page.locator('#email-form input').fill(r.identities[key].email);await page.locator('#email-form button').click();await page.locator('#code-form:visible').waitFor();
 await page.locator('#code-form input').fill(await r.provider.codeFor(r.identities[key].email));await page.locator('#code-form button').first().click();
 await page.waitForURL(url=>url.pathname==='/'&&url.hash==='#'+section);assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
 await page.locator('.topbar').waitFor();await page.locator(`html[lang="${lang}"][dir="${lang==='he'?'rtl':'ltr'}"]`).waitFor();assert.equal(await page.locator('html').getAttribute('dir'),lang==='he'?'rtl':'ltr');assert.equal((await json(page,'/api/account')).signedIn,true);
 console.log('PILOT authenticated',key,lang);
}
async function logout(page,r,lang){
 const cookies=(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; ');
 await page.goto(r.origin+'/auth/signout?lang='+lang+'&return_to=%2F');await page.locator('#logout').click();
 await page.waitForURL(url=>url.pathname==='/');assert.equal((await json(page,'/api/account')).signedIn,false);
 const replay=r.actor('a');replay.cookies=cookies;assert.equal((await replay.request('/auth/status',{})).status,401);
 return cookies;
}
async function localFreshLoginWindow(r,key,request){
 // A complete workout may outlast the real resend interval. Establish a fresh
 // local window explicitly, then prove throttling instead of assuming time.
 const email=r.identities[key].email;await r.resetLocalResendWindow(email);
 assert.equal((await request('/auth/send',{email})).status,200);
 assert.equal((await request('/auth/send',{email})).status,429);
 await r.resetLocalResendWindow(email);
}
async function viewAs(page,r,actor,lang){
 await page.goto('about:blank');await page.context().clearCookies();
 const pair=actor.cookies.split('; ').find(value=>value.startsWith('__Host-dc_session='));assert.ok(pair);
 await page.context().addCookies([{name:'__Host-dc_session',value:pair.slice('__Host-dc_session='.length),url:r.origin,secure:true,httpOnly:true,sameSite:'Strict'}]);
 await page.goto(r.origin+'/?lang='+lang+'#appointments');
}
async function manage(r,owner,key,coachKey){
 const users=await owner.json('/api/user-management');const user=users.users.find(u=>u.user_id===r.identities[key].id);
 return owner.json('/api/user-management',{action:'update',userId:user.user_id,version:user.version,role:'trainee',approval:'approved',status:'active',coachId:coachKey?r.identities[coachKey].id:null,guidanceMode:coachKey?'coached':'awaiting_assignment',confirmed:true,operationId:randomUUID()});
}

async function workoutJourney(r,page,lang,width,owner){
 stage=`${lang}/${width} workout`;const a=r.identities.a.id,coach=r.actor('coach');
 await manage(r,owner,'a','coach');await manage(r,owner,'b','coachB');
 await login(page,r,'coach',lang,'team?client='+a+'&tab=programs');
 assert.equal((await json(page,'/api/account')).careRole,'coach');assert.equal((await api(page,'/api/user-management')).status,403);
 const title='SYNTHETIC Pilot '+lang,items=[{...defaultPrescription('goblet'),sets:4,reps:10,weight:60,targetRpe:8,notes:'Synthetic complete journey'}];
 const payload={action:'save',clientId:a,requestId:randomUUID(),title,items,version:0,revisionOf:null};
 await r.db.exec("CREATE TRIGGER pilot_fail_save BEFORE INSERT ON coach_program_drafts BEGIN SELECT RAISE(ABORT,'synthetic storage failure'); END;");
 try{assert.notEqual((await api(page,'/api/care/draft',payload)).status,200);assert.equal((await r.db.prepare('SELECT COUNT(*) n FROM coach_program_drafts').first()).n,0);}finally{await r.db.exec('DROP TRIGGER pilot_fail_save;');}
 const draft=await json(page,'/api/care/draft',payload);assert.equal((await api(page,'/api/care/draft',payload)).status,409,'stale repeated draft cannot overwrite');
 assert.deepEqual((await json(page,'/api/care/draft?client='+a)).draft.items,draft.draft.items);
 await page.reload();await page.getByRole('button',{name:lang==='he'?'טעינת הטיוטה השמורה':en[he.indexOf('טעינת הטיוטה השמורה')],exact:true}).waitFor();
 const assignment={action:'assign',clientId:a,id:payload.requestId,title,items,draftVersion:draft.version};
 await json(page,'/api/care/team',assignment);await json(page,'/api/care/team',assignment);
 assert.equal((await r.db.prepare('SELECT COUNT(*) n FROM care_programs WHERE id=?').bind(payload.requestId).first()).n,1);
 coach.cookies=(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; ');
 await logout(page,r,lang);await login(page,r,'a',lang,'plan');
 const plan=await json(page,'/api/program');assert.equal(plan.access.programTitle,title);assert.equal(plan.items[0].weight,60);
 await page.locator('.plan-workspace').waitFor();assert.match(await page.locator('.plan-workspace').innerText(),/60/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:lang==='he'?'התחלת אימון':'Start workout',exact:true}).click();
 await page.getByRole('dialog').locator('button.button.primary.wide').click();
 await page.waitForURL(url=>url.hash==='#workout');let session=(await json(page,'/api/training')).active;assert.ok(session);
 assert.equal((await json(page,'/api/training',{requestId:session.id,before:session.before})).session.id,session.id);
 const disclosure=page.locator('.session-exercise .exercise-disclosure-toggle').first();await disclosure.waitFor();if(await disclosure.getAttribute('aria-expanded')==='false')await disclosure.click();await page.locator('.set-line').first().waitFor();
 const row=page.locator('.set-line').first(),fields=row.locator('.smart-set-fields input');await fields.nth(0).fill('60');await fields.nth(1).fill('10');await fields.nth(2).fill('6');
 await row.getByText(lang==='he'?'קל מהיעד':'Easier than target',{exact:false}).waitFor();
 assert.match(await row.locator('.workout-recommendation').innerText(),/62[.,]8571/);
 await row.locator('.set-save').click();await row.locator('.set-save.saved').waitFor();
 session=(await json(page,'/api/training')).active;assert.equal(session.items[0].results[0].actualRpe,6);assert.equal(session.items[0].results[0].amount,10);assert.equal(session.items[0].results[0].weight,60);
 assert.ok(Math.abs(session.items[0].results[1].weight-62.857142857)<0.0001,'continuous recommendation must not be rounded to equipment increments');
 const firstNextLoad=session.items[0].results[1].weight;
 const stale=await api(page,'/api/training',{action:'set',id:session.id,version:session.version-1,exerciseId:'goblet',setIndex:0,done:true,amount:10,weight:1,actualRpe:6},'PATCH');assert.equal(stale.status,409);
 await page.reload();await disclosure.waitFor();if(await disclosure.getAttribute('aria-expanded')==='false')await disclosure.click();await page.locator('.set-line').first().waitFor();
 assert.equal((await json(page,'/api/training')).active.items[0].results[0].weight,60);
 for(const [index,weight] of [[1,59],[2,58]]){
  const set=page.locator('.set-line').nth(index),inputs=set.locator('.smart-set-fields input');
  await inputs.nth(0).fill(String(weight));await inputs.nth(1).fill('10');await inputs.nth(2).fill('6');await set.locator('.set-save').click();await set.locator('.set-save.saved').waitFor();
 }
 await page.locator('.set-line').nth(2).getByText(lang==='he'?'ירידה בביצוע בשלושה סטים: לא מוצעת עלייה במשקל.':'Declining performance across three sets: no increase suggested.',{exact:true}).waitFor();
 session=(await json(page,'/api/training')).active;assert.equal(session.items[0].results[3].weight,58);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:resolve(evidence,`${lang}-${width}-fatigue-ceiling.png`),fullPage:true});
 const last=page.locator('.set-line').nth(3),lastFields=last.locator('.smart-set-fields input');await lastFields.nth(0).fill('57.125');await lastFields.nth(1).fill('10');await lastFields.nth(2).fill('8');await last.locator('.set-save').click();await last.locator('.set-save.saved').waitFor();
 await page.reload();await disclosure.waitFor();if(await disclosure.getAttribute('aria-expanded')==='false')await disclosure.click();
 session=(await json(page,'/api/training')).active;assert.equal(session.completedSets,4);assert.equal(session.items[0].results[3].weight,57.125);assert.equal(session.items[0].results[3].weightSource,'manual');
 await page.locator('.finish-card .button.primary').click();const dialog=page.getByRole('dialog');await dialog.locator('input').first().fill('0');await dialog.locator('button[type=submit]').click();await page.locator('.workout-saved').waitFor();
 // Weekly aggregate intentionally rounds to one decimal; stored set loads above
 // and history below must retain the exact manually entered 57.125 kg.
 const feed=await json(page,'/api/training');assert.equal(feed.active,null);assert.equal(feed.history[0].id,session.id);assert.equal(feed.stats.total,1);const progress=await json(page,'/api/progress');assert.equal(progress.current.completed,1);assert.equal(progress.current.sets,4);assert.equal(progress.current.volume,2341.3);
 await page.screenshot({path:resolve(evidence,`${lang}-${width}-workout-saved.png`),fullPage:true});
 const oldSession=await logout(page,r,lang);await localFreshLoginWindow(r,'a',(p,b)=>api(page,p,b));
 await login(page,r,'a',lang,'history');const freshCookies=(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; ');assert.notEqual(freshCookies,oldSession);
 const history=(await json(page,'/api/training')).history;assert.equal(history[0].id,session.id);assert.equal(history[0].items[0].results[0].weight,60);assert.equal(history[0].items[0].results[0].actualRpe,6);assert.equal((await json(page,'/api/program')).access.programTitle,title);
 await page.reload();await page.locator('#workout-history-list').waitFor();assert.equal((await json(page,'/api/training')).history[0].id,session.id);
 assert.equal(history[0].items[0].results[3].weight,57.125);
 check(stage,{savedWorkout:session.id,actualRpe:6,repetitions:10,weight:60,nextLoad:firstNextLoad,completedSets:4,fatigueCeiling:58,manualFinalLoad:57.125,realPersistence:true});
 return {sessionId:session.id,coach};
}

async function importsJourney(r,page,lang,width){
 const t=s=>label(s,lang),a=r.identities.a.id;
 const otherTrainee=r.actor('b');await otherTrainee.login();
 await logout(page,r,lang);await localFreshLoginWindow(r,'coach',(p,b)=>api(page,p,b));await login(page,r,'coach',lang,'team?client='+a+'&tab=programs');
 for(const format of ['csv','xlsx','pdf']){
  stage=`${lang}/${width} import ${format}`;console.log('PILOT',stage);
  const old=await json(page,'/api/care/draft?client='+a);if(old.draft)await json(page,'/api/care/draft',{action:'discard',clientId:a,version:old.version});
  await page.goto(r.origin+'/?lang='+lang+'#team?client='+a+'&tab=programs');await page.locator('.program-builder-tools > summary').click();await page.locator('.excel-import > summary').click();
  await page.locator('.excel-import input[type=file]').setInputFiles(importFile(format));
  if(format==='pdf')await page.getByRole('checkbox',{name:t('השוויתי למקור ובדקתי שהשורות והעמודות בטבלה נכונות'),exact:true}).check();
  await page.getByRole('button',{name:t('קריאה ובדיקת שורות התוכנית'),exact:true}).click();
  await page.getByText('SYNTHETIC unknown lift',{exact:true}).first().waitFor();
  assert.equal(await page.locator('.import-preview-card').count(),3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const ambiguous=page.locator('.import-row-editor').filter({hasText:'leg curl machine'});await ambiguous.locator(':scope > summary').click();await ambiguous.locator('[data-recognition-review="ambiguous-variant"]').waitFor();
  await ambiguous.getByRole('button',{name:/Seated Leg Curl/}).click();
  const replaced=page.getByRole('checkbox',{name:t('אני מאשר החלפת הטיוטה שבעורך בתוכנית המיובאת'),exact:true});if(await replaced.count())await replaced.check();
  await page.getByRole('checkbox',{name:t('בדקתי את התצוגה המקדימה: ימי האימון, התרגילים וכל ערכי התוכנית נכונים'),exact:true}).check();
  const savedResponse=page.waitForResponse(response=>response.url().endsWith('/api/care/draft')&&response.request().method()==='POST');await page.getByRole('button',{name:t('שמור תוכנית אימון'),exact:true}).click();assert.equal((await savedResponse).status(),200);
  console.log('PILOT imported draft saved',format);
  const draft=await json(page,'/api/care/draft?client='+a);assert.equal(draft.draft.items.length,3);
  const [known,curl,unknown]=draft.draft.items;assert.equal(known.exerciseId,'barbell-bench');assert.equal(curl.exerciseId,'seated-curl');assert.equal(unknown.customExercise.name,'SYNTHETIC unknown lift');assert.equal(unknown.importSource.matchingStatus,'CUSTOM_EXERCISE');assert.match(unknown.exerciseId,/^import-[a-f0-9]{16}$/);assert.equal(unknown.importSource.matchedLibraryId,null);
  assert.deepEqual(known.setReps,[{min:8,max:8},{min:10,max:10}]);assert.deepEqual(known.targetRpes,[7,8]);assert.equal(known.weight,33.125);assert.match(known.importSource.fileSha256,/^[a-f0-9]{64}$/);
  assert.equal((await r.db.prepare('SELECT COUNT(*) n FROM custom_exercises').first()).n,0,'unmatched import does not create a catalog entry');
  await page.reload();await page.getByRole('button',{name:t('טעינת הטיוטה השמורה'),exact:true}).click();await page.getByRole('alertdialog').getByRole('button',{name:t('טעינת הטיוטה'),exact:true}).click();
  assert.deepEqual((await json(page,'/api/care/draft?client='+a)).draft.items,draft.draft.items);
  const review=page.getByRole('button',{name:new RegExp(t('בדיקת כל ימי התוכנית לפני פרסום').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))});
  if(format==='csv'){
   const target=page.getByRole('spinbutton',{name:'RPE יעד לסט 1',exact:true}).first();
   const ancestors=await page.locator('input[aria-label="RPE יעד לסט 1"]').first().locator('xpath=ancestor::details').all();
   for(const details of ancestors)if(!await details.evaluate(node=>node.open))await details.locator(':scope > summary').click();
   await target.fill('');
   assert.equal(await review.locator('xpath=ancestor::form').evaluate(form=>form.checkValidity()),false,'a missing per-set effort target must still block publication');
   await review.click();assert.equal(await page.getByRole('button',{name:t('אישור ופרסום התוכנית למתאמן'),exact:true}).count(),0);
   await target.fill('7');
  }
  const invalid=await review.locator('xpath=ancestor::form').locator('input:invalid').evaluateAll(inputs=>inputs.map(input=>({label:input.closest('label')?.textContent,value:input.value,required:input.required})));
  assert.deepEqual(invalid,[],'a restored program with complete per-set RPE targets must pass native form validation');
  await review.click();
  const publish=page.getByRole('button',{name:t('אישור ופרסום התוכנית למתאמן'),exact:true});await publish.waitFor();
  const preview=publish.locator('xpath=ancestor::section[1]'),setRows=await preview.locator('article').first().getByRole('listitem').allTextContents();
  assert.match(await preview.innerText(),/33\.125 kg/,'publication preserves the imported decimal opening load');
  assert.equal(setRows.length,2,'publication preview must show both imported set prescriptions');assert.match(setRows[0],/8.*RPE.*7/);assert.match(setRows[1],/10.*RPE.*8/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(!(await preview.innerText()).includes(t('לא הוגדר יעד מאמץ לתרגיל הזה.')),'complete per-set targets are not missing effort');
  await page.screenshot({path:resolve(evidence,`${lang}-${width}-${format}-publication.png`),fullPage:true});
  await page.getByRole('button',{name:t('אישור ופרסום התוכנית למתאמן'),exact:true}).click();
  const trainee=r.actor('a');await r.resetLocalResendWindow(trainee.email);await trainee.login();const program=await trainee.json('/api/program');assert.deepEqual(program.items.map(i=>({id:i.exerciseId,reps:i.setReps,rpe:i.targetRpes,weight:i.weight})),draft.draft.items.map(i=>({id:i.exerciseId,reps:i.setReps,rpe:i.targetRpes,weight:i.weight})));
  assert.equal((await otherTrainee.json('/api/care')).programs.length,0,'authenticated trainee B cannot see A imported program');
  assert.equal((await r.db.prepare('SELECT COUNT(*) n FROM custom_exercises').first()).n,0,'assignment does not promote unknown exercises to the catalog');
  await page.screenshot({path:resolve(evidence,`${lang}-${width}-${format}-assigned.png`),fullPage:true});
  await trainee.json('/auth/logout',{});check(stage,{items:3,realDraftAndAssignment:true,freshTraineeSession:true});
 }
 await otherTrainee.json('/auth/logout',{});
}

async function rolesAndCalendar(r,page,owner,sessionId,lang,width){
 const t=s=>label(s,lang);
 stage=`${lang}/${width} roles and isolation`;const a=r.actor('a'),b=r.actor('b'),coach=r.actor('coach'),other=r.actor('coachB'),secretary=r.actor('secretary');
 for(const actor of [a,b,coach,other,secretary]){await r.resetLocalResendWindow(actor.email);await actor.login();}
 for(const [actor,target] of [[a,b],[b,a]]){assert.equal((await actor.request('/api/progress?client='+target.id)).status,403);assert.equal((await actor.request('/api/care/team',{action:'note',clientId:target.id,id:randomUUID(),kind:'training',content:'Forbidden',shared:true})).status,403);}
 const bProgram=randomUUID();await other.json('/api/care/team',{action:'assign',clientId:b.id,id:bProgram,title:'Synthetic B only',items:[{...defaultPrescription('goblet'),sets:2,reps:8,weight:25,targetRpe:8}]});
 const bSession=(await b.json('/api/training',{requestId:randomUUID(),before:0})).session;
 assert.equal((await a.request('/api/training',{action:'set',id:bSession.id,version:bSession.version,exerciseId:'goblet',setIndex:0,done:true,amount:8,weight:1,actualRpe:6},'PATCH')).status,404,'session IDs are scoped to their owner');
 assert.equal((await b.json('/api/training')).active.version,bSession.version);
 assert.equal((await b.json('/api/training')).active.items[0].results[0].done,false);
 assert.equal((await coach.json('/api/care/team')).clients.length,1);assert.equal((await other.json('/api/care/team')).clients[0].userId,b.id);
 for(const actor of [b,other]){assert.equal((await actor.request('/api/progress?client='+a.id)).status,403);assert.equal((await actor.request('/api/training',{action:'finish',id:sessionId,version:1,after:0},'PATCH')).status,404,'cross-owner sessions are not disclosed');}
 assert.equal((await coach.request('/api/care/team?client='+b.id)).status,403);
 await r.db.prepare("INSERT INTO care_notes(id,client_id,author_id,author_name,kind,content,shared,created_at) VALUES(?,?,?,'Synthetic owner','medical','SYNTHETIC PRIVATE CLINICAL NOTE',0,?)").bind(randomUUID(),a.id,owner.id,new Date().toISOString()).run();
 const view=await coach.json('/api/care/team?client='+a.id);assert.equal(view.canViewMedical,false);assert.ok(!JSON.stringify(view).includes('SYNTHETIC MEDICAL SECRET'));assert.ok(!JSON.stringify(view).includes('SYNTHETIC PRIVATE CLINICAL'));
 assert.equal((await secretary.request('/api/care/team')).status,403);assert.equal((await secretary.request('/api/google-calendar')).status,403);
 assert.equal((await owner.json('/api/user-management')).permission,'owner');assert.equal((await owner.json('/api/account')).careRole,'clinician');
 // Owner coaches through its connected clinician/owner-program capability,
 // while retaining a single physician role; it is not a second coach role.
 const ownerDraft=await owner.json('/api/care/draft?client='+a.id);assert.equal(ownerDraft.draft,null);
 const ownerPayload={action:'save',clientId:a.id,requestId:randomUUID(),version:ownerDraft.version,title:'Synthetic owner coaching',revisionOf:null,items:[{...defaultPrescription('goblet'),sets:2,reps:10,weight:50.5,targetRpe:8}]};
 const savedOwnerDraft=await owner.json('/api/care/draft',ownerPayload);await owner.json('/api/care/team',{action:'assign',clientId:a.id,id:ownerPayload.requestId,title:ownerPayload.title,items:ownerPayload.items,draftVersion:savedOwnerDraft.version});assert.equal((await a.json('/api/program')).access.programTitle,ownerPayload.title);
 const privateDraft=await coach.json('/api/care/draft?client='+a.id);await coach.json('/api/care/draft',{...ownerPayload,title:'SYNTHETIC OLD COACH PRIVATE DRAFT',requestId:randomUUID(),version:privateDraft.version});
 await coach.json('/api/care/team',{action:'note',clientId:a.id,id:randomUUID(),kind:'training',content:'SYNTHETIC TEAM INTERNAL TRAINING NOTE',shared:false});
 await manage(r,owner,'a','coachB');assert.equal((await other.json('/api/care/draft?client='+a.id)).draft,null,'new coach cannot read previous coach private draft');
 assert.equal((await coach.request('/api/care/draft?client='+a.id)).status,403,'old logged-in coach is revoked immediately');
 const after=await other.json('/api/care/team?client='+a.id);assert.ok(!JSON.stringify(after).includes('SYNTHETIC PRIVATE CLINICAL'));assert.ok(!JSON.stringify(after).includes('SYNTHETIC OLD COACH PRIVATE DRAFT'));assert.ok(JSON.stringify(after).includes('SYNTHETIC TEAM INTERNAL TRAINING NOTE'),'internal training notes belong to the assigned care team');assert.ok(!JSON.stringify(await a.json('/api/care')).includes('SYNTHETIC TEAM INTERNAL TRAINING NOTE'));
 check(stage,{ownerProfessionalRole:'physician',separateOwnerGrant:true});

 stage=`${lang}/${width} consultations and Calendar`;await r.enableCalendar();
 const create=()=>a.json('/api/appointments',{action:'create',id:randomUUID(),serviceId:'medical-video',expectedPrice:30000,clientName:'SYNTHETIC Pilot',preference:'SYNTHETIC PRIVATE PREFERENCE'});
 let appointment=(await create()).appointment;assert.equal(appointment.state,'requested');assert.ok((await secretary.json('/api/appointments?manage=1&view=active')).appointments.some(x=>x.id===appointment.id));
 await viewAs(page,r,owner,lang);await page.getByRole('heading',{name:t('ניהול בקשות ותורים'),exact:true}).waitFor();
 const ownerCard=page.locator('.appointment-card:visible').filter({hasText:'SYNTHETIC Pilot'}).first();await ownerCard.getByText(t('תיאום מועד'),{exact:true}).click();
 assert.equal(await ownerCard.getByRole('textbox',{name:t('הנחיות למתאמן'),exact:true}).count(),1,'clinical owner retains guidance editing');
 await viewAs(page,r,secretary,lang);await page.getByRole('heading',{name:t('ניהול בקשות ותורים'),exact:true}).waitFor();
 const card=page.locator('.appointment-card:visible').filter({hasText:'SYNTHETIC Pilot'}).first();await card.waitFor();
 await card.getByText(t('תיאום מועד'),{exact:true}).click();
 assert.equal(await card.getByRole('textbox',{name:t('הנחיות למתאמן'),exact:true}).count(),0,'secretary must not be offered an editable clinical field that the server discards');
 const rejected=await create();assert.equal((await owner.json('/api/appointments',{action:'cancel',id:rejected.appointment.id,version:rejected.appointment.version})).appointment.state,'cancelled');
 await r.setCalendarFailure(true);let result=await secretary.json('/api/appointments',{action:'schedule',id:appointment.id,version:appointment.version,startsAt:new Date(Date.now()+20*86400000).toISOString(),staffNote:'SYNTHETIC SECRETARY MUST NOT WRITE'});appointment=result.appointment;assert.equal((await r.db.prepare('SELECT staff_note FROM care_appointments WHERE id=?').bind(appointment.id).first()).staff_note,'','existing server ignores unauthorized clinical edits');assert.equal(appointment.state,'scheduled');assert.equal(result.calendarSync.status,'error');assert.equal((await r.calendarState()).creates,0);
 const listing=await secretary.json('/api/appointments?manage=1&view=active');assert.ok(!JSON.stringify(listing).includes('SYNTHETIC PRIVATE PREFERENCE'));assert.ok(JSON.stringify(listing).includes('error'));
 await page.reload();await page.getByRole('alert').filter({hasText:t('הייעוץ אושר, אך הסנכרון ל-Google Calendar נכשל.')}).first().waitFor();
 assert.ok(!(await page.locator('main').innerText()).includes('SYNTHETIC PRIVATE PREFERENCE'));await page.screenshot({path:resolve(evidence,`${lang}-${width}-calendar-failure.png`),fullPage:true});
 for(const actor of [a,b,coach])assert.equal((await actor.request('/api/appointments',{action:'retryCalendar',id:appointment.id,version:appointment.version})).status,403);
 for(const action of ['complete','noShow','followup','requestFeedback'])assert.equal((await secretary.request('/api/appointments',{action,id:appointment.id,version:appointment.version})).status,403);
 await r.setCalendarFailure(false);result=await secretary.json('/api/appointments',{action:'retryCalendar',id:appointment.id,version:appointment.version});assert.equal(result.calendarSync.status,'synced');assert.equal((await r.calendarState()).creates,1);
 await secretary.json('/api/appointments',{action:'retryCalendar',id:appointment.id,version:appointment.version});assert.equal((await r.calendarState()).creates,1);assert.equal((await r.calendarState()).events.length,1);
 const receipt=await r.db.prepare('SELECT * FROM google_calendar_sync WHERE appointment_id=?').bind(appointment.id).first();assert.ok(receipt.last_synced_at);assert.ok(receipt.last_attempt_at);assert.ok(receipt.event_id);
 result=await secretary.json('/api/appointments',{action:'schedule',id:appointment.id,version:appointment.version,startsAt:new Date(Date.now()+21*86400000).toISOString()});appointment=result.appointment;assert.equal(result.calendarSync.status,'synced');assert.equal((await r.calendarState()).creates,1);assert.equal(new Map((await r.calendarState()).events).get(receipt.event_id).start.dateTime,appointment.startsAt);
 result=await secretary.json('/api/appointments',{action:'cancel',id:appointment.id,version:appointment.version});assert.equal(result.appointment.state,'cancelled');assert.equal((await r.calendarState()).events.length,0);
 assert.ok((await a.json('/api/appointments')).appointments.some(x=>x.id===appointment.id&&x.state==='cancelled'));
 await viewAs(page,r,a,lang);await page.locator('details.browse-advanced > summary').click();await page.locator('details.browse-advanced .appointment-card').first().waitFor();assert.equal(await page.locator('details.browse-advanced .appointment-card').count(),2);assert.ok((await page.locator('main').innerText()).includes(t('בוטל')));assert.equal(await page.getByText(t('תיאום מועד'),{exact:true}).count(),0);
 const secretaryRow=(await owner.json('/api/user-management')).users.find(u=>u.user_id===secretary.id);
 await owner.json('/api/user-management',{action:'secretary',userId:secretary.id,version:secretaryRow.version,secretary:false,confirmed:true,operationId:randomUUID()});assert.equal((await secretary.request('/api/appointments?manage=1')).status,403);
 check(stage,{language:lang,width,requestedCancellationIsExistingRejection:true,syntheticCalendarCreates:1,noLiveEvents:true});
}

try{
 browser=await chromium.launch({headless:true,executablePath:process.env.DC_CHROMIUM||undefined});report.browser=browser.version();
 for(const {lang,width} of matrix){
  stage=`${lang}/${width} fixture startup`;const r=await pilotRuntime(),context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});let page,closing=false;
  try{
   await context.route('**/*',async route=>{try{
    const request=route.request(),u=new URL(request.url());if(u.origin!==r.origin){report.externalRequests.push(u.origin);return route.abort();}
    // Transport only: every response comes from built assets or the real Worker.
    const response=await r.fetch(new Request(request.url(),{method:request.method(),headers:await request.allHeaders(),...(['GET','HEAD'].includes(request.method())?{}:{body:request.postDataBuffer()})}));
    const body=Buffer.from(await response.arrayBuffer()),headers=Object.fromEntries([...response.headers].filter(([k])=>!['set-cookie','content-length','content-encoding','transfer-encoding'].includes(k)));
    if(response.headers.getSetCookie().length)headers['set-cookie']=response.headers.getSetCookie().join('\n');
    await route.fulfill({status:response.status,headers,body});
   }catch(error){if(!closing){report.transportErrors.push(String(error));await route.abort().catch(()=>{});}}});
   page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.browserErrors.push(e.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('status of'))console.error('PILOT browser console',message.text());});page.on('response',response=>{if(response.status()>=400)console.error('PILOT HTTP',response.status(),new URL(response.url()).pathname);});
   const owner=r.actor('owner');await owner.login();const {sessionId}=await workoutJourney(r,page,lang,width,owner);await importsJourney(r,page,lang,width);
   await rolesAndCalendar(r,page,owner,sessionId,lang,width);
   assert.deepEqual((await r.calendarState()).blocked,[]);await saveReport();
  }catch(e){report.failures.push({stage,message:String(e),classification:'UNCLASSIFIED: inspect failure and real handler evidence before assigning cause'});await saveReport();console.error('PILOT FAILED',stage,String(e));if(page)console.error('PILOT alerts',await page.getByRole('alert').allTextContents());if(page)await page.screenshot({path:resolve(evidence,'failure-'+lang+'.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{closing=true;await page?.close();await context.unrouteAll({behavior:'wait'});await context.close();await r.close();}
 }
 assert.equal(report.checks.length,6*matrix.length,'every selected journey must complete');assert.deepEqual(report.transportErrors,[]);assert.deepEqual(report.browserErrors,[]);assert.deepEqual(report.externalRequests,[]);check('all browser requests local; no browser JavaScript errors');await saveReport();
}catch(error){if(!report.failures.length)report.failures.push({stage,message:String(error),classification:'UNCLASSIFIED: inspect failure and real handler evidence before assigning cause'});await saveReport();throw error;}
finally{await browser?.close();}
