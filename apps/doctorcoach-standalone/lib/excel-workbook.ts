import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
export type ExcelCell={value:string;formula:boolean;dateConverted?:boolean};
export type ExcelSheet={name:string;rows:ExcelCell[][];mergedRanges?:string[]};
const list=(v:any):any[]=>v==null?[]:Array.isArray(v)?v:[v];
// Read-only OOXML: no formulas, macros, hyperlinks or external relationships run.
export function readExcelWorkbook(bytes:Uint8Array):ExcelSheet[]{
 if(!bytes.length||bytes.length>5*1024*1024)throw new Error('יש לבחור קובץ XLSX עד 5MB.');
 let total=0,count=0;const names=new Set<string>();
 const files=unzipSync(bytes,{filter:file=>{
  if(++count>300||names.has(file.name)||file.name.includes('..'))throw new Error('מבנה קובץ ה־Excel אינו נתמך.');
  names.add(file.name);
  if(!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/sheet\d+\.xml)$/.test(file.name))return false;
  total+=file.originalSize;if(total>8*1024*1024||file.originalSize>4*1024*1024)throw new Error('הקובץ גדול מדי לעיבוד. בחרו קובץ עם תוכנית האימון בלבד.');
  return true;
 }});
 const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@',removeNSPrefix:true,parseTagValue:false,parseAttributeValue:false,processEntities:false,trimValues:false,isArray:name=>['sheet','Relationship','si','r','row','c'].includes(name)});
 const decode=(s:string)=>s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,(_,code)=>{
  if(code.startsWith('#')){const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):Number(code.slice(1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'�';}
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[code.toLowerCase()]??'';
 });
 const text=(v:any):string=>typeof v==='string'?decode(v):v==null?'':typeof v==='object'?text(v.t??v['#text']??'')+list(v.r).map(text).join(''):String(v);
 function xml(path:string){if(!files[path])throw new Error('חסר גיליון בקובץ ה־Excel.');const raw=strFromU8(files[path]);if(/<!DOCTYPE|<!ENTITY/i.test(raw))throw new Error('קובץ ה־Excel מכיל XML שאינו נתמך.');return parser.parse(raw);}
 const workbook=xml('xl/workbook.xml');
 const styles=files['xl/styles.xml']?xml('xl/styles.xml').styleSheet:null;
 const formats=new Map(list(styles?.numFmts?.numFmt).map(f=>[String(f['@numFmtId']),String(f['@formatCode'])]));
 const cellFormats=list(styles?.cellXfs?.xf);
 const date1904=['1','true'].includes(workbook.workbook?.workbookPr?.['@date1904']);
 const relationships=new Map(list(xml('xl/_rels/workbook.xml.rels').Relationships?.Relationship).filter(r=>r['@TargetMode']!=='External').map(r=>[r['@Id'],r['@Target']]));
 const strings=files['xl/sharedStrings.xml']?list(xml('xl/sharedStrings.xml').sst?.si).map(text):[];
 if(strings.length>20000)throw new Error('הקובץ מכיל יותר מדי טקסט.');
 const sheets=list(workbook.workbook?.sheets?.sheet).filter(s=>s['@state']!=='hidden'&&s['@state']!=='veryHidden');
 if(!sheets.length||sheets.length>12)throw new Error('בחרו קובץ עם 1–12 גיליונות גלויים.');
 return sheets.map(s=>{
  const target=relationships.get(s['@id']);if(typeof target!=='string')throw new Error('קישור הגיליון אינו תקין.');
  const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
  if(!/^xl\/worksheets\/sheet\d+\.xml$/.test(path))throw new Error('מבנה גיליונות ה־Excel אינו נתמך.');
  const data=xml(path).worksheet;const rows:ExcelCell[][]=[];let cellCount=0;
  for(const row of list(data?.sheetData?.row)){
   // Formatting and merges may extend thousands of rows beyond the actual table.
   if(!list(row.c).some(c=>c.v!==undefined||c.is!==undefined||c.f!==undefined))continue;
   const rowIndex=Number(row['@r'])-1;if(!Number.isInteger(rowIndex)||rowIndex<0||rowIndex>=500)throw new Error('הייבוא תומך בעד 500 שורות בגיליון.');
   const cells:ExcelCell[]=[];
   for(const c of list(row.c)){
    if(++cellCount>16000)throw new Error('הגיליון מכיל יותר מדי תאים.');
    const address=/^([A-Z]+)\d+$/.exec(c['@r']??'');if(!address)throw new Error('כתובת תא אינה תקינה.');
    const col=[...address[1]].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1;if(col>=32)continue;
    const sharedIndex=Number(c.v);let value=c['@t']==='s'?(strings[sharedIndex]??''):c['@t']==='inlineStr'?text(c.is):text(c.v);
    const format=formats.get(String(cellFormats[Number(c['@s']??0)]?.['@numFmtId']));
    let dateConverted=false;
    // Recover the displayed day-month text, not an assumed repetition target.
    if(/^d{1,2}-m{1,2}$/i.test(format??'')&&(!c['@t']||c['@t']==='n')&&/^\d+(\.\d+)?$/.test(value)){
     const serial=Number(value);if(serial>0&&serial<100000){const origin=date1904?Date.UTC(1904,0,1):serial<60?Date.UTC(1899,11,31):Date.UTC(1899,11,30);const date=new Date(origin+Math.floor(serial)*86400000);value=`${date.getUTCDate()}-${date.getUTCMonth()+1}`;dateConverted=true;}
    }
    if(value.length>2000)throw new Error('תא בקובץ מכיל טקסט ארוך מדי.');
    cells[col]={value,formula:c.f!==undefined,...(dateConverted?{dateConverted:true}:{})};
   }
   rows[rowIndex]=cells;
  }
  // Keep merge metadata for review; never copy a merged anchor into covered cells.
  const mergedRanges=list(data?.mergeCells?.mergeCell).map(m=>String(m['@ref']??'')).filter(ref=>/^[A-Z]+[1-9]\d*:[A-Z]+[1-9]\d*$/.test(ref));
  return {name:decode(String(s['@name']??'גיליון')),rows,...(mergedRanges.length?{mergedRanges}: {})};
 });
}
