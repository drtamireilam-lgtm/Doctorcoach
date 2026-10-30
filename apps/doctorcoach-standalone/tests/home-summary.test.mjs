import test from 'node:test';
import assert from 'node:assert/strict';
import {homeSummary,homeWorkoutActionAllowed} from '../lib/home-summary.ts';
test('home preserves zero measurements and never turns missing activity into zero',()=>{
 assert.deepEqual(homeSummary(null,null),{steps:null,stepGoal:null,energy:null,energyDay:null});
 const result=homeSummary({summary:{today:0},goal:{dailyTarget:8000}},{records:[{kind:'readiness',day:'2026-10-30',data:{energy:0}},{kind:'readiness',day:'2026-10-29',data:{energy:9}}]});
 assert.deepEqual(result,{steps:0,stepGoal:8000,energy:0,energyDay:'2026-10-30'});
});
test('home never offers the start control with stale or incomplete onboarding',()=>{
 const verified={auth:'ready',status:200,loading:false,error:'',completed:true,blocked:false};
 assert.equal(homeWorkoutActionAllowed(verified),true);
 for(const override of [{auth:'required'},{auth:'loading'},{status:401},{status:500},{loading:true},{error:'offline'},{completed:false},{blocked:true}])assert.equal(homeWorkoutActionAllowed({...verified,...override}),false);
});
