import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const workerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=workerRequire('miniflare');
const {build}=workerRequire('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url));

test('calendar requests run in Workers and never forward credentials to redirects',async t=>{
 const bundle=await build({stdin:{contents:`
  import {calendarRequest} from './lib/google-calendar.ts';
  export default {async fetch(){
   try{return Response.json(await calendarRequest('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'client_secret=TEST-SECRET&code=TEST-CODE'
   }));}catch(e){return Response.json({status:e.status,message:e.message},{status:503});}
  }};`,resolveDir:root},bundle:true,write:false,format:'esm',platform:'browser'});
 let mode='success';const calls=[];
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,
  outboundService:async request=>{
   calls.push({url:request.url,body:await request.text()});
   if(mode==='redirect')return new Response(null,{status:302,headers:{Location:'https://untrusted.example/steal'}});
   if(mode==='failure')return Response.json({error:'invalid_grant'},{status:400});
   return Response.json({access_token:'TEST-ACCESS'});
  }});
 t.after(()=>mf.dispose());
 let response=await mf.dispatchFetch('https://test.local');
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{status:200,ok:true,json:{access_token:'TEST-ACCESS'}});
 assert.equal(calls.length,1);
 assert.match(calls[0].body,/client_secret=TEST-SECRET/);
 mode='redirect';response=await mf.dispatchFetch('https://test.local');
 assert.equal(response.status,503);
 assert.equal((await response.json()).status,503);
 assert.equal(calls.length,2,'redirect target must never be requested');
 assert.ok(calls.every(c=>c.url==='https://oauth2.googleapis.com/token'));
 mode='failure';response=await mf.dispatchFetch('https://test.local');
 assert.deepEqual(await response.json(),{status:400,ok:false,json:{error:'invalid_grant'}});
});
