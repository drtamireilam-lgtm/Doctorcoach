import {pdfPageTable,type PdfTextToken} from './pdf-program-table.ts';
import type {ExcelSheet} from './excel-workbook.ts';
import {detectImportColumns} from './program-import.ts';
export async function readProgramPdf(bytes:Uint8Array,workerSrc:string,assetRoot='/pdf-import-assets/6.4.299/'):Promise<ExcelSheet[]>{
 if(bytes.length>5*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('יש לבחור קובץ PDF תקין עד 5MB.');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
 const task=pdfjs.getDocument({data:bytes,cMapUrl:assetRoot+'cmaps/',cMapPacked:true,standardFontDataUrl:assetRoot+'standard_fonts/',useWasm:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true});
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  return await Promise.race([(async()=>{
   const doc=await task.promise;if(doc.numPages>20)throw new Error('אפשר לייבא PDF עד 20 עמודים. פצלו את הקובץ.');
   const sheets:ExcelSheet[]=[];let chars=0;
   for(let page=1;page<=doc.numPages;page++){
    const p=await doc.getPage(page),content=await p.getTextContent();const tokens:PdfTextToken[]=[];
    for(const item of content.items){if(!('str' in item))continue;chars+=item.str.length;if(chars>100000)throw new Error('קובץ ה־PDF מכיל יותר מדי טקסט. פצלו את הקובץ.');tokens.push({str:item.str,x:item.transform[4],y:item.transform[5],width:item.width,height:item.height,dir:item.dir});}
    const sheet=pdfPageTable(tokens,page);if(!sheet.rows.some(r=>r.some(c=>c.value)))throw new Error(`לא נמצא טקסט שניתן לחלץ בעמוד ${page}. סריקות ותמונות אינן נתמכות; העלו PDF עם טקסט שניתן לסמן או הסירו עמודים ללא טקסט.`);sheets.push(sheet);p.cleanup();
   }
   if(!sheets.length)throw new Error('לא נמצא טקסט שניתן לחלץ. PDF סרוק או תמונה אינם נתמכים; העלו PDF עם טקסט שניתן לסמן או קובץ Excel.');
   // Combine only tables whose detected headers agree exactly. Individual
   // pages remain available, and page labels let the coach verify workout days.
   if(sheets.length>1&&sheets.length<=7){
    const ds=sheets.map(detectImportColumns),headers=sheets.map((s,i)=>s.rows[ds[i].header].map(c=>c.value.trim().toLowerCase()));
    if(ds.every(d=>d.score===8)&&headers.every(h=>JSON.stringify(h)===JSON.stringify(headers[0]))){
     const combined:ExcelSheet={name:'כל העמודים · בדקו שיוך לימי אימון',rows:[sheets[0].rows[ds[0].header]]};
     sheets.forEach((s,i)=>{combined.rows.push([{value:s.name,formula:false}],...s.rows.slice(ds[i].header+1));});
     if(combined.rows.length<=500)sheets.unshift(combined);
    }
   }
   return sheets;
  })(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('קריאת ה־PDF ארכה יותר מדי זמן. נסו קובץ קטן יותר.')),20000);})]);
 }catch(e){if((e as Error).name==='PasswordException')throw new Error('ה־PDF מוגן בסיסמה. העלו עותק ללא סיסמה.');throw e;}finally{clearTimeout(timer);await task.destroy();}
}
