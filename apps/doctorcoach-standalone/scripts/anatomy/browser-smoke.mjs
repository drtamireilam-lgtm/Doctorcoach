/** Run after installing Chromium: ANATOMY_CHROMIUM=/path/to/chrome node scripts/anatomy/browser-smoke.mjs */
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const port=process.env.ANATOMY_TEST_PORT??'37851';
// This dummy ID matches the existing local Sites binding. Hard-coded --local prevents remote writes.
const fixtureDir=await mkdtemp(join(tmpdir(),'dc-anatomy-fixture-'));
const fixtureConfig=join(fixtureDir,'wrangler.json');
await writeFile(fixtureConfig,JSON.stringify({name:'doctorcoach-anatomy-local-tests',compatibility_date:'2026-10-14',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:resolve('drizzle')}]}));
const migrate=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',fixtureConfig,'--persist-to',resolve('.wrangler/state')],{encoding:'utf8',timeout:120000,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
assert.equal(migrate.status,0,'Local test migrations failed: '+migrate.stdout+migrate.stderr);
const server=await createServer({server:{host:'127.0.0.1',port:Number(port),strictPort:true}});
await server.listen();
const logs='';
let browser,page;const errors=[];const serverErrors=[];const checks=[];
try{
 let available=false;
 for(let i=0;i<12;i++){try{const r=await fetch('http://127.0.0.1:'+port+'/anatomy-preview',{signal:AbortSignal.timeout(5000)});if(i%10===0)console.log('HTTP',r.status,(await r.clone().text()).slice(0,160));if(r.ok){available=true;break;}}catch(e){if(i%10===0)console.log('Waiting for app:',e.message);}await new Promise(resolve=>setTimeout(resolve,1000));}
 assert.ok(available,'Local app did not start: '+logs.slice(-2000));
 browser=await chromium.launch({executablePath:process.env.ANATOMY_CHROMIUM||undefined,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});page=await context.newPage();page.setDefaultNavigationTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)serverErrors.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:'+port+'/anatomy-preview',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'פתיחת מודל הכתף'}).click();
 await page.getByRole('button',{name:'מבט קדמי',exact:true}).waitFor({state:'visible'});
 await page.waitForFunction(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='מבט קדמי');return button&&!button.disabled;},{timeout:60000});
 assert.equal(await page.locator('canvas').count(),1);console.log('Check passed:',checks.length+1);checks.push('real GLB loaded and WebGL canvas rendered');
 await page.getByRole('combobox').selectOption('deltoid');await page.getByRole('heading',{name:'דלתואיד',exact:true}).waitFor();
 assert.equal(await page.locator('section[aria-label="כתף בתלת־ממד"]').getAttribute('dir'),'rtl');console.log('Check passed:',checks.length+1);checks.push('Hebrew selection, content and RTL');
 const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();const bounds=await canvas.boundingBox();const snapshot=()=>page.screenshot({clip:bounds,animations:'disabled',timeout:60000});const before=await snapshot();
 await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.8,bounds.y+bounds.height*.5,{steps:12});await page.mouse.up();
 const rotated=await snapshot();assert.notDeepEqual(rotated,before);console.log('Check passed:',checks.length+1);checks.push('mouse orbit changes rendered pixels');
 await page.getByRole('button',{name:'מבט אחורי',exact:true}).click();assert.notDeepEqual(await snapshot(),rotated);console.log('Check passed:',checks.length+1);checks.push('camera preset changes pixels');
 await page.getByRole('button',{name:'שרירים',exact:true}).click();assert.equal(await page.getByRole('combobox').locator('option[value="deltoid"]').count(),0);console.log('Check passed:',checks.length+1);checks.push('hidden layer cannot be selected');
 await page.getByRole('button',{name:'שרירים',exact:true}).click();await page.getByRole('combobox').selectOption('deltoid');
 await page.getByRole('button',{name:'Switch language',exact:true}).click();await page.getByRole('heading',{name:'Deltoid',exact:true}).waitFor();
 assert.equal(await page.locator('section[aria-label="3D shoulder"]').getAttribute('dir'),'ltr');console.log('Check passed:',checks.length+1);checks.push('language switch keeps selection and LTR');
 assert.ok(await page.getByRole('button',{name:/Primary muscle|Assisting muscle|Stabilizer/}).count()>0);console.log('Check passed:',checks.length+1);checks.push('existing exercise links displayed with roles');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile horizontal overflow');console.log('Check passed:',checks.length+1);checks.push('390px mobile layout has no horizontal overflow');
 await mkdir('/tmp/dc-anatomy-evidence',{recursive:true});await page.screenshot({path:'/tmp/dc-anatomy-evidence/shoulder-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Reset',exact:true}).click();await page.getByRole('button',{name:'Clear selection',exact:true}).click();assert.equal(await page.getByRole('combobox').inputValue(),'');console.log('Check passed:',checks.length+1);checks.push('reset and clear selection');
 await canvas.scrollIntoViewIfNeeded();const pickBounds=await canvas.boundingBox();let picked='';
 for(const [x,y] of [[.5,.5],[.65,.5],[.35,.5],[.5,.35],[.5,.65]]){
  await page.mouse.click(pickBounds.x+pickBounds.width*x,pickBounds.y+pickBounds.height*y);
  picked=await page.getByRole('combobox').inputValue();if(picked)break;
 }
 assert.ok(picked,'Clicking visible geometry must select a mapped structure');
 console.log('Check passed:',checks.length+1);checks.push('direct geometry picking resolves a real mapped structure');
 await page.reload();await page.waitForFunction(()=>document.querySelector('canvas'));console.log('Check passed:',checks.length+1);checks.push('viewer restores after reload');
 await page.goto('http://127.0.0.1:'+port+'/anatomy-preview',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('canvas'));console.log('Check passed:',checks.length+1);checks.push('scene unmount and remount without page errors');
 await page.goto('http://127.0.0.1:'+port+'/#learn?region=shoulder',{waitUntil:'domcontentloaded'});
 await page.locator('section[aria-label="כתף בתלת־ממד"] canvas').waitFor({timeout:60000});
 const atlas=page.locator('section[aria-label="כתף בתלת־ממד"]');
 await atlas.getByRole('combobox').selectOption('deltoid');
 await atlas.locator('.atlas-exercises button').first().click();
 await page.waitForFunction(()=>location.hash==='#library');
 await page.getByRole('heading',{name:'לחיצת כתפיים במוט',exact:true}).waitFor();
 console.log('Check passed:',checks.length+1);checks.push('integrated app opens canonical exercise from shoulder');
 await page.goBack();await page.locator('section[aria-label="כתף בתלת־ממד"] canvas').waitFor({timeout:60000});
 assert.equal(await page.locator('section[aria-label="כתף בתלת־ממד"]').getByRole('combobox').inputValue(),'deltoid');
 console.log('Check passed:',checks.length+1);checks.push('browser back restores integrated anatomy and selection');
 assert.deepEqual(serverErrors,[]);console.log('Check passed:',checks.length+1);checks.push('migrated local app returns no HTTP 5xx responses');
 assert.deepEqual(errors,[]);console.log('Check passed:',checks.length+1);checks.push('no uncaught browser errors');
 console.log(JSON.stringify({passed:checks,browserErrors:errors,serverErrors},null,2));
 await writeFile('/tmp/dc-anatomy-evidence/browser.json',JSON.stringify({passed:checks,browserErrors:errors,serverErrors},null,2));
}catch(error){console.error(error);console.error('Browser errors:',errors,'Server errors:',serverErrors);if(page){console.error((await page.locator('body').innerText()).slice(0,5000));await page.screenshot({path:'/tmp/dc-browser-failure.png',fullPage:true,timeout:10000,animations:'disabled'});}console.error('Server tail:',logs.slice(-3000));process.exitCode=1;}finally{await Promise.race([browser?.close(),new Promise(resolve=>setTimeout(resolve,3000))]);await Promise.race([server.close(),new Promise(resolve=>setTimeout(resolve,3000))]);process.exit(process.exitCode??0);}
