import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {platform,doctor,coach,client} from './platform-db.mjs';
import {commitVideoUpload} from '../lib/media-upload.ts';
async function fixture(t){const f=platform(t);await f.connect();const id=randomUUID();await f.media.initialize(doctor,{id,kind:'demo',exerciseId:'rdl',caption:'RDL video',mime:'video/mp4',bytes:64});await f.media.ready(doctor,id,'original');await f.media.publish(doctor,{id,published:true,rightsConfirmed:true});return {...f,id};}
test('trainees and non-admin staff cannot upload publish replace or delete demonstrations',async t=>{
 const f=await fixture(t);for(const user of [client,coach]){
  await assert.rejects(()=>f.media.initialize(user,{id:randomUUID(),kind:'demo',exerciseId:'rdl',caption:'Demo',mime:'video/mp4',bytes:64}),e=>e.status===403);
  await assert.rejects(()=>f.media.publish(user,{id:f.id,published:false}),e=>e.status===403);
  await assert.rejects(()=>f.media.replacementTarget(user,f.id),e=>e.status===403);
  await assert.rejects(()=>f.media.remove(user,f.id),e=>e.status===403);
 }
 assert.equal((await f.media.readable(client,f.id)).object_key,'original');
});
test('atomic replacement preserves exercise and publication and rejects stale replacement snapshots',async t=>{
 const f=await fixture(t),before=await f.media.replacementTarget(doctor,f.id);
 await f.media.replace(doctor,before,'replacement','video/webm',100);
 const after=await f.media.readable(null,f.id);assert.equal(after.exercise_id,'rdl');assert.equal(after.published,1);assert.equal(after.object_key,'replacement');assert.equal(after.mime,'video/webm');
 await assert.rejects(()=>f.media.replace(doctor,before,'stale','video/mp4',64),e=>e.status===409);assert.equal((await f.media.get(f.id)).object_key,'replacement');
});
test('failed replacement cleans new object and keeps published original',async t=>{
 const f=await fixture(t),before=await f.media.replacementTarget(doctor,f.id);const objects=new Map([['original',new Uint8Array(64)]]);const bucket={async put(k,b){objects.set(k,b);f.sql.prepare('UPDATE media_assets SET published=0 WHERE id=?').run(f.id);},async delete(k){objects.delete(k);}};
 await assert.rejects(()=>commitVideoUpload(bucket,f.id,'video/mp4',new Uint8Array(64),key=>f.media.replace(doctor,before,key,'video/mp4',64)),e=>e.status===409);
 assert.deepEqual([...objects.keys()],['original']);assert.equal((await f.media.get(f.id)).object_key,'original');
});
