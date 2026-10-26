import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewImportExerciseName as review} from '../lib/import-recognition-review.ts';
import {matchExerciseForImport as match} from '../lib/exercise-matching.ts';

// Removing a review rule must lose the diagnostic, never silently auto-assign.
test('unresolved source classes expose an actionable review reason',()=>{
 const groups={
  'missing-name':['','  '],heading:['Legs 1','Legs 2'],instruction:['יד קדמית צריך שני תרגילים'],
  uncertain:['דדליפט רומני?','לחיצת כתפיים מוט?','מתח רחב או pulldown'],
  'ambiguous-variant':['Hip Abduction','Hip Adduction','bicep curl bench lean 45° back','hammer strength narrow grip pulling machine','single hand pullover','tricep extension pully','leg curl machine','כסא רומי','יד אחורי ת כבל','הרחקה בישיבה במכונה','kickback','Tricep extension pulley with straight bar','pronated shoulder flexion','wide grip pully'],

 };
 for(const [category,names] of Object.entries(groups))for(const name of names){const result=review(name);assert.equal(result.category,category,name);assert.ok(result.he.length>10);assert.ok(result.en.length>10);assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,'',name);}
});
test('machine leg curl suggests both postures and never leg extension',()=>{
 assert.deepEqual(review('Leg curl machine').candidateIds,['seated-curl','lying-curl']);
 assert.deepEqual(review('tricep extension pully').candidateIds,['triceps-pushdown','cable-overhead-triceps']);
});
test('missing catalog variants and headings never offer an inappropriate near variant',()=>{
 for(const name of ['wide grip pulldown','incline machine press','Side lateral machine'])assert.equal(review(name),null);
 for(const name of ['Legs 1',''])assert.deepEqual(review(name).candidateIds,[]);
});
test('unknown phrases use the existing fallback and known assignments need no unresolved diagnostic',()=>{
 assert.equal(review('unseen exercise description'),null);assert.equal(review('Dumbbell bench press'),null);
});
test('review candidates are filtered to actual entries of the supplied catalog',()=>{
 assert.deepEqual(review('leg curl machine',[{id:'lying-curl',name:'Test',en:'Test'}]).candidateIds,['lying-curl']);
 assert.deepEqual(review('leg curl machine',[]).candidateIds,[]);
});
test('review names normalize case, punctuation and word order consistently with the matcher',()=>{
 assert.deepEqual(review('machine LEG curl'),review('leg curl machine'));
 assert.equal(review('Legs 12'),null);assert.equal(review('single arm cable triceps extension not overhead'),null);
});
test('unmatched source wording does not claim that an equivalent custom variant is absent',()=>{
 const custom=[{id:'custom:synthetic',name:'לחיצת חזה במכונה בשיפוע',en:'Incline Machine Chest Press'}];
 const result=review('incline machine press',custom);
 assert.ok(result.en.includes('Search the catalog'));assert.ok(!result.en.includes('catalog has no'));
 assert.ok(!review('narrow grip pulldown',[]).en.includes('absent'));
});
test('new supported variants no longer show unresolved-name diagnostics',()=>{
 for(const name of ['incline machine press','wide grip pulldown','Seated Leg Press','Side lateral machine','biceps in machine','מקבילים','כפיפת ירך עם רגל ישרה כנגד פולי'])assert.equal(review(name),null,name);
});
