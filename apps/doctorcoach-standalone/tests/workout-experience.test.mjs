import test from 'node:test';
import assert from 'node:assert/strict';
import {previousSetPerformance} from '../lib/workout-experience.ts';
const item={exerciseId:'bench',occurrenceId:'row-1',dayId:'1',unit:'reps',results:[{done:true,weight:40,amount:8,actualRpe:8}]};
const active={id:'active',status:'active',planMode:'coached',programId:'p',startedAt:'2026-10-30T10:00:00Z'};
const prior={...active,id:'prior',status:'completed',finishedAt:'2026-10-29T11:00:00Z',items:[item]};
test('previous performance matches the actual occurrence, assignment and completed set only',()=>{
 assert.equal(previousSetPerformance(item,0,active,[prior]).weight,40);
 for(const patch of [{programId:'other'},{status:'cancelled'},{finishedAt:'2026-10-31T11:00:00Z'},{planMode:'self'}])assert.equal(previousSetPerformance(item,0,active,[{...prior,...patch}]),null);
 assert.equal(previousSetPerformance({...item,occurrenceId:'row-2'},0,active,[prior]),null);
 assert.equal(previousSetPerformance(item,1,active,[prior]),null);
});
