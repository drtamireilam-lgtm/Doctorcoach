import test from 'node:test';import assert from 'node:assert/strict';
import {cycle8} from './fixtures/workout-cycle-8.mjs';
import {extractWorkbookImport,finalizeImport,detectImportColumns} from '../lib/program-import.ts';
const sheets=cycle8.map(s=>({...s,rows:s.rows.map(r=>r.map(v=>({value:String(v??''),formula:false})))}));
test('Cycle8 retains all21 source rows, exact rep ranges and Starting RPE7 across three days',()=>{
 for(const s of sheets)assert.equal(detectImportColumns(s).mapping.rpe,3,s.name);
 const rows=extractWorkbookImport(sheets,[0,1,2]),items=finalizeImport(rows);assert.equal(rows.length,21);assert.equal(items.length,21);assert.deepEqual(rows.map(r=>r.name),cycle8.flatMap(s=>s.rows.slice(1).map(r=>r[0])));assert.deepEqual([1,2,3].map(d=>items.filter(i=>i.dayId===String(d)).length),[8,6,7]);
 for(const [n,i] of items.entries()){const source=cycle8.flatMap(s=>s.rows.slice(1))[n],range=source[2].split('–').map(Number);assert.equal(i.sets,2);assert.equal(i.reps,range[0]);assert.equal(i.repsMax,range[1]);assert.equal(i.targetRpe,7);assert.equal(i.weightUnspecified,true);assert.equal(rows[n].rpe,'7');}
 assert.equal(new Set(items.map(i=>i.occurrenceId)).size,21);
 for(const name of ['Bicep Curl Bench Lean 45°','Tricep Extension Pulley','Leg Curl Machine']){const row=rows.find(r=>r.name===name);assert.equal(row.exerciseId,'',name+' must remain explicit review rather than a guessed variant');}
});
test('Cycle8 keeps all prescriptions through private draft save, assignment and per-day workout reload',async t=>{
 const {verifyImportedWorkoutPersistence}=await import('./import-journey-helper.mjs');await verifyImportedWorkoutPersistence(t,finalizeImport(extractWorkbookImport(sheets,[0,1,2])));
});
test('Starting RPE is a prescription, not the separate Actual RPE result column',()=>{
 const s={name:'A',rows:[['Exercise','Sets','Reps','Starting RPE','Actual RPE'],['Deadlift','2','6–8','7','9']].map(r=>r.map(value=>({value,formula:false})))};
 const [i]=finalizeImport(extractWorkbookImport([s],[0]));assert.equal(i.targetRpe,7);assert.match(i.notes,/Actual RPE: 9/);
});
