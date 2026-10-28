// Built full-app anonymous entrypoints + disposable local D1/R2. No OTP or OAuth submission.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
const server=spawn(process.execPath,['standalone/scripts/live-staging-server.mjs'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('LOCAL ONLY'))resolve();});server.on('exit',c=>reject(Error('Local server exited '+c)));setTimeout(()=>reject(Error('Local server startup timeout')),20000).unref();});
 browser=await chromium.launch({headless:true,executablePath:process.env.DC_CHROMIUM||undefined,args:['--no-sandbox']});
 const errors=[];
 for(const width of [390,1440])for(const lang of ['he','en'])for(const section of ['plan','care','onboarding']){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8788/?lang='+lang+'#'+section);
  const link=page.locator('main a[href^="/signin-with-chatgpt"]:visible').first();await link.waitFor();
  // Localize updates link attributes after the initial render; wait for the final language.
  await page.waitForFunction(({lang})=>{const a=Array.from(document.querySelectorAll('main a[href^="/signin-with-chatgpt"]')).find(a=>a.getClientRects().length);return a&&new URL(a.href).searchParams.get('lang')===lang;},{lang});
  const href=new URL(await link.getAttribute('href'),'http://localhost:8788');assert.equal(href.searchParams.get('lang'),lang);
  const target=new URL(href.searchParams.get('return_to'),'http://localhost:8788');assert.equal(target.searchParams.get('lang'),lang);assert.ok(target.hash==='#'+section||section==='onboarding'&&target.hash==='#onboarding?step=consent');
  await link.click();await page.getByRole('heading',{name:lang==='en'?'Welcome to DoctorCoach':'ברוכים הבאים ל־DoctorCoach',exact:true}).waitFor();
  const back=page.getByRole('link',{name:lang==='en'?'Back to DoctorCoach':'חזרה ל־DoctorCoach',exact:true});
  const backUrl=new URL(await back.getAttribute('href'),'http://localhost:8788');assert.equal(backUrl.searchParams.get('lang'),lang);assert.equal(backUrl.hash,target.hash);
  await back.click();await page.locator('.topbar').waitFor();assert.equal(new URL(page.url()).hash,target.hash);
  console.log('PASS full-app sign-in and return',width,lang,section);await page.close();
 }
 assert.deepEqual(errors,[]);
 console.log('PASS no page errors; no real credentials, OTP delivery or provider sign-in tested');
}finally{await browser?.close();server.kill();}
