import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client,stranger} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {parseAssignedItems} from '../lib/care.ts';
const item={...defaultPrescription('goblet'),sets:3,reps:6,targetRpe:8,effortScale:'rir',approvedSubstitutions:['wall-slide','bench']};
async function fixture(t){const f=platform(t);await f.connect();await f.care.assign(coach,client.userId,{id:randomUUID(),title:'חלופות לבדיקה',items:[item]});const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});return {...f,s};}
const swap=(s,extra={})=>({id:s.id,version:s.version,action:'swap',exerciseId:s.items[0].exerciseId,replacementId:'wall-slide',confirmed:true,...extra});

test('coach alternatives are validated and legacy plans retain their shape',()=>{
 assert.deepEqual(parseAssignedItems([item])[0].approvedSubstitutions,item.approvedSubstitutions);
 assert.equal('approvedSubstitutions' in parseAssignedItems([defaultPrescription('goblet')])[0],false);
 for(const alternatives of ['bench',['unknown'],['goblet'],['bench','bench'],['walk'],['balance'],Array(11).fill('bench')])assert.throws(()=>parseAssignedItems([{...item,approvedSubstitutions:alternatives}]));
});
test('approved swap persists, preserves prescription, resets loads and never changes the assigned plan',async t=>{
 const f=await fixture(t);let s=f.s;
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'goblet',setIndex:0,done:false,amount:6,weight:50,actualRpe:9});
 const changed=await f.training.patch(client.userId,swap(s));
 const result=changed.items[0];
 assert.equal(result.exerciseId,'wall-slide');assert.equal(result.sets,3);assert.equal(result.reps,6);assert.equal(result.targetRpe,8);assert.equal(result.effortScale,'rir');
 assert.ok(result.results.every(r=>r.weight===0&&r.actualRpe===null&&!r.done));
 assert.deepEqual(result.approvedSubstitutions,['bench','goblet']);
 assert.equal((await f.training.feed(client.userId)).active.items[0].exerciseId,'wall-slide');
 assert.deepEqual((await f.training.getPlan(client.userId))[0].approvedSubstitutions,item.approvedSubstitutions);
 await assert.rejects(()=>f.training.patch(client.userId,swap(s)),e=>e.status===409);
 const back=await f.training.patch(client.userId,swap(changed,{replacementId:'goblet'}));assert.equal(back.items[0].exerciseId,'goblet');
 await f.training.patch(client.userId,{id:back.id,version:back.version,action:'cancel'});
 assert.equal((await f.training.start(client.userId,{requestId:randomUUID(),before:0})).items[0].exerciseId,'goblet');
});
test('forged approvals, missing confirmation and another owner cannot authorize a swap',async t=>{
 const f=await fixture(t);
 await assert.rejects(()=>f.training.patch(client.userId,swap(f.s,{replacementId:'walk',approvedSubstitutions:['walk']})),e=>e.status===403);
 await assert.rejects(()=>f.training.patch(client.userId,swap(f.s,{confirmed:false})),e=>e.status===400);
 f.sql.prepare("INSERT INTO user_intakes(user_id,answers_json,completed,created_at,updated_at) VALUES(?,'{}',1,'2026-01-01','2026-01-01')").run(stranger.userId);
 await assert.rejects(()=>f.training.patch(stranger.userId,swap(f.s)),e=>e.status===404);
 assert.equal((await f.training.feed(client.userId)).active.version,f.s.version);
});
test('completed sets and revoked coaching block even an approved alternative',async t=>{
 const f=await fixture(t);const s=await f.training.patch(client.userId,{id:f.s.id,version:f.s.version,action:'set',exerciseId:'goblet',setIndex:0,done:true,amount:6,weight:20,actualRpe:8});
 await assert.rejects(()=>f.training.patch(client.userId,swap(s)),e=>e.status===400);
 const own=await f.care.bundle(client,client.userId);await f.care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
 await assert.rejects(()=>f.training.patch(client.userId,swap(s)),e=>e.status===403);
});
