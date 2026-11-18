import test from 'node:test';
import assert from 'node:assert/strict';
import {workoutHistoryAnchor,revealWorkoutHistory} from '../lib/workout-history-navigation.ts';
test('history navigation opens only the target ancestor disclosures before focusing the saved workout',()=>{
 const calls=[],outer={tagName:'DETAILS',open:false,parentElement:null},card={tagName:'SECTION',parentElement:outer};
 const target={tagName:'DETAILS',open:false,parentElement:card,focus:()=>{assert.equal(target.open,true);assert.equal(outer.open,true);calls.push('focus')},scrollIntoView:()=>calls.push('scroll')};
 const other={open:false};let lookedUp;
 assert.equal(revealWorkoutHistory('session:1',{getElementById:id=>{lookedUp=id;return target}}),true);
 assert.equal(lookedUp,workoutHistoryAnchor('session:1'));assert.deepEqual(calls,['focus','scroll']);assert.equal(other.open,false);
});
test('history navigation tolerates an unavailable record and keeps session identities separate',()=>{
 assert.equal(revealWorkoutHistory('missing',{getElementById:()=>null}),false);
 assert.notEqual(workoutHistoryAnchor('a:b'),workoutHistoryAnchor('a%3Ab'));
});
