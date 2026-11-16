import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {convertDetailedAtlas,sourceSha} from '../scripts/anatomy/detailed-asset.mjs';
const source=await readFile(new URL('../.sites-runtime/detailed-source.glb',import.meta.url));
test('detailed atlas admission rejects checksum mismatch',()=>assert.throws(()=>convertDetailedAtlas(Buffer.from('bad'),[]),/checksum/));
test('detailed atlas retains source binary and makes every binding unique',()=>{
 const {bytes,structures}=convertDetailedAtlas(source,[]);
 assert.equal(structures.length,634);assert.equal(new Set(structures.map(s=>s.id)).size,634);
 const oldJsonLength=source.readUInt32LE(12),newJsonLength=bytes.readUInt32LE(12);
 assert.deepEqual(bytes.subarray(20+newJsonLength),source.subarray(20+oldJsonLength));
 const doc=JSON.parse(bytes.subarray(20,20+newJsonLength));
 assert.equal(doc.materials.length,634);
 for(const node of doc.nodes.filter(n=>n.mesh!==undefined)){
  const mesh=doc.meshes[node.mesh];assert.equal(mesh.name,node.name);assert.equal(doc.materials[mesh.primitives[0].material].name,node.name);assert.ok(mesh.primitives[0].attributes.COLOR_0!==undefined);
 }
 assert.ok(structures.some(s=>s.depth==='deep'));assert.ok(structures.some(s=>s.depth==='superficial'));
 assert.ok(doc.nodes.some(n=>n.scale?.[0]===0.0001));
});
test('exact catalogue mapping never infers neighbouring subdivisions',()=>{
 const mappings=[{en:'Left soleus',he:'סולאוס — שמאל',id:'left-soleus',layer:'muscle',learningId:'soleus',regionId:'lower_leg'}];
 const {structures}=convertDetailedAtlas(source,mappings);
 assert.equal(structures.find(s=>s.en==='Left soleus')?.learningId,'soleus');
 assert.ok(structures.filter(s=>s.learningId&&!s.learningScope).every(s=>s.en==='Left soleus'||s.en==='Right soleus'||/^(Long|Short) head of (left|right) biceps femoris$/.test(s.en)));
});

test('detailed model passes existing immutable-source admission and all-body source inventory',async()=>{
 const {anatomyModels,validateAnatomyAsset}=await import('../lib/anatomy-models.ts');
 const model=anatomyModels.find(m=>m.id==='detailed');assert.ok(model);
 const bytes=await readFile(new URL('../public/anatomy/detailed.glb',import.meta.url));
 await validateAnatomyAsset(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),model);
 for(const term of ['latissimus dorsi','rectus abdominis','internal oblique','transversus abdominis','quadratus lumborum']){
  const pairs=model.structures.filter(s=>s.en.toLowerCase().endsWith(term));assert.equal(pairs.length,2);assert.ok(pairs.every(s=>s.learningId));
 }
});
test('depth and side filters preserve manual hides and midline structures',async()=>{
 const {anatomyHiddenStructures}=await import('../lib/anatomy-depth.ts');
 const structures=[{id:'a',depth:'superficial',side:'left'},{id:'b',depth:'deep',side:'left'},{id:'c',depth:'deep',side:'right'},{id:'d',side:'midline'}];
 assert.deepEqual([...anatomyHiddenStructures(structures,new Set(['b']),new Set(['deep']),'left')].sort(),['a','b','c']);
 assert.equal(anatomyHiddenStructures(structures,new Set(),new Set(['deep','superficial']),'both').size,0);
});
test('detailed full-body routing preserves explicit old modes',async()=>{
 const {anatomyOverviewFromHash}=await import('../lib/anatomy-overview.ts');
 assert.equal(anatomyOverviewFromHash('#learn?atlas=detailed'),'detailed');
 assert.equal(anatomyOverviewFromHash('#learn?atlas=musculoskeletal'),'musculoskeletal');
});
