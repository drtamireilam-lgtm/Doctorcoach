import test from 'node:test';
import assert from 'node:assert/strict';
import {matchExerciseForImport as match} from '../lib/exercise-matching.ts';
const options={allowGeneralMovement:true};
import {recognitionCases} from './fixtures/smart-import-31-recognition.mjs';
test('24 reviewed bilingual examples retain correct specific/generic matches or manual review',()=>{
 for(const [name,id] of recognitionCases)assert.equal(match(name,undefined,options).exerciseId,id,name);
});
test('cached fuzzy reviews cannot be poisoned by caller mutation',()=>{
 const first=match('Dumbbel bench press',undefined,options),expected=structuredClone(first);
 first.exerciseId='fake';first.candidates[0].exerciseId='fake';first.candidates.length=0;
 assert.deepEqual(match('Dumbbel bench press',undefined,options),expected);
});
test('cached review policy and catalog ownership stay isolated',()=>{
 const general=match('Chest pres',undefined,options);
 assert.ok(general.candidates.some(c=>c.exerciseId.startsWith('movement-')));
 assert.ok(match('Chest pres').candidates.every(c=>!c.exerciseId.startsWith('movement-')));
 assert.equal(match('Chest pres',undefined,{suggestions:false}).status,'unmatched');
 const a=[{id:'private-a',name:'Special curl',en:'Special curl'}],b=[{id:'private-b',name:'Special curl',en:'Special curl'}];
 assert.equal(match('Special curll',a).candidates[0].exerciseId,'private-a');
 assert.equal(match('Special curll',b).candidates[0].exerciseId,'private-b');
});
test('evicting old repeated-query results never changes review semantics',()=>{
 const catalog=[{id:'private',name:'Special curl',en:'Special curl'}];
 const old=match('Special curll',catalog);
 for(let i=0;i<140;i++)match(`Unrecognized movement ${i}`,catalog);
 assert.deepEqual(match('Special curll',catalog),old);
});
