import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {anatomyModels,modelForRegion,modelRegionForMuscle,validateAnatomyAsset} from '../lib/anatomy-models.ts';import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
test('thigh and groin open the same source-mapped right model with five bones and fourteen muscles',async()=>{
 const m=modelForRegion('groin');assert.ok(m,'dedicated groin geometry missing');assert.equal(m,modelForRegion('thigh'));assert.equal(m.id,'thigh');assert.deepEqual(m.initialFocus,{structure:'adductor-magnus',scale:1.5});assert.equal(anatomyModels[0].id,'body');assert.equal(anatomyModels[1].id,'shoulder');assert.equal(m.structures.filter(s=>s.layer==='bone').length,5);assert.equal(m.structures.filter(s=>s.layer==='muscle').length,14);
 const b=readFileSync(new URL('../public'+m.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
 for(const s of m.structures){assert.equal(s.side,'right');assert.ok(s.sources.every(p=>p.mappingRows.some(r=>r.split('\t')[1].includes('right'))),s.id);}
 for(const id of ['separate-tendons','ligaments','nerves','cartilage','contralateral-paired-structures'])assert.ok(m.asset.unavailable.includes(id));
});
test('adductor cards retain canonical exercise roles and shared knee context',()=>{
 for(const id of ['adductor-longus','adductor-brevis','adductor-magnus','gracilis','pectineus','sartorius']){const c=learningCard(id);assert.ok(c,id);for(const f of ['origin','insertion','action','joints','training','location','innervation'])assert.ok(c[f]?.he&&c[f]?.en,id+':'+f);assert.ok(c.innervationReference,id);}
 for(const id of ['adductor-longus','adductor-brevis','gracilis','pectineus'])assert.ok(exerciseMuscles('adduction').some(c=>c.slug===id&&c.role==='primary'),id);
 assert.match(learningCard('adductor-magnus').innervation.en,/obturator.*tibial/i);assert.match(learningCard('pectineus').innervation.en,/femoral.*obturator/i);
 assert.equal(modelRegionForMuscle('adductor-longus','groin',true),'groin');assert.equal(modelRegionForMuscle('adductor-longus','shoulder',true),'thigh');assert.equal(modelRegionForMuscle('rectus-femoris','knee',true),'knee');assert.equal(modelRegionForMuscle('adductor-longus','shoulder',false),'shoulder');
});
