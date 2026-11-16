/** Real whole-body GLB and production viewer; synthetic, public learning content only. */
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),fixture=await mkdtemp(join(tmpdir(),'dc-detailed-'));
const evidence=resolve(process.env.ANATOMY_EVIDENCE_DIR??'/tmp/dc-anatomy-evidence/detailed');await mkdir(evidence,{recursive:true});
const source=root.replaceAll('\\','/');
await writeFile(join(fixture,'index.html'),'<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {AnatomyModelViewer} from '/@fs/${source}/components/anatomy-model-viewer.tsx';import {anatomyModels} from '/@fs/${source}/lib/anatomy-models.ts';const language=new URLSearchParams(location.search).get('lang')||'en';createRoot(document.getElementById('root')).render(<AnatomyModelViewer model={anatomyModels.find(m=>m.id==='detailed')} language={language} autoOpen onExercise={id=>document.body.dataset.exercise=id} onMuscle={id=>document.body.dataset.muscle=id}/>);`);
const server=await createServer({configFile:false,root:fixture,publicDir:resolve('public'),plugins:[react()],resolve:{alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},server:{host:'127.0.0.1',port:37858,strictPort:true,fs:{allow:[root,fixture]}}});
await server.listen();let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({executablePath:process.env.ANATOMY_CHROMIUM||undefined,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 for(const lang of ['en','he'])for(const width of [320,390,430,768]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:37858/?lang='+lang);const viewer=page.locator('[data-model-id="detailed"]');
  const ready=viewer.getByRole('button',{name:lang==='he'?'מבט קדמי':'Front view',exact:true});await ready.waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Camera"] button,[aria-label="מצלמה"] button')?.disabled,{},{timeout:90000});
  assert.equal(await viewer.getByRole('button',{name:lang==='he'?'שרירים':'Muscles',exact:true}).count(),1);
  const picker=viewer.getByRole('combobox',{name:lang==='he'?'בחירת מבנה':'Select structure',exact:true});assert.equal(await picker.locator('option').count(),635);
  if(lang==='he')for(const label of await picker.locator('option').allTextContents())assert.ok(!/[A-Za-z]/.test(label),'Hebrew picker label: '+label);
  const regionNav=viewer.getByRole('group',{name:lang==='he'?'ניווט מהיר לפי אזור':'Quick body regions',exact:true});
  await regionNav.getByRole('button',{name:lang==='he'?'כף יד':'Hand',exact:true}).click();await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')??'{}').navigationArea==='hand');assert.equal(await viewer.getAttribute('data-navigation-area'),'hand');
  assert.ok(await picker.locator('option').count()<635);const handCamera=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera);
  if(width===390){await viewer.getByRole('button',{name:lang==='he'?'הזזת המודל →':'Pan model →',exact:true}).click();await regionNav.getByRole('button',{name:lang==='he'?'כף יד':'Hand',exact:true}).click();assert.deepEqual((await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera)).target,handCamera.target,'same-region click recenters after panning');}

  await regionNav.getByRole('button',{name:lang==='he'?'כף רגל':'Foot',exact:true}).click();await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')??'{}').navigationArea==='foot');const footCamera=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera);
  assert.ok(handCamera.target[1]-footCamera.target[1]>.2,'region camera follows actual hand and foot positions');
  await viewer.getByRole('button',{name:lang==='he'?'מבט אחורי':'Back view',exact:true}).click();const backCamera=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera);assert.deepEqual(backCamera.target,footCamera.target);
  if(width===390){await viewer.getByRole('button',{name:lang==='he'?'הגדלה':'Zoom in',exact:true}).click();const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera);await page.reload();await viewer.getByRole('button',{name:lang==='he'?'מבט קדמי':'Front view',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('[aria-label="Camera"] button,[aria-label="מצלמה"] button')?.disabled);assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera),saved,'reload preserves restored orbit/zoom camera');}

  await regionNav.getByRole('button',{name:lang==='he'?'כל הגוף':'Whole body',exact:true}).click();assert.equal(await picker.locator('option').count(),635);
  await picker.selectOption('detail-clavicular-part-of-left-deltoid');await viewer.getByRole('button',{name:lang==='he'?'מידע ותרגילים':'Explore & exercises',exact:true}).last().click();await viewer.locator('.anatomy-parent-context').waitFor();
  await picker.selectOption('detail-left-soleus');await viewer.getByRole('button',{name:lang==='he'?'התמקדות במבנה':'Focus structure',exact:true}).click();await regionNav.getByRole('button',{name:lang==='he'?'כל הגוף':'Whole body',exact:true}).click();assert.deepEqual((await page.evaluate(()=>JSON.parse(sessionStorage.getItem('dc-detailed-view')).camera)).target,[0,0,0],'whole body returns from individual focus even when already selected');
  await picker.selectOption('detail-left-multifidus-cervicis');assert.equal(await viewer.getByRole('button',{name:lang==='he'?'הצגת קבוצת השריר':'Show muscle group',exact:true}).isEnabled(),false);
  await picker.selectOption('detail-left-soleus');await viewer.getByRole('button',{name:lang==='he'?'הסתרת המבנה':'Hide structure',exact:true}).click();assert.equal(await picker.locator('option[value="detail-left-soleus"]').count(),0);
  await viewer.getByRole('button',{name:lang==='he'?'ביטול ההסתרה האחרונה':'Undo last hide',exact:true}).click();assert.equal(await picker.locator('option[value="detail-left-soleus"]').count(),1);
  await viewer.getByRole('button',{name:lang==='he'?'שכבה שטחית':'Superficial layer',exact:true}).click();assert.ok(await picker.locator('option').count()<635);assert.equal(await picker.locator('option[value="detail-left-rectus-abdominis"]').count(),0);
  await viewer.getByRole('button',{name:lang==='he'?'שכבה שטחית':'Superficial layer',exact:true}).click();
  await viewer.getByRole('combobox',{name:lang==='he'?'צד לתצוגה':'Visible side',exact:true}).selectOption('left');assert.equal(await picker.locator('option[value="detail-right-soleus"]').count(),0);
  await viewer.getByRole('combobox',{name:lang==='he'?'צד לתצוגה':'Visible side',exact:true}).selectOption('both');
  await picker.selectOption('detail-left-latissimus-dorsi');await viewer.getByRole('button',{name:lang==='he'?'מידע ותרגילים':'Explore & exercises',exact:true}).last().click();await viewer.locator('.anatomy-selection-details').waitFor();
  assert.ok(await viewer.locator('.atlas-exercises').count());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await viewer.locator('canvas').scrollIntoViewIfNeeded();await page.screenshot({path:join(evidence,`detailed-${lang}-${width}.png`),fullPage:true});
  await viewer.getByRole('button',{name:lang==='he'?'מבט אחורי':'Back view',exact:true}).click();await viewer.locator('canvas').screenshot({path:join(evidence,`detailed-back-${lang}-${width}.png`)});
  checks.push({lang,width,inventory:634,hideUndo:true,depth:true,side:true,canonicalLearning:true,noOverflow:true});await page.close();
 }
 assert.deepEqual(errors,[]);await writeFile(join(evidence,'browser.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors}));
}finally{await browser?.close();await server.close();}
