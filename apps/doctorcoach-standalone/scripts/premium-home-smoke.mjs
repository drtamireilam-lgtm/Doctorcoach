// Local Worker + disposable D1/R2 only. Never deploys or signs in a real user.
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {themeTokens} from '../lib/advanced-theme.ts';
const server=spawn(process.execPath,['standalone/scripts/live-staging-server.mjs'],{stdio:['ignore','pipe','inherit']});
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('LOCAL ONLY'))resolve();});server.on('exit',c=>reject(Error('Local server exited '+c)));setTimeout(()=>reject(Error('Local server startup timeout')),20000).unref();});
 browser=await chromium.launch({headless:true,...(process.env.DC_CHROMIUM?{executablePath:process.env.DC_CHROMIUM}:{}),args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://localhost:8788/');await page.locator('.dc-premium').waitFor();await page.waitForTimeout(700);
  for(const mode of ['dark','light'])for(const palette of ['red','blue','pink','green','purple','orange','teal','yellow','neutral']){
   await page.evaluate(({mode,palette,tokens})=>{for(const [key,value] of Object.entries(tokens))document.documentElement.style.setProperty(key,value);document.documentElement.setAttribute('data-custom-theme','true');document.documentElement.classList.toggle('light',mode==='light');document.documentElement.setAttribute('data-palette',palette);},{mode,palette,tokens:themeTokens({mode,palette})});
   const result=await page.evaluate(()=>{const root=document.querySelector('.dc-premium'),c=getComputedStyle(root);return {width:innerWidth,scroll:document.documentElement.scrollWidth,text:c.getPropertyValue('--dc-text').trim(),source:c.getPropertyValue('--text').trim(),surface:c.getPropertyValue('--dc-surface').trim(),card:c.getPropertyValue('--card').trim()};});
   if(result.scroll>width||result.text!==result.source||result.surface!==result.card)throw Error(JSON.stringify({mode,palette,...result}));
   console.log('PASS',width,mode,palette);
   if(process.env.DC_PREMIUM_SCREENSHOT_DIR&&width===390&&palette==='teal')await page.screenshot({path:process.env.DC_PREMIUM_SCREENSHOT_DIR+'/premium-'+mode+'.png',fullPage:true});
  }
  if(await page.locator('.dc-premium').getAttribute('dir')!=='ltr')await page.locator('.header-language-toggle').click();await page.waitForTimeout(250);
  if(await page.locator('.dc-premium').getAttribute('dir')!=='ltr')throw Error('English direction');
  await page.locator('.dc-premium-consult button').click();await page.waitForTimeout(250);
  if(!await page.locator('.view-consult').count())throw Error('Consult navigation');
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS all palettes, modes, widths, English navigation; no page errors');
} finally {if(browser)await browser.close();server.kill();}
