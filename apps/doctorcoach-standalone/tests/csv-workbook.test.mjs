import test from 'node:test';
import assert from 'node:assert/strict';
import {readCsvWorkbook} from '../lib/csv-workbook.ts';
const read=s=>readCsvWorkbook(new TextEncoder().encode(s))[0].rows;
test('CSV detects delimiters and preserves quotes, newlines, blank source rows and BOM',()=>{
 const rows=read('\ufeffname;sets;note\r\n"Squat; paused";3;"line 1\nline ""2"""\r\n\r\nPress;4;ok');
 assert.equal(rows[1][0].value,'Squat; paused');assert.equal(rows[1][2].value,'line 1\nline "2"');assert.equal(rows[2][0].value,'');assert.equal(rows[3][0].value,'Press');
 assert.equal(read('name\tsets\nSquat\t3')[1][1].value,'3');assert.equal(read('name,sets\nSquat,3')[1][1].value,'3');
});
test('CSV marks formula-like input without evaluating, preserving numeric negatives',()=>{
 const cells=read('=1+1,+SUM(A1),@x,-cmd,-12,-2.5')[0];
 assert.deepEqual(cells.map(c=>c.formula),[true,true,true,true,false,false]);assert.equal(cells[4].value,'-12');
});
test('CSV rejects malformed quotes and invalid encoding',()=>{
 for(const input of ['a,"unterminated','ab"cd,x','"a"oops,b'])assert.throws(()=>read(input),/מירכאות/);
 assert.throws(()=>readCsvWorkbook(new Uint8Array([255])),/UTF/);
});
test('CSV enforces bounded source dimensions and text length',()=>{
 assert.throws(()=>read('x'.repeat(2001)),/ארוך/);assert.throws(()=>read(Array(33).fill('x').join(',')),/32/);
 assert.throws(()=>read(Array(501).fill('x').join('\n')),/500/);assert.throws(()=>readCsvWorkbook(new Uint8Array(5*1024*1024+1)),/5MB/);
 assert.equal(read(Array(500).fill('x').join('\n')+'\n').length,500);
});
import {zipSync,strToU8} from 'fflate';
import {readExcelWorkbook} from '../lib/excel-workbook.ts';
test('XLSX records merged ranges without inventing covered cell values',()=>{
 const bytes=zipSync({'xl/workbook.xml':strToU8('<workbook><sheets><sheet name="Plan" id="r1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':strToU8('<worksheet><sheetData><row r="1"><c r="A1"><v>3</v></c></row></sheetData><mergeCells><mergeCell ref="A1:B2"/></mergeCells></worksheet>')});
 const sheet=readExcelWorkbook(bytes)[0];assert.deepEqual(sheet.mergedRanges,['A1:B2']);assert.equal(sheet.rows[0][1],undefined);assert.equal(sheet.rows[1],undefined);
});
