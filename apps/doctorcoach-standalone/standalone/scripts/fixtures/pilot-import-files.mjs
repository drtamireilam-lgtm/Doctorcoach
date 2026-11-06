import {zipSync,strToU8} from 'fflate';

export const importRows=[['Exercise','Sets','Reps','Weight','RPE','Notes'],['Barbell horizontal bench press','2','8,10','33.125','7,8','Synthetic alias'],['leg curl machine','2','10,12','42.5','8,9','Synthetic ambiguous'],['SYNTHETIC unknown lift','2','6,8','24.75','7,7.5','Synthetic unmatched']];
export function importFile(format){
 const name='synthetic-pilot.'+format;
 if(format==='csv')return {name,mimeType:'text/csv',buffer:Buffer.from(importRows.map(row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\n'))};
 if(format==='xlsx')return {name,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(zipSync({'xl/workbook.xml':strToU8('<workbook><sheets><sheet name="Synthetic" id="r1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':strToU8('<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':strToU8('<worksheet><sheetData>'+importRows.map((row,y)=>`<row r="${y+1}">`+row.map((v,x)=>`<c r="${String.fromCharCode(65+x)}${y+1}" t="inlineStr"><is><t>${v.replaceAll('&','&amp;').replaceAll('<','&lt;')}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>')}))};
 if(format!=='pdf')throw Error('Unsupported synthetic file');
 const xs=[15,260,310,360,425,475],stream=importRows.flatMap((row,y)=>row.map((text,x)=>`BT /F1 8 Tf ${xs[x]} ${720-y*24} Td (${text.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)')}) Tj ET`)).join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let text='%PDF-1.7\n';const offsets=[];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${o}\nendobj\n`;});const start=Buffer.byteLength(text);text+=`xref\n0 6\n0000000000 65535 f \n${offsets.map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return {name,mimeType:'application/pdf',buffer:Buffer.from(text)};
}
