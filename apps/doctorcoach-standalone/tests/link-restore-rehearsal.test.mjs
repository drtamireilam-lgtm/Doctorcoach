import test from 'node:test';
import assert from 'node:assert/strict';
import {backup,DatabaseSync} from 'node:sqlite';
import {mkdtemp,mkdir,writeFile,copyFile,rm,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {platform,client} from './platform-db.mjs';
import {defaultPrescription} from '../lib/training.ts';
import {identityMapping,verifyIdentity} from '../lib/identity-mapping.ts';
import {snapshot,compareSnapshots} from '../standalone/scripts/snapshot.mjs';

function adapter(sql){return {
 prepare(query){const statement=values=>({bind(...next){return statement(next);},async first(){return sql.prepare(query).get(...values)??null;},async run(){return sql.prepare(query).run(...values);}});return statement([]);},
 async batch(statements){sql.exec('BEGIN');try{const values=[];for(const s of statements)values.push(await s.run());sql.exec('COMMIT');return values;}catch(e){sql.exec('ROLLBACK');throw e;}},
};}
test('actual SQLite backup and restore preserve application rows and private bytes through dual-proof linking',async t=>{
 const f=platform(t);await f.connect();
 await f.training.savePlan(client.userId,{...defaultPrescription('bench'),weight:37.5,sets:2});
 let session=await f.training.start(client.userId,{requestId:randomUUID(),before:0});
 for(let setIndex=0;setIndex<2;setIndex++)session=await f.training.patch(client.userId,{id:session.id,version:session.version,action:'set',exerciseId:'bench',setIndex,done:true,amount:8,weight:37.5,actualRpe:7});
 session=await f.training.patch(client.userId,{id:session.id,version:session.version,action:'finish',after:0});assert.equal(session.status,'completed');assert.equal(session.items[0].results[0].actualRpe,7);
 // Identity schema is additive; existing owner IDs are never rewritten.
 f.sql.exec(await readFile(new URL('../standalone/migrations/0001_identity.sql',import.meta.url),'utf8'));
 const dir=await mkdtemp(path.join(tmpdir(),'dc-link-restore-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const sourceFile=path.join(dir,'backup.sqlite'),restoredFile=path.join(dir,'restored.sqlite');
 const oldObjects=path.join(dir,'source-files'),newObjects=path.join(dir,'restored-files');await mkdir(oldObjects);await mkdir(newObjects);
 const bytes=Buffer.from('SYNTHETIC PRIVATE VIDEO\x00\xff');await writeFile(path.join(oldObjects,'synthetic-video'),bytes);await copyFile(path.join(oldObjects,'synthetic-video'),path.join(newObjects,'synthetic-video'));
 await backup(f.sql,sourceFile);
 const saved=new DatabaseSync(sourceFile,{readOnly:true});try{await backup(saved,restoredFile);}finally{saved.close();}
 const before=await snapshot(sourceFile,oldObjects);assert.equal(compareSnapshots(before,await snapshot(restoredFile,newObjects)),true);
 const restored=new DatabaseSync(restoredFile);t.after(()=>restored.close());
 const now=Date.now(),legacyIssuer='sites:synthetic-restore',externalIssuer='https://synthetic.example.test/auth/v1';
 const proof=async(issuer,subject)=>verifyIdentity('synthetic-proof',async()=>({issuer,subject,authenticatedAt:now,expiresAt:now+300000}),[issuer],now);
 const legacy=await proof(legacyIssuer,client.userId),external=await proof(externalIssuer,'new-synthetic-subject');
 const mapping=identityMapping(adapter(restored),{legacyIssuer,externalIssuers:[externalIssuer],now:()=>now});
 await mapping.registerLegacy(legacy);const {ticket}=await mapping.beginLink(legacy,external);
 await assert.rejects(mapping.completeLink(ticket,legacy,external,false),e=>e.status===400);
 assert.equal(compareSnapshots(before,await snapshot(restoredFile,newObjects)),true);
 assert.equal((await mapping.completeLink(ticket,legacy,external,true)).userId,client.userId);
 assert.equal((await mapping.resolve(external)).userId,client.userId);
 assert.equal(compareSnapshots(before,await snapshot(restoredFile,newObjects)),true);
 await assert.rejects(mapping.completeLink(ticket,legacy,external,true));
 // A changed clinical/training owner or changed file must fail verification.
 restored.prepare('UPDATE program_items SET owner_id=? WHERE owner_id=?').run('wrong-synthetic-owner',client.userId);
 const changed=await snapshot(restoredFile,newObjects);assert.throws(()=>compareSnapshots(before,changed));
 await writeFile(path.join(newObjects,'synthetic-video'),Buffer.from('CORRUPTED SYNTHETIC VIDEO'));
 const changedBytes=await snapshot(sourceFile,newObjects);assert.throws(()=>compareSnapshots(before,changedBytes));
});
