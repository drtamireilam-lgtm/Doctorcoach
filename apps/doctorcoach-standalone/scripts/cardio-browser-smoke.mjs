// Synthetic test fixture only. Uses real React components; no remote accounts or LAB writes.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),workerRequire=createRequire(require.resolve('wrangler/package.json'));
const {build}=workerRequire('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=fileURLToPath(new URL('../../../..//cardio-browser-evidence/',import.meta.url));
await mkdir(evidence,{recursive:true});
await build({entryPoints:[root+'/tests/fixtures/cardio-browser.tsx'],outfile:evidence+'/fixture.js',bundle:true,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const html=(await readFile(root+'/tests/fixtures/cardio-browser.html','utf8')).replace('/tests/fixtures/cardio-browser.tsx','/fixture.js').replace('</head>','<link rel="stylesheet" href="/fixture.css"></head>');
const server=createServer(async(request,response)=>{const path=new URL(request.url,'http://127.0.0.1').pathname;if(path==='/fixture.js'||path==='/fixture.css'){response.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');response.end(await readFile(evidence+path));}else if(path==='/tests/fixtures/cardio-browser.html'){response.setHeader('Content-Type','text/html;charset=utf-8');response.end(html);}else{response.statusCode=404;response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address(),origin=`http://127.0.0.1:${address.port}`;
const executable=process.env.CARDIO_CHROMIUM_PATH;
const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
const failures=[];let currentPage,observedErrors=[];
try{
 for(const language of ['en','he']){
  const page=await browser.newPage({viewport:{width:390,height:844}});currentPage=page;const errors=[];observedErrors=errors;page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/activity',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({accountScope:'synthetic',connection:null,days:[],goal:null,shares:[],goals:[],summary:{today:null,weeklyAverage:null,observedDays:0}})}));
  await page.goto(origin+'/tests/fixtures/cardio-browser.html?lang='+language);
  await page.waitForFunction(lang=>document.documentElement.lang===lang,language);
  assert.equal(await page.locator('html').getAttribute('dir'),language==='en'?'ltr':'rtl');
  await page.getByLabel(language==='en'?'Activity':'סוג פעילות',{exact:true}).selectOption('rowing_machine');
  await page.getByLabel(language==='en'?'Duration (seconds)':'משך (שניות)',{exact:true}).first().fill('60');
  await page.getByRole('button',{name:language==='en'?'Save cardio':'שמירת אירובי',exact:true}).click();
  await page.getByRole('button',{name:language==='en'?'Start cardio':'התחלת אירובי',exact:true}).click();
  await page.getByRole('button',{name:language==='en'?'Pause':'השהיה',exact:true}).click();
  const paused=await page.getByLabel(language==='en'?'Elapsed time':'זמן שחלף',{exact:true}).textContent();
  await page.reload();
  await page.getByRole('button',{name:language==='en'?'Resume':'המשך',exact:true}).waitFor();
  assert.equal(await page.getByLabel(language==='en'?'Elapsed time':'זמן שחלף',{exact:true}).textContent(),paused);
  await page.getByRole('button',{name:language==='en'?'Resume':'המשך',exact:true}).click();
  await page.getByRole('button',{name:language==='en'?'Finish cardio and record results':'סיום אירובי ותיעוד ביצוע',exact:true}).click();
  await page.getByLabel(language==='en'?'Distance (meters)':'מרחק (מטרים)',{exact:true}).fill('500');
  await page.getByLabel(language==='en'?'Pace (seconds/500m)':'קצב (שניות ל־500 מטר)',{exact:true}).fill('120');
  await page.getByRole('button',{name:language==='en'?'Save results':'שמירת הביצוע',exact:true}).click();
  await page.getByRole('heading',{name:language==='en'?'Cardio progress':'התקדמות באירובי',exact:true}).waitFor();
  const total=page.locator('.activity-step-total strong');assert.equal(await total.textContent(),'—');
  await page.getByText(language==='en'?'Connection, goals and sharing':'חיבור, יעד ושיתוף',{exact:true}).click();
  assert.equal(await page.getByRole('button',{name:language==='en'?'Connect health platform':'חיבור פלטפורמת הבריאות',exact:true}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:evidence+`/${language}-mobile.png`,fullPage:true});assert.deepEqual(errors,[]);
  await page.close();
 }
 await writeFile(evidence+'/result.json',JSON.stringify({status:'PASS',languages:['en','he'],width:390,checks:['compose rowing','pace/500m','start/pause/resume','refresh persists pause','finish actual results','missing steps not zero','PWA native requirement','RTL/LTR','no viewport overflow','no browser errors'],synthetic:true},null,2));
 process.stdout.write('PASS: English/Hebrew mobile cardio components, refresh, results and honest disconnected steps. Synthetic local fixture only.\n');
}catch(error){failures.push(error);if(currentPage&&!currentPage.isClosed()){await currentPage.screenshot({path:evidence+'/failure.png',fullPage:true});process.stderr.write(JSON.stringify({errors:observedErrors,body:await currentPage.locator('body').innerText()})+'\n');}throw error;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
