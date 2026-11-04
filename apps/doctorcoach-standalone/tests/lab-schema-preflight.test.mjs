import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {expectedSchema,checkSchema,calendarRepairStatements} from '../standalone/scripts/lab-schema-preflight.mjs';

test('complete schema with empty migration ledger requires reconciliation, never replay',()=>{
 const snapshot={tables:expectedSchema(),ledgerRows:0};
 const result=checkSchema(snapshot);
 assert.equal(result.schemaCompatible,true);
 assert.equal(result.genericMigrationReplayAllowed,false);
 assert.ok(result.warnings.includes('EMPTY_LEDGER_DOES_NOT_MEAN_EMPTY_DATABASE'));
 assert.ok(Object.keys(snapshot.tables).length>=95);
 assert.deepEqual(result.missingTables,[]);
});
test('detects last_attempt_at and management structures absent from snapshot',()=>{
 const tables=expectedSchema();
 tables.google_calendar_sync=tables.google_calendar_sync.filter(c=>c!=='last_attempt_at');
 delete tables.dc_management_grants;
 const result=checkSchema({tables,ledgerRows:0});
 assert.equal(result.schemaCompatible,false);
 assert.deepEqual(result.missingColumns.google_calendar_sync,['last_attempt_at']);
 assert.ok(result.missingTables.includes('dc_management_grants'));
});
test('partial Calendar repair preserves existing data and is repeatable after reinspection',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec("CREATE TABLE google_calendar_sync(appointment_id TEXT PRIMARY KEY,desired_version INTEGER,operation TEXT,synced_version INTEGER,event_id TEXT,last_error TEXT,updated_at TEXT,last_attempt_at TEXT); INSERT INTO google_calendar_sync VALUES('synthetic',3,'upsert',2,'synthetic-event','','2026-01-01','2026-01-01')");
  const snapshot=()=>({tables:{google_calendar_sync:db.prepare('PRAGMA table_info(google_calendar_sync)').all().map(c=>c.name)},ledgerRows:0});
  const statements=calendarRepairStatements(snapshot());
  assert.equal(statements.length,3);
  for(const statement of statements)db.exec(statement);
  assert.deepEqual({...db.prepare('SELECT * FROM google_calendar_sync').get()},{appointment_id:'synthetic',desired_version:3,operation:'upsert',synced_version:2,event_id:'synthetic-event',last_error:'',updated_at:'2026-01-01',last_attempt_at:'2026-01-01',last_synced_at:null,last_error_code:'',time_zone:'Asia/Jerusalem'});
  assert.deepEqual(calendarRepairStatements(snapshot()),[]);
 }finally{db.close();}
});
test('missing Calendar base table blocks additive repair',()=>{
 assert.throws(()=>calendarRepairStatements({tables:{},ledgerRows:0}),/base table/);
 assert.throws(()=>calendarRepairStatements({tables:{google_calendar_sync:['appointment_id']},ledgerRows:0}),/baseline columns/);
});
test('malformed snapshots cannot claim compatibility',()=>{
 for(const snapshot of [null,{}, {tables:[]}, {tables:{x:'id'},ledgerRows:0}, {tables:{x:['id','id']},ledgerRows:0}, {tables:{},ledgerRows:-1}])assert.throws(()=>checkSchema(snapshot));
 assert.equal(checkSchema({tables:{},ledgerRows:null}).schemaCompatible,false);
});
test('CLI exits nonzero for missing columns and does not write the input',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dc-schema-'));
 try{
  const file=join(dir,'schema.json'),tables=expectedSchema();
  tables.google_calendar_sync=[];
  const input=JSON.stringify({tables,ledgerRows:0});
  writeFileSync(file,input);
  const result=spawnSync(process.execPath,['standalone/scripts/lab-schema-preflight.mjs','check',file],{encoding:'utf8'});
  assert.equal(result.status,1,result.stderr);
  assert.equal(JSON.parse(result.stdout).schemaCompatible,false);
  assert.equal(readFileSync(file,'utf8'),input);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
