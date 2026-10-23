import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {anatomyModels,detailModelForStructure,validateAnatomyAsset,visibleStructureIds} from '../lib/anatomy-models.ts';
import {anatomyOverviewFromHash} from '../lib/anatomy-overview.ts';
import {learningCard} from '../lib/anatomy-learning.ts';
const model=()=>{const m=anatomyModels.find(m=>m.id==='musculoskeletal');assert.ok(m,'Combined bone and muscle model must exist');return m;};
const bytes=m=>readFileSync(new URL('../public'+m.src,import.meta.url));
function position(b,id){const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),n=j.nodes.find(n=>n.name===id),p=j.meshes[n.mesh].primitives[0],a=j.accessors[p.attributes.POSITION],v=j.bufferViews[a.bufferView],start=28+b.readUInt32LE(12)+(v.byteOffset??0)+(a.byteOffset??0);return b.subarray(start,start+a.count*12);}

test('combined asset contains the original skeleton and 89 bilateral muscle groups with unique checked source identity',async()=>{
 const m=model(),b=bytes(m);await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
 assert.ok(b.length<=32*1024*1024);assert.equal(m.structures.filter(s=>s.layer==='bone').length,201);
 const muscles=m.structures.filter(s=>s.layer==='muscle');assert.equal(muscles.length,178);
 const sources=muscles.flatMap(s=>s.sources.map(p=>p.elementId));assert.equal(sources.length,214);assert.equal(new Set(sources).size,214);
 for(const side of ['left','right']){assert.equal(muscles.filter(s=>s.side===side).length,89);for(const id of ['deltoid','biceps-brachii','pectoralis-major','trapezius','external-oblique','gluteus-maximus','rectus-femoris','gastrocnemius'])assert.ok(muscles.some(s=>s.id===side+'-'+id));}
 assert.ok(muscles.every(s=>s.learningId&&s.en&&/[\u0590-\u05ff]/.test(s.he)&&!s.he.includes('\ufffd')));
 assert.equal(m.asset.anatomicalReview,'pending');for(const id of ['latissimus-dorsi','rectus-abdominis','unlisted-muscles','coccyx'])assert.ok(m.asset.unavailable.includes(id));
});
test('all original skeleton position buffers and actual source laterality remain unchanged',()=>{
 const m=model(),b=bytes(m),skeleton=anatomyModels.find(m=>m.id==='skeleton'),old=bytes(skeleton);
 for(const s of skeleton.structures)assert.deepEqual(position(b,s.id),position(old,s.id),s.id);
 for(const s of m.structures.filter(s=>s.layer==='muscle')){const p=position(b,s.id);let x=0;for(let i=0;i<p.length;i+=12)x+=p.readFloatLE(i);assert.ok(s.side==='left'?x>0:x<0,s.id);}
 const arm=anatomyModels.find(m=>m.id==='arm');assert.deepEqual(position(b,'right-biceps-brachii'),position(bytes(arm),'biceps-brachii'));
});
test('layers and individual sides remain independent and canonical learning IDs preserve existing content',()=>{
 const m=model(),bones=visibleStructureIds(m,new Set(['bone']),null),muscles=visibleStructureIds(m,new Set(['muscle']),null);
 assert.equal(bones.length,201);assert.equal(muscles.length,178);assert.ok(!muscles.includes('right-humerus'));
 const shown=visibleStructureIds(m,new Set(['bone','muscle']),null,new Set(['left-deltoid']));assert.ok(shown.includes('right-deltoid'));assert.ok(!shown.includes('left-deltoid'));
 for(const side of ['left','right']){const s=m.structures.find(s=>s.id===side+'-biceps-brachii');assert.equal(s.learningId,'biceps-brachii');assert.ok(learningCard(s.learningId));}
 assert.equal(detailModelForStructure(m.structures.find(s=>s.id==='right-biceps-brachii')).id,'arm');assert.equal(detailModelForStructure(m.structures.find(s=>s.id==='left-biceps-brachii')),undefined);
});
test('fresh overview opens the layered model while explicit skeleton and map links remain supported',()=>{
 assert.equal(anatomyOverviewFromHash('#learn'),'musculoskeletal');assert.equal(anatomyOverviewFromHash('#learn?atlas=musculoskeletal'),'musculoskeletal');
 assert.equal(anatomyOverviewFromHash('#learn?atlas=skeleton'),'skeleton');assert.equal(anatomyOverviewFromHash('#learn?atlas=body'),'body');
 assert.equal(anatomyOverviewFromHash('#learn?region=elbow'),'body');
});
