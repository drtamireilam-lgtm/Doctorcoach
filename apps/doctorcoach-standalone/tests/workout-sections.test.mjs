import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {workoutSection,workoutGroups,isStretchExercise} from '../lib/workout-sections.ts';
import {defaultPrescription,parsePlanItem} from '../lib/training.ts';
import {nextSetLoad} from '../lib/set-load.ts';
import {exercises} from '../lib/content.ts';
import {filterLibraryExercises} from '../lib/exercise-library.ts';
import {platform,client,coach,stranger} from './platform-db.mjs';
test('optional groups order warm-up, main, stretching and never manufacture an empty section',()=>{
 const items=[{...defaultPrescription('bench')},{...defaultPrescription('walk'),workoutSection:'warmup'},defaultPrescription('cossack-squat-stretch')];
 assert.deepEqual(workoutGroups(items).map(g=>g.value),['warmup','main','stretch']);
 assert.deepEqual(workoutGroups([items[0]]).map(g=>g.value),['main']);assert.deepEqual(workoutGroups([]),[]);
 assert.equal(workoutSection({}),'main');assert.throws(()=>parsePlanItem({...items[0],workoutSection:'invalid'}));
});
test('stretching category is disjoint from ordinary exercise browsing and retains favorites and video filters',()=>{
 const filters={search:'',area:'all',kind:'all',level:'all',favoritesOnly:false,favorites:[],videosOnly:false,demoIds:null};
 const stretch=filterLibraryExercises(exercises,{...filters,category:'stretch'}),main=filterLibraryExercises(exercises,{...filters,category:'exercise'});
 assert.equal(stretch.length,32);assert.ok(stretch.every(e=>isStretchExercise(e.id)));assert.ok(main.every(e=>!isStretchExercise(e.id)));
 assert.equal(stretch.length+main.length,exercises.length);
 assert.equal(filterLibraryExercises(exercises,{...filters,category:'stretch',videosOnly:true,demoIds:new Set([stretch[0].id])}).length,1);
});
test('independent section survives save, partial edits, session snapshot and resume; warm-up gets no load escalation',async t=>{
 const f=platform(t);await f.connect();
 await f.training.savePlan(client.userId,{...defaultPrescription('walk'),workoutSection:'warmup',unit:'minutes',reps:5,sets:1});
 await f.training.savePlan(client.userId,defaultPrescription('goblet'));
 await f.training.savePlan(client.userId,{...defaultPrescription('cossack-squat-stretch'),workoutSection:'stretch',unit:'seconds',reps:20});
 await f.training.savePlan(client.userId,{exerciseId:'walk',notes:'הנחיה אישית'});
 const plan=await f.training.getPlan(client.userId);assert.equal(plan.find(i=>i.exerciseId==='walk').workoutSection,'warmup');
 const started=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 assert.deepEqual(workoutGroups(started.items).map(g=>g.value),['warmup','main','stretch']);
 await f.training.savePlan(client.userId,{exerciseId:'walk',workoutSection:'main'});
 assert.equal((await f.training.feed(client.userId)).active.items.find(i=>i.exerciseId==='walk').workoutSection,'warmup');
 const warm={...defaultPrescription('bench'),workoutSection:'warmup',targetRpe:8,results:[{done:true,weight:100,amount:5,actualRpe:6},{done:false,weight:100,amount:5}]};
 assert.equal(nextSetLoad(warm,0,{before:0,after:null}).weight,null);
});
test('coach-assigned sections and timed stretches reach the trainee unchanged without granting trainee edit rights',async t=>{
 const f=platform(t);await f.connect();
 const items=[{...defaultPrescription('walk'),dayId:'2',workoutSection:'warmup'},{...defaultPrescription('goblet'),dayId:'2'}, {...defaultPrescription('cossack-squat-stretch'),dayId:'2',unit:'seconds',reps:25}];
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'תוכנית עם חימום ומתיחות',items});
 const plan=await f.training.getPlan(client.userId);assert.deepEqual(plan.map(workoutSection),['warmup','main','stretch']);
 await assert.rejects(()=>f.training.savePlan(client.userId,{...plan[0],workoutSection:'main'}),e=>e.status===403);
 const s=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'2',before:0});
 const saved=await f.training.patch(client.userId,{id:s.id,version:s.version,action:'set',exerciseId:items[2].exerciseId,setIndex:0,done:true,amount:25,weight:0,actualRpe:null});
 assert.equal(saved.items[2].results[0].amount,25);assert.equal(saved.items[2].workoutSection,'stretch');
 assert.equal((await f.training.getPlan(stranger.userId)).length,0);
});
