import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';

async function setup(t,coached=false){
 const f=platform(t);await f.connect();
 const items=['goblet','goblet','wall-slide'].map((id,index)=>({...defaultPrescription(id),occurrenceId:'slot-'+index,workoutSection:'main',targetRpe:8,targetRpes:[7,8]}));
 if(coached)await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Synthetic',items});
 else for(const item of items)await f.training.savePlan(client.userId,item);
 const s=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 return {...f,s,patch:(s,p)=>f.training.patch(client.userId,{id:s.id,version:s.version,...p})};
}
test('active order controls persist occurrences and recorded sets without changing prescribed order or plan',async t=>{
 const f=await setup(t),a=f.s.items[0];
 let s=await f.patch(f.s,{action:'set',exerciseId:a.exerciseId,occurrenceId:a.occurrenceId,setIndex:0,done:true,amount:8,weight:35.5,actualRpe:7});
 s=await f.patch(s,{action:'moveExercise',exerciseId:a.exerciseId,occurrenceId:a.occurrenceId,direction:1});
 assert.deepEqual(s.items.map(i=>i.occurrenceId),['slot-1','slot-0','slot-2']);
 assert.equal(s.items[1].results[0].weight,35.5);assert.equal(s.items[1].prescribedPosition,0);
 assert.equal(s.items[1].prescription.targetRpe,8);
 assert.deepEqual((await f.training.getPlan(client.userId)).map(i=>i.occurrenceId),['slot-0','slot-1','slot-2']);
 assert.deepEqual((await f.training.feed(client.userId)).active.items,s.items);
});
test('independent trainees add and remove untouched sets while preserving original targets and prescribed counts',async t=>{
 const f=await setup(t),a=f.s.items[0],select={exerciseId:a.exerciseId,occurrenceId:a.occurrenceId};
 let s=await f.patch(f.s,{action:'addSet',...select});
 assert.equal(s.items[0].sets,3);assert.equal(s.items[0].prescription.sets,2);
 assert.deepEqual(s.items[0].targetRpes,[7,8,null]);assert.equal(s.items[0].results[2].done,false);
 assert.equal(s.plannedSets,f.s.plannedSets+1);
 s=await f.patch(s,{action:'removeSet',...select});
 assert.equal(s.plannedSets,f.s.plannedSets);
 assert.equal(s.items[0].sets,2);assert.deepEqual(s.items[0].targetRpes,[7,8]);
 s=await f.patch(s,{action:'set',...select,setIndex:1,done:false,amount:8,weight:40,actualRpe:7});
 await assert.rejects(()=>f.patch(s,{action:'removeSet',...select}),e=>e.status===409);
 assert.equal((await f.training.feed(client.userId)).active.items[0].results[1].weight,40);
});
test('coach dose remains protected while trainee can reorder an authorized assigned session',async t=>{
 const f=await setup(t,true),a=f.s.items[0],select={exerciseId:a.exerciseId,occurrenceId:a.occurrenceId};
 await assert.rejects(()=>f.patch(f.s,{action:'addSet',...select}),e=>e.status===403);
 await assert.rejects(()=>f.patch(f.s,{action:'removeSet',...select}),e=>e.status===403);
 const moved=await f.patch(f.s,{action:'moveExercise',...select,direction:1});
 assert.equal(moved.items[1].occurrenceId,a.occurrenceId);
 assert.equal(moved.items[1].prescription.targetRpe,8);
});
test('structural changes respect ownership, versions and commit-time safety and consent',async t=>{
 for(const action of ['moveExercise','addSet','removeSet']){
  const f=await setup(t),a=f.s.items[0],payload={action,exerciseId:a.exerciseId,occurrenceId:a.occurrenceId,direction:1};
  await assert.rejects(()=>f.training.patch('stranger',{id:f.s.id,version:f.s.version,...payload}),e=>[403,404].includes(e.status));
  await assert.rejects(()=>f.training.patch(client.userId,{id:f.s.id,version:f.s.version-1,...payload}),e=>e.status===409);
  const prepare=f.db.prepare;
  f.db.prepare=query=>{if(query.startsWith('UPDATE training_sessions SET items_json'))f.sql.exec("UPDATE user_consents SET accepted=0 WHERE user_id='client' AND consent_id='health'");return prepare(query);};
  await assert.rejects(()=>f.patch(f.s,payload),e=>e.status===403);
  assert.deepEqual((await f.training.feed(client.userId)).active.items,f.s.items);
 }
});

test('set bounds and completed values are protected while automatic next-load suggestions may be removed',async t=>{
 const f=await setup(t),select={exerciseId:f.s.items[0].exerciseId,occurrenceId:f.s.items[0].occurrenceId};
 let s=f.s;
 for(let n=2;n<20;n++)s=await f.patch(s,{action:'addSet',...select});
 await assert.rejects(()=>f.patch(s,{action:'addSet',...select}));
 s=await f.patch(s,{action:'set',...select,setIndex:19,done:true,amount:10,weight:50,actualRpe:8});
 await assert.rejects(()=>f.patch(s,{action:'removeSet',...select}),e=>e.status===409);
 const {removableSessionSet}=await import('../lib/session-flexibility.ts');
 const item={...s.items[0],sets:2,results:[s.items[0].results[0],{done:false,amount:10,weight:60,weightSource:'automatic'}]};
 assert.equal(removableSessionSet(item),true);
 assert.equal(removableSessionSet({...item,results:[item.results[0],{...item.results[1],weightSource:'manual'}]}),false);
});
