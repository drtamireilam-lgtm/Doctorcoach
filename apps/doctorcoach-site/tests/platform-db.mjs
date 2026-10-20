import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { careStore } from '../lib/care-store.ts';
import { mediaStore } from '../lib/media-store.ts';
import { appointmentsStore } from '../lib/appointments-store.ts';
import { servicesStore } from '../lib/services-store.ts';
import { trainingStore } from '../lib/training-store.ts';
import {CONSENT_REVISION} from '../lib/intake.ts';

const dir = new URL('../drizzle/', import.meta.url);
const migrations = await Promise.all((await readdir(dir)).filter(n => /^\d+.*\.sql$/.test(n)).sort().map(n => readFile(new URL(n, dir), 'utf8')));
export const doctor = { userId:'doctor', email:'doctor@example.test' };
export const coach = { userId:'coach', email:'coach@example.test' };
export const client = { userId:'client', email:'client@example.test' };
export const stranger = { userId:'stranger', email:'stranger@example.test' };
export const profile = () => ({name:'בדיקת מערכת',goal:'בדיקת תוכנית',experience:'מתחיל',equipment:'משקולות',days:3,medical:{painAreas:'מידע פרטי לבדיקה',injuryHistory:'מידע פרטי לבדיקה',medicalHistory:'מידע פרטי לבדיקה'},version:0});
export function platform(t) {
  const sql = new DatabaseSync(':memory:');
  for (const migration of migrations) sql.exec(migration);
  t.after(() => sql.close());
  // Existing feature tests use an active independent entitlement; access-policy tests override it explicitly.
  for(const userId of ['client','stranger'])sql.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) VALUES(?,'self',?,'2026-01-01')").run(userId,new Date(Date.now()+365*86400000).toISOString());
  const db = {
    prepare(query) {
      const statement = values => ({
        bind(...next) { return statement(next); },
        async first() { return sql.prepare(query).get(...values) ?? null; },
        async all() { return { results:sql.prepare(query).all(...values) }; },
        async run() { return sql.prepare(query).run(...values); },
      });
      return statement([]);
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try { const result=[]; for(const statement of statements) result.push(await statement.run()); sql.exec('COMMIT'); return result; }
      catch(error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
  const config = {adminEmails:doctor.email, clinicianEmails:doctor.email};
  const care = careStore(db, config);
  async function connect() {
    // Connected fixtures represent users who completed the required consent flow.
    for(const id of ['terms','privacy','health','team'])sql.prepare('INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES(?,?,?,?,1,?) ON CONFLICT DO NOTHING').run('fixture-'+id,client.userId,id,CONSENT_REVISION,'2026-01-01');
    sql.prepare("INSERT INTO user_consents(id,user_id,consent_id,revision,accepted,created_at) VALUES('fixture-media','client','media','2026-09-28.1',1,'2026-01-01') ON CONFLICT DO NOTHING").run();
    sql.prepare("INSERT INTO user_intakes(user_id,answers_json,completed,created_at,updated_at) VALUES(?,'{}',1,'2026-01-01','2026-01-01') ON CONFLICT DO NOTHING").run(client.userId);
    await care.saveStaff(doctor, {...coach,name:'מאמן לבדיקה',role:'coach',active:true});
    await care.saveProfile(client, profile());
    const invite = await care.createInvite(doctor,{emails:[doctor.email,coach.email]});
    return care.acceptInvite(client,{code:invite.code,consent:true});
  }
  return {sql, db, care, connect, media:mediaStore(db,config), appointments:appointmentsStore(db,doctor.email),services:servicesStore(db,doctor.email),training:trainingStore(db)};
}
