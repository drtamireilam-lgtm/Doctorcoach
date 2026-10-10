import test from 'node:test';
import assert from 'node:assert/strict';
import {workoutNavigation} from '../lib/workout-navigation.ts';
test('unsaved workout values block sidebar, settings and history departures when user stays',()=>{
 const nav=workoutNavigation();nav.accept('#workout',()=>assert.fail('no draft yet'));nav.setDirty(true);
 let prompts=0;for(const target of ['#plan','#settings','#history','#recovery?tab=measurements&from=plan']){
  assert.equal(nav.accept(target,()=>{prompts++;return false}),false);
  assert.equal(nav.current(),'#workout');
 }
 assert.equal(prompts,4);
});
test('same workout location never discards draft or prompts',()=>{
 const nav=workoutNavigation();nav.accept('#workout',()=>true);nav.setDirty(true);
 assert.equal(nav.accept('#workout',()=>assert.fail('same screen')),true);
 assert.equal(nav.accept('#plan',()=>false),false);
});
test('explicit discard permits departure, then workout unmount clears the guard',()=>{
 const nav=workoutNavigation();nav.accept('#workout',()=>true);nav.setDirty(true);
 assert.equal(nav.accept('#history',()=>true),true);assert.equal(nav.current(),'#history');nav.setDirty(false);
 assert.equal(nav.accept('#care',()=>assert.fail('draft was discarded')),true);
});
test('saved set or completed/cancelled session permits navigation without another prompt',()=>{
 for(const route of ['#history','#plan']){const nav=workoutNavigation();nav.accept('#workout',()=>true);nav.setDirty(true);nav.setDirty(false);assert.equal(nav.accept(route,()=>assert.fail('already resolved')),true);}
});
test('cancelled hash or browser-back change keeps exact previous route for restoration',()=>{
 const nav=workoutNavigation();nav.accept('#workout?context=original',()=>true);nav.setDirty(true);
 assert.equal(nav.accept('#plan',()=>false),false);assert.equal(nav.current(),'#workout?context=original');
 assert.equal(nav.accept(nav.current(),()=>assert.fail('restoration event')),true);
});
