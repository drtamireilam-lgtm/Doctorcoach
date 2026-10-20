import test from 'node:test';
import assert from 'node:assert/strict';
import {matchExerciseForImport as match} from '../lib/exercise-matching.ts';

test('verified bilingual aliases and equipment abbreviations identify canonical IDs',()=>{
 for(const [name,id] of [['DB Bench Press','bench'],['בנצ׳ פרס עם מוט','barbell-bench'],['בנצ פרס','barbell-bench'],['benchpress','barbell-bench'],['רומניאן דדליפט','rdl'],['B.B. bench press','barbell-bench'],['כפיפת מרפקים דאמבלים','dumbbell-curl'],['פייספול','face-pull']]) assert.equal(match(name).exerciseId,id,name);
});
test('generic variants and unsafe modifiers require explicit selection',()=>{
 for(const name of ['Bench Press','Leg Curl','Hamstring Curl','DB incline flat bench press','left right dumbbell row','machine barbell bench press','decline dumbbell bench press','single double leg Romanian deadlift']) assert.equal(match(name).exerciseId,'',name);
 assert.equal(match('single leg Romanian deadlift').exerciseId,'single-leg-rdl');
 assert.equal(match('Leg Curl').status,'ambiguous');
});
test('fuzzy candidates never automatically assign an exercise',()=>{
 const result=match('overheard press');assert.equal(result.exerciseId,'');assert.equal(result.status,'suggested');assert.ok(result.candidates.some(c=>c.exerciseId==='overhead-press'));
 assert.equal(match('zzzzunknown').status,'unmatched');assert.equal(match('').status,'unmatched');
});
test('custom aliases honor collisions and explicit catalog scope',()=>{
 const catalog=[{id:'custom1',name:'תרגיל אישי',en:'Custom exercise',aliases:['My movement']},{id:'custom2',name:'שני',en:'Second',aliases:['My movement']}];
 assert.equal(match('My movement',catalog).status,'ambiguous');assert.equal(match('תרגיל אישי',catalog).exerciseId,'custom1');assert.equal(match('Leg press',catalog).status,'unmatched');
});
