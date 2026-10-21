import test from 'node:test';
import assert from 'node:assert/strict';
import * as importer from '../lib/program-import.ts';
const sheet=(name,rows)=>({name,rows:rows.map(r=>r.map(v=>({value:String(v),formula:false})))});
test('selected sheets combine in workbook order with distinct days and occurrence identities',()=>{
 const sheets=[sheet('Upper',[['Exercise','Sets','Reps'],['Hip Thrust',3,8],['Hip Thrust',2,10]]),sheet('Reference',[['Image only']]),sheet('Lower',[['Exercise','Sets','Reps'],['Hip Thrust',4,6]])];
 assert.equal(typeof importer.extractWorkbookImport,'function');
 const rows=importer.extractWorkbookImport(sheets,[2,0]);
 assert.deepEqual(rows.map(r=>r.dayId),['1','1','2']);
 assert.deepEqual(rows.map(r=>r.sourceSheet),['Upper','Upper','Lower']);
 assert.deepEqual(rows.map(r=>r.row),[2,3,2]);
 const items=importer.finalizeImport(rows);
 assert.equal(new Set(items.map(i=>i.occurrenceId)).size,3);
 assert.deepEqual(items.map(i=>i.sets),[3,2,4]);
});
test('unreadable selected sheets fail explicitly rather than silently disappearing',()=>{
 assert.equal(typeof importer.extractWorkbookImport,'function');
 assert.throws(()=>importer.extractWorkbookImport([sheet('Reference',[['Image only']])],[0]),/Reference/);
});
test('uniform effort override applies across selected worksheets and clears source RIR',()=>{
 const sheets=[sheet('A',[['Exercise','Sets','Reps','RIR'],['Hip Thrust',3,8,2]]),sheet('B',[['Exercise','Sets','Reps','RPE'],['Hip Thrust',2,6,7]])];
 const rows=importer.extractWorkbookImport(sheets,[0,1],undefined,'9');
 assert.deepEqual(rows.map(r=>[r.rpe,r.rir]),[['9',''],['9','']]);
 assert.throws(()=>importer.extractWorkbookImport(sheets,[0,1],undefined,'11'));
});
test('reordering one occurrence preserves the independent prescriptions and identity',()=>{
 const s=sheet('Plan',[['Exercise','Sets','Reps'],['Hip Thrust',3,8],['Hip Thrust',2,10]]);
 const rows=importer.extractImportRows(s,0,{exercise:0,sets:1,reps:2});
 assert.equal(typeof importer.moveImportRow,'function');
 const before=importer.finalizeImport(rows),moved=importer.finalizeImport(importer.moveImportRow(rows,1,-1));
 assert.deepEqual(moved.map(i=>i.sets),[2,3]);assert.equal(moved[0].occurrenceId,before[1].occurrenceId);
 assert.equal(importer.moveImportRow(rows,0,-1),rows);
});
