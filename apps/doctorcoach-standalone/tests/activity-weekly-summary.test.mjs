import test from 'node:test';
import assert from 'node:assert/strict';
import {weeklyStepSummary} from '../lib/activity-weekly-summary.ts';
const d=(date,steps,partial=false)=>({date,steps,partial,timezone:'UTC',startAt:date+'T00:00:00.000Z',endAt:new Date(Date.parse(date+'T00:00:00.000Z')+86400000).toISOString(),observedAt:new Date(Date.parse(date+'T00:00:00.000Z')+86400000).toISOString()});
test('weekly steps distinguish missing values and measured zero and honor effective goal changes',()=>{
 const feed={days:[d('2026-10-18',0),d('2026-10-19',null),d('2026-10-20',3000),d('2026-10-21',4000),d('2026-10-25',5000)],goals:[{dailyTarget:2000,effectiveAt:'2026-10-19T12:00:00.000Z',version:1},{dailyTarget:5000,effectiveAt:'2026-10-21T00:00:00.000Z',version:2}]};
 const result=weeklyStepSummary(feed,'2026-10-18');assert.equal(result.average,7000/3);assert.equal(result.observedDays,3);assert.equal(result.targetDays,2);assert.equal(result.adherence,50);
});
test('weekly steps never invent a denominator without an effective historical goal',()=>{
 assert.deepEqual(weeklyStepSummary({days:[],goals:[]},'2026-10-18'),{average:null,observedDays:0,targetDays:0,adherence:null,partialDays:0});
 assert.equal(weeklyStepSummary({days:[d('2026-10-18',3000)],goals:[{dailyTarget:2000,effectiveAt:'2026-10-25T00:00:00.000Z',version:1}]},'2026-10-18').adherence,null);
});
