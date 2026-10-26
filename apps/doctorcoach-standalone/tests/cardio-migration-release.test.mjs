import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const script = new URL('../standalone/scripts/cardio-migration-preflight.mjs', import.meta.url);
test('cardio release preflight exists as an offline migration contract', () => {
  assert.ok(existsSync(script), 'missing offline migration preflight');
});
test('manifest orders unique migrations and records renamed PR52 files with exact hashes', async () => {
  const {migrationManifest} = await import(script);
  const manifest = migrationManifest();
  assert.deepEqual(manifest.migrations.map(m => m.file), ['0053_embedded_warmup_sets.sql','0054_load_metadata.sql','0055_cardio.sql','0056_activity.sql','0057_cardio_weekly.sql']);
  assert.deepEqual(manifest.migrations.slice(2).map(m => m.previousFile), ['0053_cardio.sql','0054_activity.sql','0055_cardio_weekly.sql']);
  for (const m of manifest.migrations) assert.equal(m.sha256, createHash('sha256').update(readFileSync(new URL('../drizzle/' + m.file, import.meta.url))).digest('hex'));
  assert.equal(manifest.remoteVerified, false);
  assert.equal(manifest.target.databaseId, '0e7a9467-5758-4d6f-b52a-ee4385a2d37d');
  assert.deepEqual(manifest.migrations[2].expectedColumns, {program_items:['cardio_json']});
  assert.equal(manifest.migrations[3].expectedTables.length, 4);
});
test('populated full SQLite baseline preserves identity, old values, constraints and triggers through additive migrations', async () => {
  const {rehearseMigrations} = await import(script);
  const result = rehearseMigrations();
  assert.equal(result.status, 'PASS');
  assert.equal(result.remoteVerified, false);
  assert.equal(result.migrationsApplied, 5);
  assert.equal(result.identityTablesPreserved, 10);
  assert.ok(result.populatedTablesPreserved >= 13);
  assert.ok(result.originalTablesPreserved > 50);
  assert.equal(result.oldColumnRowsPreserved, true);
  assert.equal(result.schemaVerified, true);
  assert.equal(result.constraintsVerified, true);
});
test('preservation checker detects changes to existing identity rows and missing guards', async () => {
  const {DatabaseSync} = await import('node:sqlite');
  const {capturePreservation, verifyPreservation} = await import(script);
  const db = new DatabaseSync(':memory:');
  try {
    db.exec("CREATE TABLE dc_identity_details(id TEXT, email TEXT); INSERT INTO dc_identity_details VALUES('p','synthetic.invalid'); CREATE TRIGGER guard BEFORE DELETE ON dc_identity_details BEGIN SELECT RAISE(ABORT,'guard'); END");
    const before = capturePreservation(db);
    db.exec("UPDATE dc_identity_details SET email='changed.invalid'");
    assert.throws(() => verifyPreservation(db, before), /rows changed.*dc_identity_details/);
    db.exec("UPDATE dc_identity_details SET email='synthetic.invalid'; DROP TRIGGER guard");
    assert.throws(() => verifyPreservation(db, before), /schema object changed.*guard/);
  } finally { db.close(); }
});
