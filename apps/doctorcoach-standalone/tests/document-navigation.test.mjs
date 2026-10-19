import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMedicalDocuments,documentDay} from '../lib/document-navigation.ts';
const base={clientId:'client',uploaderId:'doctor',uploaderName:'Tamir',purpose:'medical',channel:'',category:'blood',mime:'application/pdf',bytes:100,canArchive:false};
const files=[{...base,id:'a',filename:'Lab Results.pdf',createdAt:'2026-01-01T23:30:00Z'},{...base,id:'b',filename:'Visit.pdf',category:'visit',createdAt:'2026-01-01T08:00:00Z',uploaderName:'Patient'}];
test('document date filtering follows Israel upload day rather than UTC and includes both range endpoints',()=>{
 assert.equal(documentDay(files[0].createdAt),'2026-01-02');
 assert.deepEqual(filterMedicalDocuments(files,{from:'2026-01-02',to:'2026-01-02'}).map(f=>f.id),['a']);
 assert.equal(filterMedicalDocuments(files,{from:'2026-01-01',to:'2026-01-02'}).length,2);
});
test('filename and uploader search compose with category, sorting never mutates the authorized source list',()=>{
 assert.deepEqual(filterMedicalDocuments(files,{query:'lab TAMIR',category:'blood'}).map(f=>f.id),['a']);
 assert.equal(filterMedicalDocuments(files,{query:'Patient',category:'blood'}).length,0);
 assert.deepEqual(filterMedicalDocuments(files,{sort:'oldest'}).map(f=>f.id),['b','a']);
 assert.deepEqual(files.map(f=>f.id),['a','b']);
 assert.equal(filterMedicalDocuments(files,{query:'missing'}).length,0);
});
