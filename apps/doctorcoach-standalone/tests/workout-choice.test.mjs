import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,stranger} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {nextAssignedWorkout,startWorkoutChoice} from '../lib/workout-choice.ts';
import {workoutPreferencesStore} from '../lib/workout-preferences.ts';
const items=['1','2','3','4'].map(dayId=>({...defaultPrescription('goblet'),dayId}));
const session=(day,status='completed',programId='assigned',at='2026-10-13T12:00:00Z')=>({id:day,status,programId,planMode:'coached',items:[{...items[0],dayId:day}],startedAt:at,finishedAt:at});
test('fixed order follows completed workouts in the current assignment and wraps',()=>{
 assert.equal(nextAssignedWorkout(items,[],'assigned'),'1');
 assert.equal(nextAssignedWorkout(items,[session('2')],'assigned'),'3');
 assert.equal(nextAssignedWorkout(items,[session('4')],'assigned'),'1');
 assert.equal(nextAssignedWorkout(items,[session('4','cancelled'),session('3','active'),session('2','completed','other')],'assigned'),'1');
 assert.equal(nextAssignedWorkout(items,[session('3','completed','assigned','2026-10-12T12:00:00Z'),session('1')],'assigned'),'2');
 assert.equal(nextAssignedWorkout(items,[session('6')],'assigned'),'1');
 assert.equal(nextAssignedWorkout([],[],'assigned'),undefined);
});
test('flexible mode requires an explicit authorized day; fixed mode ignores preview choice',()=>{
 assert.equal(startWorkoutChoice('flexible',['1','2'],'1',undefined),undefined);
 assert.equal(startWorkoutChoice('flexible',['1','2'],'1','3'),undefined);
 assert.equal(startWorkoutChoice('flexible',['1','2'],'1','2'),'2');
 assert.equal(startWorkoutChoice('fixed',['1','2'],'1','2'),'1');
 assert.equal(startWorkoutChoice('fixed',['2','4'],'1',undefined),'2');
});
test('workout preference persists per account with safe default and optimistic concurrency',async t=>{
 const f=platform(t),store=workoutPreferencesStore(f.db);
 assert.deepEqual(await store.get(client.userId),{mode:'fixed',version:0});
 const saved=await store.save(client.userId,{mode:'flexible',version:0,userId:stranger.userId});
 assert.deepEqual(saved,{mode:'flexible',version:1});
 assert.deepEqual(await workoutPreferencesStore(f.db).get(client.userId),saved);
 assert.deepEqual(await store.get(stranger.userId),{mode:'fixed',version:0});
 await assert.rejects(()=>store.save(client.userId,{mode:'fixed',version:0}),e=>e.status===409);
 assert.deepEqual(await store.save(client.userId,{mode:'fixed',version:1}),{mode:'fixed',version:2});
 for(const payload of [null,{}, {mode:'other',version:2},{mode:'flexible',version:-1},{mode:'fixed',version:'2'}])await assert.rejects(()=>store.save(client.userId,payload),e=>e.status===400);
});
