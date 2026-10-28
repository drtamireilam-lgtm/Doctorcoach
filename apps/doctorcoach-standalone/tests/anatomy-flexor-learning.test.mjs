import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {learningCard} from '../lib/anatomy-learning.ts';
import {modelForRegion} from '../lib/anatomy-models.ts';
const slugs=['flexor-digitorum-superficialis','flexor-digitorum-profundus','flexor-pollicis-longus','palmaris-longus'];
const catalog=JSON.parse(readFileSync(new URL('../lib/prepared/muscles.json',import.meta.url)));
const uams='https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/';
for(const slug of slugs)test(slug+' has a complete referenced bilingual card with pending review and no invented mesh or exercise',()=>{
 const card=learningCard(slug);assert.ok(card,'Missing card: '+slug);assert.ok(catalog.some(m=>m.slug===slug));
 assert.equal(card.region,'forearm');assert.equal(card.view,'front');
 for(const field of ['location','origin','insertion','action','joints','training','innervation']){
  assert.match(card[field]?.he??'',/[\u0590-\u05ff]/,field+' Hebrew');assert.ok(card[field]?.en?.trim(),field+' English');assert.doesNotMatch(card[field].en,/[\u0590-\u05ff]/,field+' translation');
 }
 const source='https://rad.uw.edu/muscle-atlas/'+slug;
 assert.equal(card.source,source);assert.equal(card.innervationReference,source);
 assert.equal(card.contentReview.status,'reference-checked; clinical review pending');assert.equal(card.contentReview.checkedAt,'2026-10-24');
 assert.ok(card.contentReview.sources.includes(source));assert.ok(card.contentReview.sources.includes(uams));
 assert.deepEqual(card.links,[]);assert.ok(!modelForRegion('forearm').structures.some(s=>s.id===slug));
});
test('finger flexors retain PIP/middle, DIP/distal and thumb IP distinctions',()=>{
 const superficial=learningCard(slugs[0]),deep=learningCard(slugs[1]),thumb=learningCard(slugs[2]);assert.ok(superficial&&deep&&thumb,'Flexor cards must exist');
 assert.match(superficial.insertion.en,/middle phalanges/i);assert.match(superficial.action.en,/proximal interphalangeal/i);assert.match(superficial.insertion.he,/אמצעיים/);
 assert.match(deep.insertion.en,/distal phalanges/i);assert.match(deep.action.en,/distal interphalangeal/i);assert.match(deep.insertion.he,/מרוחקים/);
 assert.match(thumb.insertion.en,/thumb distal phalanx/i);assert.match(thumb.action.en,/interphalangeal/i);assert.match(thumb.action.he,/הבין־גלילי/);
});
test('FDP retains median anterior interosseous digits 2–3 and ulnar digits 4–5',()=>{
 const card=learningCard('flexor-digitorum-profundus');assert.ok(card,'FDP card must exist');
 assert.match(card.innervation.en,/digits 2–3.*anterior interosseous.*median/i);assert.match(card.innervation.en,/digits 4–5.*ulnar/i);
 assert.match(card.innervation.he,/2–3.*הבין־גרמי הקדמי.*המדיאני/);assert.match(card.innervation.he,/4–5.*האולנרי/);
 const thumb=learningCard('flexor-pollicis-longus');assert.ok(thumb);assert.match(thumb.innervation.en,/anterior interosseous.*median/i);
});
