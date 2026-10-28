import test from 'node:test';
import assert from 'node:assert/strict';
import {matchExerciseForImport} from '../lib/exercise-matching.ts';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {readCsvWorkbook} from '../lib/csv-workbook.ts';
const match=name=>matchExerciseForImport(name,undefined,{allowGeneralMovement:true});
test('unspecified equipment uses general movements; explicit implements preserve specific IDs',()=>{
 for(const [name,id] of [['Squat','movement-squat'],['Leg Curl','movement-leg-curl'],['Bench Press','movement-chest-press'],['Calves','movement-calf-raise'],['calso shrugs','movement-kelso-shrug'],['narrow grip hammer pulldown','movement-hammer-pulldown-narrow'],['wide grip hammer rows','movement-hammer-row-wide'],['Barbell Bench Press','barbell-bench'],['Dumbbell Bench Press','bench'],['Lying Leg Curl','lying-curl']])assert.equal(match(name).exerciseId,id,name);
 assert.notEqual(match('Shrugs').exerciseId,match('Kelso Shrug').exerciseId);
});
test('import saves general movement and optional implement note without requiring equipment',()=>{
 const sheet=readCsvWorkbook(new TextEncoder().encode('Exercise,Sets,Reps,Notes\nLeg Curl,3,8,\nKelso Shrug,2,12,מכשיר לבחירת המאמן'))[0];
 const d=detectImportColumns(sheet);const items=finalizeImport(extractImportRows(sheet,d.header,d.mapping));
 assert.deepEqual(items.map(i=>i.exerciseId),['movement-leg-curl','movement-kelso-shrug']);assert.equal(items[0].notes,'');assert.equal(items[1].notes,'מכשיר לבחירת המאמן');
});

test('general movement and optional implement survive assignment, workout and reopening',async t=>{
 const {platform,client,coach}=await import('./platform-db.mjs');const {randomUUID}=await import('node:crypto');const {defaultPrescription}=await import('../lib/training.ts');
 const f=platform(t);await f.connect();const items=[{...defaultPrescription('movement-kelso-shrug'),notes:'ציוד: דאמבלים'},{...defaultPrescription('movement-leg-curl'),notes:''}];
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'Synthetic general movement program',items});
 const session=await f.training.start(client.userId,{requestId:randomUUID(),dayId:'1',before:0});
 assert.equal(session.items[0].exerciseId,'movement-kelso-shrug');assert.equal(session.items[0].notes,'ציוד: דאמבלים');
 const reopened=(await f.training.feed(client.userId)).active;assert.equal(reopened.items[1].exerciseId,'movement-leg-curl');assert.equal(reopened.items[1].notes,'');
});

test('preview name edits apply the same general-movement policy as file extraction',async()=>{
 const {matchExerciseForRow}=await import('../lib/program-import.ts');
 for(const [name,id] of [['Chest Press','movement-chest-press'],['Lateral Raise','movement-lateral-raise'],['Leg Curl','movement-leg-curl']])assert.equal(matchExerciseForRow(name).exerciseId,id,name);
});
