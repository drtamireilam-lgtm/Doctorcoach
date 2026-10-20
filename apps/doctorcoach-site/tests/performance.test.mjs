import test from 'node:test';
import assert from 'node:assert/strict';
import {performancePoints,performanceSummary} from '../lib/performance.ts';
import {setEstimated1RM} from '../lib/set-load.ts';
import {canonicalEffort} from '../lib/effort.ts';
const set=(patch={})=>({done:true,weight:100,amount:5,actualRpe:8,...patch});
const session=(id,results,patch={})=>({id,status:'completed',startedAt:`2026-10-0${id}T10:00:00Z`,finishedAt:`2026-10-0${id}T11:00:00Z`,items:[{exerciseId:'squat',unit:'reps',results}],...patch});

test('progress uses the exact live set estimate for RPE and canonical RIR',()=>{
 for(const effortScale of ['rpe','rir']){
  const result=set({actualRpe:canonicalEffort(effortScale==='rir'?'2':'8',effortScale)});
  const points=performancePoints([session('1',[result])],'squat');
  assert.equal(points[0].e1rm,123.3);
  assert.equal(points[0].e1rm,setEstimated1RM(result,'reps'));
 }
});
test('missing or unsupported effort stays a gap; historical formula is explicit',()=>{
 for(const patch of [{actualRpe:null},{actualRpe:5},{amount:11}]){
  const point=performancePoints([session('1',[set(patch)])],'squat')[0];
  assert.equal(point.e1rm,null);assert.equal(point.weight,100);
 }
 assert.equal(performancePoints([session('1',[set({actualRpe:null})])],'squat','reps')[0].e1rm,116.7);
});
test('only completed sessions and performed sets contribute; date order is stable without mutation',()=>{
 const history=[session('3',[set({weight:999})],{status:'active'}),session('2',[set({weight:200,done:false}),set()]),session('1',[set({weight:90})])];
 const original=JSON.stringify(history),points=performancePoints(history,'squat');
 assert.deepEqual(points.map(p=>p.id),['1','2']);assert.equal(points[1].weight,100);
 assert.equal(JSON.stringify(history),original);
 assert.deepEqual(performancePoints(history,'other'),[]);
 assert.deepEqual(performancePoints([session('1',[],{items:[{exerciseId:'squat',unit:'seconds',results:[set()]}]})],'squat'),[]);
});
test('best set estimate and highest working load are independent observations',()=>{
 const points=performancePoints([session('1',[set({weight:100,actualRpe:6}),set({weight:105,actualRpe:10})])],'squat');
 assert.equal(points[0].e1rm,130);assert.equal(points[0].weight,105);
});
test('a missing estimate in the latest workout does not masquerade as an older last result or PR',()=>{
 const points=performancePoints([session('1',[set()]),session('2',[set({actualRpe:null})])],'squat');
 assert.deepEqual(performanceSummary(points),{best:123.3,last:null,isPr:false});
 assert.deepEqual(performanceSummary([]),{best:null,last:null,isPr:false});
 assert.equal(performanceSummary(performancePoints([session('1',[set()]),session('2',[set({weight:105})])],'squat')).isPr,true);
});
