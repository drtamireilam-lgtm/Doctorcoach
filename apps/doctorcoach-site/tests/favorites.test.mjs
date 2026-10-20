import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { favoritesStore } from '../lib/favorites-store.ts';

const migrations = await Promise.all(['0000_friendly_jocasta','0001_many_abomination','0002_chemical_diamondback','0003_steady_pestilence'].map(name => readFile(new URL(`../drizzle/${name}.sql`,import.meta.url),'utf8')));
function database(t) {
  const sql = new DatabaseSync(':memory:');
  for (const migration of migrations) sql.exec(migration);
  t.after(()=>sql.close());
  const adapter = {
    prepare(query) {
      const prepared = values => ({
        bind(...next) { return prepared(next); },
        async run() { return sql.prepare(query).run(...values); },
        async all() { return { results:sql.prepare(query).all(...values) }; },
      });
      return prepared([]);
    },
  };
  return { sql, store:favoritesStore(adapter), reconnect:()=>favoritesStore(adapter) };
}

test('favorites persist across store reloads and are isolated by the authenticated owner', async t => {
  const {store,reconnect} = database(t);
  await store.set('alice',{exerciseId:'walk',favorite:true,ownerId:'bob'});
  await store.set('bob',{exerciseId:'goblet',favorite:true});
  assert.deepEqual(await reconnect().list('alice'),['walk']);
  assert.deepEqual(await reconnect().list('bob'),['goblet']);
  await store.set('bob',{exerciseId:'walk',favorite:false,ownerId:'alice'});
  assert.deepEqual(await store.list('alice'),['walk']);
  assert.deepEqual(await store.list('nobody'),[]);
});

test('repeated add and remove requests are idempotent and do not affect another account', async t => {
  const {store,sql} = database(t);
  for (let i=0;i<3;i++) await store.set('alice',{exerciseId:'walk',favorite:true});
  await store.set('bob',{exerciseId:'walk',favorite:true});
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM exercise_favorites').get().count,2);
  for (let i=0;i<3;i++) await store.set('alice',{exerciseId:'walk',favorite:false});
  assert.deepEqual(await store.list('alice'),[]);
  assert.deepEqual(await store.list('bob'),['walk']);
});

test('unknown exercises and malformed requests fail without writes', async t => {
  const {store,sql} = database(t);
  for (const payload of [null,[],{}, {exerciseId:'unknown',favorite:true},{exerciseId:'walk'}, {exerciseId:'walk',favorite:'false'},{exerciseId:'walk',favorite:1}]) {
    await assert.rejects(()=>store.set('alice',payload),error=>error.status===400);
  }
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM exercise_favorites').get().count,0);
});

test('the favorites migration and favorites edits preserve existing programs and logs', async t => {
  const sql = new DatabaseSync(':memory:'); t.after(()=>sql.close());
  for (const migration of migrations.slice(0,-1)) sql.exec(migration);
  sql.prepare('INSERT INTO program_items(owner_id,exercise_id,sets,reps) VALUES(?,?,?,?)').run('alice','walk',2,10);
  sql.prepare('INSERT INTO workout_logs(owner_id,exercise_count,pain_before,pain_after) VALUES(?,?,?,?)').run('alice',1,2,1);
  sql.exec(migrations.at(-1));
  assert.equal(sql.prepare('SELECT sets FROM program_items').get().sets,2);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM workout_logs').get().count,1);
  const {store,sql:other} = database(t);
  other.prepare('INSERT INTO program_items(owner_id,exercise_id,sets,reps) VALUES(?,?,?,?)').run('alice','walk',2,10);
  await store.set('alice',{exerciseId:'walk',favorite:true});
  await store.set('alice',{exerciseId:'walk',favorite:false});
  assert.equal(other.prepare('SELECT COUNT(*) AS count FROM program_items').get().count,1);
});
