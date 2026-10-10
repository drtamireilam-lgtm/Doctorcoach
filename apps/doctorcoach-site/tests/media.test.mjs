import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client,stranger} from './platform-db.mjs';
import {MAX_VIDEO_BYTES,readVideoBody,videoRange} from '../lib/media-store.ts';
const payload=(kind='review')=>({id:randomUUID(),kind,exerciseId:'goblet',caption:'סרטון בדיקה',mime:'video/mp4',bytes:64});

test('private videos are visible only to their owner and currently assigned staff, including feedback',async t=>{
  const {media,care,connect}=platform(t);const own=await connect();const p=payload();
  await media.initialize(client,p);await media.ready(client,p.id);
  await assert.rejects(()=>media.readable(null,p.id),e=>e.status===401);
  await assert.rejects(()=>media.readable(stranger,p.id),e=>e.status===403);
  assert.equal((await media.readable(client,p.id)).id,p.id);
  assert.equal((await media.readable(coach,p.id)).id,p.id);
  assert.equal((await care.clients(coach))[0].pendingVideos,1);
  await assert.rejects(()=>media.feedback(client,{id:randomUUID(),assetId:p.id,content:'משוב בדיקה'}),e=>e.status===403);
  await media.feedback(coach,{id:randomUUID(),assetId:p.id,content:'משוב בדיקה'});
  const listed=await media.list(client,'review');assert.equal(listed[0].feedback[0].content,'משוב בדיקה');assert.equal('object_key' in listed[0],false);
  assert.equal((await care.clients(coach))[0].pendingVideos,0);
  await care.revoke(client,{id:own.connections.find(c=>c.role==='coach').id});
  await assert.rejects(()=>media.readable(coach,p.id),e=>e.status===403);
  await assert.rejects(()=>media.list(coach,'review',client.userId),e=>e.status===403);
  await assert.rejects(()=>media.feedback(coach,{id:randomUUID(),assetId:p.id,content:'משוב נוסף'}),e=>e.status===403);
  await assert.rejects(()=>media.remove(doctor,p.id),e=>e.status===403);
  await media.remove(client,p.id);await assert.rejects(()=>media.readable(client,p.id),e=>e.status===404);
});

test('demonstrations remain private drafts until a staff member explicitly confirms publication rights',async t=>{
  const {media}=platform(t);const p=payload('demo');
  await assert.rejects(()=>media.initialize(client,p),e=>e.status===403);
  await media.initialize(doctor,p);await media.ready(doctor,p.id);
  assert.equal((await media.list(null,'demo')).length,0);
  await assert.rejects(()=>media.readable(client,p.id),e=>e.status===403);
  await assert.rejects(()=>media.publish(doctor,{id:p.id,published:true}));
  await media.publish(doctor,{id:p.id,published:true,rightsConfirmed:true});
  assert.equal((await media.list(null,'demo')).length,1);assert.equal((await media.readable(null,p.id)).id,p.id);
  await media.publish(doctor,{id:p.id,published:false});
  assert.equal((await media.list(null,'demo')).length,0);
});

test('uploads reject unsupported exercise, oversized content, other owners and invalid binary signatures',async t=>{
  const {media,connect}=platform(t);await connect();const p=payload();
  await assert.rejects(()=>media.initialize(client,{...p,bytes:MAX_VIDEO_BYTES+1}));
  await assert.rejects(()=>media.initialize(client,{...p,mime:'text/html'}));
  await assert.rejects(()=>media.initialize(client,{...p,exerciseId:'unlisted'}));
  await media.initialize(client,p);
  await assert.rejects(()=>media.writable(stranger,p.id),e=>e.status===403);
  const binary=new Uint8Array(64);binary.set(new TextEncoder().encode('ftyp'),4);
  const request=bytes=>new Request('https://example.test',{method:'PUT',body:bytes});
  assert.equal((await readVideoBody(request(binary),64,'video/mp4')).length,64);
  await assert.rejects(()=>readVideoBody(request(binary),32,'video/mp4'),e=>e.status===413);
  await assert.rejects(()=>readVideoBody(request(binary),65,'video/mp4'));
  await assert.rejects(()=>readVideoBody(request(new TextEncoder().encode('<script>bad()</script>')),22,'video/mp4'));
});

test('range requests support seeking and suffixes while rejecting out of bounds and multi-range reads',()=>{
  assert.equal(videoRange(null,100),undefined);
  assert.deepEqual(videoRange('bytes=0-9',100),{offset:0,length:10});
  assert.deepEqual(videoRange('bytes=90-',100),{offset:90,length:10});
  assert.deepEqual(videoRange('bytes=-10',100),{offset:90,length:10});
  assert.deepEqual(videoRange('bytes=90-999',100),{offset:90,length:10});
  for(const h of ['bytes=100-','bytes=5-3','bytes=0-1,4-5','bytes=-0','bytes=-','anything'])assert.throws(()=>videoRange(h,100),e=>e.status===416);
});
