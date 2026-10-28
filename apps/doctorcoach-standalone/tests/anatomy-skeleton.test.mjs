import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {anatomyModels,modelForRegion,detailModelForStructure,validateAnatomyAsset,visibleStructureIds} from '../lib/anatomy-models.ts';
import {anatomyOverviewFromHash} from '../lib/anatomy-overview.ts';
const skeleton=()=>{const model=anatomyModels.find(m=>m.id==='skeleton');assert.ok(model,'Unified skeleton must exist');return model;};
const bytes=m=>readFileSync(new URL('../public'+m.src,import.meta.url));
const document=b=>JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
function positions(b,id){const doc=document(b),node=doc.nodes.find(n=>n.name===id),primitive=doc.meshes[node.mesh].primitives[0],accessor=doc.accessors[primitive.attributes.POSITION],view=doc.bufferViews[accessor.bufferView],start=28+b.readUInt32LE(12)+(view.byteOffset??0)+(accessor.byteOffset??0);return b.subarray(start,start+accessor.count*12);}

test('unified skeleton is a self-contained source-checked bilateral model within the mobile budget',async()=>{
 const model=skeleton(),b=bytes(model);assert.ok(b.length<=12*1024*1024);await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),model);
 assert.equal(model.structures.length,201);assert.ok(model.structures.every(s=>s.layer==='bone'));
 const sources=model.structures.flatMap(s=>s.sources.map(p=>p.elementId));assert.equal(sources.length,205);assert.equal(new Set(sources).size,sources.length);assert.ok(!sources.includes('FJ2772'));
 assert.equal(model.asset.licenseId,'CC-BY-4.0');assert.equal(model.asset.anatomicalReview,'pending');
 assert.ok(model.structures.every(s=>/[\u0590-\u05ff]/.test(s.he)&&s.en.trim()&&!s.he.includes('\uFFFD')),'UTF-8 bilingual bone labels');
 for(const missing of ['coccyx','auditory-ossicles','intervertebral-discs','ligaments'])assert.ok(model.asset.unavailable.includes(missing));
});
test('whole skeleton contains the major bilateral bones, both hands/feet, skull, ribs and continuous spine',()=>{
 const model=skeleton(),ids=new Set(model.structures.map(s=>s.id));
 for(const side of ['right','left'])for(const bone of ['humerus','radius','ulna','femur','tibia','fibula','patella','hip-bone','scapula','clavicle'])assert.ok(ids.has(side+'-'+bone),side+' '+bone);
 assert.ok(ids.has('sternum'));assert.ok(ids.has('mandible'));assert.ok(model.structures.some(s=>s.sources.some(p=>p.mappingRows.some(r=>r.startsWith('FMA52735\t')))));assert.ok(ids.has('hyoid'));
 for(const id of ['cervical-1','cervical-7','thoracic-1','thoracic-12','lumbar-1','lumbar-5','sacrum'])assert.ok(ids.has(id),id);
 for(const side of ['right','left'])assert.ok(model.structures.filter(s=>s.side===side&&s.regionId==='wrist_hand').length>=27,side+' hand');
 for(const side of ['right','left'])assert.ok(model.structures.filter(s=>s.side===side&&s.regionId==='ankle_foot').length>=26,side+' foot');
});
test('skeleton retains exact shared source positions with the existing regional bones',()=>{
 const model=skeleton(),b=bytes(model),arm=modelForRegion('elbow');
 assert.deepEqual(positions(b,'right-humerus'),positions(bytes(arm),'humerus'),'No bone-specific recentering, scaling or rotation');
 const doc=document(b);assert.ok(doc.nodes.every(n=>!n.translation&&!n.rotation&&!n.scale&&!n.matrix));
});
test('original left and right geometry remain on their proper sides at metre scale',()=>{
 const model=skeleton(),b=bytes(model);let low=Infinity,high=-Infinity;
 for(const structure of model.structures){const p=positions(b,structure.id);let meanX=0;for(let i=0;i<p.length;i+=12){meanX+=p.readFloatLE(i);low=Math.min(low,p.readFloatLE(i+4));high=Math.max(high,p.readFloatLE(i+4));}meanX/=p.length/12;if(structure.side==='left')assert.ok(meanX>0,structure.id);if(structure.side==='right')assert.ok(meanX<0,structure.id);}
 assert.ok(high-low>1.5&&high-low<2.1,'Shared full-body scale');
});
test('hiding one side never hides the opposite bone and original regional routing is retained',()=>{
 const model=skeleton(),shown=visibleStructureIds(model,new Set(['bone']),null,new Set(['left-humerus']));
 assert.ok(shown.includes('right-humerus'));assert.ok(!shown.includes('left-humerus'));
 assert.deepEqual(visibleStructureIds(model,new Set(['bone']),'right-humerus'),['right-humerus']);
 assert.equal(anatomyModels[0].id,'body');assert.equal(modelForRegion('forearm').id,'forearm');assert.equal(modelForRegion('shoulder').id,'shoulder');
});
test('fresh overview opens layered body while old surface links and region return modes remain compatible',()=>{
 assert.equal(anatomyOverviewFromHash('#learn'),'musculoskeletal');assert.equal(anatomyOverviewFromHash('#learn?atlas=skeleton'),'skeleton');
 assert.equal(anatomyOverviewFromHash('#learn?atlas=body'),'body');assert.equal(anatomyOverviewFromHash('#learn?region=elbow'),'body');
 assert.equal(anatomyOverviewFromHash('#learn?region=elbow','skeleton'),'skeleton');assert.equal(anatomyOverviewFromHash('#learn?atlas=invalid'),'musculoskeletal');
});
test('regional detail links require the actual same-side bone source',()=>{
 const model=skeleton();assert.equal(detailModelForStructure(model.structures.find(s=>s.id==='right-humerus')).id,'arm');
 assert.equal(detailModelForStructure(model.structures.find(s=>s.id==='left-humerus')),undefined);
 assert.equal(detailModelForStructure(model.structures.find(s=>s.id==='mandible')),undefined);
});
