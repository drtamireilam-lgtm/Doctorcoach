import test from 'node:test';
import assert from 'node:assert/strict';
import {muscleRegionId} from '../lib/anatomy-navigation.ts';
const regions=[{id:'shoulder',muscleSlugs:['deltoid','biceps']},{id:'elbow',muscleSlugs:['biceps']},{id:'thigh',muscleSlugs:['quadriceps']}];
test('global search result moves to its own region rather than the previous body selection',()=>{
 assert.equal(muscleRegionId('quadriceps','shoulder',regions),'thigh');
 assert.equal(muscleRegionId('deltoid','thigh',regions),'shoulder');
});
test('muscles belonging to several regions retain a matching navigation context',()=>{
 assert.equal(muscleRegionId('biceps','elbow',regions),'elbow');
 assert.equal(muscleRegionId('biceps','shoulder',regions),'shoulder');
 assert.equal(muscleRegionId('biceps','thigh',regions),'shoulder');
});
test('missing muscle-region mappings do not invent an anatomical association',()=>{
 assert.equal(muscleRegionId('unmapped','shoulder',regions),null);
 assert.equal(muscleRegionId('deltoid','invalid',regions),'shoulder');
 assert.equal(muscleRegionId('deltoid','shoulder',[]),null);
});
