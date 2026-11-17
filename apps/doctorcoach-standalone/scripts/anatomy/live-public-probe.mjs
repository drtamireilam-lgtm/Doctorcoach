/** Anonymous, read-only public application test. No Cloud Browser internals. */
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {LAB_ORIGIN,allowPublicRequest} from './live-public-policy.mjs';
const dir='/tmp/dc-anatomy-live-public';
await mkdir(dir,{recursive:true});
const evidence={origin:LAB_ORIGIN,startedAt:new Date().toISOString(),renderer:'fresh CI Chromium with SwiftShader',blocked:[],errors:[],responses:[],checks:[]};
let browser,page;
try{
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 await context.route('**/*',route=>{const r=route.request();if(allowPublicRequest(r.url(),r.method()))return route.continue();let path;try{path=new URL(r.url()).pathname;}catch{path='invalid';}evidence.blocked.push({method:r.method(),path});return route.abort();});
 page=await context.newPage();
 page.on('requestfailed',request=>{const url=new URL(request.url());if(url.origin===LAB_ORIGIN)evidence.errors.push({type:'requestfailed',method:request.method(),path:url.pathname,failure:request.failure()?.errorText});});
 page.on('pageerror',error=>evidence.errors.push({type:'pageerror',message:error.message}));
 page.on('console',message=>{if(message.type()==='error')evidence.errors.push({type:'console',message:message.text()});});
 page.on('response',response=>{const url=new URL(response.url());if(/\.(?:glb|js)$/.test(url.pathname)||response.status()>=400)evidence.responses.push({path:url.pathname,status:response.status(),mime:response.headers()['content-type']});});
 for(const language of ['he','en']){
  await page.goto(LAB_ORIGIN+'/?lang='+language+'#learn?region=shoulder&muscle=deltoid',{waitUntil:'domcontentloaded',timeout:60000});
  const viewer=page.locator('[data-model-id="shoulder"]');
  await viewer.waitFor({timeout:30000});
  const open=viewer.getByRole('button',{name:language==='he'?'פתיחת מודל הכתף':'Open shoulder model',exact:true});
  if(await open.count())await open.click();
  await page.waitForFunction(()=>{const v=document.querySelector('[data-model-id="shoulder"]');return v?.querySelector('[role="alert"]')||v?.querySelector('canvas')&&v.querySelector('.anatomy-viewer-toolbar button')?.disabled===false;},null,{timeout:60000});
  const alert=viewer.getByRole('alert');
  if(await alert.count()){await page.screenshot({path:dir+'/'+language+'-failure.png',fullPage:true});throw new Error('Public model fallback: '+await alert.innerText());}
  const canvas=viewer.locator('canvas');await canvas.scrollIntoViewIfNeeded();
  await viewer.locator('.anatomy-viewer-toolbar button').nth(0).click();await page.waitForTimeout(800);
  const front=await canvas.screenshot({path:dir+'/'+language+'-front.png'});
  await viewer.locator('.anatomy-viewer-toolbar button').nth(1).click();await page.waitForTimeout(800);
  const back=await canvas.screenshot({path:dir+'/'+language+'-back.png'});
  assert.equal(front.equals(back),false,'Front and back must render different frames');
  assert.equal(await viewer.locator('canvas').count(),1);
  evidence.checks.push({language,model:'shoulder',rendered:true,frontBackChanged:true});
 }
 evidence.passed=true;
}catch(error){if(page)await page.screenshot({path:dir+'/failure.png',fullPage:true,timeout:10000}).catch(()=>{});evidence.passed=false;evidence.failure=String(error);process.exitCode=1;}
finally{await browser?.close();evidence.finishedAt=new Date().toISOString();await writeFile(dir+'/result.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:evidence.passed,checks:evidence.checks,failure:evidence.failure}));}
