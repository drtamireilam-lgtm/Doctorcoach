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
