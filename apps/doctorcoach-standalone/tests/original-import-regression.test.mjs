import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {detectImportColumns,extractImportRows,importRowItem} from '../lib/program-import.ts';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/original-import-rows.json',import.meta.url)));
// Expected source positions are independently inspected from the four originals.
const layouts=[{count:8,name:0,sets:1,reps:2},{count:26,name:1,sets:2,reps:3},{count:27,name:1,sets:2,reps:3},{count:21,name:0,sets:1,reps:2}];
fixtures.forEach((f,i)=>test(`original workbook ${i+1}: every exercise and prescription retains source coordinates`,()=>{
 const s={...f,rows:f.rows.map(r=>r.map(value=>({value,formula:false})))};
 const d=detectImportColumns(s),r=extractImportRows(s,d.header,d.mapping),layout=layouts[i];
 assert.equal(r.length,layout.count);
 for(const row of r){const original=f.rows[row.row-1];assert.equal(row.name,original[layout.name].trim());assert.equal(row.sets,original[layout.sets].trim());assert.equal(row.reps,original[layout.reps].trim());}
 if(i===0){assert.deepEqual(r.map(x=>x.weightUnit),['lb','lb','kg','kg','lb','lb','lb','lb']);assert.equal(r[1].loadBasis,'per-side');assert.equal(r[0].exerciseId,'');assert.equal(r[1].exerciseId,'');}
 if(i===1){assert.ok(r[0].notes.includes('חתוך'));const list=r.find(x=>x.weight==='17,17,18,17');assert.ok(list);assert.throws(()=>importRowItem(list));assert.equal(r.filter(x=>x.name==='rear delt flys machine').length,2);}
 if(i===2)assert.ok(r.every(x=>x.notes.includes('קבוצה:')));
 if(i===3)assert.equal(r.filter(x=>x.name==='Hip thrust').length,2);
}));
