import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationTourSteps} from '../lib/navigation-tour.ts';
import {traineeAreas} from '../lib/mobile-navigation.ts';
import {readFileSync} from 'node:fs';
test('onboarding overview follows the same seven areas as trainee navigation',()=>{
 const cards=JSON.parse(readFileSync(new URL('../lib/prepared/welcome-cards.json',import.meta.url),'utf8'));
 assert.deepEqual(cards.map(c=>({id:c.id,label:c.title_he})),traineeAreas);
});
test('guide follows all seven main areas on phone and desktop',()=>{
 for(const mobile of [true,false])assert.deepEqual(navigationTourSteps(mobile,false).map(s=>s.section),traineeAreas.map(a=>a.id));
});
test('guide never redirects to an active workout or an obsolete More screen',()=>{
 const steps=navigationTourSteps(true,true);
 assert.deepEqual(steps,navigationTourSteps(false,false));
 assert.ok(!steps.some(s=>['workout','more'].includes(s.section)));
 assert.ok(steps.every(s=>!s.target.startsWith('mobile-')));
});
test('guide explains consolidated progress, settings and contact',()=>{
 const steps=navigationTourSteps(false,false);
 assert.match(steps.find(s=>s.section==='history').text,/תזונה ומדידות/);
 assert.match(steps.find(s=>s.section==='care').text,/מנוי/);
 assert.match(steps.find(s=>s.section==='contact').text,/האינסטגרם/);
});
