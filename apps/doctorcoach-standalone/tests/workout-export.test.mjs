import test from 'node:test';import assert from 'node:assert/strict';
import {workoutExportRows} from '../lib/workout-export.ts';
test('export preserves warmup/work rows and repeated identity without warmup strength estimates',()=>{
 const result={done:true,amount:8,weight:80,actualRpe:8};
 const item={exerciseId:'barbell-bench',occurrenceId:'bench:a',name:'Bench',sets:1,reps:8,unit:'reps',weight:80,notes:'',workoutSection:'main',side:'left',warmupResults:[{...result,weight:200}],results:[result]};
 const session={items:[item,{...item,occurrenceId:'bench:b',workoutSection:'warmup',warmupResults:[]}],startedAt:'2026-10-20',finishedAt:null,before:0,after:0};
 const rows=workoutExportRows([session]);assert.equal(rows.length,4);
 assert.deepEqual(rows.slice(1).map(r=>r[20]),['warmup','working','preparation']);
 assert.deepEqual(rows[1].slice(10,12),['','']);assert.equal(typeof rows[2][11],'number');assert.deepEqual(rows[3].slice(10,12),['','']);
 assert.deepEqual(rows.slice(1).map(r=>r[21]),['bench:a','bench:a','bench:b']);assert.equal(rows[1][22],'left');
});
