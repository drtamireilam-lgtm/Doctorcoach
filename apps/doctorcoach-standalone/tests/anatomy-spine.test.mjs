import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {anatomyModels,modelForRegion,modelRegionForMuscle,validateAnatomyAsset} from '../lib/anatomy-models.ts';
import {learningCard} from '../lib/anatomy-learning.ts';
const catalog=['muscles','additional-muscles'].flatMap(n=>JSON.parse(readFileSync(new URL('../lib/prepared/'+n+'.json',import.meta.url))));
test('back model preserves 24 separately identified vertebrae and midline laterality',async()=>{
 assert.equal(anatomyModels[0].id,'body');assert.equal(anatomyModels[1].id,'shoulder');
 const m=modelForRegion('lower_back_spine');assert.ok(m,'spine model missing');assert.equal(modelForRegion('upper_back_scapula'),m);assert.equal(m.initialView,'back');
 assert.equal(m.structures.filter(s=>s.layer==='bone').length,40);assert.equal(m.structures.filter(s=>s.layer==='muscle').length,8);
 const b=readFileSync(new URL('../public'+m.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),m);
 for(const [prefix,n] of [['cervical',7],['thoracic',12],['lumbar',5]])for(let i=1;i<=n;i++){const s=m.structures.find(s=>s.id===`${prefix}-${i}`);assert.ok(s);assert.equal(s.side,'midline');}
 assert.equal(m.structures.find(s=>s.id==='sacrum').side,'midline');
 for(const s of m.structures.filter(s=>s.layer==='muscle')){assert.equal(s.side,'right');assert.ok(s.sources.every(p=>p.mappingRows.some(r=>r.split('\t')[1].includes('right'))));}
 for(const missing of ['intervertebral-discs','ligaments','nerves','latissimus-dorsi','multifidus','quadratus-lumborum','contralateral-paired-structures'])assert.ok(m.asset.unavailable.includes(missing),missing);
});
test('back muscle cards and existing exercise roles resolve without claiming group geometry',()=>{
 const m=modelForRegion('lower_back_spine');assert.ok(m);
 for(const s of m.structures.filter(s=>s.layer==='muscle')){assert.ok(catalog.some(c=>(c.slug??c.muscle_id)===s.id),s.id);const c=learningCard(s.id);assert.ok(c,s.id);for(const field of ['origin','insertion','action','location','training','joints','innervation'])assert.ok(c[field]?.he&&c[field]?.en,s.id+':'+field);assert.ok(c.innervationReference);}
 assert.ok(learningCard('longissimus-thoracis').links.some(l=>l.id==='deadlift'&&l.role==='stabilizer'));
 assert.equal(modelRegionForMuscle('rhomboid-major','upper_back_scapula',true),'upper_back_scapula');
 assert.equal(modelRegionForMuscle('trapezius','shoulder',true),'shoulder');
 assert.ok(!m.structures.some(s=>['erector-spinae','multifidus','latissimus-dorsi'].includes(s.id)));
});
