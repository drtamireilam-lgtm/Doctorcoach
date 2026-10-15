import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {snapshot,compareSnapshots} from '../standalone/scripts/snapshot.mjs';import {deploymentGate} from '../standalone/scripts/deployment-gate.mjs';
test('snapshot preserves exact 64-bit integers and distinguishes SQLite value types',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'dc-integer-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'numbers.sqlite'),db=new DatabaseSync(file);t.after(()=>db.close());
 db.exec('CREATE TABLE original(value);INSERT INTO original VALUES(9223372036854775807)');
 const large=await snapshot(file);db.exec('UPDATE original SET value=9223372036854775806');
 const different=await snapshot(file);assert.throws(()=>compareSnapshots(large,different));
 db.exec("UPDATE original SET value='9223372036854775807'");const text=await snapshot(file);assert.throws(()=>compareSnapshots(large,text));
 db.exec('UPDATE original SET value=1');const integer=await snapshot(file);db.exec('UPDATE original SET value=1.0');const real=await snapshot(file);assert.throws(()=>compareSnapshots(integer,real));
});
test('snapshot rejects a restored database containing broken foreign-key ownership',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'dc-broken-owner-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const file=path.join(dir,'broken.sqlite'),db=new DatabaseSync(file);
 db.exec('PRAGMA foreign_keys=OFF;CREATE TABLE owner(id PRIMARY KEY);CREATE TABLE records(owner_id REFERENCES owner(id));INSERT INTO records VALUES(7)');db.close();
 await assert.rejects(snapshot(file),/Database integrity verification failed/);
});
test('preservation compares every original table and binary object, with no medical content in the report',async t=>{const root=await mkdtemp(path.join(tmpdir(),'dc-preserve-'));t.after(()=>rm(root,{recursive:true,force:true}));const a=path.join(root,'a.sqlite'),b=path.join(root,'b.sqlite'),old=path.join(root,'old'),next=path.join(root,'next');await mkdir(old);await mkdir(next);for(const p of [a,b]){const db=new DatabaseSync(p);db.exec("CREATE TABLE clinical(id TEXT PRIMARY KEY,private_text TEXT);INSERT INTO clinical VALUES('original-owner','private-health-content')");db.close();}const data=Buffer.from([0,255,29,0]);await writeFile(path.join(old,'private'),data);await writeFile(path.join(next,'private'),data);const before=await snapshot(a,old),after=await snapshot(b,next);assert.equal(compareSnapshots(before,after),true);assert.ok(!JSON.stringify(after).includes('private-health-content'));assert.ok(!JSON.stringify(after).includes('original-owner'));const db=new DatabaseSync(b);db.exec("UPDATE clinical SET id='rewritten-owner'");db.close();const changed=await snapshot(b,next);assert.throws(()=>compareSnapshots(before,changed));await writeFile(path.join(next,'private'),Buffer.from([1,255]));const changedFiles=await snapshot(a,next);assert.throws(()=>compareSnapshots(before,changedFiles));});
test('deployment gate stays closed for local tests alone or stale/incomplete evidence',()=>{const result=deploymentGate({sourceCommit:'ce4cba9f3e5c703bf84b801e05491070a00fe947',candidateHash:'a'.repeat(64),verifiedAt:new Date().toISOString(),checks:{firstWorkoutRpeRir:true}});assert.equal(result.ready,false);assert.ok(result.missing.includes('providerEmailDelivery'));assert.ok(result.missing.includes('d1RestoreAndCompare'));assert.ok(result.missing.includes('legacyOwnershipLink'));});
