import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {modelForRegion,validateAnatomyAsset} from '../lib/anatomy-models.ts';
import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
test('hip navigator opens a licensed source-mapped right hip with selectable bones and twelve muscles',async()=>{
 const model=modelForRegion('hip_glute');assert.ok(model,'dedicated hip model is missing');assert.equal(model.id,'hip');
 assert.equal(model.structures.filter(s=>s.layer==='bone').length,2);assert.equal(model.structures.filter(s=>s.layer==='muscle').length,12);
 const b=readFileSync(new URL('../public'+model.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),model);
 const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),used=new Set();
 for(const s of model.structures){assert.equal(s.regionId,'hip_glute');assert.equal(s.side,'right');for(const source of s.sources){assert.ok(source.mappingRows.some(r=>r.split('\t')[1].includes('right')),s.id);assert.ok(!used.has(source.elementId));used.add(source.elementId);}
 const mesh=doc.meshes.find(m=>m.name===s.id),a=doc.accessors[mesh.primitives[0].attributes.POSITION];assert.ok((a.min[0]+a.max[0])/2<0,s.id+': geometry is on the wrong side');}
 assert.equal(model.asset.licenseId,'CC-BY-4.0');assert.equal(model.asset.anatomicalReview,'pending');
 assert.ok(model.asset.unavailable.includes('cartilage'));assert.equal(modelForRegion('ankle_foot'),undefined);
});
test('all modeled hip muscles have bilingual referenced information and canonical exercise relationships',()=>{
 const model=modelForRegion('hip_glute');assert.ok(model,'hip model missing');
 for(const s of model.structures.filter(s=>s.layer==='muscle')){
  const c=learningCard(s.id);assert.ok(c,s.id);assert.equal(c.region,'hip_glute');
  for(const field of ['location','origin','insertion','action','joints','training','innervation'])assert.ok(c[field]?.he&&c[field]?.en,s.id+': '+field);
  assert.ok(c.innervationReference,s.id);for(const link of c.links)assert.ok(exerciseMuscles(link.id).some(x=>x.slug===s.id&&x.role===link.role));
 }
 assert.ok(learningCard('gluteus-maximus').links.some(l=>l.id==='hip-thrust'&&l.role==='primary'));
 assert.ok(learningCard('gluteus-medius').links.some(l=>l.id==='balance'&&l.role==='stabilizer'));
 assert.ok(learningCard('psoas-major').links.some(l=>l.id==='hanging-leg-raise'&&l.role==='primary'));
 assert.ok(!learningCard('psoas-major').links.some(l=>l.id.includes('stretch')),'stretching is not an active strengthening role');
});
