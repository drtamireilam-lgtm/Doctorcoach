// Offline only: this module has no Cloudflare client and never applies remote SQL.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const app=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,app),'utf8');
const quote=name=>'"'+name.replaceAll('"','""')+'"';

function withExpectedSchema(inspect){
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync(new URL('drizzle/',app)).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort())db.exec(read('drizzle/'+file));
  // Separate migration namespace; management depends on app 0059 + identity.
  for(const file of readdirSync(new URL('standalone/migrations/',app)).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort())db.exec(read('standalone/migrations/'+file));
  return inspect(db);
 }finally{db.close();}
}

// Schema metadata only: never SELECT application rows. Keep SQL intact (apart
// from CRLF) so CHECK expressions, collations, predicates and trigger bodies
// cannot disappear during normalization. Equivalent DDL may require review.
export function structuralMetadata(db){
 const objects=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name").all().map(row=>({...row,sql:row.sql?.replaceAll('\r\n','\n')??null}));
 const tables={};
 for(const {name} of objects.filter(o=>o.type==='table')){
  const columns=db.prepare(`PRAGMA table_xinfo(${quote(name)})`).all();
  const foreignKeys=db.prepare(`PRAGMA foreign_key_list(${quote(name)})`).all();
  const indexes=db.prepare(`PRAGMA index_list(${quote(name)})`).all().map(({seq,...index})=>({...index,columns:db.prepare(`PRAGMA index_xinfo(${quote(index.name)})`).all()})).sort((a,b)=>a.name.localeCompare(b.name));
  tables[name]={columns,foreignKeys,indexes};
 }
 return {objects,tables};
}
export function expectedSchema(){return withExpectedSchema(db=>Object.fromEntries(Object.entries(structuralMetadata(db).tables).map(([name,t])=>[name,t.columns.filter(c=>c.hidden===0).map(c=>c.name)])));}
export function expectedStructure(){return withExpectedSchema(structuralMetadata);}
function same(a,b){
 // Object property order is not evidence; array order is meaningful metadata.
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
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
 const warnings=['PROVIDER_READINESS_REQUIRES_SEPARATE_VERIFICATION'];
 const structuralDifferences=[];
 if(!snapshot.structure)warnings.push('STRUCTURAL_METADATA_NOT_VERIFIED');
 else {
  const expectedStructureMetadata=expectedStructure();
  for(const [table,metadata] of Object.entries(expectedStructureMetadata.tables))if(!same(metadata,snapshot.structure.tables?.[table]))structuralDifferences.push('table:'+table);
  for(const object of expectedStructureMetadata.objects){
   const actual=snapshot.structure.objects?.find(o=>o.type===object.type&&o.name===object.name);
   if(!same(object,actual))structuralDifferences.push(object.type+':'+object.name);
  }
  // Additional objects may impose new constraints or side effects; never ignore.
  for(const object of snapshot.structure.objects??[])if(!expectedStructureMetadata.objects.some(o=>o.type===object.type&&o.name===object.name))structuralDifferences.push('unexpected:'+object.type+':'+object.name);
 }
 const columnNamesCompatible=missingTables.length===0&&Object.keys(missingColumns).length===0;
 if(snapshot.ledgerRows===0)warnings.push('EMPTY_LEDGER_DOES_NOT_MEAN_EMPTY_DATABASE');
 if(snapshot.ledgerRows===null)warnings.push('MIGRATION_LEDGER_NOT_VERIFIED');
 return {schemaCompatible:columnNamesCompatible&&!!snapshot.structure&&structuralDifferences.length===0,columnNamesCompatible,structuralDifferences,requiredTables:Object.keys(expected).length,missingTables,missingColumns,genericMigrationReplayAllowed:false,warnings};
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
  const result=mode==='expected'?{tables:expectedSchema(),structure:expectedStructure(),ledgerRows:null}:checkSchema(JSON.parse(readFileSync(file,'utf8')));
  console.log(JSON.stringify(result,null,2));
  if(mode==='check'&&!result.schemaCompatible)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=2;}
}
