// Synthetic local React + controller + SQLite acceptance; no hosted data or provider calls.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,mkdtemp,writeFile,readFile,realpath,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
import {platform,client} from '../tests/platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {trainingAccess} from '../lib/training-access.ts';
import {completedWorkoutCorrectionStore} from '../lib/completed-workout-correction-store.ts';
import {toKg} from '../lib/load-units.ts';
const cleanup=[],f=platform({after:fn=>cleanup.push(fn)});await f.connect();
const store=completedWorkoutCorrectionStore(f.db),runtime=resolve('.sites-runtime');await mkdir(runtime,{recursive:true});
const fixture=await mkdtemp(join(runtime,'completed-correction-')),evidence=resolve(process.env.DC_CORRECTION_EVIDENCE??join(runtime,'completed-correction-evidence'));await mkdir(evidence,{recursive:true});
const css=[...(await readFile('app/layout.tsx','utf8')).matchAll(/import '\.\/(.+\.css)';/g)].map(m=>`import '../../app/${m[1]}';`).join('');
await writeFile(join(fixture,'index.html'),'<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import{CompletedWorkoutCorrection}from'../../components/completed-workout-correction';import{LanguageProvider}from'../../components/language-provider';import{useTraining}from'../../hooks/use-training';${css}function App(){const c=useTraining(),s=c.feed.history[0];return <main style={{maxWidth:800,margin:'auto',padding:12}}>{s&&<CompletedWorkoutCorrection session={s} controller={c}/>}<pre hidden data-testid="feed">{JSON.stringify(c.feed)}</pre></main>}createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);`);
let failNext=false;const requests=[];
const server=await createServer({configFile:false,root:fixture,cacheDir:join(fixture,'cache'),plugins:[react(),{name:'local-correction-api',configureServer(server){server.middlewares.use('/api',async(req,res)=>{
 try {let bytes='';for await(const chunk of req)bytes+=chunk;const payload=bytes?JSON.parse(bytes):null;let result;
  if(req.url==='/program')result={items:await f.training.getPlan(client.userId),access:await trainingAccess(f.db,client.userId),split:null,workoutPreference:{mode:'fixed',version:0}};
  else if(req.url==='/training')result=await f.training.feed(client.userId);
  else if(req.url==='/logs')result={logs:[]};else if(req.url==='/favorites')result={favorites:[]};
  else if(req.url==='/training/corrections'){requests.push(payload);if(failNext){failNext=false;res.statusCode=503;result={error:'Synthetic disconnection'};}else result=await store.correct(client.userId,payload);}
  else {res.statusCode=404;result={error:'Unknown synthetic route'};}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 }catch(e){res.statusCode=e.status??500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}
});}}],server:{host:'127.0.0.1',port:37879,strictPort:true,fs:{allow:[resolve('.'),await realpath('node_modules')]}}});
let browser;const results=[],errors=[];
try {
 await server.listen();browser=await chromium.launch({executablePath:process.env.DC_CHROMIUM??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const language of ['he','en'])for(const width of (process.env.DC_CORRECTION_WIDTHS??'320,390,430,768,1363').split(',').map(Number)){
  f.sql.exec("DELETE FROM training_sessions;DELETE FROM program_items;");
  await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),occurrenceId:'first',sets:1,weight:20});
  await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),occurrenceId:'second',sets:1,weight:toKg(50,'lb'),load:{sourceValue:50,sourceUnit:'lb',basis:'total'},effortScale:'rir'});
  let historical=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
  for(const item of historical.items)historical=await f.training.patch(client.userId,{id:historical.id,version:historical.version,action:'set',exerciseId:item.exerciseId,occurrenceId:item.occurrenceId,setIndex:0,done:true,amount:8,weight:item.weight,actualRpe:7});
  historical=await f.training.patch(client.userId,{id:historical.id,version:historical.version,action:'finish',after:0});
  const original=structuredClone(historical),active=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
  const context=await browser.newContext({viewport:{width,height:936}});await context.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:37879'?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
  const t=(he,en)=>language==='he'?he:en,open=()=>page.getByRole('button',{name:t('תיקון סט שתועד','Correct a recorded set'),exact:true}).click();
  await page.goto('http://127.0.0.1:37879/?lang='+language,{waitUntil:'domcontentloaded',timeout:90000});await open();
  await page.getByLabel(t('מופע תרגיל','Exercise occurrence'),{exact:true}).selectOption('second');
  const weight=page.getByLabel(t('משקל (lb)','Weight (lb)'),{exact:true});await weight.fill('57.9');await page.getByLabel(t('חזרות','Repetitions'),{exact:true}).fill('9');await page.getByLabel('RIR',{exact:true}).fill('2');
  const save=()=>page.getByRole('button',{name:t('שמירת התיקון','Save correction'),exact:true});
  failNext=true;const start=requests.length;await save().click();await page.getByRole('alert').waitFor();assert.equal(await weight.inputValue(),'57.9');await save().click();await page.getByText(t('התיקון נשמר בהיסטוריית האימון.','The correction was saved in workout history.'),{exact:true}).waitFor();
  assert.equal(requests[start].requestId,requests[start+1].requestId);
  let saved=(await f.training.feed(client.userId)).history[0];assert.equal(saved.items[1].results[0].weight,toKg(57.9,'lb'));assert.equal(saved.items[1].results[0].actualRpe,8);assert.deepEqual(saved.items[0],original.items[0]);assert.equal(saved.startedAt,original.startedAt);assert.equal(saved.finishedAt,original.finishedAt);assert.equal(saved.retrospective,null);assert.equal((await f.training.feed(client.userId)).active.id,active.id);
  await open();await page.getByLabel(t('משקל (kg)','Weight (kg)'),{exact:true}).fill('22.6');
  saved=await store.correct(client.userId,{sessionId:saved.id,version:saved.version,requestId:randomUUID(),exerciseId:'goblet',occurrenceId:'first',setIndex:0,amount:10,weight:24.5,actualRpe:7});
  await save().click();await page.getByRole('alert').waitFor();assert.equal(await save().isDisabled(),true);await page.getByLabel(t('משקל (kg)','Weight (kg)'),{exact:true}).fill('23.9');assert.equal(await save().isDisabled(),true);
  await page.getByRole('button',{name:t('טעינה מחדש וביטול העריכה','Reload and discard changes'),exact:true}).click();await open();assert.equal(await page.getByLabel(t('משקל (kg)','Weight (kg)'),{exact:true}).inputValue(),'24.5');
  const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(geometry.scroll<=width+1,JSON.stringify(geometry));
  const targets=await page.locator('input,select,button').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().width>0).map(n=>({tag:n.tagName,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));assert.ok(targets.every(n=>n.height>=40&&n.width>=40),JSON.stringify(targets));
  await page.screenshot({path:join(evidence,`correction-${language}-${width}.png`),fullPage:true});results.push({language,width,decimalLbRir:true,retry:true,conflict:true,activePreserved:true,geometry});console.log('PASS completed correction',language,width);await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(join(evidence,'results.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser?.close();await server.close();await rm(fixture,{recursive:true,force:true});for(const fn of cleanup.reverse())await fn();}
