import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {pdfPageTable,tableText,editedPdfTable} from '../lib/pdf-program-table.ts';
import {detectImportColumns,extractImportRows,finalizeImport} from '../lib/program-import.ts';
import {readProgramPdf} from '../lib/pdf-program-reader.ts';
const token=(str,x,y,width=30,dir='ltr')=>({str,x,y,width,height:10,dir});
test('PDF coordinates preserve headers, exercise names, ranges, sets and effort',()=>{
 const s=pdfPageTable([token('Exercise',20,700,50),token('Sets',240,700),token('Reps',310,700),token('RPE',390,700),token('Weight',450,700,45),token('Leg Press',20,680,60),token('3',247,680,6),token('8-6',310,680),token('8',394,680,6),token('80',455,680,12)],1);
 const d=detectImportColumns(s);assert.equal(d.score,8);const rows=extractImportRows(s,d.header,d.mapping);const item=finalizeImport(rows)[0];assert.equal(item.sets,3);assert.equal(item.reps,6);assert.equal(item.repsMax,8);assert.equal(item.targetRpe,8);assert.equal(item.weight,80);
 assert.deepEqual(editedPdfTable(tableText(s),s.name),s);
});
test('RTL PDF text remains logical text and manual corrections never invent prescription',()=>{
 const s=pdfPageTable([token('תרגיל',440,700,40,'rtl'),token('סטים',350,700,25,'rtl'),token('חזרות',270,700,35,'rtl'),token('לחיצת רגליים',400,680,80,'rtl'),token('3',358,680,6),token('10-12',275,680)],1);
 const d=detectImportColumns(s);assert.equal(d.mapping.exercise,2);const rows=extractImportRows(s,d.header,d.mapping);assert.equal(rows[0].name,'לחיצת רגליים');assert.equal(rows[0].weight,'');assert.equal(rows[0].reps,'10-12');
 assert.throws(()=>editedPdfTable('x'.repeat(100001),'page'));assert.throws(()=>editedPdfTable('','page'));assert.throws(()=>pdfPageTable([token('a',NaN,1)],1));
 const text=pdfPageTable([token('A workout without table headings',20,700,190)],1);assert.equal(detectImportColumns(text).score,0);
});
// Small real PDF, generated in-memory as a parser fixture (no uploaded data).
function pdfFixture(lines){
 const stream=lines.map(([text,x,y])=>`BT /F1 12 Tf ${x} ${y} Td (${text}) Tj ET`).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let text='%PDF-1.7\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(text.length);text+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=text.length;text+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new TextEncoder().encode(text);
}
test('real PDF reader extracts a local text table and rejects image-only and oversized input',async()=>{
 const require=createRequire(import.meta.url),pdfRequire=createRequire(require.resolve('pdfjs-dist/package.json'));const canvas=pdfRequire('@napi-rs/canvas');globalThis.DOMMatrix=canvas.DOMMatrix;globalThis.Path2D=canvas.Path2D;globalThis.ImageData=canvas.ImageData;
 const worker=pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
 const assets=pathToFileURL(dirname(require.resolve('pdfjs-dist/package.json'))+'/').href;
 const sheets=await readProgramPdf(pdfFixture([['Exercise',20,700],['Sets',240,700],['Reps',310,700],['RPE',390,700],['Leg Press',20,680],['3',240,680],['6-8',310,680],['8',390,680]]),worker,assets);
 const d=detectImportColumns(sheets[0]);assert.equal(d.score,8);const item=finalizeImport(extractImportRows(sheets[0],d.header,d.mapping))[0];assert.equal(item.repsMax,8);assert.equal(item.targetRpe,8);
 await assert.rejects(readProgramPdf(pdfFixture([]),worker),/לא נמצא טקסט/);await assert.rejects(readProgramPdf(new Uint8Array(5*1024*1024+1),worker));await assert.rejects(readProgramPdf(new TextEncoder().encode('bad'),worker));
});
