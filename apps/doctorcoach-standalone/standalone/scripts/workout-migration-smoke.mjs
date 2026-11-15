// Disposable workerd/D1 upgrade rehearsal. No CLI, credentials, remote DB or deployment calls.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(realpathSync(new URL('../../node_modules/@cloudflare/vite-plugin/package.json',import.meta.url)));
const {Miniflare}=require('miniflare');
const app=new URL('../../',import.meta.url),read=file=>readFileSync(new URL(file,app),'utf8');
const files=readdirSync(new URL('drizzle/',app)).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort();
const flatten=sql=>sql.replaceAll('--> statement-breakpoint','').split('\n').filter(line=>!line.trim().startsWith('--')).join(' ');
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const targetDate=JSON.parse(read('standalone/wrangler.isolated-staging.json')).compatibility_date;
// Installed workerd supports the existing runtime-smoke baseline, not the later LAB date.
const runtimeDate=process.env.DC_MIGRATION_RUNTIME_DATE??'2026-05-15';
const mf=new Miniflare({name:'synthetic-workout-migration',compatibilityDate:runtimeDate,compatibilityFlags:['nodejs_compat'],modules:true,script:'export default {fetch(){return new Response("Synthetic local migration fixture")}}',d1Databases:['DB']});
try{
 await mf.ready;const db=await mf.getD1Database('DB');
 for(const file of files.filter(f=>Number(f.slice(0,4))<=60))await db.exec(flatten(read('drizzle/'+file)));
 for(const file of readdirSync(new URL('standalone/migrations/',app)).filter(f=>/^\d{4}_/.test(f)).sort())await db.exec(flatten(read('standalone/migrations/'+file)));
 const json='[{"exerciseId":"goblet","sets":2,"reps":8,"unit":"reps","weight":32.5,"notes":"SYNTHETIC unchanged","targetRpe":7}]';
 await db.prepare('INSERT INTO program_items(owner_id,exercise_id,sets,reps,unit,weight,notes) VALUES(?,?,?,?,?,?,?)').bind('synthetic-owner','goblet',2,8,'reps',32.5,'SYNTHETIC unchanged').run();
 for(const status of ['active','completed'])await db.prepare('INSERT INTO training_sessions(id,owner_id,status,items_json,started_at,finished_at,pain_before,planned_sets,completed_sets,version) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('synthetic-'+status,'synthetic-owner',status,json,'2026-11-01T18:00:00Z',status==='completed'?'2026-11-01T18:30:00Z':null,0,2,status==='completed'?2:0,5).run();
 await db.prepare('INSERT INTO care_programs(id,client_id,author_name,author_email,title,items_json,created_at) VALUES(?,?,?,?,?,?,?)').bind('synthetic-program','synthetic-owner','Synthetic coach','coach@example.test','Synthetic program',json,'2026-11-01').run();
 await db.prepare('INSERT INTO coach_program_drafts VALUES(?,?,?,?,?)').bind('synthetic-coach','synthetic-owner',json,3,'2026-11-01').run();
 const tables=['program_items','training_sessions','care_programs','coach_program_drafts'];
 const snapshot=async()=>{const records=[];for(const name of tables){const columns=(await db.prepare('PRAGMA table_info('+quote(name)+')').all()).results.map(c=>c.name);const rows=(await db.prepare('SELECT '+columns.map(quote).join(',')+' FROM '+quote(name)).all()).results;records.push({name,columns,rows:rows.map(row=>JSON.stringify(row)).sort()});}return records;};
 const checks=[];
 for(const number of [61,62,63]){
  const before=await snapshot(),file=files.find(f=>Number(f.slice(0,4))===number),sql=read('drizzle/'+file);await db.exec(flatten(sql));
  for(const {name,columns,rows} of before)assert.deepEqual((await db.prepare('SELECT '+columns.map(quote).join(',')+' FROM '+quote(name)).all()).results.map(row=>JSON.stringify(row)).sort(),rows,name+' original values');
  checks.push({file,sha256Lf:createHash('sha256').update(sql.replaceAll('\r\n','\n')).digest('hex'),preservedTables:before.length});
  if(number===61){await db.prepare('INSERT INTO retrospective_workout_drafts VALUES(?,?,?,?)').bind('synthetic-owner','{"requestId":"synthetic-draft"}',7,'2026-11-01').run();tables.push('retrospective_workout_drafts');}
  if(number===62){await db.prepare('INSERT INTO retrospective_workout_revisions VALUES(?,?,?,?,?)').bind('synthetic-completed','synthetic-owner',4,'{"prior":"SYNTHETIC"}','2026-11-02').run();tables.push('retrospective_workout_revisions');}
 }
 assert.equal((await db.prepare('SELECT rest_seconds FROM program_items').first()).rest_seconds,null);
 assert.equal((await db.prepare('SELECT retrospective_json FROM training_sessions LIMIT 1').first()).retrospective_json,null);
 for(const value of [-1,1801,1.5,'bad'])await assert.rejects(()=>db.prepare('UPDATE program_items SET rest_seconds=?').bind(value).run(),/CHECK/);
 await db.prepare('UPDATE program_items SET rest_seconds=?').bind(90).run();
 await assert.rejects(()=>db.prepare('INSERT INTO retrospective_workout_revisions VALUES(?,?,?,?,?)').bind('missing','synthetic-owner',1,'{}','2026-11-01').run(),/FOREIGN KEY/);
 await db.prepare('INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) VALUES(?,?,?,?,?)').bind('synthetic-owner','synthetic-delete','deleting','synthetic-reviewer','2026-11-01').run();
 await assert.rejects(()=>db.prepare('INSERT INTO retrospective_workout_revisions VALUES(?,?,?,?,?)').bind('synthetic-completed','synthetic-owner',5,'{}','2026-11-03').run(),/deletion/);
 await assert.rejects(()=>db.prepare('UPDATE retrospective_workout_drafts SET version=8 WHERE owner_id=?').bind('synthetic-owner').run(),/deletion/);
 await db.prepare('DELETE FROM training_sessions WHERE id=?').bind('synthetic-completed').run();
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM retrospective_workout_revisions').first()).n,0);
 assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
 console.log(JSON.stringify({status:'PASS',runtime:'workerd local D1',requestedRuntimeCompatibilityDate:runtimeDate,targetCompatibilityDate:targetDate,matchesTargetConfigurationDate:runtimeDate===targetDate,labRuntimeVerified:false,offlineOnly:true,remoteVerified:false,upgrades:checks,existingRowsPreserved:true,nullableDefaults:true,restConstraints:true,journalForeignKeyAndCascade:true,deletionBarriers:true},null,2));
}finally{await mf.dispose();}
