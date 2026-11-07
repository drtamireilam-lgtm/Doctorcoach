import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {expectedSchema,expectedStructure,structuralMetadata,checkSchema,calendarRepairStatements} from '../standalone/scripts/lab-schema-preflight.mjs';

test('complete schema with empty migration ledger requires reconciliation, never replay',()=>{
 const snapshot={tables:expectedSchema(),structure:expectedStructure(),ledgerRows:0};
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


test('column names alone cannot certify schema compatibility',()=>{
 const result=checkSchema({tables:expectedSchema(),ledgerRows:0});
 assert.equal(result.schemaCompatible,false);
 assert.equal(result.columnNamesCompatible,true);
 assert.ok(result.warnings.includes('STRUCTURAL_METADATA_NOT_VERIFIED'));
});


test('matching columns cannot hide changed defaults, keys, indexes, checks or triggers',()=>{
 const baseline={tables:expectedSchema(),structure:expectedStructure(),ledgerRows:0};
 assert.equal(checkSchema(baseline).schemaCompatible,true);
 const table=Object.keys(baseline.structure.tables).find(t=>baseline.structure.tables[t].indexes.length&&baseline.structure.tables[t].foreignKeys.length);
 assert.ok(table,'real migration schema must exercise indexes and foreign keys');
 for(const mutate of [
  s=>{s.tables[table].columns[0].notnull=1-s.tables[table].columns[0].notnull;},
  s=>{s.tables[table].columns[0].dflt_value="'wrong'";},
  s=>{s.tables[table].columns[0].pk+=1;},
  s=>{s.tables[table].foreignKeys[0].on_delete='RESTRICT-CHANGED';},
  s=>{s.tables[table].indexes[0].unique=1-s.tables[table].indexes[0].unique;},
  s=>{s.objects.find(o=>o.type==='table').sql+=' /* changed CHECK or collation */';},
  s=>{s.objects=s.objects.filter(o=>o.type!=='trigger');},
  s=>{s.objects.push({type:'trigger',name:'unexpected_guard',tbl_name:table,sql:'synthetic'});},
 ]){
  const input=structuredClone(baseline);mutate(input.structure);
  const result=checkSchema(input);
  assert.equal(result.columnNamesCompatible,true);
  assert.equal(result.schemaCompatible,false);
  assert.ok(result.structuralDifferences.length);
 }
});


test('metadata capture includes a user trigger resembling the SQLite prefix',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec("CREATE TABLE target(id TEXT); CREATE TRIGGER sqliteX_guard BEFORE INSERT ON target BEGIN SELECT RAISE(ABORT,'unexpected guard'); END");
  assert.ok(structuralMetadata(db).objects.some(o=>o.name==='sqliteX_guard'));
 }finally{db.close();}
});
