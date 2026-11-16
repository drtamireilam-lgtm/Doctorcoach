/** Real bundled shoulder GLB and production annotation UI. No accounts or clinical data. */
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {chromium} from '@playwright/test';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),fixture=await mkdtemp(join(tmpdir(),'dc-annotations-'));
const evidence=resolve(process.env.ANATOMY_EVIDENCE_DIR??join(tmpdir(),'dc-annotations-evidence'));
await mkdir(evidence,{recursive:true});
const source=root.replaceAll('\\','/');
await writeFile(join(fixture,'index.html'),'<html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}*{box-sizing:border-box}</style><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import {AnatomyModelViewer} from '/@fs/${source}/components/anatomy-model-viewer.tsx';import {anatomyModels} from '/@fs/${source}/lib/anatomy-models.ts';import {LanguageProvider,useLanguage} from '/@fs/${source}/components/language-provider.tsx';function App(){const {language}=useLanguage();return <AnatomyModelViewer model={anatomyModels.find(m=>m.id==='shoulder')} initialSelection="deltoid" autoOpen language={language} onExercise={()=>{}} onMuscle={()=>{}}/>}createRoot(document.getElementById('root')).render(<LanguageProvider><App/></LanguageProvider>);`);
const server=await createServer({configFile:false,root:fixture,publicDir:resolve('public'),plugins:[react()],resolve:{alias:{react:resolve('node_modules/react'),'react-dom':resolve('node_modules/react-dom')}},server:{host:'127.0.0.1',port:37853,strictPort:true,fs:{allow:[root,fixture]}}});
await server.listen();let browser,page;const errors=[],checks=[];
try{
 browser=await chromium.launch({executablePath:process.env.ANATOMY_CHROMIUM||undefined,headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 page=await browser.newPage({hasTouch:true});page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 const viewer=page.locator('[data-model-id="shoulder"]'),card=viewer.locator('.anatomy-annotation-card'),line=viewer.locator('.anatomy-annotation-lines line');
 async function ready(){await viewer.locator('canvas').waitFor();await page.waitForFunction(()=>{const b=document.querySelector('[data-model-id="shoulder"] select');return b&&[...b.options].some(o=>o.value==='deltoid');});await viewer.getByRole('combobox').first().selectOption('deltoid');await card.waitFor();await line.waitFor({state:'attached'});}
 async function anchor(){return line.evaluate(el=>[Number(el.getAttribute('x1')),Number(el.getAttribute('y1'))]);}
 async function bounds(){const stage=await viewer.locator('.anatomy-viewer-stage').boundingBox(),label=await card.boundingBox();assert.ok(stage&&label,'model stage and selected annotation visible');assert.ok(label.x>=stage.x-1&&label.y>=stage.y-1&&label.x+label.width<=stage.x+stage.width+1&&label.y+label.height<=stage.y+stage.height+1,'annotation remains within model stage');assert.ok((await anchor()).every(Number.isFinite));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');}
 await page.goto('http://127.0.0.1:37853/?lang=en',{waitUntil:'domcontentloaded'});await ready();
 assert.equal(await card.getAttribute('data-selected-structure'),'deltoid');
 await viewer.getByRole('button',{name:'Front view',exact:true}).click();
 const unselected=await viewer.locator('canvas').screenshot();
 await viewer.getByRole('button',{name:'Clear selection',exact:true}).click();await card.waitFor({state:'hidden'});
 const clear=await viewer.locator('canvas').screenshot();assert.notDeepEqual(clear,unselected,'selection changes rendered highlight');
 await viewer.getByRole('combobox').first().selectOption('deltoid');await card.waitFor();
 for(const name of ['Pan model →','Zoom in','Back view','Front view']){const before=await anchor();await viewer.getByRole('button',{name,exact:true}).click();await page.waitForFunction(before=>{const el=document.querySelector('.anatomy-annotation-lines line');return el&&(Math.abs(Number(el.getAttribute('x1'))-before[0])>0.1||Math.abs(Number(el.getAttribute('y1'))-before[1])>0.1);},before);await bounds();checks.push(name+' updates projected anchor');}
 for(const language of ['en','he'])for(const width of [320,390,430,768,1280]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:37853/?lang='+language,{waitUntil:'domcontentloaded'});await ready();await bounds();assert.equal(await viewer.getAttribute('dir'),language==='he'?'rtl':'ltr');await page.screenshot({path:join(evidence,`annotations-${language}-${width}.png`),fullPage:true});checks.push(language+' '+width+'px bounded selected annotation');}
 await page.goto('http://127.0.0.1:37853/?lang=en',{waitUntil:'domcontentloaded'});await ready();
 await viewer.getByRole('button',{name:'Show muscle group',exact:true}).click();
 assert.equal(await viewer.getByRole('combobox').first().locator('option[value="deltoid"]').count(),1);assert.equal(await viewer.getByRole('combobox').first().locator('option[value="humerus"]').count(),0);checks.push('muscle group preserves selected muscle and hides bone');
 await viewer.getByRole('button',{name:/Restore hidden structures/}).click();
 await viewer.getByRole('button',{name:'Focus structure',exact:true}).click();
 await viewer.locator('canvas').scrollIntoViewIfNeeded();
 const tapAnchor=await anchor();
 await viewer.getByRole('button',{name:'Clear selection',exact:true}).click();
 await viewer.locator('canvas').scrollIntoViewIfNeeded();
 const currentStage=await viewer.locator('.anatomy-viewer-stage').boundingBox();
 await page.touchscreen.tap(currentStage.x+tapAnchor[0],currentStage.y+tapAnchor[1]);
 await page.waitForFunction(()=>Boolean(document.querySelector('[data-model-id="shoulder"] select')?.value));
 const hit=await viewer.getByRole('combobox').first().inputValue();assert.ok(hit,'visible mesh selected by touch');checks.push('real canvas touch raycast selects '+hit);
 await viewer.getByRole('button',{name:'Clear selection',exact:true}).click();
 await viewer.locator('canvas').scrollIntoViewIfNeeded();
 const hoverStage=await viewer.locator('.anatomy-viewer-stage').boundingBox();
 await page.mouse.move(hoverStage.x+tapAnchor[0],hoverStage.y+tapAnchor[1]);await card.waitFor();
 const previewId=await card.getAttribute('data-selected-structure');
 await card.getByRole('button',{name:'Select structure',exact:true}).hover();
 await card.getByRole('button',{name:'Select structure',exact:true}).click();assert.equal(await viewer.getByRole('combobox').first().inputValue(),previewId);
 await card.getByRole('button',{name:'Explore & exercises',exact:true}).click();
 await viewer.locator('.atlas-definitions').first().waitFor();checks.push('hover preview remains reachable across canvas gap and opens details');
 await viewer.getByRole('combobox').first().selectOption('deltoid');await card.waitFor();
 await card.getByRole('button',{name:'Explore & exercises',exact:true}).click();await viewer.locator('.atlas-definitions').first().waitFor();checks.push('annotation opens educational details');
 const exerciseType=viewer.getByLabel('Exercise type',{exact:true});await exerciseType.selectOption('stretch');
 const stretchCards=viewer.locator('.atlas-exercises button');for(const text of await stretchCards.allTextContents())assert.match(text,/Stretch target/);
 if(!await stretchCards.count())await viewer.getByText('No exercises of this type.',{exact:true}).waitFor();
 await exerciseType.selectOption('all');assert.ok(await viewer.locator('.atlas-exercises button').count());checks.push('explicitly named exercise filter separates stretches and restores existing role cards');
 await viewer.getByRole('button',{name:'Isolate structure',exact:true}).click();assert.equal(await card.getAttribute('data-selected-structure'),'deltoid');
 await viewer.getByRole('button',{name:'Hide structure',exact:true}).click();await card.waitFor({state:'hidden'});assert.equal(await viewer.getByRole('combobox').first().locator('option[value="deltoid"]').count(),0);
 await viewer.getByRole('button',{name:/Restore hidden structures/}).click();await viewer.getByRole('combobox').first().selectOption('deltoid');await card.waitFor();
 await viewer.getByRole('button',{name:'Clear selection',exact:true}).click();await card.waitFor({state:'hidden'});checks.push('isolate, hide, restore and clear retain consistent annotation state');
 assert.deepEqual(errors,[]);await writeFile(join(evidence,'annotations-checks.json'),JSON.stringify({checks,errors,scope:'Real shoulder GLB in isolated viewer fixture, Chromium software WebGL; responsive widths, no authenticated app coverage'},null,2));console.log(JSON.stringify({checks,errors,evidence},null,2));
}catch(error){console.error('Annotation page errors:',errors);if(page)console.error((await page.locator('body').innerText()).slice(-2500));throw error;}
finally{await browser?.close();await server.close();}
