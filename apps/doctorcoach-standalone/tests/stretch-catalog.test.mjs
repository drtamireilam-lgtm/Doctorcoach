import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {stretchExercises,selectedStretchNumbers,stretchTranslations} from '../lib/stretch-exercises.ts';
import {exercises} from '../lib/content.ts';
import {defaultPrescription} from '../lib/training.ts';
import {isStretchExercise,workoutGroups} from '../lib/workout-sections.ts';
import {platform,coach,client} from './platform-db.mjs';
test('catalog contains exactly the thirty owner-selected stretches, with no positional duplicates',()=>{
 assert.deepEqual(selectedStretchNumbers,[2,5,9,13,18,21,25,31,35,37,41,45,49,53,58,59,62,65,67,69,73,74,79,83,85,86,89,90,93,97]);
 assert.equal(stretchExercises.length,30);assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length);
 for(const e of stretchExercises){assert.ok(isStretchExercise(e.id));assert.equal(defaultPrescription(e.id).unit,'seconds');assert.equal(defaultPrescription(e.id).workoutSection,'stretch');assert.ok(e.primary&&e.cues.length&&e.en);assert.deepEqual(e.injuries,[]);}
 assert.equal(stretchExercises.filter(e=>e.en==='Overhead Triceps Stretch').length,1);
 assert.ok(exercises.some(e=>e.id==='roman-chair-ql-lateral-stretch'));assert.ok(exercises.some(e=>e.id==='cossack-squat-stretch'));
 assert.ok(stretchTranslations.every(([he,en])=>he&&en&&!/[\u0590-\u05ff]/u.test(en)));
});
test('selected timed stretches can be prescribed by a coach and persist with the trainee dose; new content is never auto assigned',async t=>{
 const f=platform(t);await f.connect();assert.equal((await f.training.getPlan(client.userId)).length,0);
 const prescribed=stretchExercises.filter((_,n)=>[0,9,20,29].includes(n)).map(e=>({...defaultPrescription(e.id),sets:1,reps:25,notes:'צד ימין לפי ההדגמה'}));
 await f.care.assign(coach,client.userId,{id:randomUUID(),title:'בדיקת מתיחות אישיות',items:prescribed});
 const plan=await f.training.getPlan(client.userId);assert.equal(plan.length,4);assert.deepEqual(workoutGroups(plan).map(g=>g.value),['stretch']);
 assert.ok(plan.every(i=>i.unit==='seconds'&&i.reps===25&&i.notes===prescribed[0].notes));
 const session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});assert.equal(session.items.length,4);
 assert.ok(session.items.every(i=>i.workoutSection==='stretch'&&i.results[0].amount===25));
});
