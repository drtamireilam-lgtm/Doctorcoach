import test from 'node:test';
import assert from 'node:assert/strict';
import {exportCoverage} from '../standalone/scripts/export-coverage.mjs';
test('a bounded-looking inventory cannot certify coverage merely because truncated is false',()=>{
 const expected=Array.from({length:72},(_,i)=>'table_'+i),r=exportCoverage(expected,expected.slice(0,50),{truncated:false,omitted_tables:0});
 assert.equal(r.inventoryComplete,false);assert.equal(r.missing.length,22);assert.equal(r.backupVerified,false);
});
test('complete table names still do not establish a database/private-object backup',()=>{
 const r=exportCoverage(['plans','sessions'],['sessions','plans']);assert.equal(r.inventoryComplete,true);assert.equal(r.backupVerified,false);
});
test('omitted rows, values or schema and unexpected tables fail coverage checks',()=>{
 for(const model of [{truncated:true},{omitted_tables:1},{omitted_rows:1},{omitted_columns:1},{truncated_values:1}])assert.equal(exportCoverage(['plans'],['plans'],model).inventoryComplete,false);
 assert.equal(exportCoverage(['plans'],['plans','unknown']).inventoryComplete,false);
});
test('missing, duplicate or invalid inventories are rejected',()=>{
 for(const values of [[],['plans','plans'],[''],[7],null])assert.throws(()=>exportCoverage(['plans'],values));
});
