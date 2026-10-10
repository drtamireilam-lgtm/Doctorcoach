import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryTarget,recoveryHref} from '../lib/recovery-navigation.ts';
const episodeId='a1111111-2222-3333-4444-555555555555';
test('context links round-trip the intended episode, tab and return destination',()=>{
 for(const from of ['care','plan','history'])for(const tab of ['rehab','return','readiness']){
 const target={tab,from,episodeId};
 assert.deepEqual(recoveryTarget(recoveryHref(target)),target);
 }
 assert.deepEqual(recoveryTarget(recoveryHref({tab:'return',from:'care'})),{tab:'return',from:'care'});
});
test('unrelated routes and unsupported query values do not retain prior injury context',()=>{
 for(const hash of ['#plan','#care','#history','#recovery','#recovery?tab=unknown&episode=bad&from=https://evil.test']){
 assert.deepEqual(recoveryTarget(hash),{tab:'rehab',from:'history'});
 }
 assert.deepEqual(recoveryTarget('#plan?tab=return&episode='+episodeId+'&from=care'),{tab:'rehab',from:'history'});
 assert.equal(recoveryHref({tab:'rehab',from:'plan',episodeId:'bad'}),'#recovery?tab=rehab&from=plan');
});
test('query parser ignores personal content and never treats an external source as a return link',()=>{
 const hash='#recovery?tab=return&from=javascript:alert(1)&client=someone-else&label=private&episode='+episodeId;
 assert.deepEqual(recoveryTarget(hash),{tab:'return',from:'history',episodeId});
 const href=recoveryHref(recoveryTarget(hash));
 assert.equal(href.includes('private'),false);assert.equal(href.includes('someone-else'),false);
 assert.equal(href.includes('javascript'),false);
});
