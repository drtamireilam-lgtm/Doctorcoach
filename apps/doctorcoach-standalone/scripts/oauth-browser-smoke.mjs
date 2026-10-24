import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {authPage} from '../standalone/page.ts';
import assert from 'node:assert/strict';
const evidence=resolve(process.env.DC_OAUTH_EVIDENCE??'../../../../outputs/oauth-local');await mkdir(evidence,{recursive:true});
let available={google:false,apple:false},starts=[];
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:37864');
  if(url.pathname==='/auth/signin'){
   const response=authPage({signout:false,returnTo:'/#learn?section=physiology',english:url.searchParams.get('lang')==='en',isolatedStaging:true});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');
  if(url.pathname==='/auth/providers'){res.end(JSON.stringify(available));return;}
  if(url.pathname==='/auth/status'){res.statusCode=401;res.end('{}');return;}
  if(url.pathname==='/auth/pending'){res.end('{"pending":false}');return;}
  if(url.pathname==='/auth/oauth/start'){
   let raw='';for await(const part of req)raw+=part;starts.push(JSON.parse(raw));
   // Simulate a provider outage: the real UI must unlock and preserve email OTP.
   res.statusCode=503;res.end('{"error":"Provider unavailable"}');return;
  }
  res.statusCode=404;res.end('{}');
 }catch{res.statusCode=500;res.end('{}');}
});
await new Promise(r=>server.listen(37864,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:900}});page.on('pageerror',e=>errors.push(e.message));
 for(const lang of ['he','en']){
  await page.goto('http://127.0.0.1:37864/auth/signin?lang='+lang);
  await page.locator('#oauth-google-state').filter({hasText:lang==='he'?'ממתין להגדרת הספק':'Awaiting provider setup'}).waitFor();
  assert.equal(await page.locator('#oauth-google').isEnabled(),false);assert.equal(await page.locator('#oauth-apple').isEnabled(),false);
  assert.equal(await page.locator('#email-form button').isEnabled(),true);
  assert.equal(await page.locator('html').getAttribute('dir'),lang==='he'?'rtl':'ltr');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(evidence,lang+'-mobile-awaiting-setup.png'),fullPage:true});
 }
 checks.push('HE/EN RTL/LTR mobile layout; disabled providers honest; email sign-in remains enabled');
 available={google:true,apple:false};await page.reload();await page.locator('#oauth-google:not([disabled])').waitFor();
 assert.equal(await page.locator('#oauth-apple').isEnabled(),false);
 await page.locator('#oauth-google').focus();await page.keyboard.press('Enter');
 await page.getByRole('status').filter({hasText:'The sign-in service is temporarily unavailable.'}).waitFor();
 assert.deepEqual(starts,[{provider:'google',returnTo:'/#learn?section=physiology',english:true}]);
 assert.equal(await page.locator('#email-form button').isEnabled(),true);assert.equal(await page.locator('#oauth-google').isEnabled(),true);
 checks.push('keyboard activates only configured provider; server outage unlocks controls and retains OTP');
 available={google:true,apple:true};await page.setViewportSize({width:1440,height:1000});await page.reload();
 await page.locator('#oauth-google:not([disabled])').waitFor();await page.locator('#oauth-apple:not([disabled])').waitFor();
 await page.screenshot({path:resolve(evidence,'en-desktop-enabled-fixture.png'),fullPage:true});
 checks.push('both provider buttons enable only with positive server availability (isolated fixture)');
 await page.goto('http://127.0.0.1:37864/auth/signin?lang=en&oauth_error=cancelled');
 await page.getByRole('status').filter({hasText:'Sign-in was canceled.'}).waitFor();
 checks.push('canceled callback provides localized feedback without provider error details');
 assert.deepEqual(errors,[]);checks.push('no browser JavaScript errors');
 const report={scope:'Real authPage UI with isolated HTTP provider fixture, not a real Google/Apple login',checks,errors};
 await writeFile(resolve(evidence,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
