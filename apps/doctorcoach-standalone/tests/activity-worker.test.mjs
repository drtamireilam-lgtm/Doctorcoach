import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),workerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=workerRequire('miniflare'),{build}=workerRequire('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url));

test('activity sync runs in a real local Worker with disposable D1 and owner isolation',async t=>{
 const bundle=await build({stdin:{contents:`
  import {activityStore} from './lib/activity-store.ts';
  export default {async fetch(request,env){
   const user=new URL(request.url).searchParams.has('other')?{userId:'synthetic-other',email:'other@example.test'}:{userId:'synthetic-owner',email:'owner@example.test'};
   try {const store=activityStore(env.DB);return Response.json(request.method==='POST'?await store.mutate(user,await request.json()):await store.feed(user));}
   catch(error){return Response.json({error:error.message},{status:error.status??500});}
  }};`,resolveDir:root},bundle:true,write:false,format:'esm',platform:'browser'});
 // Installed local workerd supports dates through 2026-05-22. This does not change LAB configuration.
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-22',d1Databases:{DB:'synthetic-activity-db'}});t.after(()=>mf.dispose());
 const db=await mf.getD1Database('DB');
 // This smoke needs only the new activity schema; no remote or real-user database is opened.
 const migration=await readFile(new URL('../drizzle/0054_activity.sql',import.meta.url),'utf8');
 for(const statement of migration.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 const post=(payload,other=false)=>mf.dispatchFetch('https://fixture.local/'+(other?'?other=1':''),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 let response=await post({action:'connect',accountScope:'synthetic-owner',consent:true,platform:'healthkit',timezone:'UTC'});assert.equal(response.status,200);const feed=await response.json();
 const end=new Date();end.setUTCHours(0,0,0,0);const start=new Date(end.valueOf()-86400000),observedAt=new Date().toISOString();
 const sync={action:'sync',accountScope:'synthetic-owner',connectionId:feed.connection.id,generation:feed.connection.generation,revision:1,timezone:'UTC',days:[{date:start.toISOString().slice(0,10),timezone:'UTC',startAt:start.toISOString(),endAt:end.toISOString(),observedAt,steps:0,partial:false,method:'healthkit_cumulative',provenance:['synthetic-test-platform-aggregate']}]};
 response=await post(sync);assert.equal(response.status,200);assert.equal((await response.json()).days[0].steps,0);
 response=await post({...sync,accountScope:'synthetic-other'},true);assert.equal(response.status,409);
 response=await post(sync);assert.equal(response.status,200);assert.equal((await response.json()).days.length,1);
 response=await post({action:'disconnect',accountScope:'synthetic-owner',connectionId:feed.connection.id,generation:feed.connection.generation});assert.equal(response.status,200);
 response=await post({...sync,revision:2});assert.equal(response.status,409);
});
