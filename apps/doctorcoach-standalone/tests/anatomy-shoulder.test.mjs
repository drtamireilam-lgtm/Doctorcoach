import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectGlb} from '../lib/anatomy-glb-inventory.ts';
import {shoulderAsset,shoulderStructures, materialState, pickStructure} from '../lib/anatomy-shoulder.ts';
test('packaged shoulder contains exactly the mapped meshes and named materials',()=>{
 const bytes=readFileSync(new URL('../public/anatomy/shoulder.glb',import.meta.url));
 const inventory=inspectGlb(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert.deepEqual(new Set(inventory.meshNodeNames),new Set(shoulderStructures.map(s=>s.id)));
 assert.ok(shoulderStructures.filter(s=>s.layer==='muscle').length>=8);
 assert.ok(bytes.length<3*1024*1024);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),shoulderAsset.glbSha256);
 for(const structure of shoulderAsset.structures){assert.ok(structure.sources.every(s=>s.mappingRows.length>0));}
});
test('selection rejects hidden and unknown structures',()=>{
 const id=shoulderStructures.find(s=>s.layer==='muscle').id;
 assert.equal(pickStructure(id,new Set(['bone'])),null);
 assert.equal(pickStructure('invented',new Set(['muscle'])),null);
 assert.equal(pickStructure(id,new Set(['muscle'])),id);
});
test('highlight and layer visibility are reversible',()=>{
 const s=shoulderStructures[0];
 assert.equal(materialState(s,s.id,new Set()).color[3],0);
 assert.notDeepEqual(materialState(s,s.id,new Set([s.layer])).color,materialState(s,null,new Set([s.layer])).color);
 assert.equal(materialState(s,null,new Set([s.layer])).color[3],1);
});
test('all modeled muscles have bilingual information and a canonical exercise relationship',async()=>{
 const {learningCard,exerciseMuscles}=await import('../lib/anatomy-learning.ts');
 for(const structure of shoulderStructures.filter(s=>s.layer==='muscle')){
  const card=learningCard(structure.id);assert.ok(card,structure.id);
  assert.ok(card.innervation?.he&&card.innervation?.en,structure.id);
  assert.ok(card.links.length>0,structure.id);
  for(const link of card.links)assert.ok(exerciseMuscles(link.id).some(m=>m.slug===structure.id));
 }
});
