import test from 'node:test';
import assert from 'node:assert/strict';
import {progressMeasurementKey} from '../lib/progress-measurements.ts';
const row=(patch={})=>({kind:'rehab',data:{region:'כתף',side:'ימין',motion:'כפיפה',response:'אחרי אימון',...patch}});
test('overview comparisons separate regions even for unassigned measurements with identical labels',()=>{
 assert.notEqual(progressMeasurementKey(row()),progressMeasurementKey(row({region:'ברך'})));
 assert.equal(progressMeasurementKey(row()),progressMeasurementKey({...row(),day:'2026-10-14'}));
 for(const patch of [{side:'שמאל'},{motion:'פשיטה'},{response:'לפני אימון'},{episodeId:'injury-1'}])assert.notEqual(progressMeasurementKey(row()),progressMeasurementKey(row(patch)));
 assert.notEqual(progressMeasurementKey(row({episodeId:'injury-1'})),progressMeasurementKey(row({episodeId:'injury-2'})));
});

test('function scores use the recorded 0–10 scale',async()=>{const {trackingDomain}=await import('../lib/tracking-points.ts');assert.deepEqual(trackingDomain('functionScore'),[0,10]);});
