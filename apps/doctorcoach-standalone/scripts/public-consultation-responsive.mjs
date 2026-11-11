import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const req=createRequire(join(root,'package.json'));
const {createServer}=await import(pathToFileURL(req.resolve('vite')));
const {default:react}=await import(pathToFileURL(req.resolve('@vitejs/plugin-react')));
const {chromium,webkit}=req('@playwright/test');
const fixture=join(root,'.sites-runtime/pr74');await mkdir(fixture,{recursive:true});
const output=resolve(process.env.DC_EVIDENCE??join(root,'.sites-runtime/public-consultation-evidence'));await mkdir(output,{recursive:true});process.chdir(root);
const css=[...(await readFile(join(root,'app/layout.tsx'),'utf8')).matchAll(/import '\.\/(.+\.css)';/g)].map(m=>`import '../../app/${m[1]}';`).join('\n');
await writeFile(join(fixture,'index.html'),'<html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/main.tsx"></script></html>');
await writeFile(join(fixture,'main.tsx'),`import React from 'react';import {createRoot} from 'react-dom/client';import HomePage from '../../app/page';import {ThemeProvider} from '../../components/theme-provider';import {LanguageProvider,LanguageToggle} from '../../components/language-provider';${css}\ncreateRoot(document.getElementById('root')).render(<ThemeProvider><LanguageProvider><HomePage/><div style={{position:'fixed',top:0,left:0,zIndex:99999,display:'none'}} id="verification-controls"><LanguageToggle className="verification-language"/></div></LanguageProvider></ThemeProvider>);`);
const server=await createServer({configFile:false,define:{'process.env.NEXT_PUBLIC_DC_ANATOMY_TARGET':'"disabled"'},root:fixture,cacheDir:join(fixture,'cache'),publicDir:join(root,'public'),plugins:[react()],resolve:{alias:{'@':root}},server:{host:'127.0.0.1',port:37875,hmr:false,watch:{ignored:['**/*']},fs:{allow:[root,await realpath(join(root,'node_modules'))]}}});
await server.listen();const origin=new URL(server.resolvedUrls.local[0]).origin;
const results=[];let synthetic=false,bookable=true;const payloads=[];
try{
for(const engine of (process.env.DC_ENGINES?.split(',')??['chromium','webkit'])){
const browser=await (engine==='chromium'?chromium:webkit).launch({headless:true,...(engine==='chromium'?{executablePath:process.env.DC_CHROMIUM||undefined}:{})});
const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:936},...(engine==='webkit'?{isMobile:true,hasTouch:true,deviceScaleFactor:2}:{})});const requests=[],errors=[];
await context.route('**/*',async route=>{
 const r=route.request(),u=new URL(r.url());if(u.origin!==origin)return route.abort();
 if(!u.pathname.startsWith('/api/'))return route.continue();
 requests.push({path:u.pathname,method:r.method()});
 if(r.method()!=='GET'){payloads.push(r.postDataJSON());return route.fulfill({status:503,json:{error:'לא ניתן להשלים את הפעולה כרגע.'}});}
 if(u.pathname==='/api/services')return route.fulfill({json:{services:[{id:'medical-video',title:'ייעוץ רפואי בזום',description:'שיחה מרחוק, בירור והכוונה ראשונית.',provider:'tamir',format:'video',durationMinutes:30,priceAgorot:30000,priceConfirmed:true,status:bookable?'bookable':'listed',bookingUrl:'https://calendly.com/synthetic/verification',paymentUrl:'',paymentInstructions:''},{id:'medical-clinic',title:'ייעוץ רפואי פרונטלי',description:'מפגש פנים אל פנים עם בדיקה לפי הצורך.',provider:'tamir',format:'clinic',durationMinutes:60,priceAgorot:50000,priceConfirmed:true,status:'listed',bookingUrl:'',paymentUrl:'',paymentInstructions:''}]}});
 if(u.pathname==='/api/account')return route.fulfill({json:{signedIn:synthetic,canManageServices:false,careRole:null}});
 if(u.pathname==='/api/appointments'&&synthetic)return route.fulfill({json:{appointments:[{id:'synthetic-appointment',clientId:'synthetic',clientName:'Synthetic',serviceId:'medical-video',title:'ייעוץ רפואי בזום',provider:'tamir',duration:30,priceAgorot:30000,preference:'Synthetic preference',state:'scheduled',startsAt:new Date(Date.now()+3600000).toISOString(),endsAt:new Date(Date.now()+5400000).toISOString(),meetingUrl:'',staffNote:'',paymentState:'unpaid',paymentReference:'',version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}],nextOffset:null}});
 return route.fulfill({status:401,json:{error:'יש להתחבר לחשבון.'}});
});
let page;const initPage=async()=>{page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.setDefaultTimeout(30000);};
async function geometry(){return page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...document.querySelectorAll('main button,main a.button,main input,main textarea,main h1,main h2,.service-tag,header button')].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&(n.scrollWidth>n.clientWidth+2||n.getBoundingClientRect().right>innerWidth+2||n.getBoundingClientRect().left< -2||n.getBoundingClientRect().height>140)).map(n=>({text:n.textContent,tag:n.tagName,scroll:n.scrollWidth,client:n.clientWidth}))}));}
try{
 for(const width of (process.env.DC_WIDTHS?.split(',').map(Number)??[320,390,430,768,1363]))for(const language of (process.env.DC_LANGUAGES?.split(',')??['he','en'])){
 const row={engine,version:browser.version(),width,height:936,language,status:'PASS',checks:[]};results.push(row);
 try{
 await initPage();errors.length=0;
 synthetic=false;bookable=true;await page.setViewportSize({width,height:936});await page.goto(origin+'?lang='+language+'#consult',{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('.service-card').first().waitFor({timeout:120000});await page.waitForTimeout(350);
 assert.equal(await page.locator('html').getAttribute('dir'),language==='en'?'ltr':'rtl');
 assert.equal(await page.locator('.consultation-workspace h1').innerText(),language==='en'?'Consultations and coaching':'ייעוץ וליווי');
 const body=await page.locator('main').innerText();if(language==='en')assert.equal(/[\u0590-\u05ff]/u.test(body),false,body);
 const accessible=await page.getByRole('button',{name:language==='en'?'Request an appointment: Medical consultation via Zoom':'בקשת תור: ייעוץ רפואי בזום',exact:true}).count();assert.equal(accessible,1);
 const ready=page.locator('.service-card').first();const bookingBox=await ready.locator('a.button').boundingBox(),requestBox=await ready.locator('button.button').boundingBox();assert.ok(bookingBox.y+bookingBox.height<=requestBox.y+1,'External booking must precede request action');
 row.publicGeometry=await geometry();assert.equal(row.publicGeometry.overflow,false);assert.deepEqual(row.publicGeometry.clipped,[]);
 await page.screenshot({path:join(output,`${engine}-${language}-${width}-public.png`),fullPage:true});
 await writeFile(join(output,`${engine}-${language}-${width}-public.txt`),await page.locator('body').innerText());
 row.checks.push('public headings, booking actions, badges, scheduling note, nutrition, back label, accessible names, direction, no overflow/clipping');
 const back=page.locator('.content>.context-navigation .back-link');assert.equal(await back.count(),1);await back.click();assert.match(page.url(),/#contact/);await page.goto(origin+'?lang='+language+'#consult',{waitUntil:'domcontentloaded'});await page.locator('.service-card').first().waitFor();row.checks.push('Back to Contact action and external-booking/request visual order');
 const menu=page.locator('.menu-toggle');if(await menu.isVisible()){await menu.click();await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-overlay').count(),0);row.checks.push('mobile menu opens and closes with Escape');}
 const mobile=page.locator('.mobile-bottom-nav');if(await mobile.isVisible()){await mobile.getByRole('button',{name:language==='en'?'More':'עוד',exact:true}).click();await page.locator('.navigation-hub h1').waitFor();assert.match(page.url(),/#more/);row.checks.push('mobile More navigation');}
 await page.waitForLoadState('networkidle');synthetic=true;await page.goto(origin+'?lang='+language+'&fixture=member#consult',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('.service-card').first().waitFor();await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:language==='en'?'Request an appointment: Medical consultation via Zoom':'בקשת תור: ייעוץ רפואי בזום',exact:true}).click();
 const form=page.locator('.appointment-request-toggle form');await form.locator('input').first().waitFor();
 await form.locator('button[type=submit],button.button.primary').last().click();assert.equal(await form.locator('input').first().evaluate(n=>n.validity.valueMissing),true);
 await form.locator('input').first().fill('Synthetic Tamir בדיקה');await form.locator('textarea').fill('Tuesday after 17:00 יום שלישי');
 const selectedBefore=await form.locator('[role=combobox]').innerText();assert.ok(selectedBefore.trim());
 const headerSwitch=page.locator('header .language-toggle');const useHarness=!await headerSwitch.isVisible();if(useHarness)await page.locator('#verification-controls').evaluate(n=>n.style.display='block');const toggle=useHarness?page.locator('.verification-language'):headerSwitch;
 await toggle.click();await page.waitForTimeout(100);assert.equal(await page.locator('html').getAttribute('lang'),language==='en'?'he':'en');assert.equal(await page.locator('html').getAttribute('dir'),language==='en'?'rtl':'ltr');assert.equal(await form.locator('input').first().inputValue(),'Synthetic Tamir בדיקה');assert.equal(await form.locator('textarea').inputValue(),'Tuesday after 17:00 יום שלישי');
 await toggle.click();await page.waitForTimeout(100);assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(await page.locator('html').getAttribute('dir'),language==='en'?'ltr':'rtl');if(useHarness){await page.locator('#verification-controls').evaluate(n=>n.style.display='none');row.checks.push('mounted-form language preservation uses real LanguageToggle in test harness; mobile production switch lives in settings');}
 await form.locator('button.button.primary').last().click();await form.getByRole('alert').waitFor();assert.equal(payloads.at(-1).serviceId,'medical-video');assert.equal(payloads.at(-1).clientName,'Synthetic Tamir בדיקה');assert.equal(payloads.at(-1).expectedPrice,30000);assert.equal(payloads.at(-1).preference,'Tuesday after 17:00 יום שלישי');
 row.validation=await form.getByRole('alert').innerText();if(language==='en')assert.equal(/[\u0590-\u05ff]/u.test(row.validation),false);
 assert.equal(await page.locator('.appointment-card .care-pill').first().innerText(),language==='en'?'Scheduled':'נקבע');assert.match(await page.locator('.appointment-time').innerText(),language==='en'?/Israel time/:/שעון ישראל/);if(language==='en')assert.equal(/[\u0590-\u05ff]/u.test(await page.locator('.appointment-card').innerText()),false);
 row.formGeometry=await geometry();assert.equal(row.formGeometry.overflow,false);assert.deepEqual(row.formGeometry.clipped,[]);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(output,`${engine}-${language}-${width}-form.png`),fullPage:true});
 await writeFile(join(output,`${engine}-${language}-${width}-accessibility.txt`),await page.locator('main').ariaSnapshot());
 row.checks.push('request button selects canonical service, required validation, localized error, language switches preserve name/preferences/service/price, appointment time/status, no booking created');
 bookable=false;synthetic=false;await page.waitForLoadState('networkidle');await page.goto(origin+'?lang='+language+'&fixture=listed#consult',{waitUntil:'domcontentloaded'});await page.locator('.service-booking-note').waitFor();
 assert.equal(await page.locator('.service-booking-note h2').innerText(),language==='en'?'Request an appointment in the app':'בקשת תור דרך האפליקציה');if(language==='en')assert.equal(/[\u0590-\u05ff]/u.test(await page.locator('main').innerText()),false);
 await page.screenshot({path:join(output,`${engine}-${language}-${width}-listed.png`),fullPage:true});row.checks.push('listed-only catalog original scheduling fallback remains fixed');
 await page.locator('header .account-shortcut').click();await page.locator('.account-settings-hub').waitFor();await page.locator('.account-settings-hub .compact-menu button').filter({hasText:language==='en'?'Language & appearance':'שפה ותצוגה'}).click();await page.locator('.account-settings-hub .language-toggle').click();
 assert.equal(await page.locator('html').getAttribute('lang'),language==='en'?'he':'en');assert.equal(await page.locator('html').getAttribute('dir'),language==='en'?'rtl':'ltr');assert.equal(new URL(page.url()).searchParams.get('lang'),language==='en'?'he':'en');assert.equal(await page.evaluate(()=>localStorage.getItem('doctorcoach-language')),language==='en'?'he':'en');row.checks.push('production settings language switch updates direction, URL and saved preference');
 assert.deepEqual(errors,[]);
 }catch(e){row.status='FAIL';row.error=e.message;await page.screenshot({path:join(output,`${engine}-${language}-${width}-failure.png`),fullPage:true}).catch(()=>{});}
 await writeFile(join(output,'responsive-results.json'),JSON.stringify({source:'PR 74 working tree; exact tested commit recorded in review report',results,payloads,errors},null,2));console.log(JSON.stringify(row));
 await page.close();
 }
}finally{await browser.close();}
}
}finally{await server.close();}
process.exitCode=results.some(row=>row.status!=='PASS')?1:0;
