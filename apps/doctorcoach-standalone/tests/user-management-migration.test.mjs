import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('management migration preserves populated legacy tables and a baseline backup restores exactly',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'dc-management-restore-')),sql=new DatabaseSync(':memory:');t.after(async()=>{sql.close();await rm(directory,{recursive:true,force:true});});
 const drizzle=new URL('../drizzle/',import.meta.url),files=(await readdir(drizzle)).filter(x=>/^\d.*\.sql$/.test(x)&&Number(x.slice(0,4))<=58).sort();for(const file of files)sql.exec(await readFile(new URL(file,drizzle),'utf8'));
 sql.exec(await readFile(new URL('../standalone/migrations/0001_identity.sql',import.meta.url),'utf8'));
 for(const id of ['legacy-physician','legacy-trainee']){sql.prepare("INSERT INTO dc_identity_principals VALUES(?,'active','synthetic',?,0)").run(id,id);sql.prepare("INSERT INTO dc_identity_aliases VALUES('synthetic',?,?,0)").run(id,id);sql.prepare('INSERT INTO dc_identity_details VALUES(?,?,?,1)').run(id,id+'@example.test',id);}
 sql.prepare("INSERT INTO care_staff(email,name,role,active,updated_at) VALUES('legacy-physician@example.test','Synthetic Physician','clinician',1,'2026-01-01')").run();
 sql.prepare("INSERT INTO care_connections(id,client_id,staff_email,medical_access,nutrition_access,active,created_at,scope) VALUES('legacy-link','legacy-trainee','legacy-physician@example.test',1,0,1,'2026-01-01','care')").run();
 sql.prepare("INSERT INTO training_access(user_id,mode,self_until,updated_at) VALUES('legacy-trainee','self','2099-01-01','2026-01-01')").run();
 const tables=sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name),snapshot=Object.fromEntries(tables.map(name=>[name,sql.prepare('SELECT * FROM '+JSON.stringify(name)).all()]));
 const backup=join(directory,'baseline.sqlite');sql.exec("VACUUM INTO '"+backup+"'");const restored=new DatabaseSync(backup);for(const name of tables)assert.deepEqual(restored.prepare('SELECT * FROM '+JSON.stringify(name)).all(),snapshot[name]);assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');restored.close();
 sql.exec(await readFile(new URL('../drizzle/0059_management_assignment_provenance.sql',import.meta.url),'utf8'));sql.exec(await readFile(new URL('../standalone/migrations/0002_user_management.sql',import.meta.url),'utf8'));
 for(const name of tables){const rows=sql.prepare('SELECT * FROM '+JSON.stringify(name)).all().map(row=>{if(name==='care_connections'){const {management_derived,...old}=row;assert.equal(management_derived,0);return old;}return row;});assert.equal(JSON.stringify(rows),JSON.stringify(snapshot[name]),name+' legacy rows unchanged');}
 const managedBefore=sql.prepare('SELECT * FROM dc_managed_users ORDER BY user_id').all(),accessBefore=sql.prepare('SELECT * FROM training_access ORDER BY user_id').all();
 const beforeGuidance=join(directory,'before-guidance.sqlite');sql.exec("VACUUM INTO '"+beforeGuidance+"'");const copy=new DatabaseSync(beforeGuidance);assert.deepEqual(copy.prepare('SELECT * FROM dc_managed_users ORDER BY user_id').all(),managedBefore);copy.close();
 sql.exec(await readFile(new URL('../standalone/migrations/0003_trainee_guidance.sql',import.meta.url),'utf8'));
 const after=sql.prepare('SELECT * FROM dc_managed_users ORDER BY user_id').all().map(({guidance_mode,...old})=>{assert.equal(guidance_mode,null);return old;});assert.equal(JSON.stringify(after),JSON.stringify(managedBefore));assert.deepEqual(sql.prepare('SELECT * FROM training_access ORDER BY user_id').all(),accessBefore);
 assert.throws(()=>sql.exec("UPDATE dc_managed_users SET guidance_mode='coached' WHERE user_id='legacy-trainee'"),/Inconsistent trainee guidance/);
 assert.throws(()=>sql.exec("UPDATE dc_managed_users SET guidance_mode='independent' WHERE user_id='legacy-physician'"),/Inconsistent trainee guidance/);
 assert.equal(sql.prepare("SELECT approval FROM dc_managed_users WHERE user_id='legacy-trainee'").get().approval,'legacy');assert.equal(sql.prepare('SELECT COUNT(*) n FROM dc_management_grants').get().n,0);assert.equal(sql.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
});
