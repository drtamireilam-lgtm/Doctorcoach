import test from 'node:test';
import assert from 'node:assert/strict';
import {homeSummary,homeWorkoutActionAllowed} from '../lib/home-summary.ts';
test('home preserves zero measurements and never turns missing activity into zero',()=>{
 assert.deepEqual(homeSummary(null,null),{steps:null,stepGoal:null,energy:null,energyDay:null,recoveryPain:null,recoveryDay:null});
 const result=homeSummary({summary:{today:0},goal:{dailyTarget:8000}},{records:[{kind:'readiness',day:'2026-10-30',data:{energy:0}},{kind:'readiness',day:'2026-10-29',data:{energy:9}}]});
 assert.deepEqual(result,{steps:0,stepGoal:8000,energy:0,energyDay:'2026-10-30',recoveryPain:null,recoveryDay:null});
});

test('recovery uses the latest dated pain report, preserves zero and never invents a recovery score',()=>{
 assert.equal(homeSummary(null,null).recoveryPain,null);
 const records=[{kind:'rehab',day:'2026-10-29',data:{pain:6}},{kind:'rehab',day:'2026-10-30',data:{pain:0}}];
 const summary=homeSummary(null,{records});
 assert.equal(summary.recoveryPain,0);
 assert.equal(summary.recoveryDay,'2026-10-30');
 assert.equal(homeSummary(null,{records:[{kind:'rehab',day:'2026-10-30',data:{pain:12}}]}).recoveryPain,null);
 assert.equal(records[0].day,'2026-10-29');
});
test('home never offers the start control with stale or incomplete onboarding',()=>{
 const verified={auth:'ready',status:200,loading:false,error:'',completed:true,blocked:false};
 assert.equal(homeWorkoutActionAllowed(verified),true);
 for(const override of [{auth:'required'},{auth:'loading'},{status:401},{status:500},{loading:true},{error:'offline'},{completed:false},{blocked:true}])assert.equal(homeWorkoutActionAllowed({...verified,...override}),false);
});
