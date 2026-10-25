// Synthetic local database workflow, not a browser or live LAB test.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,client,coach,stranger} from './platform-db.mjs';
import {coachDraftStore} from '../lib/coach-drafts.ts';
import {trainingStore} from '../lib/training-store.ts';

const prescription=item=>Object.fromEntries(['exerciseId','occurrenceId','sets','reps','repsMax','unit','weight','weightUnspecified','warmupSets','load','side','tempo','targetRpe','targetRpes','effortScale','workoutSection','notes'].map(key=>[key,item[key]??null]));

export async function verifyImportedWorkoutPersistence(t,items){
 const f=platform(t);await f.connect();
 const drafts=coachDraftStore(f.db,f.care);
 await assert.rejects(()=>drafts.save(stranger,client.userId,{action:'save',requestId:randomUUID(),version:0,title:'Synthetic import',items,revisionOf:null}),e=>e.status===403);
 await drafts.save(coach,client.userId,{action:'save',requestId:randomUUID(),version:0,title:'Synthetic import',items,revisionOf:null});
 const saved=(await coachDraftStore(f.db,f.care).get(coach,client.userId)).draft;
 assert.deepEqual(saved.items,items);
 await assert.rejects(()=>f.care.assign(stranger,client.userId,{id:randomUUID(),title:saved.title,items:saved.items}),e=>e.status===403);
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:saved.title,items:saved.items});
 for(const dayId of [...new Set(items.map(i=>i.dayId))]){
  const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId,before:0});
  const expected=items.filter(i=>i.dayId===dayId);
  assert.deepEqual(session.items.map(i=>i.exerciseId),expected.map(i=>i.exerciseId));
  assert.deepEqual(session.items.map(i=>i.occurrenceId),expected.map(i=>i.occurrenceId));
  assert.deepEqual(session.items.map(prescription),expected.map(prescription));
  for(const item of session.items){
   assert.deepEqual(item.results,Array.from({length:item.sets},()=>({done:false,amount:item.reps,weight:item.weight})));
   assert.deepEqual(item.warmupResults??[],(item.warmupSets??[]).map(set=>({...set,done:false})));
  }
  const first=session.items[0];
  await f.training.patch(client.userId,{id:session.id,version:session.version,action:'set',exerciseId:first.exerciseId,occurrenceId:first.occurrenceId,setIndex:0,done:true,amount:8,weight:27,actualRpe:8});
  const reopened=(await trainingStore(f.db).feed(client.userId)).active;
  assert.equal(reopened.items[0].results[0].weight,27);
  assert.equal(reopened.items[0].results[0].done,true);
  assert.deepEqual(reopened.items.map(prescription),expected.map(prescription));
  assert.deepEqual(reopened.items.map(i=>i.warmupResults??[]),session.items.map(i=>i.warmupResults??[]));
  assert.deepEqual(reopened.items.map(i=>i.notes),expected.map(i=>i.notes));
  // Finish this synthetic session before opening the next imported day.
  await f.training.patch(client.userId,{id:reopened.id,version:reopened.version,action:'finish',after:0});
 }
}
