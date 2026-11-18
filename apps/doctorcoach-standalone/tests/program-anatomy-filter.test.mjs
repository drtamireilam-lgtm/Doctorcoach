import test from 'node:test';
import assert from 'node:assert/strict';
import * as picker from '../lib/coach-exercise-picker.ts';
import {exercises} from '../lib/content.ts';
import {exerciseAnatomyLinks} from '../lib/anatomy-exercises.ts';
test('exact authored muscle filter composes with equipment and excludes guessed custom mappings',()=>{
 const custom={id:'custom:chest',name:'Pectoralis bench',en:'Pectoralis bench',group:'חזה',equipment:'barbell'};
 const all=[...exercises,custom];
 const filtered=picker.filterCoachExercises(all,'','all','barbell','all','pectoralis-major');
 assert.ok(filtered.length>0);assert.ok(filtered.every(e=>exerciseAnatomyLinks(e.id).some(l=>l.slug==='pectoralis-major')));assert.ok(filtered.every(e=>picker.pickerEquipment(e).includes('barbell')));assert.ok(!filtered.includes(custom));
 assert.equal(picker.filterCoachExercises(all,'','all','all','all','missing').length,0);
 assert.equal(picker.filterCoachExercises(all,'','all','all','all','all').length,all.length);
});
test('muscle options only describe relationships in the available catalog',()=>{
 assert.equal(typeof picker.pickerMuscles,'function');const options=picker.pickerMuscles(exercises.slice(0,8));
 assert.ok(options.length>0);assert.equal(new Set(options.map(x=>x.slug)).size,options.length);
 for(const o of options){assert.ok(o.he&&o.en);assert.ok(exercises.slice(0,8).some(e=>exerciseAnatomyLinks(e.id).some(l=>l.slug===o.slug)));}
 assert.deepEqual(picker.pickerMuscles([{id:'custom:unknown',name:'Bench',en:'Bench'}]),[]);
});
