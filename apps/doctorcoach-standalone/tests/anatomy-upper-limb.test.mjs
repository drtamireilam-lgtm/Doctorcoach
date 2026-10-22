import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {modelForRegion,validateAnatomyAsset} from '../lib/anatomy-models.ts';
import {learningCard,exerciseMuscles} from '../lib/anatomy-learning.ts';
import {anatomyImageFor} from '../lib/anatomy-images.ts';
test('upper limb has a distinct forearm and a real complete hand skeleton',async()=>{
 const arm=modelForRegion('elbow'),forearm=modelForRegion('forearm'),hand=modelForRegion('wrist_hand');
 assert.notEqual(forearm.id,arm.id);assert.equal(hand.id,'hand');
 assert.ok(arm.structures.some(s=>s.id==='coracobrachialis'));
 assert.equal(hand.structures.filter(s=>s.layer==='bone').length,27);
 for(const id of ['flexor-carpi-radialis','flexor-carpi-ulnaris','extensor-carpi-radialis-brevis','extensor-carpi-radialis-longus','extensor-carpi-ulnaris','pronator-teres','pronator-quadratus','supinator'])assert.ok(forearm.structures.some(s=>s.id===id),id);
 for(const id of ['adductor-pollicis','opponens-pollicis','abductor-pollicis-brevis','flexor-pollicis-brevis'])assert.ok(hand.structures.some(s=>s.id===id),id);
 for(const model of [arm,forearm,hand]){const b=readFileSync(new URL('../public'+model.src,import.meta.url));await validateAnatomyAsset(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),model);const used=new Set();for(const s of model.structures){for(const part of s.sources){assert.ok(part.mappingRows.some(r=>r.split('\t')[1].includes('right')),s.id+':'+part.elementId);assert.ok(!used.has(part.elementId),s.id+': duplicated source geometry');used.add(part.elementId);}}}
});
test('modeled new muscles have bilingual attachments, checked innervation and honest exercise relationships',()=>{
 for(const model of [modelForRegion('elbow'),modelForRegion('forearm'),modelForRegion('wrist_hand')])for(const s of model.structures.filter(s=>s.layer==='muscle')){
  const c=learningCard(s.id);assert.ok(c,s.id);for(const field of ['location','origin','insertion','action','joints','training','innervation'])assert.ok(c[field]?.he&&c[field]?.en,s.id+':'+field);
  assert.ok(['medicine.uams.edu','rad.uw.edu','pubmed.ncbi.nlm.nih.gov'].includes(new URL(c.innervationReference).hostname),s.id);
  for(const l of c.links)assert.ok(exerciseMuscles(l.id).some(v=>v.slug===s.id));
 }
 // Generic gripping is not a thumb-abduction exercise; do not manufacture a primary link.
 assert.ok(!learningCard('abductor-pollicis-brevis').links.some(l=>l.role==='primary'));
});
test('deltoid uses an uncolored original and biceps/coracobrachialis use the full labeled arm plate',()=>{
 assert.equal(anatomyImageFor('deltoid').id,'gray410');
 assert.equal(anatomyImageFor('biceps-brachii').id,'gray411');
 assert.equal(anatomyImageFor('coracobrachialis').id,'gray411');
 assert.ok(!anatomyImageFor('deltoid').url.includes('deltoideus'));
});

test('named selection rejects swapped node-to-mesh bindings even with an updated asset checksum',async()=>{
 const model=modelForRegion('wrist_hand'),b=readFileSync(new URL('../public'+model.src,import.meta.url)),altered=Buffer.from(b),length=altered.readUInt32LE(12);
 const doc=JSON.parse(altered.subarray(20,20+length).toString());[doc.nodes[0].mesh,doc.nodes[1].mesh]=[doc.nodes[1].mesh,doc.nodes[0].mesh];
 const text=JSON.stringify(doc);assert.ok(Buffer.byteLength(text)<=length);altered.fill(32,20,20+length);altered.write(text,20);
 const spec={...model,asset:{...model.asset,glbSha256:createHash('sha256').update(altered).digest('hex')}};
 await assert.rejects(()=>validateAnatomyAsset(altered.buffer.slice(altered.byteOffset,altered.byteOffset+altered.byteLength),spec),/binding/i);
});
