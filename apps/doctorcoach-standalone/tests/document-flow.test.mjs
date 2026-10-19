import test from 'node:test';
import assert from 'node:assert/strict';
import {platform,client,doctor,coach,stranger} from './platform-db.mjs';
import {privateDocumentStore} from '../lib/private-document-store.ts';
import {documentRetentionStore} from '../lib/document-retention.ts';
import {readDocumentBody} from '../lib/private-documents.ts';
import {commitVideoUpload} from '../lib/media-upload.ts';

const bytes=new TextEncoder().encode('%PDF-1.7\nDoctorCoach synthetic test document\n%%EOF');
async function fixture(t){
 const f=platform(t);await f.connect();
 const docs=privateDocumentStore(f.db,{clinicianEmails:doctor.email});
 const retention=documentRetentionStore(f.db);
 const objects=new Map();
 const bucket={async put(key,body){objects.set(key,body.slice());},async delete(key){objects.delete(key);}};
 const id=crypto.randomUUID();
 await docs.initialize(client,{id,clientId:client.userId,purpose:'medical',category:'visit',filename:'synthetic-document.pdf',mime:'application/pdf',bytes:bytes.length});
 const body=()=>new Request('https://example.test',{method:'PUT',body:bytes});
 const upload=async()=>commitVideoUpload(bucket,id,'application/pdf',await readDocumentBody(body(),bytes.length,'application/pdf'),key=>docs.ready(client,id,key));
 return {...f,docs,retention,objects,id,upload};
}

test('synthetic medical file retains exact bytes across upload, permission checks, archive and restore',async t=>{
 const f=await fixture(t);await f.upload();
 const row=await f.docs.readable(client,f.id);
 assert.deepEqual(f.objects.get(row.object_key),bytes);
 await f.docs.logDownload(doctor,row);
 for(const user of [coach,stranger])await assert.rejects(f.docs.readable(user,f.id),e=>e.status===403);
 f.sql.exec("UPDATE care_connections SET medical_access=0 WHERE staff_email='doctor@example.test'");
 await assert.rejects(f.docs.confirmReadable(doctor,row),e=>e.status===403);
 await f.retention.change(client,{id:f.id,action:'archive',version:0,confirmed:true});
 await assert.rejects(f.docs.readable(client,f.id),e=>e.status===404);
 await f.retention.change(client,{id:f.id,action:'restore',version:1,confirmed:true});
 const restored=await f.docs.readable(client,f.id);
 assert.equal(restored.object_key,row.object_key);
 assert.deepEqual(f.objects.get(restored.object_key),bytes);
 await f.retention.change(client,{id:f.id,action:'request_delete',version:2,confirmed:true});
 await assert.rejects(f.docs.readable(client,f.id),e=>e.status===404);
 assert.deepEqual(f.objects.get(row.object_key),bytes);
});

test('revocation during storage write removes the rejected object and leaves no readable file',async t=>{
 const f=await fixture(t);
 const bucket={async put(key,body){f.objects.set(key,body.slice());f.sql.exec("UPDATE user_consents SET accepted=0 WHERE consent_id='health'");},async delete(key){f.objects.delete(key);}};
 await assert.rejects(commitVideoUpload(bucket,f.id,'application/pdf',bytes,key=>f.docs.ready(client,f.id,key)),e=>e.status===403);
 assert.equal(f.objects.size,0);
 assert.equal((await f.docs.get(f.id)).status,'uploading');
 await assert.rejects(f.docs.readable(client,f.id),e=>e.status===404);
});

test('duplicate upload cleans only the retry object and preserves the original document',async t=>{
 const f=await fixture(t);await f.upload();
 const first=await f.docs.readable(client,f.id);await f.upload();
 assert.equal(f.objects.size,1);
 assert.equal((await f.docs.readable(client,f.id)).object_key,first.object_key);
 assert.deepEqual(f.objects.get(first.object_key),bytes);
});
