import test from 'node:test';
import assert from 'node:assert/strict';
import {pushStep,readyPushWorker} from '../lib/browser-push.ts';
const pending=()=>new Promise(()=>{});
test('a pending browser operation releases activation with an actionable error',async()=>{
 await assert.rejects(pushStep(pending(),'retry activation',5),/retry activation/);
 assert.equal(await pushStep(Promise.resolve('ready'),'failed',5),'ready');
});
test('existing active worker bypasses a never-resolving ready promise',async()=>{
 const registration={active:{},pushManager:{}};
 assert.equal(await readyPushWorker({getRegistration:async()=>registration,register:()=>assert.fail('already registered'),ready:pending()},5),registration);
});
test('missing registration is explicitly registered before waiting for activation',async()=>{
 let registered=false;const ready={active:{}};
 const result=await readyPushWorker({getRegistration:async()=>undefined,register:async(path,options)=>{assert.equal(path,'/sw.js');assert.equal(options.scope,'/');registered=true;return {};},ready:Promise.resolve(ready)},5);
 assert.equal(result,ready);assert.equal(registered,true);
});
test('worker that never activates reports recovery rather than waiting forever',async()=>{
 let retried=false;
 await assert.rejects(readyPushWorker({getRegistration:async()=>({active:null}),register:async()=>{retried=true;return {};},ready:pending()},5),/מסך הבית/);
 assert.equal(retried,true);
});
test('registration failure is propagated and does not wait on ready',async()=>{
 await assert.rejects(readyPushWorker({getRegistration:async()=>undefined,register:async()=>{throw new Error('registration blocked');},ready:pending()},5),/registration blocked/);
});
