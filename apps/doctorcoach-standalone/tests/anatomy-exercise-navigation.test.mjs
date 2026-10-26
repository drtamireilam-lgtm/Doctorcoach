import test from 'node:test';import assert from 'node:assert/strict';
import {readExerciseSelection} from '../lib/anatomy-exercise-navigation.ts';
test('exercise deep links only open an existing library entry',()=>{
 const ids=new Set(['shoulder-press']);
 assert.equal(readExerciseSelection('#library?exercise=shoulder-press',ids),'shoulder-press');
 assert.equal(readExerciseSelection('#learn?exercise=shoulder-press',ids),null);
 assert.equal(readExerciseSelection('#library?exercise=unknown',ids),null);
});
