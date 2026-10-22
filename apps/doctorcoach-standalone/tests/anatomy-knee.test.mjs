import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import * as atlas from '../lib/anatomy-models.ts';import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
test('right knee has six real bones and ten distinct source-mapped muscles with joint framing',async()=>{
 const m=atlas.modelForRegion('knee');assert.ok(m,'knee model missing');assert.equal(m.id,'knee');
 assert.equal(m.structures.filter(s=>s.layer==='bone').length,6);assert.equal(m.structures.filter(s=>s.layer==='muscle').length,10);
 assert.deepEqual(m.initialFocus,{structure:'patella',scale:4});
 const b=readFileSync(new URL('../public'+m.src,import.meta.url));await atlas.validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
 const doc=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),seen=new Set();
 for(const s of m.structures){assert.equal(s.side,'right');assert.equal(s.regionId,'knee');
 for(const p of s.sources){assert.ok(p.mappingRows.some(r=>r.split('\t')[1].includes('right')),s.id);assert.ok(!seen.has(p.elementId));seen.add(p.elementId);}
 const mesh=doc.meshes.find(x=>x.name===s.id),a=doc.accessors[mesh.primitives[0].attributes.POSITION];assert.ok((a.min[0]+a.max[0])/2<0,s.id);}
 for(const id of ['menisci','cruciate-ligaments','collateral-ligaments','cartilage','separate-tendons'])assert.ok(m.asset.unavailable.includes(id),id);
 assert.equal(m.asset.anatomicalReview,'pending');assert.equal(atlas.modelForRegion('groin'),undefined);
});
test('exercise anatomy can resolve an existing muscle into its available LAB model without changing normal routes',()=>{
 assert.equal(typeof atlas.modelRegionForMuscle,'function','LAB model resolution missing');
 assert.equal(atlas.modelRegionForMuscle('rectus-femoris','thigh',true),'knee');
 assert.equal(atlas.modelRegionForMuscle('rectus-femoris','thigh',false),'thigh');
 assert.equal(atlas.modelRegionForMuscle('gastrocnemius','lower_leg',true),'lower_leg');
 assert.equal(atlas.modelRegionForMuscle('brachioradialis','elbow',true),'elbow');
 assert.equal(atlas.modelRegionForMuscle('brachioradialis','forearm',true),'forearm');
 assert.equal(atlas.modelRegionForMuscle('not-a-structure','groin',true),'groin');
});
test('knee muscles retain their canonical cards, distinct innervation and appropriate exercise roles',()=>{
 const m=atlas.modelForRegion('knee');assert.ok(m);
 for(const s of m.structures.filter(s=>s.layer==='muscle')){const c=learningCard(s.id);assert.ok(c,s.id);for(const f of ['location','origin','insertion','action','joints','training','innervation'])assert.ok(c[f]?.he&&c[f]?.en,s.id+':'+f);assert.ok(c.innervationReference,s.id);for(const l of c.links)assert.ok(exerciseMuscles(l.id).some(x=>x.slug===s.id&&x.role===l.role));}
 assert.match(learningCard('biceps-femoris-short-head').innervation.en,/fibular|peroneal/i);
 assert.match(learningCard('biceps-femoris-long-head').innervation.en,/tibial/i);
 assert.ok(!learningCard('biceps-femoris-short-head').links.some(l=>['rdl','deadlift'].includes(l.id)));
 assert.deepEqual(learningCard('popliteus').links,[]);
});
