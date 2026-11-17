import test from 'node:test';import assert from 'node:assert/strict';
import {anatomyModels} from '../lib/anatomy-models.ts';
import * as training from '../lib/anatomy-training.ts';
const feature=await import('../lib/anatomy-workout.ts').catch(()=>({}));
const item=(exerciseId,sets=3,extra={})=>({exerciseId,sets,reps:8,unit:'reps',weight:40,notes:'',dayId:'1',...extra});
const summarize=items=>{assert.equal(typeof feature.workoutMuscleSummary,'function','planned workout aggregation must exist');return feature.workoutMuscleSummary(items);};
test('repeated bench occurrences across days keep independent counts and contributors',()=>{
 const input=[item('barbell-bench',3,{occurrenceId:'a'}),item('barbell-row',2),item('barbell-bench',4,{dayId:'2',occurrenceId:'b'})],before=JSON.stringify(input),s=summarize(input);
 const pec=s.muscles.find(m=>m.slug==='pectoralis-major');assert.deepEqual(pec.counts,{primary:7,secondary:0,stabilizer:0});assert.deepEqual(pec.contributions.map(c=>[c.index,c.dayId,c.sets,c.role]),[[0,'1',3,'primary'],[2,'2',4,'primary']]);assert.equal(s.muscles.find(m=>m.slug==='deltoid'&&m.part==='anterior').counts.secondary,7);assert.equal(s.muscles.find(m=>m.slug==='triceps-brachii').counts.secondary,7);assert.equal(JSON.stringify(input),before);
 assert.equal(summarize(input.filter(i=>i.dayId==='2')).muscles.find(m=>m.slug==='pectoralis-major').counts.primary,4);
});
test('warmups, stretching and cardio never inflate working sets and unknown names never infer mapping',()=>{
 const s=summarize([item('barbell-bench',3,{warmupSets:[{reps:10,weight:20},{reps:5,weight:30}]}),item('barbell-bench',8,{workoutSection:'warmup'}),item('stretch-doorway-chest',5),item('barbell-bench',7,{workoutSection:'stretch'}),item('barbell-bench',6,{cardio:{kind:'walk'}}),item('custom-press',4,{customExercise:{name:'לחיצת חזה',en:'Bench Press'}})]);
 assert.equal(s.muscles.find(m=>m.slug==='pectoralis-major').counts.primary,3);assert.equal(s.excluded,4);assert.deepEqual(s.unmapped.map(x=>[x.index,x.reason]),[[5,'unmapped']]);
});
test('invalid set counts are disclosed instead of coerced; empty plan remains empty',()=>{
 const s=summarize([item('barbell-bench',NaN),item('barbell-bench',0),item('barbell-bench',-2),item('barbell-bench',2.5),item('barbell-bench','3')]);assert.equal(s.muscles.length,0);assert.deepEqual(s.unmapped.map(x=>x.reason),Array(5).fill('invalid-sets'));assert.deepEqual(summarize([]),{muscles:[],unmapped:[],excluded:0});
});
test('mixed roles preserve all counts while colour precedence reflects any primary contribution',()=>{
 const s=summarize([item('barbell-bench',3),item('triceps-pushdown',2)]),tri=s.muscles.find(m=>m.slug==='triceps-brachii');assert.deepEqual(tri.counts,{primary:2,secondary:3,stabilizer:0});assert.equal(feature.workoutMuscleLinks(s.muscles).find(l=>l.slug==='triceps-brachii').role,'primary');assert.equal(tri.contributions.length,2);
});
test('anterior and lateral deltoid remain distinct, detailed source geometry matches their own roles',()=>{
 const s=summarize([item('barbell-bench',3),item('lateral-raise',2)]),links=feature.workoutMuscleLinks(s.muscles),model=anatomyModels.find(m=>m.id==='detailed');assert.equal(s.muscles.filter(m=>m.slug==='deltoid').length,2);assert.equal(typeof training.structureRolesForLinks,'function');const roles=training.structureRolesForLinks(model,links);assert.equal(roles.get('detail-clavicular-part-of-right-deltoid'),'secondary');assert.equal(roles.get('detail-acromial-part-of-right-deltoid'),'primary');assert.equal(roles.has('detail-spinal-part-of-right-deltoid'),false);
});
test('alias mappings and legacy day defaults are retained without merging duplicate occurrences',()=>{
 const s=summarize([item('bench',2,{dayId:undefined}),item('bench',2,{dayId:undefined})]);const row=s.muscles.find(m=>m.slug==='pectoralis-major');assert.equal(row.counts.primary,4);assert.equal(row.contributions.length,2);assert.deepEqual(row.contributions.map(c=>c.dayId),['1','1']);
});
