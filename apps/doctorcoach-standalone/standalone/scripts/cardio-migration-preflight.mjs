// Offline only. This module never connects to D1, Supabase or a deployment API.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
const app = new URL('../../', import.meta.url);
const read = file => readFileSync(new URL(file, app), 'utf8');
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const digest = value => createHash('sha256').update(value).digest('hex');
const definitions = [
  {file:'0053_embedded_warmup_sets.sql', previousFile:null, expectedColumns:{program_items:['warmup_sets_json','side']}, expectedTables:[]},
  {file:'0054_load_metadata.sql', previousFile:null, expectedColumns:{program_items:['load_json']}, expectedTables:[]},
  {file:'0055_cardio.sql', previousFile:'0053_cardio.sql', expectedColumns:{program_items:['cardio_json']}, expectedTables:[]},
  {file:'0056_activity.sql', previousFile:'0054_activity.sql', expectedColumns:{
    activity_connections:['id','owner_id','platform','generation','status','timezone','enabled','version','revision','payload_json','last_sync_at','created_at','revoked_at'],
    activity_step_days:['owner_id','connection_id','generation','activity_date','timezone','payload_json','revision'],
    activity_step_goals:['owner_id','version','daily_target','weekly_target','author_id','author_role','effective_at'],
    activity_shares:['owner_id','coach_email','steps','cardio','heart_rate','version','updated_at']
  }, expectedTables:['activity_connections','activity_step_days','activity_step_goals','activity_shares']},
  {file:'0057_cardio_weekly.sql', previousFile:'0055_cardio_weekly.sql', expectedColumns:{activity_cardio_weekly_goals:['owner_id','week','cardio_sessions','cardio_minutes','version','author_id','author_role','effective_at']}, expectedTables:['activity_cardio_weekly_goals']}
];
export function migrationManifest() {
  const files = readdirSync(new URL('drizzle/', app)).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort();
  assert.equal(new Set(files.map(f => f.slice(0,4))).size, files.length, 'Duplicate migration sequence');
  return {
    formatVersion:1, offlineOnly:true, remoteVerified:false,
    target:{worker:'doctorcoach-isolated-staging',database:'doctorcoach-isolated-staging',databaseId:'0e7a9467-5758-4d6f-b52a-ee4385a2d37d',authProject:'jbfkzkzcznfacsjdawmf',activityStore:'Cloudflare D1'},
    baseline:'Source schema through 0052; actual remote schema and ledgers must be inspected before choosing pending files.',
    migrations:definitions.map(m => ({...m, sha256:digest(read('drizzle/'+m.file))})),
    blockers:['Remote schema/ledger unverified','Complete identity-inclusive backup and restore unverified','Remote migration/deploy requires explicit approval'],
  };
}
function rows(db, table, columns) {
  const stmt = db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(table)}`);
  stmt.setReadBigInts(true);
  return stmt.all().map(row => JSON.stringify(row, (_, value) => typeof value === 'bigint' ? {$integer:value.toString()} : value instanceof Uint8Array ? {$blob:Buffer.from(value).toString('base64')} : value)).sort();
}
export function capturePreservation(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name}) => {
    const columns = db.prepare(`PRAGMA table_info(${quote(name)})`).all();
    return {name, columns, rows:rows(db,name,columns.map(c=>c.name)), objects:db.prepare("SELECT type,name,sql FROM sqlite_master WHERE tbl_name=? AND type IN ('index','trigger') ORDER BY type,name").all(name)};
  });
}
export function verifyPreservation(db, before) {
  for (const original of before) {
    const columns = db.prepare(`PRAGMA table_info(${quote(original.name)})`).all();
    assert.deepEqual(columns.slice(0, original.columns.length), original.columns, 'Original columns changed: '+original.name);
    assert.deepEqual(rows(db,original.name,original.columns.map(c=>c.name)), original.rows, 'Original rows changed: '+original.name);
    for (const obj of original.objects) assert.deepEqual(db.prepare('SELECT type,name,sql FROM sqlite_master WHERE type=? AND name=?').get(obj.type,obj.name), obj, 'Original schema object changed: '+obj.name);
  }
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
}
function seed(db) {
  db.exec(`
    INSERT INTO program_items(owner_id,exercise_id,sets,reps,weight,notes,day_id,occurrence_id) VALUES('synthetic-owner','goblet',3,8,42,'preserve notes','1','synthetic-occurrence');
    INSERT INTO training_sessions(id,owner_id,items_json,started_at,pain_before,planned_sets) VALUES('synthetic-session','synthetic-owner','[{"exerciseId":"goblet","sets":[{"weight":42}]}]','2026-10-01T10:00:00Z',0,3);
    INSERT INTO appearance_preferences(user_id,mode,palette,version,updated_at,custom_json) VALUES('synthetic-owner','dark','teal',7,'2026-10-01T10:00:00Z','{"accent":"synthetic"}');
    INSERT INTO dc_identity_principals VALUES('synthetic-principal','active','synthetic-issuer','synthetic-subject',1);
    INSERT INTO dc_identity_aliases VALUES('synthetic-issuer','synthetic-alias','synthetic-principal',1);
    INSERT INTO dc_identity_challenges VALUES('synthetic-challenge','synthetic-ticket-hash','synthetic-principal','synthetic-source','synthetic-target','synthetic-target-subject',999,2,1);
    INSERT INTO dc_identity_link_receipts VALUES('synthetic-challenge','synthetic-principal','synthetic-operation',1);
    INSERT INTO dc_identity_details VALUES('synthetic-principal','synthetic@example.invalid','Synthetic',0);
    INSERT INTO dc_auth_sessions VALUES('synthetic-session-hash','synthetic-issuer','synthetic-subject','synthetic@example.invalid','synthetic-ciphertext',3,1,2,999,NULL,NULL);
    INSERT INTO dc_auth_challenges VALUES('synthetic-auth-hash','synthetic@example.invalid',999,1,NULL);
    INSERT INTO dc_auth_limits VALUES('synthetic-limit',1,2);
    INSERT INTO dc_reserved_emails VALUES('synthetic@example.invalid');
    INSERT INTO dc_legacy_link_receipts VALUES('synthetic-nonce','synthetic-subject','synthetic-principal',1);
  `);
}
export function rehearseMigrations() {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    const baseline = readdirSync(new URL('drizzle/', app)).filter(f => /^\d{4}_.*\.sql$/.test(f) && f < '0053').sort();
    for (const file of baseline) db.exec(read('drizzle/'+file));
    db.exec(read('standalone/migrations/0001_identity.sql'));
    seed(db);
    const before = capturePreservation(db);
    for (const migration of migrationManifest().migrations) {
      db.exec('BEGIN');
      try { db.exec(read('drizzle/'+migration.file)); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
      verifyPreservation(db,before);
      for (const [table,expected] of Object.entries(migration.expectedColumns)) {
        const columns = db.prepare(`PRAGMA table_info(${quote(table)})`).all().map(c=>c.name);
        for (const column of expected) assert.ok(columns.includes(column), `Missing ${table}.${column}`);
        if (migration.expectedTables.includes(table)) assert.deepEqual(columns, expected);
      }
    }
    assert.deepEqual({...db.prepare('SELECT warmup_sets_json,side,load_json,cardio_json FROM program_items').get()}, {warmup_sets_json:null,side:null,load_json:null,cardio_json:null});
    assert.throws(()=>db.exec("UPDATE program_items SET side='invalid'"), /CHECK/);
    db.exec("INSERT INTO account_deletions(user_id,request_id,state,reviewer_id,started_at) VALUES('synthetic-owner','synthetic-delete','deleting','synthetic-reviewer','2026-10-01T10:00:00Z')");
    assert.throws(()=>db.exec("UPDATE program_items SET notes='changed' WHERE owner_id='synthetic-owner'"), /deletion/i);
    db.exec("INSERT INTO activity_connections(id,owner_id,platform,generation,status,timezone,created_at) VALUES('c1','synthetic-owner','ios','g1','connected','UTC','2026-10-01')");
    assert.throws(()=>db.exec("INSERT INTO activity_connections(id,owner_id,platform,generation,status,timezone,created_at) VALUES('c2','synthetic-owner','android','g2','connected','UTC','2026-10-01')"), /UNIQUE/);
    assert.throws(()=>db.exec("INSERT INTO activity_cardio_weekly_goals(owner_id,week,cardio_sessions,author_id,author_role,effective_at) VALUES('synthetic-owner','2026-W40',22,'synthetic-owner','owner','2026-10-01')"), /CHECK/);
    return {status:'PASS',offlineOnly:true,remoteVerified:false,migrationsApplied:definitions.length,originalTablesPreserved:before.length,populatedTablesPreserved:before.filter(t=>t.rows.length).length,identityTablesPreserved:before.filter(t=>t.name.startsWith('dc_')).length,oldColumnRowsPreserved:true,schemaVerified:true,constraintsVerified:true};
  } finally { db.close(); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? 'rehearse';
  assert.ok(['manifest','rehearse'].includes(mode), 'Usage: cardio-migration-preflight.mjs [manifest|rehearse]');
  console.log(JSON.stringify(mode === 'manifest' ? migrationManifest() : rehearseMigrations(), null, 2));
}
