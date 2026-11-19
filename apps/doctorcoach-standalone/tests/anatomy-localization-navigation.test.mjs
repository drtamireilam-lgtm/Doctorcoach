import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const structures=JSON.parse(await readFile(new URL('../lib/prepared/detailed-model.json',import.meta.url),'utf8')).structures;
const {detailedName,detailedAreas,wholeMuscleContext}=await import('../scripts/anatomy/detailed-labels.mjs');
test('all pinned source names have Hebrew labels and a known navigation area',()=>{
 for(const s of structures){const r=detailedName(s.en);assert.match(r.he,/[א-ת]/,s.en);assert.doesNotMatch(r.he,/[A-Za-z]/,s.en);assert.ok(r.area&&detailedAreas.some(a=>a.id===r.area),s.en);}
});
test('labels distinguish hand and foot bones, side and source mesh subdivisions',()=>{
 assert.notEqual(detailedName('Left first metacarpal bone').he,detailedName('Left first metatarsal bone').he);
 assert.match(detailedName('Right extensor carpi ulnaris (2)').he,/ימין.*חלק נוסף|חלק נוסף.*ימין/);
 assert.match(detailedName('Spinal part of left deltoid').he,/שכמתי|קוצי/);
 assert.throws(()=>detailedName('Invented mystery muscle'),/Unknown/);
});
test('subdivisions link only through explicit whole-muscle context',()=>{
 assert.equal(wholeMuscleContext('Clavicular part of left deltoid'),'deltoid');
 assert.equal(wholeMuscleContext('Left calcaneal tendon'),undefined);
 assert.equal(wholeMuscleContext('Left mentalis'),undefined);
});
test('navigation groups filter the picker without discarding manual layer state',async()=>{
 const {navigationHidden,anatomyNavigationAreas}=await import('../lib/anatomy-navigation.ts');
 const hidden=new Set(['manual']);const s=[{id:'manual',navigationArea:'hand'},{id:'hand',navigationArea:'hand'},{id:'foot',navigationArea:'foot'}];
 assert.deepEqual([...navigationHidden(s,hidden,'hand')].sort(),['foot','manual']);
 assert.deepEqual([...hidden],['manual']);assert.deepEqual([...navigationHidden(s,hidden,'invented')],['manual']);
 for(const area of anatomyNavigationAreas)assert.ok(structures.some(s=>s.navigationArea===area.id),area.id);
});
test('new explicit education links all resolve to existing cards',async()=>{
 const {learningCard}=await import('../lib/anatomy-learning.ts');
 for(const s of structures)if(s.learningId)assert.ok(learningCard(s.learningId),s.id);
 assert.equal(structures.find(s=>s.en==='Long head of left biceps femoris').learningId,'biceps-femoris-long-head');
 assert.equal(structures.find(s=>s.en==='Clavicular part of left deltoid').learningScope,'parent');
});

test('both lumbar multifidus meshes open the existing lower-back muscle card as parent context', () => {
 for (const side of ['left', 'right']) {
  const mesh = structures.find(item => item.id === 'detail-' + side + '-multifidus-lumborum');
  assert.equal(mesh?.learningId, 'multifidus');
  assert.equal(mesh.learningScope, 'parent');
 }
});
