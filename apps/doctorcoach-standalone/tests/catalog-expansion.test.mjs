import test from 'node:test';
import assert from 'node:assert/strict';
import {exercises} from '../lib/content.ts';
import {exerciseAliases} from '../lib/exercise-aliases.ts';
import {searchExerciseNames,exactExerciseNameMatches} from '../lib/exercise-search.ts';
import {matchImportExercise,suggestImportExercises,extractImportRows,finalizeImport,detectImportColumns} from '../lib/program-import.ts';
import {filterLibraryExercises} from '../lib/exercise-library.ts';
import {defaultPrescription} from '../lib/training.ts';
import {parseAssignedItems} from '../lib/care.ts';
const added=['push-up','machine-chest-press','cable-fly','incline-barbell-bench','single-arm-db-row','t-bar-row','straight-arm-pulldown','assisted-pull-up','seated-db-shoulder-press','cable-lateral-raise','reverse-pec-deck','dumbbell-curl','incline-db-curl','preacher-curl','skull-crusher','cable-overhead-triceps','close-grip-bench','bulgarian-split-squat','hack-squat','smith-squat','reverse-lunge','walking-lunge','hip-abduction-machine','trap-bar-deadlift','sumo-deadlift','cable-crunch','ab-wheel','hanging-leg-raise','suitcase-carry'];
test('29 additions have distinct IDs, bilingual names, instruction fields and usable prescriptions',()=>{
 assert.equal(added.length,29);assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length);
 for(const id of added){const e=exercises.find(e=>e.id===id);assert.ok(e);for(const k of ['name','en','group','primary','desc','easier','harder'])assert.ok(e[k].trim());assert.ok(e.cues.length>=2);assert.equal(e.kind,'רגיל');assert.equal(matchImportExercise(e.en),id);assert.equal(parseAssignedItems([{...defaultPrescription(id),targetRpe:8}])[0].exerciseId,id);}
 assert.equal(defaultPrescription('suitcase-carry').unit,'seconds');assert.match(defaultPrescription('assisted-pull-up').notes,/סיוע/);
});
test('every curated alias references a real exercise and can be found in search',()=>{
 for(const [id,names] of Object.entries(exerciseAliases)){assert.ok(exercises.some(e=>e.id===id));for(const name of names)assert.ok(searchExerciseNames(exercises,name).some(e=>e.id===id),name);}
 for(const [name,id] of [['Pec Deck','chest-fly'],['RDL','rdl'],['RFESS','bulgarian-split-squat'],['Hex Bar Deadlift','trap-bar-deadlift'],['קרוס אובר','cable-fly'],['Scott Curl','preacher-curl']])assert.equal(matchImportExercise(name),id);
});
test('generic names import general movements while explicit variants remain selectable',()=>{
 for(const [name,id] of [['Leg Curl','movement-leg-curl'],['Hamstring Curl','movement-leg-curl'],['כפיפת ברך','movement-leg-curl'],['Bench Press','movement-chest-press']]){
  assert.equal(matchImportExercise(name),id);assert.ok(exactExerciseNameMatches(exercises,name).length>=2);assert.equal(suggestImportExercises(name)[0].id,id);
 }
 assert.equal(matchImportExercise('Seated Hamstring Curl'),'seated-curl');assert.equal(matchImportExercise('Prone Leg Curl'),'lying-curl');
 const cell=value=>({value,formula:false});const sheet={name:'A',rows:[['Exercise','Sets','Reps','RPE'].map(cell),['Leg Curl','3','6-8','8'].map(cell)]};const d=detectImportColumns(sheet);const rows=extractImportRows(sheet,d.header,d.mapping);assert.equal(rows[0].exerciseId,'movement-leg-curl');assert.equal(finalizeImport(rows)[0].repsMax,8);
});
test('library aliases respect category, favorites and video filters',()=>{
 const f={search:'Pec Deck',area:'all',kind:'all',level:'all',favoritesOnly:false,favorites:[],videosOnly:false,demoIds:null,category:'exercise'};
 assert.ok(filterLibraryExercises(exercises,f).some(e=>e.id==='chest-fly'));assert.deepEqual(filterLibraryExercises(exercises,{...f,category:'stretch'}),[]);assert.deepEqual(filterLibraryExercises(exercises,{...f,favoritesOnly:true}),[]);assert.deepEqual(filterLibraryExercises(exercises,{...f,videosOnly:true,demoIds:new Set()}),[]);
 assert.ok(filterLibraryExercises(exercises,{...f,search:'האק סקוואט'}).some(e=>e.id==='hack-squat'));
});
