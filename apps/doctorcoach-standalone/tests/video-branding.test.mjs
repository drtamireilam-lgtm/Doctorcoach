import test from 'node:test';
import assert from 'node:assert/strict';
import {brandLayout,createVideoBranding,BRAND_APP_URL} from '../lib/video-branding.ts';
test('logo stays small inside portrait and landscape frames and above the bottom story controls',()=>{
 for(const [w,h] of [[1080,1920],[1920,1080],[720,1280]]){
  const l=brandLayout(w,h);assert.ok(l.x>=0&&l.y>=0);assert.ok(l.logo<=w*.1+1);assert.ok(l.y+l.logo<h*.85);assert.ok(l.x+l.logo*3.2<w);
 }
 assert.throws(()=>brandLayout(0,1920));assert.throws(()=>brandLayout(Infinity,1920));
 assert.equal(new URL(BRAND_APP_URL).hostname,'doctorcoach-standalone-staging.dr-tamireilam.workers.dev');
});
test('every exported frame contains the source plus the DoctorCoach logo; QR is optional and small unreadable QR fails',async t=>{
 const savedImage=globalThis.Image,savedDocument=globalThis.document,calls=[];
 const ctx={fillRect(...args){calls.push(['rect',...args]);},drawImage(...args){calls.push(['logo',...args.slice(1)]);},fillText(text){calls.push(['text',text]);}};
 globalThis.Image=class{async decode(){}};
 globalThis.document={createElement(){return {getContext(){return ctx;}};}};
 t.after(()=>{globalThis.Image=savedImage;globalThis.document=savedDocument;});
 const sample={displayWidth:1080,displayHeight:1920,draw(){calls.push(['source']);}};
 const render=await createVideoBranding(false);render(sample);render(sample);
 assert.equal(calls.filter(c=>c[0]==='source').length,2);assert.equal(calls.filter(c=>c[0]==='logo').length,2);assert.equal(calls.filter(c=>c[1]==='DoctorCoach').length,2);
 const qr=await createVideoBranding(true);assert.doesNotThrow(()=>qr(sample));
 assert.throws(()=>qr({...sample,displayWidth:240,displayHeight:400}),/QR/);
});
