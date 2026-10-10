import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { servicesStore } from '../lib/services-store.ts';
import { bookingLink, defaultServices, parseService } from '../lib/services.ts';
import { isStaff } from '../lib/staff.ts';

const migrations = await Promise.all(['0000_friendly_jocasta','0001_many_abomination','0002_chemical_diamondback','0003_steady_pestilence','0004_awesome_ogun'].map(name => readFile(new URL(`../drizzle/${name}.sql`,import.meta.url),'utf8')));
const admin = { userId:'staff-id', email:'owner@example.test' };
const member = { userId:'member-id', email:'member@example.test' };
const configured = admin.email;
const sample = () => ({ ...defaultServices[0] });
function database(t) {
  const sql = new DatabaseSync(':memory:');
  for(const migration of migrations) sql.exec(migration);
  t.after(()=>sql.close());
  const adapter = {
    prepare(query) {
      const prepared = values => ({
        bind(...next) { return prepared(next); },
        async first() { return sql.prepare(query).get(...values) ?? null; },
        async all() { return { results:sql.prepare(query).all(...values) }; },
      });
      return prepared([]);
    },
  };
  return { sql, store:servicesStore(adapter,configured), withoutAdmins:servicesStore(adapter) };
}

test('staff access fails closed, uses an exact configured identity, and rejects forged role fields', async t => {
  const {store,withoutAdmins,sql} = database(t);
  assert.equal(isStaff(null,configured),false);
  assert.equal(isStaff(admin),false);
  assert.equal(isStaff({...admin,email:'OWNER@example.test'},` ${configured} `),true);
  assert.equal(isStaff({...admin,email:'owner@example.test.evil'},configured),false);
  assert.equal(isStaff({...admin,userId:''},configured),false);
  await assert.rejects(()=>store.listAdmin(null),error=>error.status===401);
  await assert.rejects(()=>store.listAdmin(member),error=>error.status===403);
  await assert.rejects(()=>store.save(member,{...sample(),role:'admin',isAdmin:true}),error=>error.status===403);
  await assert.rejects(()=>withoutAdmins.save(admin,sample()),error=>error.status===403);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM consultation_services').get().count,0);
});

test('public catalog retains proposed defaults without creating rows or exposing draft links', async t => {
  const {store,sql} = database(t);
  const services = await store.listPublic();
  assert.equal(services.length,3);assert.equal(services[0].priceAgorot,30000);
  assert.equal(services[0].priceConfirmed,true);assert.equal(services[0].status,'listed');
  assert.equal('version' in services[0],false);assert.equal('updatedBy' in services[0],false);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM consultation_services').get().count,0);
  await store.save(admin,{...sample(),bookingUrl:'https://calendly.com/example/consultation'});
  assert.equal((await store.listPublic())[0].bookingUrl,'');
});

test('publishing requires a valid event link and explicit price confirmation', async t => {
  const {store} = database(t);
  await assert.rejects(()=>store.save(admin,{...sample(),status:'bookable'}));
  await assert.rejects(()=>store.save(admin,{...sample(),status:'bookable',priceConfirmed:false,bookingUrl:'https://calendly.com/example/consultation'}));
  const saved = await store.save(admin,{...sample(),status:'bookable',priceConfirmed:true,bookingUrl:'https://calendly.com/example/consultation',priceAgorot:42050});
  const listed = (await store.listPublic())[0];
  assert.equal(saved.version,1);assert.equal(listed.priceAgorot,42050);assert.equal(listed.status,'bookable');
  assert.equal(listed.bookingUrl,'https://calendly.com/example/consultation');
});

test('unsafe hosts, schemes, credentials, queries and malformed service values are rejected',()=>{
  for(const url of ['javascript:alert(1)','http://calendly.com/a/b','https://calendly.com.evil.test/a/b','https://calendly.com@evil.test/a/b','https://user:pass@calendly.com/a/b','https://calendly.com/a/b?email=person@example.test','https://calendly.com/a/b#fragment','https://calendly.com/a','https://evil.test/a/b','https://calendly.com:444/a/b']) assert.throws(()=>bookingLink(url));
  for(const patch of [{priceAgorot:-1},{priceAgorot:1.2},{priceAgorot:Infinity},{durationMinutes:0},{durationMinutes:181},{title:'a'},{priceConfirmed:'true'},{status:'approved'},{provider:'intruder'},{version:-1},{description:'a'.repeat(1201)}]) assert.throws(()=>parseService({...sample(),...patch}));
  assert.throws(()=>parseService(null));
  assert.equal(bookingLink('  https://calendly.com/example/consultation  '),'https://calendly.com/example/consultation');
});

test('saving a draft hides the service durably and never changes personal workout records', async t => {
  const {store,sql} = database(t);
  sql.prepare('INSERT INTO program_items(owner_id,exercise_id,sets,reps) VALUES(?,?,?,?)').run('member-id','walk',1,10);
  sql.prepare('INSERT INTO workout_logs(owner_id,exercise_count,pain_before,pain_after) VALUES(?,?,?,?)').run('member-id',1,2,1);
  const saved=await store.save(admin,{...sample(),status:'draft'});
  assert.equal((await store.listPublic()).some(service=>service.id===saved.id),false);
  assert.equal((await store.listAdmin(admin)).find(service=>service.id===saved.id).status,'draft');
  assert.equal(sql.prepare('SELECT updated_by FROM consultation_services').get().updated_by,admin.userId);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM program_items').get().count,1);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM workout_logs').get().count,1);
});

test('simultaneous updates preserve the first save and return the current version on conflict', async t => {
  const {store,sql} = database(t);
  const first=await store.save(admin,sample());
  const updated=await store.save(admin,{...first,priceAgorot:50000});
  await assert.rejects(()=>store.save(admin,{...first,title:'עריכה ישנה'}),error=>error.status===409&&error.current.version===updated.version&&error.current.priceAgorot===50000);
  await assert.rejects(()=>store.save(admin,sample()),error=>error.status===409);
  assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM consultation_services').get().count,1);
  assert.equal((await store.listPublic())[0].title,first.title);
});

test('custom services for either provider persist and remain hidden until listed', async t => {
  const {store} = database(t);
  const created=await store.save(admin,{...sample(),id:'coaching-session',title:'מפגש אימון אישי',provider:'nadav',status:'draft'});
  assert.equal((await store.listAdmin(admin)).length,4);assert.equal((await store.listPublic()).length,3);
  await store.save(admin,{...created,status:'listed'});
  const visible=(await store.listPublic()).find(service=>service.id===created.id);
  assert.equal(visible.provider,'nadav');assert.equal(visible.title,'מפגש אימון אישי');assert.equal(visible.bookingUrl,'');
});
