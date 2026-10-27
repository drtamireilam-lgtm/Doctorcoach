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

import {workoutNavigationTargets,workoutSetAnchor,revealWorkoutTarget} from '../lib/workout-navigation.ts';
test('next set follows visible preparation/main order and advances only on saved done values',()=>{
 const main={exerciseId:'main',workoutSection:'main',results:[{done:true},{done:false}]};
 const warm={exerciseId:'warm',workoutSection:'warmup',results:[{done:false}]};
 const stretch={exerciseId:'stretch',workoutSection:'stretch',results:[{done:false}]};
 const session={items:[main,stretch,warm]};const before=JSON.stringify(session);
 assert.equal(workoutNavigationTargets(session).pending.item,stretch);assert.equal(JSON.stringify(session),before);
 stretch.results[0].done=true;assert.equal(workoutNavigationTargets(session).pending.item,warm);
 warm.results[0].done=true;assert.equal(workoutNavigationTargets(session).pending.item,main);assert.equal(workoutNavigationTargets(session).pending.index,1);
 main.results[1].done=true;assert.equal(workoutNavigationTargets(session).pending,null);
});
test('set anchors separate sessions, workout days and set positions',()=>{
 const item={exerciseId:'a:b',dayId:'1'};const anchor=workoutSetAnchor('session',item,0);
 assert.notEqual(anchor,workoutSetAnchor('session',{...item,dayId:'2'},0));assert.notEqual(anchor,workoutSetAnchor('other',item,0));assert.notEqual(anchor,workoutSetAnchor('session',item,1));
});
test('explicit set navigation opens a collapsed exercise then focuses and scrolls without altering fields',()=>{
 const calls=[];let queued;const target={isConnected:true,closest:()=>({querySelector:()=>({getAttribute:()=> 'false',click:()=>calls.push('open')})}),focus:()=>calls.push('focus'),scrollIntoView:()=>calls.push('scroll')};
 assert.equal(revealWorkoutTarget('target',{getElementById:()=>target},fn=>{queued=fn;}),true);assert.deepEqual(calls,['open']);queued();assert.deepEqual(calls,['open','focus','scroll']);
 assert.equal(revealWorkoutTarget('missing',{getElementById:()=>null},()=>{throw Error('unexpected');}),false);
});
test('navigation leaves open disclosures open and ignores a removed target',()=>{
 let clicks=0,queued;const target={isConnected:false,closest:()=>({querySelector:()=>({getAttribute:()=> 'true',click:()=>clicks++})}),focus:()=>{throw Error('removed');}};
 revealWorkoutTarget('target',{getElementById:()=>target},fn=>{queued=fn;});queued();assert.equal(clicks,0);
});

test('next workout target follows unified preparation in source order before main work',()=>{
 const main={exerciseId:'main',workoutSection:'main',results:[{done:false}]};
 const warm={exerciseId:'warm',workoutSection:'warmup',results:[{done:false}]};
 const stretch={exerciseId:'stretch',workoutSection:'stretch',results:[{done:false}]};
 const session={items:[main,stretch,warm]};
 assert.deepEqual(workoutNavigationTargets(session).items,[stretch,warm,main]);
 assert.equal(workoutNavigationTargets(session).pending.item,stretch);
 stretch.results[0].done=true;assert.equal(workoutNavigationTargets(session).pending.item,warm);
 warm.results[0].done=true;assert.equal(workoutNavigationTargets(session).pending.item,main);
});
