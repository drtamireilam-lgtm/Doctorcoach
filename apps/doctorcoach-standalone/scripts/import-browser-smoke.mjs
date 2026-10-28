// Actual importer UI with local synthetic files and HTTP fixtures. No LAB login,
// database save, remote assignment or deployment is performed by this harness.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
import {zipSync,strToU8} from 'fflate';
import {importVariantExercises} from '../lib/import-variant-exercises.ts';
await import('./prepare-pdf-assets.mjs');
const runtime=resolve('.sites-runtime');await mkdir(runtime,{recursive:true});
const fixture=await mkdtemp(join(runtime,'import-browser-'));
const evidence=resolve(process.env.DC_IMPORT_EVIDENCE??join(runtime,'import-browser-evidence'));await mkdir(evidence,{recursive:true});
await writeFile(join(fixture,'index.html'),'<!doctype html><html class="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
const cssImports=[...(await readFile(resolve('app/layout.tsx'),'utf8')).matchAll(/import '\.\/(.+\.css)';/g)].map(m=>`import '../../app/${m[1]}';`).join('');
await writeFile(join(fixture,'main.tsx'),`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ProgramExcelImport} from '../../components/program-excel-import';import {LanguageProvider} from '../../components/language-provider';${cssImports}function Harness(){const [draft,setDraft]=useState(null);return <LanguageProvider><main style={{maxWidth:1000,margin:'auto',padding:16}}><h1>Synthetic local import check</h1><ProgramExcelImport hasDraft={false} onAccept={(items,title)=>setDraft({items,title})}/><pre data-testid="accepted">{JSON.stringify(draft)}</pre></main></LanguageProvider>}createRoot(document.getElementById('root')).render(<Harness/>);`);
const fixtureApi={name:'synthetic-import-api',configureServer(server){server.middlewares.use((req,res,next)=>{if(!req.url?.startsWith('/api/'))return next();res.setHeader('content-type','application/json');if(req.method!=='GET'){res.statusCode=405;return res.end('{}');}if(req.url==='/api/import-mappings')return res.end(JSON.stringify({items:[{source:'Synthetic coach spelling',exerciseId:'bench',version:1}]}));if(req.url==='/api/exercises')return res.end(JSON.stringify({items:[],assigned:[],canCreate:false}));res.statusCode=404;res.end('{}');});}};
const server=await createServer({configFile:false,root:fixture,resolve:{alias:{'@':resolve('.')}},publicDir:resolve('public'),plugins:[react(),fixtureApi],server:{host:'127.0.0.1',port:37865,strictPort:true,fs:{allow:[resolve('.')]}}});
let browser,page;const checks=[],errors=[],external=[],apiWrites=[];
function workbook(rows){const files={'xl/workbook.xml':strToU8('<workbook><sheets><sheet name="Synthetic" id="r1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':strToU8('<worksheet><sheetData>'+rows.map((row,y)=>`<row r="${y+1}">`+row.map((v,x)=>`<c r="${String.fromCharCode(65+x)}${y+1}" t="inlineStr"><is><t>${v}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>')};return Buffer.from(zipSync(files));}
function pdf(rows){const stream=rows.flatMap((r,i)=>r.map((s,j)=>[s,[20,300,400][j],700-i*20])).map(([s,x,y])=>`BT /F1 12 Tf ${x} ${y} Td (${s}) Tj ET`).join('\n');const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let text='%PDF-1.7\n',offsets=[];objects.forEach((o,i)=>{offsets.push(text.length);text+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=text.length;text+=`xref\n0 6\n0000000000 65535 f \n${offsets.map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(text);}
try{
 await server.listen();browser=await chromium.launch({executablePath:process.env.DC_IMPORT_CHROMIUM||undefined,headless:true,args:['--no-sandbox']});
 for(const width of [390,1440])for(const lang of ['he','en']){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));await page.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin!=='http://127.0.0.1:37865'){external.push(url.origin);return route.abort();}if(url.pathname.startsWith('/api/')&&request.method()!=='GET')apiWrites.push(url.pathname);return route.continue();});
  for(const format of ['csv','xlsx','pdf']){
   await page.goto('http://127.0.0.1:37865/?lang='+lang);await page.locator('html[lang="'+lang+'"]').waitFor();await page.locator('.excel-import > summary').click();
   const rows=[['Exercise','Sets','Reps'],['Barbell horizontal bench press','3','6-8'],['leg curl machine','2','10'],...importVariantExercises.map(e=>[e.en,'2','8'])];if(format==='csv')rows.push(['','2','8'],['Legs 1','','']);
   const buffer=format==='csv'?Buffer.from(rows.map(r=>r.join(',')).join('\n')):format==='xlsx'?workbook(rows):pdf(rows);
   await page.locator('input[type=file]').setInputFiles({name:'synthetic.'+format,mimeType:format==='pdf'?'application/pdf':format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer});
   const read=page.getByRole('button',{name:'קריאה ובדיקת שורות התוכנית',exact:true});await read.waitFor();
   if(format==='pdf'){assert.equal(await read.isDisabled(),true);await page.getByRole('checkbox',{name:'השוויתי למקור ובדקתי שהשורות והעמודות בטבלה נכונות',exact:true}).check();}
   await read.click();const row=page.locator('.import-row-editor').filter({hasText:'leg curl machine'});await row.locator('summary').click();
   const help=row.locator('[data-recognition-review="ambiguous-variant"]');await help.waitFor();assert.ok((await help.innerText()).includes(lang==='en'?'seated or lying':'בישיבה או בשכיבה'));assert.equal(await help.getByRole('button').count(),2);assert.ok(!(await help.innerText()).includes('Leg Extension'));
   const accept=page.getByRole('button',{name:'טעינת התוכנית לטיוטה לבדיקה',exact:true});assert.equal(await accept.isDisabled(),true);
   if(format==='csv')for(const category of ['missing-name','heading']){const item=page.locator('.import-row-editor').filter({has:page.locator('[data-recognition-review="'+category+'"]')});await item.locator('summary').click();assert.equal(await item.locator('[data-recognition-review] button').count(),0);await item.getByRole('checkbox',{name:'דלג על השורה הזאת',exact:true}).check();}
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))console.error('OVERFLOW',await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left< -1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,w:e.getBoundingClientRect().width,text:e.textContent.slice(0,80)}))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+width+' '+lang+' '+format);
   if(format==='csv'){
    await page.screenshot({path:join(evidence,`${lang}-${width}-review.png`),fullPage:true});
    const pending=page.waitForEvent('download');await page.getByRole('link',{name:lang==='en'?'Download alias proposals for review':'הורדת הצעות כינויים לבדיקה',exact:true}).click();const download=await pending;const payload=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(payload.mode,'proposals_only');assert.equal(payload.proposals[0].source,'Synthetic coach spelling');
   }
   await help.getByRole('button',{name:/Seated Leg Curl/}).click();await row.waitFor({state:'detached'});
   await page.getByRole('checkbox',{name:'בדקתי את התצוגה המקדימה: ימי האימון, התרגילים וכל ערכי התוכנית נכונים',exact:true}).check();await accept.click();
   const accepted=JSON.parse(await page.getByTestId('accepted').innerText());assert.deepEqual(accepted.items.map(i=>i.exerciseId),['barbell-bench','seated-curl',...importVariantExercises.map(e=>e.id)]);assert.equal(accepted.items[0].repsMax,8);assert.equal(accepted.items[0].sets,3);assert.equal(accepted.items[1].sets,2);assert.ok(accepted.items.slice(2).every(i=>i.sets===2&&i.reps===8));
   checks.push({width,language:lang,format,acceptedIds:accepted.items.map(i=>i.exerciseId)});console.log('PASS',width,lang,format);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(apiWrites,[]);assert.deepEqual(external,[]);
 const report={scope:'Actual ProgramExcelImport in isolated local Vite harness. Synthetic catalog/memory GET fixtures and local onAccept callback; no authenticated save, assignment or live LAB.',checks,browserErrors:errors,apiWrites,externalRequests:external};await writeFile(join(evidence,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){if(page){console.error((await page.locator('body').innerText()).slice(-6000));await page.screenshot({path:join(evidence,'failure.png'),fullPage:true}).catch(()=>{});}console.error(error);process.exitCode=1;}
finally{await browser?.close();await server.close();await rm(fixture,{recursive:true,force:true});}
