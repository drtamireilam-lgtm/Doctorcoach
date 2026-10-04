const { test } = require('node:test');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { canAccessAthlete, HttpDoctorCoachApi } = require(join(process.env.DOCTORCOACH_TEST_BUILD, 'backend.js'));
const { resolveRuntimeMode, canUseDemoWorkspace } = require(join(process.env.DOCTORCOACH_TEST_BUILD, 'runtime-policy.js'));
const { validateProfile, validAccountConfig, AccountService } = require(join(process.env.DOCTORCOACH_TEST_BUILD, 'account.js'));

test('account inputs exclude privilege fields and reject invalid names or effort scales',()=>{
  assert.deepEqual(validateProfile({display_name:' Name ',effort_mode:'RIR',roles:['admin'],assignedPlanId:'fake'}),{display_name:'Name',effort_mode:'RIR'});
  assert.throws(()=>validateProfile({display_name:' ',effort_mode:'RPE'}));
  assert.throws(()=>validateProfile({display_name:'A',effort_mode:'bad'}));
  assert.equal(validAccountConfig('https://nlnyvrbejaqzdbekwlgi.supabase.co','sb_publishable_test'),true);
  for(const key of ['sb_secret_test','service_role','eyJhbGciOi']) assert.equal(validAccountConfig('https://nlnyvrbejaqzdbekwlgi.supabase.co',key),false);
  assert.equal(validAccountConfig('http://evil.invalid','sb_publishable_test'),false);
});

test('account service fails closed on expired or anonymous authentication',async()=>{
  for(const user of [null,{id:'a',is_anonymous:true}]) {
    const api=new AccountService({auth:{getUser:async()=>({data:{user},error:null})},from:()=>{throw Error('Database must not be called');}});
    await assert.rejects(api.load(),/נדרשת התחברות/);
    await assert.rejects(api.save({display_name:'A',effort_mode:'RPE'},null),/נדרשת התחברות/);
  }
});

test('account save uses the verified user and expected version; conflicts never claim success',async()=>{
  const calls=[];
  const request={eq:(k,v)=>{calls.push([k,v]);return request;},select:()=>request,maybeSingle:async()=>({data:null,error:null})};
  const api=new AccountService({auth:{getUser:async()=>({data:{user:{id:'verified',is_anonymous:false}},error:null})},from:()=>({update:values=>{calls.push(values);return request;}})});
  await assert.rejects(api.save({display_name:'A',effort_mode:'RIR',id:'other'},3),/הפרופיל השתנה/);
  assert.deepEqual(calls,[{display_name:'A',effort_mode:'RIR'},['id','verified'],['version',3]]);
});

test('unconfigured and invalid release modes never expose demo roles', () => {
  for (const value of [undefined, '', 'prodution', 'PRODUCTION']) {
    assert.equal(canUseDemoWorkspace(resolveRuntimeMode(value, false)), false);
  }
  assert.equal(canUseDemoWorkspace(resolveRuntimeMode('production', true)), false);
  assert.equal(canUseDemoWorkspace(resolveRuntimeMode('invalid', true)), false);
});

test('development default and explicit synthetic-data modes stay usable', () => {
  assert.equal(resolveRuntimeMode(undefined, true), 'local');
  for (const mode of ['local', 'pilot']) assert.equal(canUseDemoWorkspace(resolveRuntimeMode(mode, false)), true);
});

test('trainees can access their own resource, not another athlete or staff actions', () => {
  const user = { userId: 'u1', roles: ['trainee'], athleteId: 'a1' };
  assert.equal(canAccessAthlete(user, 'a1'), true);
  assert.equal(canAccessAthlete(user, 'a2'), false);
  assert.equal(canAccessAthlete(user, 'a1', 'medical'), false);
  assert.equal(canAccessAthlete({ ...user, userId: '' }, 'a1'), false);
});

test('staff and administrators do not receive universal athlete access', () => {
  for (const role of ['coach', 'medical', 'dietitian', 'admin']) {
    assert.equal(canAccessAthlete({ userId: 'u', roles: [role] }, 'a1'), false);
  }
});

test('assignments must be active, match the athlete and match a current staff role', () => {
  const grant = { athleteId: 'a1', role: 'coach', active: true };
  const user = { userId: 'u', roles: ['coach'], athleteAssignments: [grant] };
  assert.equal(canAccessAthlete(user, 'a1', 'coach'), true);
  assert.equal(canAccessAthlete(user, 'a2'), false);
  assert.equal(canAccessAthlete(user, 'a1', 'medical'), false);
  assert.equal(canAccessAthlete({ ...user, roles: ['admin'] }, 'a1'), false);
  assert.equal(canAccessAthlete({ ...user, athleteAssignments: [{ ...grant, active: false }] }, 'a1'), false);
});

test('multi-role users retain each explicitly assigned scope without leaking other scopes', () => {
  const user = { userId: 'u', roles: ['trainee', 'coach', 'medical'], athleteId: 'self', athleteAssignments: [
    { athleteId: 'a1', role: 'coach', active: true },
    { athleteId: 'a2', role: 'medical', active: true },
  ] };
  assert.equal(canAccessAthlete(user, 'self'), true);
  assert.equal(canAccessAthlete(user, 'a1', 'coach'), true);
  assert.equal(canAccessAthlete(user, 'a2', 'medical'), true);
  assert.equal(canAccessAthlete(user, 'a1', 'medical'), false);
});

test('missing authentication prevents reads and writes before any network request', async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('Unexpected network request'); };
  try {
    for (const token of [null, '', ' ']) {
      const api = new HttpDoctorCoachApi('https://example.invalid', async () => token);
      await assert.rejects(api.getProfile('a1'), /Authentication required/);
      await assert.rejects(api.saveProfile('a1', {}), /Authentication required/);
    }
    assert.equal(calls, 0);
  } finally { global.fetch = originalFetch; }
});
