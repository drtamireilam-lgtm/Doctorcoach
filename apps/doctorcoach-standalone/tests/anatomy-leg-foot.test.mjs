import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {modelForRegion,modelRegionForMuscle,validateAnatomyAsset} from '../lib/anatomy-models.ts';
import {learningCard} from '../lib/anatomy-learning.ts';
test('separate right calf and foot models contain exact major foot skeletons and scoped muscle inventories',async()=>{
 for(const [region,id,bones,muscles] of [['lower_leg','lowerleg',29,12],['ankle_foot','foot',28,9]]){
  const m=modelForRegion(region);assert.ok(m,region+' model missing');assert.equal(m.id,id);assert.equal(m.structures.filter(s=>s.layer==='bone').length,bones);assert.equal(m.structures.filter(s=>s.layer==='muscle').length,muscles);
  const b=readFileSync(new URL('../public'+m.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
  const d=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),seen=new Set();
  for(const s of m.structures){assert.equal(s.side,'right');for(const p of s.sources){assert.ok(p.mappingRows.some(r=>r.split('\t')[1].includes('right')),s.id);assert.ok(!seen.has(p.elementId));seen.add(p.elementId);}
   const a=d.accessors[d.meshes.find(x=>x.name===s.id).primitives[0].attributes.POSITION];assert.ok((a.min[0]+a.max[0])/2<0,s.id);}
  for(const missing of ['ligaments','cartilage','separate-tendons','unlisted-muscles'])assert.ok(m.asset.unavailable.includes(missing));
 }
 const foot=modelForRegion('ankle_foot');assert.equal(foot.initialView,'left');assert.deepEqual(foot.initialFocus,{structure:'talus',scale:6});
 assert.equal(foot.structures.filter(s=>/^(proximal|middle|distal)-phalanx-/.test(s.id)).length,14);
});
test('canonical calf links now use the calf while valid knee and foot contexts remain stable',()=>{
 assert.equal(modelRegionForMuscle('gastrocnemius','lower_leg',true),'lower_leg');
 assert.equal(modelRegionForMuscle('gastrocnemius','knee',true),'knee');
 assert.equal(modelRegionForMuscle('tibialis-anterior','ankle_foot',true),'ankle_foot');
 assert.equal(modelRegionForMuscle('tibialis-anterior','lower_leg',false),'lower_leg');
});
test('all modeled leg and foot muscles have bilingual referenced content with honest exercise roles',()=>{
 for(const region of ['lower_leg','ankle_foot']){const m=modelForRegion(region);assert.ok(m);for(const s of m.structures.filter(s=>s.layer==='muscle')){const c=learningCard(s.id);assert.ok(c,s.id);for(const field of ['location','origin','insertion','action','joints','training','innervation'])assert.ok(c[field]?.he&&c[field]?.en,s.id+':'+field);assert.ok(c.innervationReference,s.id);}}
 assert.ok(learningCard('tibialis-anterior').links.some(l=>l.id==='tibialis-raise'&&l.role==='primary'));
 assert.ok(learningCard('fibularis-longus').links.some(l=>l.id==='ankle-eversion-band'&&l.role==='primary'));
 assert.ok(learningCard('tibialis-posterior').links.some(l=>l.id==='ankle-inversion-band'&&l.role==='primary'));
 assert.match(learningCard('flexor-hallucis-brevis').innervation.en,/medial plantar/i);
 assert.ok(!learningCard('abductor-hallucis').links.some(l=>l.role==='primary'),'generic short foot is not isolated hallux abduction');
});
