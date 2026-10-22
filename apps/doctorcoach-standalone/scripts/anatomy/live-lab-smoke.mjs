/** Read-only acceptance of the fixed isolated LAB; never accepts a Production target. */
import {chromium} from '@playwright/test';
import {createHash,X509Certificate} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://doctorcoach-isolated-staging.dr-tamireilam.workers.dev';
// Bundled Chromium has its own trust store. Pin only the CA already trusted by this host's Node/curl proxy.
const proxyCa=process.env.HTTPS_PROXY&&process.env.NODE_EXTRA_CA_CERTS;
const proxySpki=proxyCa?createHash('sha256').update(new X509Certificate(await readFile(proxyCa)).publicKey.export({type:'spki',format:'der'})).digest('base64'):null;
const browser=await chromium.launch({executablePath:process.env.ANATOMY_CHROMIUM||undefined,headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:[...(proxySpki?['--ignore-certificate-errors-spki-list='+proxySpki]:[]),'--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const errors=[],checks=[];let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page=await context.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));
 for(const name of ['body','arm','forearm','hand']){
  const manifest=JSON.parse(await readFile(new URL('../../lib/prepared/'+name+'-model.json',import.meta.url),'utf8'));
  const response=await context.request.get(origin+'/anatomy/'+name+'.glb');assert.equal(response.status(),200);
  assert.equal(createHash('sha256').update(await response.body()).digest('hex'),manifest.glbSha256);checks.push(name+' live GLB matches reviewed asset checksum');
 }
 await page.goto(origin+'/?lang=en#learn?atlas=body',{waitUntil:'domcontentloaded'});
 await page.locator('[data-model-id="body"] canvas').waitFor();assert.equal(await page.locator('canvas').count(),1);checks.push('live full body rendered on mobile viewport');
 const body=page.locator('[data-model-id="body"]');await body.getByRole('combobox').selectOption('elbow');await body.getByRole('button',{name:'Open region',exact:true}).click();
 await page.locator('[data-model-id="arm"] canvas').waitFor();const arm=page.locator('[data-model-id="arm"]');await arm.getByRole('combobox').selectOption('biceps-brachii');await arm.getByRole('heading',{name:'Biceps brachii',exact:true}).waitFor();assert.equal(await arm.getAttribute('dir'),'ltr');checks.push('live body-to-arm selection and English information');
 await arm.locator('.atlas-exercises button').first().click();await page.locator('.atlas-exercise-links a[href*="muscle=biceps-brachii"]').waitFor();await page.goBack();await page.locator('[data-model-id="arm"] canvas').waitFor();assert.equal(await page.locator('[data-model-id="arm"]').getByRole('combobox').inputValue(),'biceps-brachii');checks.push('live exercise roundtrip restores arm selection');
 await page.goto(origin+'/?lang=he#learn?region=elbow&muscle=biceps-brachii',{waitUntil:'domcontentloaded'});await page.locator('[data-model-id="arm"] canvas').waitFor();assert.equal(await page.locator('[data-model-id="arm"]').getAttribute('dir'),'rtl');await page.locator('[data-model-id="arm"]').getByRole('heading',{name:'השריר הדו־ראשי של הזרוע',exact:true}).waitFor();checks.push('live Hebrew RTL and selected muscle');
 await page.goto(origin+'/?lang=en#learn?region=forearm&muscle=flexor-carpi-radialis',{waitUntil:'domcontentloaded'});
 const forearm=page.locator('[data-model-id="forearm"]');await forearm.locator('canvas').waitFor();await forearm.getByRole('heading',{name:'Flexor carpi radialis',exact:true}).waitFor();await forearm.getByRole('button',{name:'Focus structure',exact:true}).click();checks.push('live dedicated forearm and source mesh focus');
 await page.goto(origin+'/?lang=en#learn?region=wrist_hand&muscle=abductor-pollicis-brevis',{waitUntil:'domcontentloaded'});
 const hand=page.locator('[data-model-id="hand"]');await hand.locator('canvas').waitFor();await hand.getByRole('heading',{name:'Abductor pollicis brevis',exact:true}).waitFor();assert.equal(await hand.getByRole('combobox').locator('option').count(),31);
 await page.screenshot({path:'/tmp/dc-hand-initial-live.png',fullPage:true});
 await hand.getByRole('combobox').selectOption('adductor-pollicis');await hand.locator('.atlas-exercises button').first().click();await page.locator('.atlas-exercise-links a[href*="muscle=adductor-pollicis"]').waitFor();await page.goBack();await hand.locator('canvas').waitFor();assert.equal(await hand.getByRole('combobox').inputValue(),'adductor-pollicis');checks.push('live hand bones, thumb selection and exercise roundtrip');
 assert.deepEqual(errors,[]);checks.push('no uncaught errors in live acceptance flow');
 const dir='/tmp/dc-anatomy-live-evidence';await mkdir(dir,{recursive:true});await page.screenshot({path:dir+'/arm-mobile-lab.png',fullPage:true});
 const result={origin,checkedAt:new Date().toISOString(),checks,errors};await writeFile(dir+'/live.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(e){console.error(e.message);console.error('Browser errors:',errors);process.exitCode=1;}
finally{await browser.close();}
