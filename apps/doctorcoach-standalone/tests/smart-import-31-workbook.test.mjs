import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {readExcelWorkbook} from '../lib/excel-workbook.ts';
const zip=(rows,extra={})=>zipSync(Object.fromEntries(Object.entries({
 'xl/workbook.xml':'<workbook><sheets><sheet name="Workout" id="r1"/></sheets></workbook>',
 'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>',
 'xl/worksheets/sheet1.xml':`<worksheet><sheetData>${rows}</sheetData></worksheet>`,...extra
}).map(([k,v])=>[k,strToU8(v)])));
const cell=(ref,value)=>`<c r="${ref}"><v>${value}</v></c>`;
test('duplicate data rows cannot silently overwrite previous prescriptions',()=>{
 assert.throws(()=>readExcelWorkbook(zip(`<row r="1">${cell('A1',33)}</row><row r="1">${cell('A1',42.5)}</row>`)),/כפול/);
});
test('duplicate cells cannot silently overwrite weights',()=>{
 assert.throws(()=>readExcelWorkbook(zip(`<row r="1">${cell('A1',33)}${cell('A1',42.5)}</row>`)),/כפול/);
});
test('cell coordinates must belong to the containing row',()=>{
 assert.throws(()=>readExcelWorkbook(zip(`<row r="1">${cell('A2',33)}</row>`)),/כתובת/);
});
test('invalid shared-string references cannot silently erase exercise names',()=>{
 for(const value of ['-1','0.5','10','abc'])assert.throws(()=>readExcelWorkbook(zip(`<row r="1"><c r="A1" t="s"><v>${value}</v></c></row>`,{'xl/sharedStrings.xml':'<sst><si><t>Bench Press</t></si></sst>'})),/טקסט/);
});
test('valid rich shared strings and formatting-only duplicate rows retain real data',()=>{
 const s=readExcelWorkbook(zip(`<row r="1"><c r="A1" t="s"><v>0</v></c>${cell('B1',24.75)}</row><row r="1"><c r="C1" s="1"/></row>`,{'xl/sharedStrings.xml':'<sst><si><r><t>לחיצת </t></r><r><t>חזה</t></r></si></sst>'}));
 assert.equal(s[0].rows[0][0].value,'לחיצת חזה');assert.equal(s[0].rows[0][1].value,'24.75');
});

test('large multi-sheet workbook preserves 900 data rows, merges, order and exact text',async()=>{
 const files={
  'xl/workbook.xml':'<workbook><sheets>'+[1,2,3].map(i=>`<sheet name="Day ${i}" id="r${i}"/>`).join('')+'</sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships>'+[1,2,3].map(i=>`<Relationship Id="r${i}" Target="worksheets/sheet${i}.xml"/>`).join('')+'</Relationships>'
 };
 for(let s=1;s<=3;s++)files[`xl/worksheets/sheet${s}.xml`]='<worksheet><sheetData>'+Array.from({length:300},(_,i)=>`<row r="${i+1}"><c r="A${i+1}" t="inlineStr"><is><t>${i%2?'DB Bench Press':'לחיצת חזה'}</t></is></c>${cell('B'+(i+1),'24.75')}<c r="C${i+1}" t="inlineStr"><is><t>7,7</t></is></c></row>`).join('')+'</sheetData><mergeCells><mergeCell ref="E1:F1"/></mergeCells></worksheet>';
 const bytes=zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)])));
 const sheets=readExcelWorkbook(bytes);assert.equal(sheets.length,3);
 for(const [i,s] of sheets.entries()){assert.equal(s.name,`Day ${i+1}`);assert.equal(s.rows.length,300);assert.deepEqual(s.mergedRanges,['E1:F1']);for(const [j,r] of s.rows.entries()){assert.equal(r[0].value,j%2?'DB Bench Press':'לחיצת חזה');assert.equal(r[1].value,'24.75');assert.equal(r[2].value,'7,7');assert.equal(r[4],undefined);}}
});
test('oversized row addresses fail clearly without sparse unbounded allocation',()=>{
 assert.throws(()=>readExcelWorkbook(zip(`<row r="501">${cell('A501',1)}</row>`)),/500/);
});

test('typed blank shared-string cells and whitespace-padded indices remain valid',()=>{
 const s=readExcelWorkbook(zip(`<row r="1"><c r="A1" t="s"/>${cell('B1',33)}<c r="C1" t="s"><v></v></c><c r="D1" t="s"><v> 0 </v></c><c r="E1" t="s"><f>A2</f></c></row>`,{'xl/sharedStrings.xml':'<sst><si><t>Bench Press</t></si></sst>'}));
 assert.equal(s[0].rows[0][0].value,'');assert.equal(s[0].rows[0][2].value,'');assert.equal(s[0].rows[0][3].value,'Bench Press');assert.equal(s[0].rows[0][4].value,'');assert.equal(s[0].rows[0][4].formula,true);
});
