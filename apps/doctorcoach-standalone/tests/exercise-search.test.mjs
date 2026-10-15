import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises} from '../lib/content.ts';
import {searchExerciseNames,bilingualExerciseName,exactExerciseNameMatches} from '../lib/exercise-search.ts';
import {filterLibraryExercises} from '../lib/exercise-library.ts';
import {exerciseFamily} from '../lib/exercise-families.ts';
test('all catalog exercises carry Hebrew and English names; search finds either language',()=>{
 assert.ok(exercises.length>0);for(const e of exercises){assert.ok(e.name.trim());assert.ok(e.en.trim());assert.ok(searchExerciseNames(exercises,e.en).some(x=>x.id===e.id));assert.ok(searchExerciseNames(exercises,e.name).some(x=>x.id===e.id));assert.ok(bilingualExerciseName(e).includes(e.en));}
 assert.ok(searchExerciseNames(exercises,'  LEG  PRESS ').some(e=>e.en==='Leg Press'));assert.equal(searchExerciseNames(exercises,'zzzzzz-nothing').length,0);assert.equal(searchExerciseNames(exercises,'').length,exercises.length);
});
test('adductors, neck and lumbar exercises are discoverable in both library and program picker',()=>{
 const cases=[['קירוב ירך',['adduction','adductor-squeeze','copenhagen-short-lever','copenhagen-long-lever']],['מקרבים',['adduction','adductor-squeeze','copenhagen-short-lever','copenhagen-long-lever']],['צוואר',['chin-tuck','deep-neck-flexor-hold','cervical-isometric-rotation']],['גב תחתון',['back-extension','mcgill-curl-up','hip-hinge-dowel','bird-dog','dead-bug']],['פשיטת גו',['back-extension']],['Neck',['chin-tuck','deep-neck-flexor-hold','cervical-isometric-rotation']],['Adductor Machine',['adduction']]];
 const filters={area:'all',kind:'all',level:'all',favoritesOnly:false,favorites:[],videosOnly:false,demoIds:null,category:'exercise'};
 for(const [query,expected] of cases){for(const result of [searchExerciseNames(exercises,query),filterLibraryExercises(exercises,{...filters,search:query})]){for(const id of expected)assert.ok(result.some(e=>e.id===id),`${query}: ${id}`);assert.equal(new Set(result.map(e=>e.id)).size,result.length);}}
 assert.equal(exerciseFamily(exercises.find(e=>e.id==='adduction')),'קירוב ירך ומקרבים');
 assert.equal(exerciseFamily(exercises.find(e=>e.id==='chin-tuck')),'צוואר');
 assert.equal(exerciseFamily(exercises.find(e=>e.id==='back-extension')),'גב תחתון ושליטה בגו');
 assert.deepEqual(exactExerciseNameMatches(exercises,'פשיטת גו').map(e=>e.id),['back-extension']);
 // Body-part search must not silently auto-select an exercise during import.
 assert.deepEqual(exactExerciseNameMatches(exercises,'צוואר'),[]);
 assert.equal(filterLibraryExercises(exercises,{...filters,search:'צוואר',kind:'רגיל'}).some(e=>e.id==='chin-tuck'),false);
});
