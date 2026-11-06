import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runtimeFixture} from '../standalone/scripts/fixtures/runtime-fixture.mjs';

test('runtime service transport preserves provider lifecycle and explicit configuration transitions',async t=>{
 const root=fileURLToPath(new URL('../.sites-runtime/runtime-transport-test/',import.meta.url));
 const contents=`import {env as runtimeEnv} from 'cloudflare:workers';export default {async fetch(req,env){const url=new URL(req.url);if(url.pathname==='/config')return Response.json({management:runtimeEnv.DC_USER_MANAGEMENT_ENABLED??null,calendar:runtimeEnv.DOCTORCOACH_CALENDAR_ID??null});return fetch('https://'+(url.searchParams.get('host')??'auth.example.test')+url.pathname,{method:req.method,headers:{authorization:req.headers.get('authorization')??''},...(['GET','HEAD'].includes(req.method)?{}:{body:await req.text()}),signal:AbortSignal.timeout(8000)});}};`;
 const {mf,control}=await runtimeFixture({modulesRoot:root,modules:[{type:'ESModule',path:path.join(root,'index.js'),contents}],compatibilityDate:'2026-05-15'});
 const request=(url,body,token)=>mf.dispatchFetch('https://local.example.test'+url,{method:body===undefined?'GET':'POST',headers:token?{authorization:'Bearer '+token}:{},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const post=async(url,body,token)=>{const r=await request(url,body,token);assert.equal(r.status,200);return r.json();};
 try{
  await t.test('1000 app-to-provider round trips complete without a Node callback',async()=>{
   for(let i=0;i<1000;i++){const r=await request('/auth/v1/settings');assert.equal(r.status,200);assert.deepEqual(await r.json(),{external:{google:false,apple:false}});}
  });
  await t.test('flag transitions retain OTP, identity, refresh and revocation state',async()=>{
   const email='transport@example.test';await post('/auth/v1/otp',{email});
   assert.equal((await request('/auth/v1/verify',{email,token:'999999'})).status,401);
   const first=await post('/auth/v1/verify',{email,token:'123456'});assert.equal(first.expires_in,1);
   const subject=(await control('identity',{email})).subject;assert.ok(subject);
   assert.deepEqual(await (await request('/config')).json(),{management:null,calendar:null});
   await control('bindings',{bindings:{DC_USER_MANAGEMENT_ENABLED:'true'}});
   await control('bindings',{bindings:{DOCTORCOACH_CALENDAR_ID:'synthetic@group.calendar.google.com'}});
   assert.deepEqual(await (await request('/config')).json(),{management:'true',calendar:'synthetic@group.calendar.google.com'});
   assert.equal((await control('identity',{email})).subject,subject);
   assert.equal((await request('/auth/v1/verify',{email,token:'123456'})).status,401);
   const refreshed=await post('/auth/v1/token',{refresh_token:first.refresh_token});assert.equal(refreshed.expires_in,300);assert.equal((await control('state')).refreshCount,1);
   assert.equal((await request('/auth/v1/token',{refresh_token:first.refresh_token})).status,401);
   assert.equal((await (await request('/auth/v1/user',undefined,refreshed.access_token)).json()).id,subject);
   await post('/auth/v1/logout',{},refreshed.access_token);
   assert.equal((await request('/auth/v1/user',undefined,refreshed.access_token)).status,401);
   assert.equal((await request('/auth/v1/user',undefined,first.access_token)).status,401);
   assert.equal((await request('/auth/v1/token',{refresh_token:refreshed.refresh_token})).status,401);
  });
  await t.test('synthetic Calendar failure recovery retains readback and duplicate protection',async()=>{
   const url='/calendar/v3/calendars/synthetic/events?host=www.googleapis.com',event={id:'synthetic-event',summary:'SYNTHETIC'};
   await control('calendarFailure',{value:true});assert.equal((await request(url,event)).status,503);
   await control('calendarFailure',{value:false});assert.equal((await request(url,event)).status,200);
   await control('bindings',{bindings:{DOCTORCOACH_CALENDAR_TEST_ENABLED:'true'}});
   assert.equal((await request(url,event)).status,409);
   const readback=await request('/calendar/v3/calendars/synthetic/events/synthetic-event?host=www.googleapis.com');assert.equal(readback.status,200);assert.equal((await readback.json()).summary,'SYNTHETIC');
   assert.equal((await control('state')).creates,1);
   assert.equal((await request('/blocked?host=outside.example.test')).status,403);
   assert.deepEqual((await control('state')).blocked,['https://outside.example.test']);
  });
 }finally{await mf.dispose();}
});
