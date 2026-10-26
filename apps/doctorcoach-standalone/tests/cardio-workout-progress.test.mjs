import test from 'node:test';
import assert from 'node:assert/strict';
import {workoutProgress} from '../lib/workout-progress.ts';
test('cardio-only workout progress is finite and completes without invented strength sets',()=>{
 const s={plannedSets:0,completedSets:0,items:[{cardio:{},cardioResult:undefined}]};
 assert.equal(workoutProgress(s).percentage,0);assert.equal(workoutProgress(s).allComplete,false);
 s.items[0].cardioResult={status:'completed'};assert.equal(workoutProgress(s).percentage,100);assert.equal(workoutProgress(s).allComplete,true);
});
test('mixed workout progress requires cardio completion as well as strength sets',()=>{
 const s={plannedSets:2,completedSets:2,items:[{}, {cardio:{}}]};
 assert.equal(workoutProgress(s).allComplete,false);assert.equal(workoutProgress(s).percentage,67);
 assert.deepEqual(workoutProgress({plannedSets:4,completedSets:2,items:[{}]}),{percentage:50,allComplete:false,cardioPlanned:0,cardioCompleted:0});
});
