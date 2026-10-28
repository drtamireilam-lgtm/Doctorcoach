// Local Worker + disposable D1/R2 only. Never deploys or signs in a real user.
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';
import {themePresets,themeTokens} from '../lib/advanced-theme.ts';
const server=spawn(process.execPath,['standalone/scripts/live-staging-server.mjs'],{stdio:['ignore','pipe','inherit']});
let browser;
try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('LOCAL ONLY'))resolve();});server.on('exit',c=>reject(Error('Local server exited '+c)));setTimeout(()=>reject(Error('Local server startup timeout')),20000).unref();});
 browser=await chromium.launch({headless:true,...(process.env.DC_CHROMIUM?{executablePath:process.env.DC_CHROMIUM}:{}),args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto('http://localhost:8788/');await page.locator('.dc-premium').waitFor();await page.waitForTimeout(700);if(await page.locator('.dc-premium').getAttribute('dir')!=='rtl'){await page.locator('.header-language-toggle').click();await page.waitForTimeout(150);}
  for(const mode of ['dark','light'])for(const palette of ['red','blue','pink','green','purple','orange','teal','yellow','neutral']){
   await page.evaluate(({mode,palette,tokens})=>{for(const [key,value] of Object.entries(tokens))document.documentElement.style.setProperty(key,value);document.documentElement.setAttribute('data-custom-theme','true');document.documentElement.classList.toggle('light',mode==='light');document.documentElement.setAttribute('data-palette',palette);},{mode,palette,tokens:themeTokens({mode,palette})});
   const result=await page.evaluate(()=>{const root=document.querySelector('.dc-premium'),c=getComputedStyle(root);return {width:innerWidth,scroll:document.documentElement.scrollWidth,text:c.getPropertyValue('--dc-text').trim(),source:c.getPropertyValue('--text').trim(),surface:c.getPropertyValue('--dc-surface').trim(),card:c.getPropertyValue('--card').trim(),headerHeight:document.querySelector('.topbar').getBoundingClientRect().height,heroHeight:root.querySelector('.dc-premium-hero').getBoundingClientRect().height};});
   if((width<=760&&result.headerHeight>80)||(width>=1000&&result.heroHeight>390)||result.scroll>width||result.text!==result.source||result.surface!==result.card)throw Error(JSON.stringify({mode,palette,...result}));
   console.log('PASS',width,mode,palette);
   if(process.env.DC_PREMIUM_SCREENSHOT_DIR&&width===390&&palette==='teal')await page.screenshot({path:process.env.DC_PREMIUM_SCREENSHOT_DIR+'/premium-'+mode+'.png',fullPage:true});
  }
  for(const id of ['gold','silver','medical-premium','ocean-slate','sage-stone','ivory-champagne','midnight-lavender']){const appearance=themePresets.find(p=>p.id===id).appearance;await page.evaluate(({tokens,mode})=>{document.documentElement.classList.toggle('light',mode==='light');document.documentElement.classList.toggle('dark',mode==='dark');for(const [key,value]of Object.entries(tokens))document.documentElement.style.setProperty(key,value);},{tokens:themeTokens(appearance),mode:appearance.mode});const presetLayout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(presetLayout.scroll>width)throw Error('Preset overflow '+id);if(process.env.DC_PREMIUM_SCREENSHOT_DIR&&(width===390||width===1440))await page.screenshot({path:process.env.DC_PREMIUM_SCREENSHOT_DIR+'/premium-'+id+'-'+width+'.png',fullPage:true});console.log('PASS preset',id,width);}
  if(await page.locator('.dc-premium').getAttribute('dir')!=='ltr')await page.locator('.header-language-toggle').click();await page.waitForTimeout(250);
  if(await page.locator('.dc-premium').getAttribute('dir')!=='ltr')throw Error('English direction');
  const english=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,header:document.querySelector('.topbar').getBoundingClientRect().height}));if(english.scroll>width||(width<=760&&english.header>80))throw Error('English layout '+JSON.stringify(english));
  await page.locator('.dc-premium-consult button').click();await page.waitForTimeout(250);
  if(!await page.locator('.view-consult').count())throw Error('Consult navigation');
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS all palettes, modes, widths, English navigation; no page errors');
} finally {if(browser)await browser.close();server.kill();}
