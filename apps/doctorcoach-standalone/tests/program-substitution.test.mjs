import test from 'node:test';
import assert from 'node:assert/strict';
import * as substitutions from '../lib/program-substitution.ts';
import {defaultPrescription} from '../lib/training.ts';
import {exercises} from '../lib/content.ts';
test('substitution preserves compatible dose and slot while clearing exercise-specific load and options',()=>{
 assert.equal(typeof substitutions.substituteProgramExercise,'function');
 const source={...defaultPrescription('goblet'),occurrenceId:'slot',dayId:'2',weight:60,weightUnspecified:false,targetRpe:7,targetRpes:[7,8],repsMax:12,warmupSets:[{reps:5,weight:30}],approvedSubstitutions:['back-squat'],load:{sourceValue:60},notes:'coach cue'};
 const result=substitutions.substituteProgramExercise(source,exercises.find(e=>e.id==='bench'));
 assert.equal(result.exerciseId,'bench');assert.equal(result.occurrenceId,'slot');assert.equal(result.dayId,'2');assert.equal(result.targetRpe,7);assert.equal(result.repsMax,12);assert.equal(result.notes,'coach cue');
 assert.equal(result.weight,0);assert.equal(result.weightUnspecified,true);assert.equal(result.load,undefined);assert.equal(result.warmupSets,undefined);assert.deepEqual(result.approvedSubstitutions,[]);
 result.targetRpes[0]=10;assert.equal(source.targetRpes[0],7);assert.equal(source.weight,60);
});
test('substitution rejects incompatible units and cardio without mutating the source',()=>{
 const source=defaultPrescription('goblet');assert.throws(()=>substitutions.substituteProgramExercise(source,exercises.find(e=>e.id==='walk')));
 assert.equal(source.exerciseId,'goblet');
});
