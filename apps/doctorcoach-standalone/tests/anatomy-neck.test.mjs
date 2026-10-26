import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {anatomyModels,modelForRegion,modelRegionForMuscle,validateAnatomyAsset} from '../lib/anatomy-models.ts';import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
const catalog=['muscles','additional-muscles'].flatMap(n=>JSON.parse(readFileSync(new URL('../lib/prepared/'+n+'.json',import.meta.url))));
test('neck contains source-mapped cervical bones and right muscles without mirroring missing longus colli',async()=>{
 const m=modelForRegion('cervical_neck');assert.ok(m,'dedicated neck model missing');assert.equal(m.id,'neck');assert.equal(anatomyModels[0].id,'body');assert.equal(anatomyModels[1].id,'shoulder');
 assert.equal(m.structures.filter(s=>s.layer==='bone').length,20);assert.equal(m.structures.filter(s=>s.layer==='muscle').length,12);
 const b=readFileSync(new URL('../public'+m.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
 for(let i=1;i<=7;i++)assert.equal(m.structures.find(s=>s.id==='cervical-'+i)?.side,'midline');
 assert.equal(m.structures.find(s=>s.id==='occipital-bone').side,'midline');
 for(const s of m.structures.filter(s=>s.layer==='muscle')){assert.equal(s.side,'right');for(const p of s.sources)assert.ok(p.mappingRows.some(r=>r.split('\t')[1].includes('right')),s.id);}
 for(const id of ['longus-colli','spinal-cord','nerves','ligaments','intervertebral-discs','complete-skull'])assert.ok(m.asset.unavailable.includes(id),id);
 assert.ok(!m.structures.some(s=>s.id==='longus-colli'));
});
test('neck muscle cards are bilingual referenced and preserve conservative canonical exercise relationships',()=>{
 const m=modelForRegion('cervical_neck');assert.ok(m);
 for(const s of m.structures.filter(s=>s.layer==='muscle')){assert.ok(catalog.some(c=>(c.slug??c.muscle_id)===s.id),s.id);const c=learningCard(s.id);assert.ok(c,s.id);for(const f of ['origin','insertion','action','joints','training','location','innervation'])assert.ok(c[f]?.he&&c[f]?.en,s.id+':'+f);assert.ok(c.innervationReference,s.id);}
 assert.ok(exerciseMuscles('cervical-isometric-rotation').some(c=>c.slug==='sternocleidomastoid'&&c.role==='stabilizer'));
 assert.ok(exerciseMuscles('deep-neck-flexor-hold').some(c=>c.slug==='longus-capitis'&&c.role==='primary'));
 assert.equal(modelRegionForMuscle('levator-scapulae','cervical_neck',true),'cervical_neck');
 assert.ok(!learningCard('rectus-capitis-posterior-major').links.length);
});
