import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('profile schema enforces ownership and concurrency in a local PostgreSQL engine', async t => {
  const db = new PGlite();
  const a = '11111111-1111-4111-8111-111111111111';
  const b = '22222222-2222-4222-8222-222222222222';
  try {
    // Minimal local stand-in for Supabase's auth schema; never uses live users.
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users values ('${a}'),('${b}');
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid(), auth.jwt() to anon,authenticated;`);
    await db.exec(readFileSync('supabase/schema/profiles.sql','utf8'));
    async function login(id, claims = { is_anonymous: false }) {
      await db.exec('reset role; set role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)", [id, JSON.stringify(claims)]);
    }
    await t.test('owner can create, read and update; server increments the version', async()=>{
      await login(a);
      await db.query('insert into public.doctorcoach_profiles(id,display_name) values ($1,$2)',[a,'Synthetic A']);
      const updated = await db.query("update public.doctorcoach_profiles set effort_mode='RIR' where id=$1 and version=1 returning version",[a]);
      assert.equal(updated.rows[0].version,2);
      const stale = await db.query("update public.doctorcoach_profiles set display_name='stale' where id=$1 and version=1 returning id",[a]);
      assert.equal(stale.rows.length,0);
    });
    await t.test('another user cannot read, overwrite or impersonate an owner',async()=>{
      await login(b);
      assert.equal((await db.query('select * from public.doctorcoach_profiles')).rows.length,0);
      assert.equal((await db.query("update public.doctorcoach_profiles set display_name='attack' where id=$1 returning id",[a])).rows.length,0);
      await assert.rejects(db.query('insert into public.doctorcoach_profiles(id,display_name) values ($1,$2)',[a,'attack']),/row-level security/);
      await db.query('insert into public.doctorcoach_profiles(id,display_name) values ($1,$2)',[b,'Synthetic B']);
    });
    await t.test('ownership, version and deletion are not writable by the user',async()=>{
      await login(a);
      await assert.rejects(db.query('update public.doctorcoach_profiles set id=$1 where id=$2',[b,a]),/permission denied/);
      await assert.rejects(db.exec('update public.doctorcoach_profiles set version=100'),/permission denied/);
      await assert.rejects(db.exec('delete from public.doctorcoach_profiles'),/permission denied/);
      await assert.rejects(db.exec("update public.doctorcoach_profiles set effort_mode='invalid'"),/check constraint/);
    });
    await t.test('forged user metadata does not give team or administrator access',async()=>{
      await login(b,{is_anonymous:false,user_metadata:{role:'admin',roles:['medical']}});
      const result=await db.query('select id from public.doctorcoach_profiles order by id');
      assert.deepEqual(result.rows.map(r=>r.id),[b]);
    });
    await t.test('anonymous sessions and missing auth claims are denied',async()=>{
      await login(a,{is_anonymous:true});
      assert.equal((await db.query('select * from public.doctorcoach_profiles')).rows.length,0);
      await assert.rejects(db.query('insert into public.doctorcoach_profiles(id,display_name) values ($1,$2)',[a,'anonymous']),/row-level security/);
      await login(a,{});
      assert.equal((await db.query('select * from public.doctorcoach_profiles')).rows.length,0);
      await db.exec('reset role; set role anon');
      await assert.rejects(db.exec('select * from public.doctorcoach_profiles'),/permission denied/);
    });
  } finally { await db.close(); }
});
