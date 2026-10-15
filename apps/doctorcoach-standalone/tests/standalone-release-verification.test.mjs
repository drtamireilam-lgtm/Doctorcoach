import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm, symlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {r2Snapshot, compareR2Snapshots} from '../standalone/scripts/r2-preservation.mjs';
import {candidateHash} from '../standalone/scripts/candidate-hash.mjs';
import {boundDeploymentGate, requiredChecks} from '../standalone/scripts/deployment-gate.mjs';

async function fixture(t) {
 const root=await mkdtemp(path.join(tmpdir(),'dc-release-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const objects=path.join(root,'objects');await mkdir(objects);
 const bytes=Buffer.from([0,255,42,1]);await writeFile(path.join(objects,'blob'),bytes);
 const item={key:'private/owner/medical.pdf',blobFile:'blob',size:bytes.length,
 sha256:createHash('sha256').update(bytes).digest('hex'),storageClass:'Standard',
 httpMetadata:{contentType:'application/pdf',cacheControl:'private, no-store'},
 customMetadata:{owner:'original-owner',purpose:'medical'}};
 const manifest=path.join(root,'manifest.json');
 async function save(changes={}) {await writeFile(manifest,JSON.stringify({version:1,complete:true,objectCount:1,objects:[{...item,...changes}]}));}
 await save();return {root,objects,manifest,item,save};
}
test('R2 inventory compares actual binary bytes and metadata independent of field order',async t=>{
 const f=await fixture(t),before=await r2Snapshot(f.manifest,f.objects);
 await f.save({httpMetadata:{cacheControl:'private, no-store',contentType:'application/pdf'},customMetadata:{purpose:'medical',owner:'original-owner'}});
 assert.equal(compareR2Snapshots(before,await r2Snapshot(f.manifest,f.objects)),true);
 assert.ok(!JSON.stringify(before).includes('medical.pdf'));
});
test('R2 rejects changed ownership, cache policy, type, storage class and object key',async t=>{
 const f=await fixture(t),before=await r2Snapshot(f.manifest,f.objects);
 for(const change of [{customMetadata:{owner:'other-owner'}},{httpMetadata:{contentType:'application/pdf',cacheControl:'public'}},{httpMetadata:{contentType:'text/html'}},{storageClass:'InfrequentAccess'},{key:'private/other/medical.pdf'}]){
  await f.save(change);
  const after=await r2Snapshot(f.manifest,f.objects);assert.throws(()=>compareR2Snapshots(before,after),/preservation/);
 }
});
test('R2 refuses tampered bytes even when source and target manifests claim the same digest',async t=>{
 const f=await fixture(t);await writeFile(path.join(f.objects,'blob'),Buffer.from([0,255,42,2]));
 await assert.rejects(r2Snapshot(f.manifest,f.objects),/preservation/);
});
test('R2 requires explicit complete inventory, metadata and unique keys',async t=>{
 const f=await fixture(t);
 for(const manifest of [
  {version:1,complete:false,objectCount:1,objects:[f.item]},
  {version:1,complete:true,objectCount:2,objects:[f.item]},
  {version:1,complete:true,objectCount:2,objects:[f.item,f.item]},
  {version:1,complete:true,objectCount:1,objects:[{...f.item,httpMetadata:null}]},
  {version:1,complete:true,objectCount:1,objects:[{...f.item,customMetadata:null}]},
 ]){await writeFile(f.manifest,JSON.stringify(manifest));await assert.rejects(r2Snapshot(f.manifest,f.objects),/preservation/);}
});
test('R2 export paths cannot read outside object root through traversal or symlinks',async t=>{
 const f=await fixture(t);await writeFile(path.join(f.root,'outside'),Buffer.from([0,255,42,1]));
 await f.save({blobFile:'../outside'});await assert.rejects(r2Snapshot(f.manifest,f.objects),/preservation/);
 await symlink(path.join(f.root,'outside'),path.join(f.objects,'escape'));
 await f.save({blobFile:'escape'});await assert.rejects(r2Snapshot(f.manifest,f.objects),/preservation/);
});
test('source fingerprint changes on code edits, ignores evidence and generated output',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'dc-hash-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(path.join(root,'standalone'));await mkdir(path.join(root,'dist'));
 await writeFile(path.join(root,'app.ts'),'original');const before=await candidateHash(root);
 await writeFile(path.join(root,'next-env.d.ts'),'generated types');await writeFile(path.join(root,'standalone/evidence.json'),'{}');await writeFile(path.join(root,'dist/output.js'),'generated');
 assert.equal(await candidateHash(root),before);await writeFile(path.join(root,'app.ts'),'changed');assert.notEqual(await candidateHash(root),before);
});
test('complete evidence still cannot pass for another candidate or future verification time',()=>{
 const actual='a'.repeat(64),e={sourceCommit:'ce4cba9f3e5c703bf84b801e05491070a00fe947',candidateHash:actual,verifiedAt:new Date(Date.now()-1000).toISOString(),checks:Object.fromEntries(requiredChecks.map(k=>[k,true]))};
 assert.equal(boundDeploymentGate(e,actual).ready,true);
 assert.ok(boundDeploymentGate(e,'b'.repeat(64)).missing.includes('candidateSourceMismatch'));
 assert.ok(boundDeploymentGate({...e,verifiedAt:new Date(Date.now()+60000).toISOString()},actual).missing.includes('futureEvidence'));
 assert.equal(boundDeploymentGate({...e,verifiedAt:new Date(Date.now()-90000000).toISOString()},actual).ready,false);
});
