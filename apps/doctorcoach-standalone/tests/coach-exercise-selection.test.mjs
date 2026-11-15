import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const moduleUrl=new URL('../lib/coach-exercise-selection.ts',import.meta.url);
async function library(){assert.ok(existsSync(moduleUrl),'Coach exercise batch selection is missing');return import(moduleUrl);}
test('queue preserves selection order and supports explicit removal and reselection without mutation',async()=>{
 const {toggleCoachExerciseSelection:toggle}=await library(),first=toggle([],'bench',4),second=toggle(first,'squat',4);assert.deepEqual(first,['bench']);assert.deepEqual(second,['bench','squat']);assert.deepEqual(toggle(second,'bench',4),['squat']);assert.deepEqual(toggle(toggle(second,'bench',4),'bench',4),['squat','bench']);assert.deepEqual(second,['bench','squat']);
});
test('selection capacity never silently subsets a batch; queued choices remain removable after capacity shrinks',async()=>{
 const {toggleCoachExerciseSelection:toggle,coachExerciseSelectionStatus:status}=await library(),ids=['bench','squat'];assert.deepEqual(toggle(ids,'row',2),ids);assert.deepEqual(toggle(ids,'bench',0),['squat']);assert.equal(status(ids,29,['bench','squat']).canAdd,false);assert.equal(status(ids,28,['bench','squat']).canAdd,true);assert.equal(status(ids,28,['bench','squat']).remaining,2);assert.deepEqual(ids,['bench','squat']);
});
test('invalid counts or missing catalog identities block complete batches without accepting a subset',async()=>{
 const {coachExerciseSelectionStatus:status}=await library();for(const total of [NaN,-1,30,31,1.5])assert.equal(status(['bench'],total,['bench']).canAdd,false);assert.equal(status([],0,['bench']).canAdd,false);assert.equal(status(['bench','bench'],0,['bench']).canAdd,false);assert.equal(status(['bench','missing'],0,['bench']).canAdd,false);assert.deepEqual(status(['bench','missing'],0,['bench']).unavailable,['missing']);
});
