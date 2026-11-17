import test from 'node:test';import assert from 'node:assert/strict';
import {muscles,muscleFor,exerciseFor} from '../lib/anatomy-catalog.ts';
import raw from '../lib/prepared/muscles.json' with {type:'json'};
import extra from '../lib/prepared/additional-muscles.json' with {type:'json'};
import {exercises} from '../lib/content.ts';
test('shared public catalog retains names, identity and source ordering',()=>{assert.equal(new Set(muscles.map(m=>m.slug)).size,muscles.length);assert.deepEqual(muscles.slice(0,raw.length).map(m=>m.slug),raw.map(m=>m.slug));for(const m of raw){assert.equal(muscleFor(m.slug).name,m.name_he);assert.equal(muscleFor(m.slug).en,m.name_en);assert.equal(muscleFor(m.slug),muscles.find(x=>x.slug===m.slug));}for(const m of extra)assert.ok(muscleFor(m.muscle_id));assert.equal(muscleFor('unknown'),undefined);});
test('shared exercise lookup preserves canonical aliases and unknown behavior',()=>{assert.equal(exerciseFor('bench-press'),exercises.find(e=>e.id==='barbell-bench'));assert.equal(exerciseFor('barbell-bench'),exerciseFor('bench-press'));assert.equal(exerciseFor('unknown'),undefined);});
