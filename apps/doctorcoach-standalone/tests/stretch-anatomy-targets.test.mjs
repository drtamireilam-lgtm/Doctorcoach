import test from 'node:test';
import assert from 'node:assert/strict';
import {stretchAnatomyTargets,stretchingTargets,stretchesForMuscle} from '../lib/stretch-anatomy-targets.ts';
import {isStretchExercise} from '../lib/workout-sections.ts';
import {exercises} from '../lib/content.ts';
import {learningCards} from '../lib/anatomy-learning.ts';

test('curated stretching targets reference real stretch exercises and atlas muscles',()=>{
 const exerciseIds=new Set(exercises.filter(e=>isStretchExercise(e.id)).map(e=>e.id));
 const muscleIds=new Set(learningCards.map(c=>c.slug));
 assert.ok(Object.keys(stretchAnatomyTargets).length>=24);
 for(const [id,slugs] of Object.entries(stretchAnatomyTargets)){
  assert.ok(exerciseIds.has(id),'Unknown stretch: '+id);
  assert.ok(slugs.length,'Missing targets: '+id);
  assert.equal(new Set(slugs).size,slugs.length,'Repeated target: '+id);
  for(const slug of slugs)assert.ok(muscleIds.has(slug),'Unknown muscle: '+slug);
 }
});
test('stretch links are bidirectional without conflating contraction roles',()=>{
 assert.ok(stretchingTargets('stretch-doorway-chest').includes('pectoralis-major'));
 assert.ok(stretchesForMuscle('pectoralis-major').includes('stretch-doorway-chest'));
 assert.deepEqual(stretchingTargets('barbell-bench'),[]);
 assert.deepEqual(stretchesForMuscle('not-a-muscle'),[]);
});

test('named QL and anterior trunk stretches expose their authored targets in both directions', () => {
 for (const [id, slug] of [['roman-chair-ql-lateral-stretch', 'quadratus-lumborum'], ['stretch-low-cobra', 'rectus-abdominis'], ['stretch-double-knee-to-chest', 'erector-spinae'], ['stretch-childs-pose', 'erector-spinae']]) {
  assert.ok(stretchingTargets(id).includes(slug), id);
  assert.ok(stretchesForMuscle(slug).includes(id), slug);
 }
});
