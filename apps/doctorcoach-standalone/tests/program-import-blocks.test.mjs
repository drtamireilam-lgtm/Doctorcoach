import test from 'node:test';
import assert from 'node:assert/strict';
import {detectImportColumns,extractImportRows,finalizeImport,importTableEnd} from '../lib/program-import.ts';
const sheet=rows=>({name:'Weekly plan',rows:rows.map(r=>r.map(value=>({value:String(value),formula:false})))});
const parse=s=>{const d=detectImportColumns(s);return extractImportRows(s,d.header,d.mapping);};
test('two fresh workout blocks preserve preparation, timed dose, sides, warmups and repeated occurrences',()=>{
 const r=parse(sheet([['Exercise','Sets','Reps','Weight','Warmup sets'],['Day A'],['Mobility'],['Balance',2,'30 sec each side','',''],['Main'],['Leg Press','3 x 8','','0','10@20; 5@30'],['Day B'],['Stretching'],['Balance',1,'2 min left','',''],['Main'],['Leg Press','4×6-8','','','']]));
 assert.equal(r.length,4);assert.deepEqual(r.map(x=>x.dayId),['1','1','2','2']);assert.equal(r[0].section,'warmup');assert.equal(r[0].unit,'seconds');assert.equal(r[0].side,'both');assert.equal(r[1].sets,'3');assert.equal(r[1].reps,'8');assert.deepEqual(r[1].warmupSets,[{amount:10,weight:20},{amount:5,weight:30}]);assert.equal(r[2].section,'stretch');assert.equal(r[2].side,'left');assert.equal(r[3].reps,'6-8');
});
test('unknown headings and malformed doses require review, formulas never become headings',()=>{
 const s=sheet([['Exercise','Sets','Reps'],['Possibly a phase'],['Leg Press',3,'8 per limb'],['Warmup'],['Leg Press',2,8]]);s.rows[3][0].formula=true;
 const r=parse(s);assert.ok(r[0].issues.length);assert.ok(r.find(x=>x.name==='Warmup')?.issues.length);assert.ok(r.find(x=>x.reps==='8 per limb')?.issues.length);
});
test('repeated header blocks can change column order without losing source metadata',()=>{
 const r=parse(sheet([['Exercise','Sets','Reps','Notes'],['Day A'],['Leg Press',3,8,'first'],['Reps','Exercise','Sets','Notes'],[10,'Hip Thrust',4,'second']]));assert.equal(r.length,2);assert.equal(r[1].name,'Hip Thrust');assert.equal(r[1].reps,'10');assert.equal(r[1].notes,'second');
});
test('a Hebrew circuit preserves weight×reps warmups, explicit zero and source notation',()=>{
 const r=parse(sheet([['תרגיל','סטים','חזרות','משקל','סטי חימום','צד','הערות'],['יום א'],['Hip Thrust',3,'8 לכל צד',0,'40×10;60x5','both','עצירה למעלה'],['Hip Thrust',2,'6-8','','','','סט מסיים']]));
 assert.equal(r.length,2);assert.deepEqual(r[0].warmupSets,[{amount:10,weight:40},{amount:5,weight:60}]);assert.equal(r[0].sourcePrescription.reps,'8 לכל צד');assert.equal(r[0].notes,'עצירה למעלה');
 const items=finalizeImport(r);assert.equal(items.length,2);assert.notEqual(items[0].occurrenceId,items[1].occurrenceId);assert.equal(items[0].weightUnspecified,false);assert.equal(items[1].weightUnspecified,true);assert.deepEqual(items[0].warmupSets,r[0].warmupSets);assert.equal(items[0].side,'both');
});
test('conflicting dose, side, time units, malformed warmups and formulas block finalization',()=>{
 for(const row of [['Leg Press',2,'3×8','','',''],['Leg Press',2,'8 left','','right',''],['Leg Press',2,'30 sec','minutes','',''],['Leg Press',2,'8','','','10/20']]){
  const r=parse(sheet([['Exercise','Sets','Reps','Unit','Side','Warmup sets'],row]));assert.ok(r[0].issues.length);assert.throws(()=>finalizeImport(r));
 }
 for(const column of [0,1,2,3]){const s=sheet([['Exercise','Sets','Reps','Warmup sets'],['Leg Press',3,8,'10@20']]);s.rows[1][column].formula=true;assert.throws(()=>finalizeImport(parse(s)));}
 assert.throws(()=>parse(sheet([['Exercise','Sets','Reps'],[],[]])));
 assert.throws(()=>parse(sheet([['Exercise','Sets','Reps'],...Array.from({length:61},()=>['Leg Press',3,8])])));
});
test('three spacer rows cannot silently truncate later days; empty cached formulas stay reviewable',()=>{
 const s=sheet([['Exercise','Sets','Reps'],['A'],['Leg Press',3,8],[],[],[],['B'],['Hip Thrust',4,10]]);const d=detectImportColumns(s);assert.equal(importTableEnd(s,d.header,d.mapping),s.rows.length);assert.equal(extractImportRows(s,d.header,d.mapping,{lastRow:importTableEnd(s,d.header,d.mapping)}).length,2);
 s.rows.push([{value:'',formula:true}]);const r=extractImportRows(s,d.header,d.mapping);assert.equal(r.length,3);assert.ok(r[2].issues.some(i=>i.includes('נוסחה')));
});
test('identical repeated layouts retain manually mapped headers',()=>{
 const s=sheet([['Exercise','Sets','Reps','Effort 1-10'],['Leg Press',3,8,7],['Exercise','Sets','Reps','Effort 1-10'],['Hip Thrust',4,10,9]]);
 const rows=extractImportRows(s,0,{exercise:0,sets:1,reps:2,rpe:3});assert.deepEqual(rows.map(r=>r.rpe),['7','9']);
});
test('reordered repeated layouts follow selected source week and manual header identities',()=>{
 const s=sheet([['Exercise','Sets','Reps','Week 1','Effort 1-10'],['Leg Press',3,8,'40x8',7],['Week 1','Reps','Exercise','Sets','Effort 1-10'],['60x10',10,'Hip Thrust',4,9]]);
 const rows=extractImportRows(s,0,{exercise:0,sets:1,reps:2,rpe:4},{weekColumn:3});assert.equal(rows[1].sourceLog,'60x10');assert.deepEqual(rows[1].sourceSets,[{weight:60,reps:10,count:1}]);assert.equal(rows[1].rpe,'9');assert.equal(rows[1].sourceWeek,'Week 1');
});
test('missing manual or selected-week header identity blocks the changed block',()=>{
 const s=sheet([['Exercise','Sets','Reps','Week 1','Effort 1-10'],['Leg Press',3,8,'40x8',7],['Exercise','Sets','Reps','Other week','Intensity'],['Hip Thrust',4,10,'60x10',9]]);
 const rows=extractImportRows(s,0,{exercise:0,sets:1,reps:2,rpe:4},{weekColumn:3});assert.equal(rows[0].issues.length,0);assert.ok(rows[1].issues.length>=2);assert.equal(rows[1].sourceLog,'');assert.equal(rows[1].rpe,'');assert.throws(()=>finalizeImport(rows));
});
