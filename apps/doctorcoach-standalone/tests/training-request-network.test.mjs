import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {apiResponseFailure} from '../lib/api-response.ts';
function fixture(fetch,timeout=AbortSignal.timeout.bind(AbortSignal)){
 const exports={};
 const code=ts.transpileModule(readFileSync(new URL('../hooks/use-training.ts',import.meta.url),'utf8')+'\nexport {request as testRequest};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:k=>k==='../lib/api-response'?{apiResponseFailure}:({}),fetch,AbortSignal:{timeout},JSON,Error});
 return exports.testRequest;
}
test('training requests bound stalled connections without changing mutation identity or payload',async()=>{
 let sent,deadline;
 const request=fixture(async(url,init)=>{sent={url,init};return Response.json({session:{id:'same-session',version:2}});},ms=>{deadline=ms;return AbortSignal.timeout(ms);});
 const payload={id:'same-session',version:1,action:'set',occurrenceId:'same-occurrence',setIndex:0};
 assert.equal((await request('/api/training','PATCH',payload)).session.version,2);
 assert.equal(deadline,15000);assert.ok(sent.init.signal instanceof AbortSignal);
 assert.deepEqual(JSON.parse(sent.init.body),payload);assert.equal(sent.init.method,'PATCH');
});
test('timed-out writes reject without acknowledging a save or retrying the mutation',async()=>{
 let calls=0;
 const request=fixture(async(url,init)=>{calls++;if(init.signal?.aborted)throw init.signal.reason;return Response.json({session:{id:'should-not-succeed'}});},()=>AbortSignal.abort(new DOMException('Timed out','TimeoutError')));
 await assert.rejects(()=>request('/api/training','PATCH',{id:'session',version:1,action:'finish'}),e=>e.status===0&&/לא אושר/.test(e.message));
 assert.equal(calls,1);
});
