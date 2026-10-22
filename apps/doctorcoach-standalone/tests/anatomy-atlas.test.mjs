import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {anatomyModels,modelForRegion,validateAnatomyAsset,visibleStructureIds,readCameraState} from '../lib/anatomy-models.ts';
import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
const bytes=m=>{const b=readFileSync(new URL('../public'+m.src,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
test('body and arm use real packaged geometry within separate mobile budgets',async()=>{
 for(const m of anatomyModels){const b=bytes(m);assert.ok(b.byteLength<=m.maxBytes,m.id);await validateAnatomyAsset(b,m);assert.equal(new Set(m.structures.map(s=>s.id)).size,m.structures.length);assert.equal(m.asset.licenseId,'CC-BY-4.0');assert.equal(m.asset.anatomicalReview,'pending');assert.ok(m.structures.every(s=>s.sources.length&&s.sources.every(p=>p.mappingRows.length)),m.id);}
 assert.equal(modelForRegion('shoulder').id,'shoulder');assert.equal(modelForRegion('elbow').id,'arm');assert.equal(modelForRegion('forearm').id,'forearm');assert.equal(modelForRegion('unavailable-region'),undefined);
});
test('asset admission refuses altered geometry, excess bytes and a mismatched mapping',async()=>{
 const model=modelForRegion('elbow'),b=bytes(model);const altered=b.slice(0);new Uint8Array(altered)[altered.byteLength-8]^=1;
 await assert.rejects(()=>validateAnatomyAsset(altered,model),/checksum/i);
 await assert.rejects(()=>validateAnatomyAsset(b,{...model,maxBytes:8}),/budget/i);
 await assert.rejects(()=>validateAnatomyAsset(b,{...model,structures:model.structures.slice(1)}),/inventory/i);
});
test('isolation never reveals a hidden or unknown structure and reset restores available structures',()=>{
 const m=modelForRegion('elbow'),layers=new Set(['bone','muscle']);
 assert.deepEqual(visibleStructureIds(m,layers,'biceps-brachii'),['biceps-brachii']);
 assert.deepEqual(visibleStructureIds(m,new Set(['bone']),'biceps-brachii'),[]);
 assert.deepEqual(visibleStructureIds(m,layers,'invented'),[]);
 assert.equal(visibleStructureIds(m,layers,null).length,m.structures.length);
});
test('camera restoration accepts only bounded finite positions and targets',()=>{
 assert.deepEqual(readCameraState({position:[0,0,2],target:[0,.1,0]}),{position:[0,0,2],target:[0,.1,0]});
 for(const bad of [null,{}, {position:[NaN,0,1],target:[0,0,0]},{position:[0,0,Infinity],target:[0,0,0]},{position:[10000,0,1],target:[0,0,0]},{position:[0,0,0],target:[0,0,0]}])assert.equal(readCameraState(bad),null);
});
test('new modeled muscles have complete bilingual learning cards and canonical reverse exercise links',()=>{
 for(const s of modelForRegion('elbow').structures.filter(s=>s.layer==='muscle')){const c=learningCard(s.id);assert.ok(c,s.id);for(const f of ['origin','insertion','action','joints','training','innervation'])assert.ok(c[f]?.he&&c[f]?.en,s.id+':'+f);assert.ok(c.links.length,s.id);for(const link of c.links)assert.ok(exerciseMuscles(link.id).some(m=>m.slug===s.id));}
});
