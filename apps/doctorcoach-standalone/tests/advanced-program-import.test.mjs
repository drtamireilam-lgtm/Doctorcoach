import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {readExcelWorkbook} from '../lib/excel-workbook.ts';
import {parseSourceSets} from '../lib/import-workout-log.ts';
import {detectImportColumns,importTableEnd,importWeeks,weekTarget,extractImportRows,finalizeImport} from '../lib/program-import.ts';
const c=(value)=>({value:String(value),formula:false});
const fixture=()=>({name:'Program',rows:[['','sets','reps','RPE','week 1-(*7)','week 2-(*7.5)'].map(c),['A'].map(c),['Leg Press',3,'6-8','7','26*8,(28*8)2','30x8'].map(c),['B'].map(c),['Hip Thrust',3,'8-10','8-9','(40*8)*3','45x8,50x6'].map(c),['C'].map(c),['Leg Extension',3,'6-8','7','',''].map(c),[],[],[],['Historical comparison','','','','',''].map(c)]});
function workbook(sheet,styles=''){
 return zipSync({'xl/workbook.xml':strToU8('<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Program" r:id="rId1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':strToU8(sheet),...(styles?{'xl/styles.xml':strToU8(styles)}:{})});
}
test('format-only rows beyond row 500 are ignored but actual out-of-bound data is rejected',()=>{
 const x='<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Exercise</t></is></c></row><row r="9999"><c r="A9999" s="1"/></row></sheetData></worksheet>';
 assert.equal(readExcelWorkbook(workbook(x))[0].rows.length,1);
 assert.throws(()=>readExcelWorkbook(workbook(x.replace('<c r="A9999" s="1"/>','<c r="A9999"><v>1</v></c>'))));
});
test('day-month notation in repetitions imports as a rep range rather than a date',()=>{
 const styles='<styleSheet><numFmts><numFmt numFmtId="164" formatCode="d-m"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="164"/></cellXfs></styleSheet>';
 const s=readExcelWorkbook(workbook('<worksheet><sheetData><row r="1"><c r="A1" s="1"><v>45636</v></c><c r="B1"><v>45636</v></c></row></sheetData></worksheet>',styles))[0];
 assert.equal(s.rows[0][0].value,'10-12');assert.equal(s.rows[0][0].dateConverted,true);assert.equal(s.rows[0][1].value,'45636');
 const sheet=fixture();sheet.rows[2][2]={value:'8-12',formula:false,dateConverted:true};const d=detectImportColumns(sheet);const rows=extractImportRows(sheet,d.header,d.mapping,{lastRow:7,targetRpe:'7.5'});
 assert.deepEqual(rows[0].issues,[]);assert.equal(finalizeImport(rows)[0].repsMax,12);
 sheet.rows[2][1]={value:'8-12',formula:false,dateConverted:true};const invalid=extractImportRows(sheet,d.header,d.mapping,{lastRow:7,targetRpe:'7.5'});assert.ok(invalid[0].issues.some(i=>i.includes('כתאריך')));assert.throws(()=>finalizeImport(invalid));
});
test('ascending and descending repetition ranges keep sets and RPE separate',()=>{
 for(const [text,min,max] of [['6-8',6,8],['8-6',6,8],['12–10',10,12],['18-6',6,18]]){
  const sheet=fixture();sheet.rows[2][2]=c(text);const d=detectImportColumns(sheet);const rows=extractImportRows(sheet,d.header,d.mapping,{lastRow:7,targetRpe:'8'});const item=finalizeImport(rows)[0];assert.equal(item.reps,min);assert.equal(item.repsMax,max);assert.equal(item.sets,3);assert.equal(item.targetRpe,8);
 }
 const sheet=fixture();sheet.rows[2][2]=c('0-8');const d=detectImportColumns(sheet);assert.throws(()=>finalizeImport(extractImportRows(sheet,d.header,d.mapping,{lastRow:7,targetRpe:'8'})));
});
test('supported source log notation preserves all sets and rejects ambiguous comments',()=>{
 assert.deepEqual(parseSourceSets('26*8,(28*8)2').sets,[{weight:26,reps:8,count:1},{weight:28,reps:8,count:2}]);
 assert.deepEqual(parseSourceSets('(26×8)×3').sets,[{weight:26,reps:8,count:3}]);
 assert.deepEqual(parseSourceSets('2(14*8),16*8').sets,[{weight:14,reps:8,count:2},{weight:16,reps:8,count:1}]);
 for(const log of ['30x8 failure','BW flys x8','30,35x8,37.5x','bench 65x6*8','(10x8)21','1001x8','(60,65,75x6)3']){assert.ok(parseSourceSets(log).error);assert.deepEqual(parseSourceSets(log).sets,[]);}
});
test('unnamed exercise heading, table boundary and selected week work without importing historical sets',()=>{
 const sheet=fixture(),d=detectImportColumns(sheet);assert.equal(d.mapping.exercise,0);assert.equal(importTableEnd(sheet,d.header,d.mapping),7);
 const weeks=importWeeks(sheet,d.header);assert.equal(weeks.length,2);assert.equal(weekTarget(weeks[1].label),'7.5');assert.equal(weekTarget('Week 3'), '');
 const rows=extractImportRows(sheet,d.header,d.mapping,{lastRow:7,weekColumn:5,targetRpe:'7.5'});
 assert.equal(rows.length,3);assert.equal(rows[0].sourceLog,'30x8');assert.equal(rows[0].weight,'');assert.equal(rows[0].reps,'6-8');assert.equal(rows[1].sourceSets[1].weight,50);
 const items=finalizeImport(rows);assert.equal(items[0].weightUnspecified,true);assert.equal(items[0].targetRpe,7.5);assert.equal(items[0].sets,3);assert.equal(items[0].reps,6);assert.equal(items[0].repsMax,8);assert.equal(items[0].sourceLog,undefined);assert.equal(items[0].results,undefined);
 // Choosing a source load is an explicit coach edit and keeps the prescription.
 rows[0].weight=String(rows[0].sourceSets[0].weight);const copied=finalizeImport(rows)[0];assert.equal(copied.weight,30);assert.equal(copied.sets,3);assert.equal(copied.reps,6);
});
test('changing selected week changes only source data; mapped formulas and RPE ranges require review',()=>{
 const sheet=fixture(),d=detectImportColumns(sheet);const a=extractImportRows(sheet,0,d.mapping,{lastRow:7,weekColumn:4});const b=extractImportRows(sheet,0,d.mapping,{lastRow:7,weekColumn:5});
 assert.equal(a[0].sourceLog,'26*8,(28*8)2');assert.equal(b[0].sourceLog,'30x8');assert.equal(a[0].rpe,'7');assert.equal(a[1].rpe,'8-9');assert.deepEqual(finalizeImport(a)[1].importSource.rpeRange,[8,9]);
 sheet.rows[2][4].formula=true;const formulas=extractImportRows(sheet,0,d.mapping,{lastRow:7,weekColumn:4,targetRpe:'7'});assert.equal(formulas[0].sourceSets.length,0);assert.ok(formulas[0].sourceLogError);
 assert.throws(()=>extractImportRows(sheet,0,d.mapping,{lastRow:500}));
 assert.throws(()=>extractImportRows(sheet,0,d.mapping,{weekColumn:1,lastRow:7}));
});
