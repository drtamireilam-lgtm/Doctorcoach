import test from 'node:test';
import assert from 'node:assert/strict';
import {homeWorkoutPreview} from '../lib/home-workout.ts';
const plan=[{exerciseId:'a',dayId:'1',sets:3},{exerciseId:'b',dayId:'2',sets:4},{exerciseId:'c',dayId:'2',sets:2}];
test('home chooses only the next day of the current fixed coached assignment',()=>{
 const history=[{id:'old',status:'completed',planMode:'coached',programId:'old',finishedAt:'2026-10-16',items:[plan[1]]},{id:'current',status:'completed',planMode:'coached',programId:'current',finishedAt:'2026-10-15',items:[plan[0]]}];
 assert.deepEqual(homeWorkoutPreview(plan,history,'coached','fixed','current'),{day:'2',days:2,exercises:2,sets:6});
});
test('home leaves multiple self and flexible days for explicit selection',()=>{
 for(const [mode,choice] of [['self','fixed'],['coached','flexible']])assert.deepEqual(homeWorkoutPreview(plan,[],mode,choice,null),{day:undefined,days:2,exercises:0,sets:0});
});
test('one-day and empty programs have truthful preview counts',()=>{
 assert.deepEqual(homeWorkoutPreview(plan.slice(0,1),[],'self','fixed',null),{day:'1',days:1,exercises:1,sets:3});
 assert.deepEqual(homeWorkoutPreview([],[],'coached','fixed',null),{day:undefined,days:0,exercises:0,sets:0});
});
