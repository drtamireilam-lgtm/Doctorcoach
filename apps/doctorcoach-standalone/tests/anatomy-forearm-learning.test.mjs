import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {learningCard} from '../lib/anatomy-learning.ts';
import {modelForRegion} from '../lib/anatomy-models.ts';

const slugs=['extensor-digitorum','extensor-digiti-minimi','extensor-indicis','abductor-pollicis-longus','extensor-pollicis-brevis','extensor-pollicis-longus'];
const uams='https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/';
for(const slug of slugs)test(slug+' has a referenced bilingual learning card without invented geometry or exercise links',()=>{
 const card=learningCard(slug);assert.ok(card,'Missing authored card: '+slug);
 assert.equal(card.region,'forearm');assert.equal(card.view,'back');
 for(const field of ['location','origin','insertion','action','joints','training','innervation']){
  assert.ok(/[\u0590-\u05ff]/.test(card[field]?.he??''),field+' Hebrew');
  assert.ok(card[field]?.en?.trim(),field+' English');assert.ok(!/[\u0590-\u05ff]/.test(card[field].en),field+' untranslated');
 }
 const source='https://rad.uw.edu/muscle-atlas/'+slug;
 assert.equal(card.source,source);assert.equal(card.innervationReference,source);
 assert.equal(card.contentReview.status,'reference-checked; clinical review pending');
 assert.equal(card.contentReview.checkedAt,'2026-10-24');assert.ok(card.contentReview.sources.includes(source));
 if(slug==='extensor-pollicis-brevis')assert.ok(card.contentReview.sources.includes(uams),'MCP correction requires the second reference');
 assert.deepEqual(card.links,[],'No independently reviewed exercise mapping is available');
 assert.ok(!modelForRegion('forearm').structures.some(s=>s.id===slug),'A card must not fabricate a mesh');
});

test('thumb cards retain distinct attachments and joints',()=>{
 const short=learningCard('extensor-pollicis-brevis'),long=learningCard('extensor-pollicis-longus'),abductor=learningCard('abductor-pollicis-longus');
 assert.ok(short&&long&&abductor,'Thumb cards must exist');
 assert.match(short.insertion.en,/proximal phalanx/i);assert.match(short.action.en,/metacarpophalangeal/i);
 assert.match(long.insertion.en,/distal phalanx/i);assert.match(long.action.en,/interphalangeal/i);
 assert.match(abductor.insertion.en,/first metacarpal/i);assert.match(abductor.action.en,/carpometacarpal/i);
});

test('new forearm cards use existing catalog identities',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../lib/prepared/muscles.json',import.meta.url)));
 for(const slug of slugs)assert.ok(catalog.some(m=>m.slug===slug),slug);
});
