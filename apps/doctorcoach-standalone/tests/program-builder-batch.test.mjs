import test from 'node:test';
import assert from 'node:assert/strict';
import {appendProgramExerciseBatch} from '../lib/program-builder-ux.ts';
import {defaultPrescription} from '../lib/training.ts';
const item=()=>({...defaultPrescription('goblet'),occurrenceId:'original',notes:'preserve',weight:22.6});
test('batch append is atomic, ordered and scoped with fresh identities even for repeated exercises',()=>{
 const original=[item()],before=structuredClone(original);let id=0;
 const result=appendProgramExerciseBatch(original,['bench','goblet','bench'],name=>defaultPrescription(name),'2','warmup',()=>String(++id));
 assert.equal(result.ok,true);assert.deepEqual(original,before);assert.deepEqual(result.items.slice(1).map(i=>i.exerciseId),['bench','goblet','bench']);assert.deepEqual(result.items.slice(1).map(i=>i.occurrenceId),['1','2','3']);assert.ok(result.items.slice(1).every(i=>i.dayId==='2'&&i.workoutSection==='warmup'));
});
test('capacity and unknown exercises reject the entire batch without altering existing items',()=>{
 const original=Array.from({length:29},(_,i)=>({...item(),occurrenceId:String(i)}));
 assert.deepEqual(appendProgramExerciseBatch(original,['bench','goblet'],id=>defaultPrescription(id),'1','main'),{ok:false,reason:'capacity'});
 assert.deepEqual(appendProgramExerciseBatch([],['bench','gone'],id=>id==='gone'?null:defaultPrescription(id),'1','main'),{ok:false,reason:'unknown'});
 assert.deepEqual(appendProgramExerciseBatch([],[],id=>defaultPrescription(id),'1','main'),{ok:false,reason:'empty'});
});
