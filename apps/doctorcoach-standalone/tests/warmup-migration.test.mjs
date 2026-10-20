import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
test('warmup migration preserves existing program and session rows and deletion guards',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec("CREATE TABLE program_items(owner_id TEXT,exercise_id TEXT,sets INTEGER);CREATE TABLE training_sessions(id TEXT,items_json TEXT);CREATE TRIGGER preserve_program BEFORE DELETE ON program_items BEGIN SELECT RAISE(ABORT,'preserve');END;INSERT INTO program_items VALUES('synthetic','goblet',3);INSERT INTO training_sessions VALUES('synthetic-session','[]');");
  db.exec(fs.readFileSync(new URL('../drizzle/0053_embedded_warmup_sets.sql',import.meta.url),'utf8'));
  assert.deepEqual({...db.prepare('SELECT * FROM program_items').get()},{owner_id:'synthetic',exercise_id:'goblet',sets:3,warmup_sets_json:null,side:null});
  assert.equal(db.prepare('SELECT items_json FROM training_sessions').get().items_json,'[]');
  assert.throws(()=>db.exec('DELETE FROM program_items'),/preserve/);
  assert.throws(()=>db.exec("UPDATE program_items SET side='invalid'"),/CHECK/);
 }finally{db.close();}
});
