import test from 'node:test';
import assert from 'node:assert/strict';
import questionnaire from '../lib/prepared/intake-questions.json' with {type:'json'};
import {consents,parseAnswers} from '../lib/intake.ts';
import {onboardingIssues} from '../lib/onboarding-guidance.ts';
const choices=()=>Object.fromEntries(consents.map(c=>[c.id,c.required]));
const value=id=>{const q=questionnaire.questions.find(q=>q.id===id),option=q.options?.[0],first=typeof option==='string'?option:option?.value;return q.type==='number'?Math.max(1,q.min??0):q.type.startsWith('multi_select')?[first]:first??'מטרת בדיקה';};
const complete=()=>({name:'פרופיל בדיקה',current_injury:'no',red_flags:['none'],age:30,medical_history:['אין מחלות רקע משמעותיות'],training_frequency:value('training_frequency'),training_style:value('training_style'),specific_goals:value('specific_goals')});
test('completion guidance accepts the server-valid non-injury path without requiring hidden injury fields',()=>{
 const answers=complete();assert.deepEqual(onboardingIssues('training',answers,choices()),[]);assert.equal(parseAnswers(answers,true).current_injury,'no');
});
test('injury validation accepts zero pain but rejects empty, out-of-range and fractional scores',()=>{
 const answers={...complete(),current_injury:'yes',body_region:value('body_region'),onset:value('onset'),duration:value('duration'),pain_score:0};
 assert.deepEqual(onboardingIssues('injury',answers,choices()),[]);assert.equal(parseAnswers(answers,true).pain_score,0);
 for(const pain_score of ['',undefined,-1,11,1.5])assert.ok(onboardingIssues('injury',{...answers,pain_score},choices()).some(x=>x.id==='pain_score'));
});
test('final validation identifies an earlier incomplete step and mandatory consent',()=>{
 assert.equal(onboardingIssues('training',{...complete(),age:''},choices())[0].step,'background');
 assert.equal(onboardingIssues('training',complete(),{...choices(),health:false})[0].id,'consent_health');
 assert.equal(onboardingIssues('background',complete(),{...choices(),privacy:false})[0].step,'consent');
});
test('safety guidance retains valid warning selections and rejects a contradictory none selection',()=>{
 const answers={...complete(),red_flags:['chest_breathing']};assert.deepEqual(onboardingIssues('safety',answers,choices()),[]);
 assert.ok(onboardingIssues('safety',{...answers,red_flags:['none','chest_breathing']},choices()).some(x=>x.id==='red_flags'));
 assert.ok(onboardingIssues('safety',{...answers,phone:'1234'},choices()).some(x=>x.id==='phone'));
});
