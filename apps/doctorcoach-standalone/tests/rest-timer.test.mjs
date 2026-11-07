import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingSeconds,formatCountdown} from '../lib/rest-timer.ts';

test('rest countdown follows elapsed wall time and clamps at zero',()=>{
 assert.equal(remainingSeconds(10000,10001),0);
 assert.equal(remainingSeconds(10000,8501),2);
 assert.equal(remainingSeconds(10000,8000),2);
 assert.equal(formatCountdown(90),'01:30');
 assert.equal(formatCountdown(0),'00:00');
});

test('timer state restores elapsed deadlines, pauses exactly, resets and rejects corrupt storage',async()=>{
 const {timerTransition,restoreTimerState,defaultTimerState}=await import('../lib/rest-timer.ts');
 let state=timerTransition(defaultTimerState,'start',1000);assert.equal(state.deadline,91000);
 assert.deepEqual(restoreTimerState(JSON.stringify(state)),state);
 state=timerTransition(state,'pause',2500);assert.equal(state.remaining,89);assert.equal(state.deadline,null);
 state=timerTransition(state,'reset',3000);assert.equal(state.remaining,90);
 assert.deepEqual(restoreTimerState('{broken'),defaultTimerState);
 assert.deepEqual(restoreTimerState(JSON.stringify({duration:90,remaining:-1,deadline:null})),defaultTimerState);
});
