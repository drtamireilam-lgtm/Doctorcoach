import test from 'node:test';
import assert from 'node:assert/strict';
import {filterCoachExercises,pickerEquipment} from '../lib/coach-exercise-picker.ts';
const items=[{id:'a',name:'לחיצת רגליים במכונה',en:'Leg Press',group:'רגליים',aliases:['Legpress']},{id:'b',name:'סקוואט',en:'Squat',group:'רגליים'},{id:'custom-test',name:'תרגיל אישי',en:'Custom row',group:'גב',equipment:'Resistance band',family:'חתירה',aliases:['Personal pull']}];
test('bilingual and alias search compose with muscle and equipment filters including private catalog metadata',()=>{
 assert.deepEqual(filterCoachExercises(items,'Legpress','רגליים','machine').map(e=>e.id),['a']);
 assert.deepEqual(filterCoachExercises(items,'לחיצת','רגליים','machine').map(e=>e.id),['a']);
 assert.deepEqual(filterCoachExercises(items,'personal pull','גב','band','חתירה').map(e=>e.id),['custom-test']);
 assert.equal(filterCoachExercises(items,'personal pull','רגליים','band').length,0);
});
test('unspecified equipment stays unspecified rather than assuming bodyweight; multiple explicit equipment variants stay searchable',()=>{
 assert.deepEqual(pickerEquipment(items[1]),['unknown']);
 assert.deepEqual(pickerEquipment({...items[1],equipment:'Dumbbells and resistance band'}),['dumbbell','band']);
 assert.equal(filterCoachExercises(items,'','all','bodyweight').length,0);
 assert.deepEqual(items.map(e=>e.id),['a','b','custom-test']);
});
