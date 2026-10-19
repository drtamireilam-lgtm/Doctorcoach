import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {privacyPolicy} from '../lib/privacy-policy.ts';
import {consents,parseConsents,CONSENT_REVISION} from '../lib/intake.ts';
test('policy has matching complete Hebrew and English sections and launch caveats',()=>{
 assert.equal(privacyPolicy.he.sections.length,privacyPolicy.en.sections.length);
 for(const lang of ['he','en']){const p=privacyPolicy[lang];assert.ok(p.draft&&p.sections.length>=8);assert.ok(p.sections.every(s=>s.title&&s.paragraphs.every(Boolean)));}
 assert.match(privacyPolicy.en.sections.flatMap(s=>s.paragraphs).join(' '),/does not immediately delete/);
 const page=fs.readFileSync(new URL('../app/privacy-policy/page.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(page,/requireChatGPTUser|getChatGPTUser/);
});
test('push consent is separate and opt-in; legacy medical consents stay valid',()=>{
 const legacy=Object.fromEntries(consents.filter(c=>c.id!=='push').map(c=>[c.id,c.required]));
 assert.equal(parseConsents(legacy).push,false);
 assert.equal(parseConsents({...legacy,push:true}).push,true);
 assert.equal(consents.find(c=>c.id==='push').required,false);
 assert.equal(CONSENT_REVISION,'2026-09-28.1');
});
test('device permission is requested only after checking server consent',()=>{
 const s=fs.readFileSync(new URL('../components/push-settings.tsx',import.meta.url),'utf8');
 assert.ok(s.indexOf('if(!r.data.consented)')<s.indexOf('Notification.requestPermission()'));
});
