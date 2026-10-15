import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,coach,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {parseAssignedItems} from '../lib/care.ts';
import {assignedDays,selectWorkoutDay,planItemKey} from '../lib/workout-days.ts';
const item=(dayId,exerciseId='goblet',sets=2)=>({...defaultPrescription(exerciseId),dayId,sets,targetRpe:8,effortScale:'rir',approvedSubstitutions:exerciseId==='goblet'?['bench']:[]});
const program=()=>({id:randomUUID(),title:'תוכנית ימי אימון',items:[item('1'),item('2','goblet',4),item('2','wall-slide')]});
async function fixture(t){const f=platform(t);await f.connect();const p=program();await f.care.assign(coach,client.userId,p);return {...f,p};}
const start=(f,dayId)=>f.training.start(client.userId,{requestId:randomUUID(),before:0,...(dayId===undefined?{}:{dayId})});

test('day validation allows repeated exercises only in different stable slots',()=>{
 const parsed=parseAssignedItems(program().items);
 assert.deepEqual(assignedDays(parsed),['1','2']);assert.equal(new Set(parsed.map(planItemKey)).size,3);
 for(const dayId of ['',0,1,'0','8','01',{},null])assert.throws(()=>parseAssignedItems([item(dayId)]));
 assert.throws(()=>parseAssignedItems([item('1'),item('1')]));
 assert.throws(()=>parseAssignedItems([defaultPrescription('goblet'),item('1')]));
 assert.equal(selectWorkoutDay([defaultPrescription('goblet')],undefined).length,1);
 assert.throws(()=>selectWorkoutDay(parsed,undefined));
});
test('only one prescribed day enters the session and retries resume that snapshot',async t=>{
 const f=await fixture(t);
 for(const dayId of [undefined,'3','0',{},2])await assert.rejects(()=>start(f,dayId),e=>e.status===400);
 assert.equal((await f.training.feed(client.userId)).active,null);
 const s=await start(f,'2');
 assert.equal(s.programId,f.p.id);assert.equal(s.items.length,2);assert.equal(s.plannedSets,6);
 assert.ok(s.items.every(i=>i.dayId==='2'));assert.equal(s.items[0].sets,4);assert.equal(s.items[0].effortScale,'rir');
 assert.equal((await start(f,'1')).id,s.id);
 assert.deepEqual((await f.training.feed(client.userId)).active.items,s.items);
 await assert.rejects(()=>f.care.assign(coach,client.userId,program()),e=>e.status===409);
});
test('day snapshots and approved substitutions survive completion and program replacement',async t=>{
 const f=await fixture(t);let s=await start(f,'2');
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'swap',exerciseId:'goblet',replacementId:'bench',confirmed:true});
 assert.equal(s.items[0].dayId,'2');assert.equal(s.items[0].sets,4);
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:'bench',setIndex:0,amount:10,weight:20,done:true,actualRpe:8});
 s=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'finish',after:0});
 const p={id:randomUUID(),title:'תוכנית החלפה',items:[item('3')]};await f.care.assign(coach,client.userId,p);
 assert.deepEqual((await f.training.feed(client.userId)).history[0].items,s.items);
 await assert.rejects(()=>start(f,'2'),e=>e.status===400);
 const fresh=await start(f,'3');assert.equal(fresh.programId,p.id);assert.equal(fresh.items[0].exerciseId,'goblet');
});
test('legacy coaching and independent training remain compatible without day selection',async t=>{
 const f=platform(t);await f.connect();
 await f.training.savePlan(client.userId,defaultPrescription('goblet'));
 let s=await start(f,undefined);assert.equal(s.planMode,'self');
 await f.training.patch(client.userId,{id:s.id,version:s.version,action:'cancel'});
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'תוכנית קיימת',items:[defaultPrescription('goblet')]});
 s=await start(f,undefined);assert.equal(s.items.length,1);assert.equal(s.items[0].dayId,undefined);
});
