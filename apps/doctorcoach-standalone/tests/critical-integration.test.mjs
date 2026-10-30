import test from 'node:test';
import assert from 'node:assert/strict';
import {readCsvWorkbook} from '../lib/csv-workbook.ts';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {matchExerciseForImport} from '../lib/exercise-matching.ts';
const read=csv=>{const sheet=readCsvWorkbook(new TextEncoder().encode(csv))[0];const d=detectImportColumns(sheet);return extractImportRows(sheet,d.header,d.mapping);};
test('combined integration retains spaced and extended numbered headings without consuming data',()=>{
 const labels=['C2','C 2','C12','C 12','Workout C12','אימון C 12'];
 const rows=read('Exercise,Sets,Reps,Notes\n'+labels.map(label=>label+',,,\nLeg Curl,2,8,').join('\n'));
 assert.equal(rows.length,labels.length);assert.deepEqual(rows.map(row=>row.sourceDay),labels);
 const annotated=read('Exercise,Sets,Reps,Notes\nC 12,,,keep\nC12,3,8,');
 assert.deepEqual(annotated.map(row=>row.name),['C 12','C12']);
 assert.equal(annotated[0].notes,'keep');
});
test('generic Hebrew bench aliases do not invent equipment while explicit variants stay exact',()=>{
 for(const name of ['בנץ פרס','בנץ׳ פרס',"בנץ' פרס"]){assert.equal(matchExerciseForImport(name,undefined,{allowGeneralMovement:true}).exerciseId,'movement-chest-press',name);}
 for(const [name,id] of [['Barbell Bench Press','barbell-bench'],['BB bench press','barbell-bench'],['לחיצת חזה במוט','barbell-bench'],['DB Bench Press','bench'],['לחיצת חזה דמבלים','bench']])assert.equal(matchExerciseForImport(name,undefined,{allowGeneralMovement:true}).exerciseId,id,name);
});
test('actual RPE notes survive unknown private program save assignment and reopen',async t=>{
 const rows=read('Exercise,Sets,Reps,RPE בפועל,Notes\nC 2,,,,\nSynthetic orbit row,2,8,"7,7",source note');
 assert.equal(rows.length,1);assert.equal(rows[0].rpe,'');assert.equal(rows[0].notes,'source note\nRPE בפועל: 7,7');
 const items=finalizeImport(rows);assert.equal(items.length,1);assert.equal(items[0].targetRpe,null);assert.equal(items[0].notes,rows[0].notes);
 const {verifyImportedWorkoutPersistence}=await import('./import-journey-helper.mjs');await verifyImportedWorkoutPersistence(t,items);
});
