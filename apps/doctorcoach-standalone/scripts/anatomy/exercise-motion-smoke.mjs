/** Actual shared renderer and source asset, isolated UI fixture; no records/auth/provider writes. */
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),source=root.replaceAll('\\','/'),fixture=await mkdtemp(join(tmpdir(),'dc-exercise-motion-'));
const evidence=resolve(process.env.ANATOMY_EVIDENCE_DIR??join(tmpdir(),'dc-exercise-motion-evidence'));await mkdir(evidence,{recursive:true});
await writeFile(join(fixture,'index.html'),'<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider,LanguageToggle} from '/@fs/${source}/components/language-provider.tsx';import {ExerciseAnatomicalDemo} from '/@fs/${source}/components/exercise-anatomical-demo.tsx';createRoot(document.getElementById('root')).render(<LanguageProvider><LanguageToggle/><ExerciseAnatomicalDemo exerciseId="barbell-curl"/></LanguageProvider>);`);
const server=await createServer({configFile:false,root:fixture,publicDir:resolve('public'),plugins:[react()],define:{'process.env.NEXT_PUBLIC_DC_ANATOMY_TARGET':JSON.stringify('local-development')},resolve:{alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},server:{host:'127.0.0.1',port:37854,strictPort:true,fs:{allow:[root,fixture]}}});await server.listen();let browser;
const checks=[],errors=[],viewports=[],poses=[];let metrics;
try{
 browser=await chromium.launch({executablePath:process.env.ANATOMY_CHROMIUM||undefined,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:37854/?lang=en',{waitUntil:'domcontentloaded'});assert.equal(await page.locator('canvas').count(),0);checks.push('no canvas or asset rendering before explicit open');
 await page.getByRole('button',{name:'3D Anatomical Demonstration',exact:true}).click();const player=page.locator('[data-exercise-motion="barbell-curl"]');await player.getByRole('button',{name:'Play',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('[data-exercise-motion] button[aria-pressed="false"]')?.disabled&&!!document.querySelector('canvas'));await player.getByRole('button',{name:'Reset motion',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Reset motion');return b&&!b.disabled;});
 const canvas=player.locator('canvas'),slider=player.getByRole('slider');await canvas.scrollIntoViewIfNeeded();const neutral=await canvas.screenshot({path:join(evidence,'curl-neutral.png')});await slider.focus();await slider.fill('50');assert.equal(await slider.inputValue(),'50');const flexed=await canvas.screenshot({path:join(evidence,'curl-flexed.png')});assert.notDeepEqual(neutral,flexed);await slider.press('End');assert.equal(await slider.inputValue(),'100');assert.equal(await player.locator('[data-motion-angle]').getAttribute('data-motion-angle'),'0.00');checks.push('source bones flex at mid-repetition and return to the same pose at completion');
 const widths=[320,390,430,768,1280];
 async function checkWidths(direction){
  for(const width of widths){
   await page.setViewportSize({width,height:width<768?844:900});
   const dimensions=await player.evaluate(element=>{
    const controls=[...element.querySelectorAll('button,input,select,canvas')];
    return {viewport:innerWidth,document:document.documentElement.scrollWidth,direction:element.dir,controlsFit:controls.every(control=>{const box=control.getBoundingClientRect();return box.left>=-1&&box.right<=innerWidth+1;})};
   });
   assert.equal(dimensions.viewport,width);
   assert.equal(dimensions.direction,direction);
   assert.ok(dimensions.document<=width&&dimensions.controlsFit,JSON.stringify(dimensions));
   viewports.push({width,...dimensions});
  }
  await page.setViewportSize({width:390,height:844});
 }
 await checkWidths('ltr');
 await player.getByRole('button',{name:'Side view',exact:true}).click();
 const pictures=[];
 for(const progress of [0,25,50,75,100]){
  await slider.fill(String(progress));
  const angle=await player.locator('[data-motion-angle]').getAttribute('data-motion-angle');
  assert.equal(Number(angle),[0,50,100,50,0][poses.length]);
  const file='curl-side-'+String(progress).padStart(3,'0')+'.png';
  pictures.push(await canvas.screenshot({path:join(evidence,file)}));
  poses.push({progress,angle:Number(angle),file});
 }
 assert.deepEqual(pictures[0],pictures[4]);
 assert.deepEqual(pictures[1],pictures[3]);
 assert.notDeepEqual(pictures[0],pictures[1]);
 assert.notDeepEqual(pictures[1],pictures[2]);
 checks.push('side-view captures confirm neutral loop closure and matched poses at quarter and three-quarter progress');
 await player.getByRole('button',{name:'Reset camera',exact:true}).click();
 await player.getByRole('button',{name:'Reset motion',exact:true}).click();await player.getByLabel('Animation speed',{exact:true}).selectOption('2');await player.getByRole('button',{name:'Play',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
 metrics=await page.evaluate(async()=>{const e=document.querySelector('[data-motion-angle]');let updates=0;const observer=new MutationObserver(records=>updates+=records.length);observer.observe(e,{attributes:true,attributeFilter:['data-motion-angle']});const start=performance.now();await new Promise(r=>setTimeout(r,2000));observer.disconnect();return {updates,milliseconds:performance.now()-start,angle:e.dataset.motionAngle};});assert.ok(metrics.updates>=2);assert.ok(metrics.updates<=Math.ceil(metrics.milliseconds/1000*31)+2);checks.push('playback advances at selected speed with bounded animation update scheduling');
 await player.getByRole('button',{name:'Pause',exact:true}).click();const paused=await player.locator('[data-motion-angle]').getAttribute('data-motion-angle');await page.waitForTimeout(400);assert.equal(await player.locator('[data-motion-angle]').getAttribute('data-motion-angle'),paused);checks.push('pause freezes the pose');
 await canvas.scrollIntoViewIfNeeded();const beforeOrbit=await canvas.screenshot(),box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.5,{steps:6});await page.mouse.up();assert.notDeepEqual(await canvas.screenshot(),beforeOrbit);checks.push('free camera orbit remains available');
 await player.getByRole('button',{name:'Play',exact:true}).click();await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5,{steps:5});await page.mouse.up();assert.equal(await player.getAttribute('data-motion-playing'),'true');await player.getByRole('button',{name:'Pause',exact:true}).click();checks.push('camera orbit does not stop running playback');
 await player.getByRole('button',{name:'Skeleton and joints',exact:true}).click();await player.getByRole('button',{name:'Muscles in reference pose',exact:true}).click();assert.equal(await player.getByRole('button',{name:'Play',exact:true}).isDisabled(),true);assert.equal(await slider.isDisabled(),true);const legend=player.getByRole('group',{name:'Muscle roles'});assert.equal(await legend.getByRole('listitem').count(),10);await player.getByText(/use the source reference pose/i).waitFor();const muscle=legend.getByRole('button').first();await muscle.click();assert.equal(await muscle.getAttribute('aria-pressed'),'true');await canvas.screenshot({path:join(evidence,'curl-muscle-reference.png')});await player.getByRole('button',{name:'Reset highlighting',exact:true}).click();assert.equal(await muscle.getAttribute('aria-pressed'),'false');await player.getByRole('button',{name:'Bones',exact:true}).click();assert.equal(await player.getByRole('button',{name:'Bones',exact:true}).getAttribute('aria-pressed'),'false');await player.getByText('Model source and review',{exact:true}).click();await player.getByText(/BodyParts3D, © The Database Center for Life Science/).waitFor();checks.push('neutral-only muscle reference exposes qualitative roles, bone layer and source attribution');
 await player.getByRole('button',{name:'Movement demonstration',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='Play'&&b.disabled));await slider.focus();await slider.press('End');assert.equal(await slider.inputValue(),'100');checks.push('reduced motion blocks autoplay while preserving manual pose exploration');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'מעבר לעברית',exact:true}).click();assert.equal(await player.getAttribute('dir'),'rtl');await player.getByRole('button',{name:'איפוס תנועה',exact:true}).click();await player.getByRole('button',{name:'הפעלה',exact:true}).click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>document.querySelector('[data-motion-playing]')?.dataset.motionPlaying==='false');checks.push('hidden-document event pauses playback; Hebrew controls and RTL remain available');
 await checkWidths('rtl');checks.push('controls and canvas fit at 320, 390, 430, 768 and 1280 pixels in Hebrew RTL and English LTR');
 await player.screenshot({path:join(evidence,'curl-he-mobile.png')});
 await page.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),extension=gl.getExtension('WEBGL_lose_context'),old=extension.loseContext.bind(extension);window.__motionDisposed=0;extension.loseContext=()=>{window.__motionDisposed++;old();};});await page.getByRole('button',{name:'סגירת הדגמת תלת־ממד',exact:true}).click();assert.equal(await page.locator('canvas').count(),0);assert.ok(await page.evaluate(()=>window.__motionDisposed>=1));checks.push('closing disposes the WebGL context and removes the animation scene');
 assert.deepEqual(errors,[]);await writeFile(join(evidence,'motion-checks.json'),JSON.stringify({checks,errors,metrics,viewports,poses,browser:browser.version(),scope:'Standalone React player fixture with the application renderer and real source asset; Chromium software WebGL and simulated viewport sizes'},null,2));console.log(JSON.stringify({checks,errors,metrics,viewports,poses},null,2));
}finally{await browser?.close();await server.close();}
