import test from 'node:test';
import assert from 'node:assert/strict';
import {traineeNextStep} from '../lib/trainee-next-step.ts';
import {consents,CONSENT_REVISION} from '../lib/intake.ts';
const base=()=>({onboarding:{intake:{completed:true},consents:Object.fromEntries(consents.map(c=>[c.id,c.required])),consentRevision:CONSENT_REVISION,trainingBlocked:false},access:{mode:'coached',canBuild:false,canStart:false},planCount:0,active:false,completedWorkouts:0});
test('new trainee goes to questionnaire; a saved complete questionnaire is not requested again',()=>{
 const x=base();x.onboarding.intake=null;assert.equal(traineeNextStep(x).next,'profile');
 x.onboarding.intake={completed:true};assert.equal(traineeNextStep(x).next,'waiting');assert.equal(traineeNextStep(x).profile,true);
});
test('missing required consent or stale revision cannot mark onboarding complete',()=>{
 for(const c of consents.filter(c=>c.required)){const x=base();x.onboarding.consents[c.id]=false;assert.equal(traineeNextStep(x).next,'profile');}
 const x=base();x.onboarding.consentRevision='old';assert.equal(traineeNextStep(x).profile,false);
});
test('medical hold overrides ready program and even an active workout',()=>{
 const x=base();Object.assign(x,{planCount:4,active:true,completedWorkouts:2});x.access.canStart=true;x.onboarding.trainingBlocked=true;
 assert.equal(traineeNextStep(x).next,'medical');
});
test('authorized self-building and expired self-access have distinct next actions',()=>{
 const x=base();x.access.mode='self';assert.equal(traineeNextStep(x).next,'access');
 x.access.canBuild=true;x.access.canStart=true;assert.equal(traineeNextStep(x).next,'build');
});
test('a program must have both current access and exercises before pointing to a first workout',()=>{
 const x=base();x.planCount=5;assert.equal(traineeNextStep(x).next,'waiting');
 x.access.canStart=true;assert.equal(traineeNextStep(x).next,'start');
 x.planCount=0;assert.equal(traineeNextStep(x).program,false);
});
test('an active workout resumes; starting one alone does not finish the checklist',()=>{
 const x=base();x.active=true;x.planCount=3;x.access.canStart=true;
 assert.equal(traineeNextStep(x).next,'resume');assert.equal(traineeNextStep(x).firstWorkout,false);
 x.active=false;x.completedWorkouts=1;assert.deepEqual(traineeNextStep(x),{next:'ready',profile:true,program:true,firstWorkout:true});
});
test('a returning trainee whose assignment was removed is sent back to coaching support',()=>{
 const x=base();x.completedWorkouts=12;assert.equal(traineeNextStep(x).next,'waiting');assert.equal(traineeNextStep(x).program,false);
});
