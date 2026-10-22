import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {anatomyModels,modelForRegion,modelRegionForMuscle,validateAnatomyAsset,visibleStructureIds} from '../lib/anatomy-models.ts';
import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
test('chest and abdomen share exact licensed torso geometry with separate cartilage and honest missing muscles',async()=>{
 const m=modelForRegion('chest');assert.ok(m,'torso model missing');assert.equal(modelForRegion('core_abdomen'),m);assert.equal(anatomyModels[0].id,'body');assert.equal(anatomyModels[1].id,'shoulder');
 assert.equal(m.structures.filter(s=>s.layer==='bone').length,17);assert.equal(m.structures.filter(s=>s.layer==='cartilage').length,7);assert.equal(m.structures.filter(s=>s.layer==='muscle').length,4);
 const b=readFileSync(new URL('../public'+m.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
 const sternum=m.structures.find(s=>s.id==='sternum');assert.equal(sternum.side,'midline');assert.deepEqual(sternum.sources.map(p=>p.elementId),['FJ3290','FJ3178','FJ3153']);
 for(const s of m.structures.filter(s=>s.id!=='sternum')){assert.equal(s.side,'right');assert.ok(s.sources.every(p=>p.mappingRows.some(r=>r.split('\t')[1].includes('right'))));}
 for(const id of ['rectus-abdominis','internal-oblique','transversus-abdominis','internal-organs','nerves'])assert.ok(m.asset.unavailable.includes(id));
 assert.deepEqual(visibleStructureIds(m,new Set(['cartilage']),null),m.structures.filter(s=>s.layer==='cartilage').map(s=>s.id));
 assert.deepEqual(visibleStructureIds(m,new Set(['bone','muscle']),'costal-cartilage-1'),[]);
});
test('modeled torso muscles reuse canonical cards and exercise roles without fabricating targeted exercises',()=>{
 const m=modelForRegion('chest');assert.ok(m);
 for(const s of m.structures.filter(s=>s.layer==='muscle')){const c=learningCard(s.id);assert.ok(c);for(const f of ['origin','insertion','action','location','joints','training','innervation'])assert.ok(c[f]?.he&&c[f]?.en,s.id+':'+f);assert.ok(c.innervationReference);}
 assert.equal(modelRegionForMuscle('external-oblique','core_abdomen',true),'core_abdomen');assert.equal(modelRegionForMuscle('serratus-anterior','chest',true),'chest');assert.equal(modelRegionForMuscle('serratus-anterior','shoulder',true),'shoulder');
 assert.ok(exerciseMuscles('barbell-bench').some(s=>s.slug==='pectoralis-major'&&s.role==='primary'));
 assert.ok(exerciseMuscles('side-plank').some(s=>s.slug==='external-oblique'&&s.role==='stabilizer'));
 assert.equal(learningCard('pectoralis-minor').links.length,0);assert.ok(!m.structures.some(s=>s.id==='rectus-abdominis'));
});
