// Offline only: this module has no Cloudflare client and never applies remote SQL.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const app=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,app),'utf8');
const quote=name=>'"'+name.replaceAll('"','""')+'"';

export function expectedSchema(){
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync(new URL('drizzle/',app)).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort())db.exec(read('drizzle/'+file));
  // Separate migration namespace; management depends on app 0059 + identity.
  for(const file of readdirSync(new URL('standalone/migrations/',app)).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort())db.exec(read('standalone/migrations/'+file));
  return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name})=>[name,db.prepare(`PRAGMA table_info(${quote(name)})`).all().map(c=>c.name)]));
 }finally{db.close();}
}

function validate(snapshot){
 assert.ok(snapshot&&typeof snapshot==='object','Metadata snapshot required');
 assert.ok(snapshot.tables&&typeof snapshot.tables==='object'&&!Array.isArray(snapshot.tables),'tables must be an object');
 assert.ok(snapshot.ledgerRows===null||(Number.isSafeInteger(snapshot.ledgerRows)&&snapshot.ledgerRows>=0),'ledgerRows must be a nonnegative integer or null');
 for(const columns of Object.values(snapshot.tables))assert.ok(Array.isArray(columns)&&columns.every(c=>typeof c==='string'&&c.length>0)&&new Set(columns).size===columns.length,'columns must be unique names');
}

export function checkSchema(snapshot){
 validate(snapshot);
 const expected=expectedSchema(),missingTables=[],missingColumns={};
 for(const [table,columns] of Object.entries(expected)){
  if(!Object.hasOwn(snapshot.tables,table)){missingTables.push(table);continue;}
  const absent=columns.filter(c=>!snapshot.tables[table].includes(c));
  if(absent.length)missingColumns[table]=absent;
 }
 const warnings=['COLUMN_NAMES_ONLY_CONSTRAINTS_AND_PROVIDER_READINESS_REQUIRE_SEPARATE_VERIFICATION'];
 if(snapshot.ledgerRows===0)warnings.push('EMPTY_LEDGER_DOES_NOT_MEAN_EMPTY_DATABASE');
 if(snapshot.ledgerRows===null)warnings.push('MIGRATION_LEDGER_NOT_VERIFIED');
 return {schemaCompatible:missingTables.length===0&&Object.keys(missingColumns).length===0,requiredTables:Object.keys(expected).length,missingTables,missingColumns,genericMigrationReplayAllowed:false,warnings};
}

// Returns a review plan, never executes it. Reinspect immediately before approved
// application; a stale snapshot is not an idempotent execution mechanism.
export function calendarRepairStatements(snapshot){
 validate(snapshot);
 assert.ok(Object.hasOwn(snapshot.tables,'google_calendar_sync'),'Calendar base table missing; investigate baseline before additive repair');
 const columns=snapshot.tables.google_calendar_sync;
 assert.ok(['appointment_id','desired_version','operation','synced_version','event_id','last_error','updated_at'].every(c=>columns.includes(c)),'Calendar baseline columns missing; investigate baseline before additive repair');
 return read('drizzle/0060_calendar_delivery_receipts.sql').split('\n').filter(line=>line.startsWith('ALTER TABLE')).filter(line=>{
  const column=/ADD COLUMN (\w+)/.exec(line)?.[1];
  assert.ok(column,'Unrecognized Calendar migration statement');
  return !columns.includes(column);
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const [mode,file,...extra]=process.argv.slice(2);
  assert.ok(!extra.length&&((mode==='expected'&&!file)||(mode==='check'&&file)),'Usage: lab-schema-preflight.mjs expected | check metadata.json');
  const result=mode==='expected'?{tables:expectedSchema(),ledgerRows:null}:checkSchema(JSON.parse(readFileSync(file,'utf8')));
  console.log(JSON.stringify(result,null,2));
  if(mode==='check'&&!result.schemaCompatible)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=2;}
}
