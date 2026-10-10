import test from 'node:test';
import assert from 'node:assert/strict';
import {isSimpleTrainee,mobileTabFor,areaFor,traineeAreas,areaLinks} from '../lib/mobile-navigation.ts';

test('personal daily view waits for verified trainee identity and completed onboarding',()=>{
 const trainee={auth:'ready',staffAccess:'member',completed:true};
 assert.equal(isSimpleTrainee(trainee),true);
 for(const override of [{auth:'loading'},{auth:'signedOut'},{staffAccess:'loading'},{staffAccess:'error'},{staffAccess:'staff'},{completed:false},{canAdmin:true},...['coach','clinician','dietitian','coordinator'].map(staffRole=>({staffRole}))]) assert.equal(isSimpleTrainee({...trainee,...override}),false,JSON.stringify(override));
});
test('seven areas exclude staff, subscriptions and active sessions as main destinations',()=>{
 assert.deepEqual(traineeAreas.map(a=>a.id),['home','care','plan','history','library','learn','contact']);
 for(const section of ['admin','team','dashboard'])assert.equal(areaFor(section),undefined);
});
test('legacy links retain their parent area and phone selection',()=>{
 const groups={home:['home','stories','pro','more'],care:['care','onboarding','settings','membership','privacy','injuries'],plan:['plan','workout','readiness'],history:['history','nutrition','recovery'],library:['library','videos'],learn:['learn'],contact:['contact','messages','feedback','appointments','consult']};
 for(const [area,sections] of Object.entries(groups))for(const section of sections){
  assert.equal(areaFor(section),area,section);
  assert.equal(mobileTabFor(section),['home','care','plan','history'].includes(area)?area:'menu',section);
 }
});
test('secondary navigation links stay within their parent area',()=>{
 for(const [area,links] of Object.entries(areaLinks))for(const link of links)assert.equal(areaFor(link.id),area,link.id);
 assert.equal(new Set(Object.values(areaLinks).flat().map(l=>l.id)).size,Object.values(areaLinks).flat().length);
});
test('staff shortcuts disappear during authorization refresh and errors despite a stale role',async()=>{
 const {staffDestinations}=await import('../lib/mobile-navigation.ts');
 for(const access of ['loading','error','signedOut'])for(const careRole of ['clinician','coach','dietitian','coordinator',null])assert.deepEqual(staffDestinations({access,careRole}),[]);
 assert.deepEqual(staffDestinations({access:'member'}),[]);
 assert.deepEqual(staffDestinations({access:'staff'}),['admin','dashboard']);
 for(const careRole of ['clinician','coach','dietitian'])assert.deepEqual(staffDestinations({access:'member',careRole}),['team','dashboard']);
 assert.deepEqual(staffDestinations({access:'member',careRole:'coordinator'}),['dashboard']);
});
