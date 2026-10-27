import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {anatomyImages,anatomyImageFor} from '../lib/anatomy-images.ts';
test('calf plates map verified muscles and leave unmatched neighboring muscles without an illustration',()=>{
 for(const slug of ['tibialis-anterior','fibularis-tertius'])assert.equal(anatomyImageFor(slug).id,'gray437');
 for(const slug of ['soleus','plantaris'])assert.equal(anatomyImageFor(slug).id,'gray438');
 for(const slug of ['tibialis-posterior','flexor-digitorum-longus','flexor-hallucis-longus'])assert.equal(anatomyImageFor(slug).id,'gray439');
 for(const slug of ['gastrocnemius','fibularis-longus','fibularis-brevis'])assert.equal(anatomyImageFor(slug),null);
});
test('selected illustrations bind only existing muscle records with no duplicate slug association',()=>{
 const raw=JSON.parse(readFileSync(new URL('../lib/prepared/muscles.json',import.meta.url)));
 const extra=JSON.parse(readFileSync(new URL('../lib/prepared/additional-muscles.json',import.meta.url)));
 const slugs=new Set([...raw.map(m=>m.slug),...extra.map(m=>m.muscle_id)]);
 const used=new Set();
 for(const image of anatomyImages)for(const slug of image.slugs){assert.ok(slugs.has(slug),slug);assert.ok(!used.has(slug),slug);used.add(slug);assert.equal(anatomyImageFor(slug),image);}
 assert.equal(anatomyImageFor('missing-muscle'),null);
});
test('every selected illustration retains exact source, credit, license and intrinsic dimensions',()=>{
 for(const image of anatomyImages){
  assert.equal(new URL(image.url).hostname,'upload.wikimedia.org');
  assert.equal(new URL(image.source).hostname,'commons.wikimedia.org');
  assert.equal(new URL(image.licenseUrl).hostname,'creativecommons.org');
  assert.equal(image.license,'Public domain');assert.ok(image.credit&&image.alt&&image.title&&image.verifiedOn);
  assert.ok(image.width>0&&image.height>0);assert.ok(image.url.endsWith('.png'));
 }
 assert.equal(anatomyImageFor('deltoid').id,'gray410');
 assert.equal(anatomyImageFor('biceps-brachii').id,'gray411');
});
test('thigh plates cover matched records without assuming every quadriceps or hamstring is depicted',()=>{
 for(const slug of ['rectus-femoris','vastus-lateralis','vastus-medialis','sartorius'])assert.equal(anatomyImageFor(slug).id,'gray430');
 for(const slug of ['semimembranosus','biceps-femoris-short-head'])assert.equal(anatomyImageFor(slug).id,'gray434');
 for(const slug of ['vastus-intermedius','biceps-femoris-long-head','semitendinosus'])assert.equal(anatomyImageFor(slug),null);
 assert.equal(anatomyImageFor('rectus-femoris').height,1229);
 assert.equal(anatomyImageFor('semimembranosus').height,1000);
});
