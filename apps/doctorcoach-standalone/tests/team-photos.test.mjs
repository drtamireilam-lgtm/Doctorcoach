import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {teamProfiles,visibleTeamProfiles} from '../lib/team-profiles.ts';
import {teamPhotoStore,readTeamPhotoBody,MAX_TEAM_PHOTO_BYTES} from '../lib/team-photo-store.ts';
import {platform,doctor,coach,client} from './platform-db.mjs';
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
function fixture(t){const f=platform(t),objects=new Map();const bucket={async put(key,bytes){objects.set(key,bytes.slice());},async delete(key){objects.delete(key);}};return {...f,objects,bucket,photos:teamPhotoStore(f.db,doctor.email)};}
test('Lior is restored alongside Tamir and Nadav with his retained professional profile',()=>{
 assert.deepEqual(visibleTeamProfiles.map(p=>p.id),['tamir','nadav','lior']);
 const lior=teamProfiles.find(p=>p.id==='lior');assert.equal(lior.visible,true);assert.equal(lior.instagram,'liorzelikson');assert.ok(lior.bio&&lior.nameEn);
});
test('portraits are independent, bounded to known public members, and publication is administrator-only',async t=>{
 const f=fixture(t);await f.connect();
 for(const user of [null,coach,client])await assert.rejects(()=>f.photos.upload(user,f.bucket,'tamir',0,'image/png',png,true),e=>[401,403].includes(e.status));
 await assert.rejects(()=>f.photos.upload(doctor,f.bucket,'unknown',0,'image/png',png,true),e=>e.status===404);
 await assert.rejects(()=>f.photos.upload(doctor,f.bucket,'tamir',0,'image/png',png,false));assert.equal(f.objects.size,0);
 const tamir=await f.photos.upload(doctor,f.bucket,'tamir',0,'image/png',png,true);const nadav=await f.photos.upload(doctor,f.bucket,'nadav',0,'image/png',png,true);
 assert.equal(tamir.version,1);assert.equal(nadav.version,1);assert.equal((await f.photos.list()).filter(p=>p.url).length,2);
 assert.notEqual((await f.photos.readable('tamir')).object_key,(await f.photos.readable('nadav')).object_key);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM private_documents').get().n,0);
});
test('failed replacement retains old picture; stale versions and concurrent uploads cannot overwrite another success',async t=>{
 const f=fixture(t);await f.photos.upload(doctor,f.bucket,'tamir',0,'image/png',png,true);const old=await f.photos.readable('tamir');
 const broken={async put(key,bytes){f.objects.set(key,bytes);throw Error('storage failure');},delete:f.bucket.delete};
 await assert.rejects(()=>f.photos.upload(doctor,broken,'tamir',1,'image/png',png,true));assert.equal((await f.photos.readable('tamir')).object_key,old.object_key);assert.ok(f.objects.has(old.object_key));
 const result=await Promise.allSettled([f.photos.upload(doctor,f.bucket,'tamir',1,'image/png',png,true),f.photos.upload(doctor,f.bucket,'tamir',1,'image/png',png,true)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.photos.readable('tamir')).version,2);assert.equal(f.objects.size,2);
 await assert.rejects(()=>f.photos.upload(doctor,f.bucket,'tamir',1,'image/png',png,true),e=>e.status===409);
});
test('portrait read cannot serve an arbitrary private storage key',async t=>{
 const f=fixture(t);await f.photos.upload(doctor,f.bucket,'nadav',0,'image/png',png,true);
 f.sql.prepare("UPDATE team_photos SET object_key='private-documents/secret' WHERE member_id='nadav'").run();
 await assert.rejects(()=>f.photos.readable('nadav'),e=>e.status===404);await assert.rejects(()=>f.photos.readable('../tamir'),e=>e.status===404);
});
test('image stream checks MIME, exact size, signature and five-MiB bound before retaining any content',async()=>{
 const req=(body=png,mime='image/png',size=String(body.length))=>new Request('https://doctorcoach.test',{method:'PUT',headers:{'Content-Type':mime,'X-File-Size':size},body});
 assert.deepEqual((await readTeamPhotoBody(req())).bytes,png);
 await assert.rejects(readTeamPhotoBody(req(png,'image/svg+xml')));await assert.rejects(readTeamPhotoBody(req(new TextEncoder().encode('%PDF-1.7'),'image/png')));
 for(const size of ['0','7','NaN',String(MAX_TEAM_PHOTO_BYTES+1)])await assert.rejects(readTeamPhotoBody(req(png,'image/png',size)));
 await assert.rejects(readTeamPhotoBody(req(png,'image/png','8')));
});
test('public portrait upload UI still requires confirmation and strips original metadata',async()=>{

 const admin=await readFile(new URL('../components/team-photo-admin.tsx',import.meta.url),'utf8');assert.ok(admin.includes('canvas.toBlob'));assert.ok(admin.includes('!confirmed'));assert.ok(admin.includes("'X-Confirm-Public':'true'"));
});
