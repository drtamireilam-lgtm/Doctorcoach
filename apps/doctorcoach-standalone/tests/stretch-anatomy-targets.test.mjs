import test from 'node:test';
import assert from 'node:assert/strict';
import {stretchAnatomyTargets,stretchingTargets,stretchesForMuscle} from '../lib/stretch-anatomy-targets.ts';
import {exercises} from '../lib/content.ts';
import {learningCards} from '../lib/anatomy-learning.ts';

test('curated stretching targets reference real stretch exercises and atlas muscles',()=>{
 const exerciseIds=new Set(exercises.filter(e=>e.kind==='מתיחה').map(e=>e.id));
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
