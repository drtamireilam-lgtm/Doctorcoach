import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import {platform,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import * as helpers from '../lib/api-helpers.ts';
import * as privateResponse from '../lib/private-json.ts';
async function fixture(t){
 const f=platform(t);await f.connect();
 const store=await import('../lib/completed-workout-correction-store.ts');
 let user=client;const exports={};
 const modules={'../../../chatgpt-auth':{getChatGPTUser:async()=>user},'../../../../db/raw':{getRawDb:()=>f.db},'../../../../lib/care-server':{careConfig:()=>({})},'../../../../lib/private-json':privateResponse,'../../../../lib/api-helpers':helpers,'../../../../lib/completed-workout-correction-store':store};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/api/training/corrections/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:key=>{assert.ok(key in modules,key);return modules[key];},URL});
 await f.training.savePlan(client.userId,{...defaultPrescription('goblet'),sets:2,weight:20});
 let session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 session=await f.training.patch(client.userId,{action:'set',id:session.id,version:session.version,exerciseId:'goblet',setIndex:0,done:true,amount:8,weight:20,actualRpe:7});
 session=await f.training.patch(client.userId,{action:'finish',id:session.id,version:session.version,after:0});
 const payload={sessionId:session.id,version:session.version,requestId:randomUUID(),exerciseId:'goblet',occurrenceId:session.items[0].occurrenceId,setIndex:0,amount:9,weight:22.6,actualRpe:8};
 return {...f,route:exports,session,payload,setUser:value=>{user=value;}};
}
const request=(p,headers={})=>new Request('https://synthetic.example.test/api/training/corrections',{method:'PATCH',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(p)});
test('completed correction route authenticates owner and returns private saved values with safe retries',async t=>{
 const f=await fixture(t),response=await f.route.PATCH(request(f.payload));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const saved=await response.json();assert.equal(saved.items[0].results[0].weight,22.6);assert.equal(saved.startedAt,f.session.startedAt);assert.equal(saved.finishedAt,f.session.finishedAt);
 assert.equal((await (await f.route.PATCH(request(f.payload))).json()).version,saved.version);
 const loaded=await f.route.GET(new Request('https://synthetic.example.test/api/training/corrections?session='+f.session.id));assert.equal(loaded.status,200);assert.equal((await loaded.json()).session.version,saved.version);
 f.setUser({userId:'stranger',email:'stranger@example.test'});assert.ok([403,404].includes((await f.route.PATCH(request(f.payload))).status));
 f.setUser(null);assert.equal((await f.route.PATCH(request(f.payload))).status,401);
});
test('completed correction route rejects cross-site/non-JSON writes and stale edits without modifying history',async t=>{
 const f=await fixture(t);assert.equal((await f.route.PATCH(request(f.payload,{'Sec-Fetch-Site':'cross-site'}))).status,403);
 assert.equal((await f.route.PATCH(request(f.payload,{'Content-Type':'text/plain'}))).status,415);
 assert.equal((await f.route.PATCH(request({...f.payload,version:f.payload.version-1}))).status,409);
 assert.equal((await f.training.feed(client.userId)).history[0].items[0].results[0].weight,20);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM retrospective_workout_revisions').get().n,0);
});
