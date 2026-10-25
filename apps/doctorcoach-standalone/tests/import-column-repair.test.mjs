import test from 'node:test';import assert from 'node:assert/strict';
import {detectImportColumns,extractImportRows,importRowItem} from '../lib/program-import.ts';
const sheet=rows=>({name:'Plan',rows:rows.map(r=>r.map(value=>({value:String(value),formula:false})))});
test('source update loads and singular Hebrew notes are retained, invalid load lists block approval',()=>{
 const s=sheet([['אימון','תרגיל','סטים','חזרות','משקל לעדכון','הערה','משקל נראה בתמונה'],['A','Hip Thrust',2,'8-10','17,17,18,17','יש לבדוק','36…']]);
 const d=detectImportColumns(s),r=extractImportRows(s,d.header,d.mapping)[0];
 assert.equal(r.weight,'17,17,18,17');assert.ok(r.notes.includes('יש לבדוק'));assert.ok(r.notes.includes('36…'));assert.throws(()=>importRowItem(r));
});
test('muscle-group labels are preserved as context without inventing training days',()=>{
 const s=sheet([['קבוצה','תרגיל','סטים','חזרות'],['קוואדס','Leg Press',3,8]]),d=detectImportColumns(s),r=extractImportRows(s,d.header,d.mapping)[0];
 assert.ok(r.notes.includes('קוואדס'));assert.equal(r.dayId,'1');
});
test('semantic bilingual headers locate a delayed reordered table and mass unit',()=>{
 const s=sheet([['Coach plan'],[],['Load','Repetitions','Movement','Target RPE','Sets','Unit'],[105,10,'Leg Press',8,2,'lb']]);const d=detectImportColumns(s);assert.equal(d.header,2);assert.equal(d.mapping.exercise,2);assert.equal(d.mapping.reps,1);assert.equal(d.mapping.weightUnit,5);assert.equal(d.mapping.unit,undefined);const row=extractImportRows(s,d.header,d.mapping)[0];assert.equal(row.name,'Leg Press');assert.equal(row.reps,'10');assert.equal(row.weightUnit,'lb');
});
test('ambiguous duplicate headers and textual numeric columns do not silently pick the first',()=>{
 const d=detectImportColumns(sheet([['Exercise','Sets','Reps','Repetitions'],['Leg Press',2,10,12]]));assert.equal(d.mapping.reps,undefined);assert.ok(d.issues.length);
 const s=sheet([['Exercise','Sets','Reps'],[10,2,'Leg Press']]);const swapped=detectImportColumns(s);assert.ok(swapped.issues.length);assert.equal(swapped.mapping.reps,undefined);assert.throws(()=>extractImportRows(s,swapped.header,{exercise:0,sets:1,reps:2}).map(r=>importRowItem(r)));
});
test('unnamed exercise column is inferred by content independent of its position',()=>{
 const s=sheet([['Reps','Coach label','Sets'],[10,'Leg Press',2],[8,'Hip Thrust',3],[12,'Leg Extension',4]]);assert.equal(detectImportColumns(s).mapping.exercise,1);
});
test('Hebrew movement and explicit load-unit columns stay distinct from dose units',()=>{
 const s=sheet([['שם התנועה','מספר סטים','מספר חזרות','משקל עבודה','יחידת משקל','Target RIR'],['לחיצת רגליים',2,'8-12','92,5','פאונד',2]]);const d=detectImportColumns(s);assert.equal(d.mapping.exercise,0);assert.equal(d.mapping.rir,5);assert.equal(d.mapping.weightUnit,4);
});
test('invalid dose errors identify source row and field without zero fallback',()=>{
 const s=sheet([['Exercise','Sets','Reps'],['Leg Press',2,'Leg Press']]);const d={header:0,mapping:{exercise:0,sets:1,reps:2}};const row=extractImportRows(s,d.header,d.mapping)[0];assert.throws(()=>importRowItem(row),e=>/2/.test(e.message)&&/חזרות/.test(e.message));
});
test('repeated mixed-unit header blocks retain semantic unit mapping and changed load header units',()=>{const s=sheet([['Exercise','Sets','Reps','Weight','Unit'],['Leg Press',2,10,105,'lb'],['Exercise','Sets','Reps','Weight','Unit'],['Hip Thrust',3,8,40,'kg']]);const d=detectImportColumns(s),r=extractImportRows(s,d.header,d.mapping);assert.equal(r.length,2);assert.deepEqual(r.map(x=>x.weightUnit),['lb','kg']);assert.deepEqual(r.map(x=>x.issues),[[],[]]);assert.equal(importRowItem(r[1]).load.sourceUnit,'kg');});
test('missing prescriptions and invalid numeric fields never become zero or default sets',()=>{const s=sheet([['Exercise','Reps'],['Leg Press',10]]),d=detectImportColumns(s);assert.equal(d.mapping.sets,undefined);const incomplete=extractImportRows(s,d.header,d.mapping)[0];assert.equal(incomplete.sets,'');assert.throws(()=>importRowItem(incomplete));assert.equal(importRowItem({...incomplete,sets:'3'}).sets,3);const good=extractImportRows(sheet([['Exercise','Sets','Reps'],['Leg Press',2,10]]),0,{exercise:0,sets:1,reps:2})[0];for(const patch of [{sets:''},{sets:'2.5'},{sets:'-1'},{reps:'Leg Press'},{reps:''},{weight:'oops'},{rpe:'11'},{rir:'10'}])assert.throws(()=>importRowItem({...good,...patch}));assert.equal(importRowItem(good).targetRpe,null);});
test('competing mass-unit columns require an explicit choice instead of kg fallback',()=>{const s=sheet([['Exercise','Sets','Reps','Weight','Unit','Weight Unit'],['Leg Press',2,10,105,'lb','kg']]),d=detectImportColumns(s);assert.equal(d.mapping.weightUnit,undefined);const row=extractImportRows(s,d.header,d.mapping)[0];assert.ok(row.issues.some(i=>i.includes('יחידת משקל')));assert.throws(()=>importRowItem(row));const explicit=extractImportRows(s,0,{exercise:0,sets:1,reps:2,weight:3,weightUnit:4})[0];assert.equal(importRowItem(explicit).load.sourceUnit,'lb');});
test('duplicate load headers cannot silently discard available source weights',()=>{const s=sheet([['Exercise','Sets','Reps','Weight','Load'],['Leg Press',2,10,40,80]]),d=detectImportColumns(s);assert.equal(d.mapping.weight,undefined);const row=extractImportRows(s,d.header,d.mapping)[0];assert.ok(row.issues.some(i=>i.includes('weight')));assert.throws(()=>importRowItem(row));const fixed=extractImportRows(s,0,{exercise:0,sets:1,reps:2,weight:4})[0];assert.equal(importRowItem(fixed).weight,80);});
test('later ambiguous repeated headers never hide an earlier complete workout block',()=>{
 const s=sheet([['Exercise','Sets','Reps','Notes'],['Leg Press',3,8,'first block'],['Exercise','Sets','Reps','Notes','Notes'],['Hip Thrust',4,10,'second block','alternative note']]);
 const d=detectImportColumns(s);assert.equal(d.header,0);
 const r=extractImportRows(s,d.header,d.mapping);assert.equal(r.length,2);assert.equal(r[0].name,'Leg Press');assert.equal(r[0].notes,'first block');assert.equal(r[1].name,'Hip Thrust');
 assert.ok(r[1].issues.length);assert.throws(()=>importRowItem(r[1]));
});
test('a later wider table does not replace an earlier combined-dose table',()=>{
 const s=sheet([['Exercise','Sets'],['Leg Press','3x8'],['Exercise','Sets','Reps'],['Hip Thrust',4,10]]);
 const d=detectImportColumns(s);assert.equal(d.header,0);
 const r=extractImportRows(s,d.header,d.mapping);assert.deepEqual(r.map(x=>x.name),['Leg Press','Hip Thrust']);
 assert.deepEqual(r.map(x=>[x.sets,x.reps]),[['3','8'],['4','10']]);r.forEach(x=>assert.doesNotThrow(()=>importRowItem(x)));
});
