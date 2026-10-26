import test from 'node:test';import assert from 'node:assert/strict';
import {exercises} from '../lib/content.ts';
import {matchExerciseForImport as match} from '../lib/exercise-matching.ts';
import {auditExerciseAliases} from '../scripts/audit-exercise-aliases.mjs';
import {filterCoachExercises,pickerEquipment} from '../lib/coach-exercise-picker.ts';
import {exerciseFamily} from '../lib/exercise-families.ts';
import {defaultPrescription} from '../lib/training.ts';
import {parseAssignedItems} from '../lib/care.ts';
import {readCsvWorkbook} from '../lib/csv-workbook.ts';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {verifyImportedWorkoutPersistence} from './import-journey-helper.mjs';
const variants=[
 ['seated-leg-press','Seated Leg Press','machine'],['incline-machine-chest-press','incline machine press','machine'],
 ['machine-lateral-raise','Side lateral machine','machine'],['machine-biceps-curl','biceps in machine','machine'],
 ['cable-straight-leg-hip-flexion','כפיפת ירך עם רגל ישרה כנגד פולי','cable'],['parallel-bar-dip','מקבילים','bodyweight'],
 ['wide-grip-cable-pulldown','Wide grip cable lat pulldown','cable'],['narrow-grip-cable-pulldown','פולי עליון צר','cable'],
 ['movement-wide-grip-pulldown','wide grip pulldown','unknown'],['movement-narrow-grip-pulldown','narrow grip pulldown','unknown'],
];
test('new canonical variants are unique bilingual records with explicit equipment and families',()=>{
 assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length);
 for(const [id,name,equipment] of variants){const e=exercises.find(e=>e.id===id);assert.ok(e,id);assert.ok(e.name&&e.en&&e.desc&&e.primary&&e.cues.length>=2);assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,id,name);assert.ok(pickerEquipment(e).includes(equipment),id);assert.ok(exerciseFamily(e));assert.equal(parseAssignedItems([defaultPrescription(id)])[0].exerciseId,id);assert.ok(filterCoachExercises(exercises,e.en,'all',equipment).some(x=>x.id===id));}
});
test('all new variants meet the 15 unique bilingual alternative name target',()=>{
 const audit=auditExerciseAliases();for(const [id] of variants){const r=audit.rows.find(r=>r.exerciseId===id);assert.ok(r,id);assert.ok(r.aliasCount>=15,id+': '+r.aliasCount);assert.ok(r.hasHebrew&&r.hasEnglish,id);}
});
test('general grip names never infer cable while explicit implements and adjacent angles remain distinct',()=>{
 for(const [name,id] of [['wide grip pulldown','movement-wide-grip-pulldown'],['narrow grip pulldown','movement-narrow-grip-pulldown'],['פולי עליון רחב','wide-grip-cable-pulldown'],['פולי עליון צר','narrow-grip-cable-pulldown'],['narrow grip hammer pulldown','movement-hammer-pulldown-narrow'],['flat machine press','machine-chest-press'],['Incline DB Press','incline-db'],['Lateral Raise','movement-lateral-raise'],['Leg Curl','movement-leg-curl']])assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,id,name);
 for(const name of ['incline flat machine chest press','standing seated leg press','bench dips','assisted parallel bar dips','weighted parallel bar dips','standing machine lateral raise','seated machine lateral raise','machine preacher curl','single arm machine biceps curl','supinated narrow grip cable pulldown','wide grip cable pulldown behind neck','lying straight leg cable hip flexion'])assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,'',name);
});
test('new source variants preserve doses and distinct IDs through real draft assignment workout and reload',async t=>{
 const csv='Exercise,Sets,Reps,Weight\n'+variants.map(([,name])=>`${name},2,6-10,20`).join('\n');
 const sheet=readCsvWorkbook(new TextEncoder().encode(csv))[0];const d=detectImportColumns(sheet);const items=finalizeImport(extractImportRows(sheet,d.header,d.mapping));
 assert.deepEqual(items.map(i=>i.exerciseId),variants.map(([id])=>id));assert.ok(items.every(i=>i.sets===2&&i.reps===6&&i.repsMax===10&&i.weight===20));
 await verifyImportedWorkoutPersistence(t,items);
});
test('equipment-only chest names and broad vertical pulling do not identify presses or pulldowns',()=>{
 for(const name of ['Incline chest machine','Wide grip vertical pull','Wide grip upper pull','Narrow grip vertical pull','Close grip vertical pull','משיכה אנכית באחיזה רחבה','משיכה אנכית באחיזה צרה'])assert.equal(match(name,undefined,{allowGeneralMovement:true}).exerciseId,'',name);
});
