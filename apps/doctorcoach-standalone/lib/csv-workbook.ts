import type {ExcelCell,ExcelSheet} from './excel-workbook';
const quoteError=()=>new Error('מבנה המירכאות בקובץ CSV אינו תקין. סגרו כל שדה במירכאות והכפילו מירכאות בתוך שדה.');
// Parse text only. Formula-looking values are marked for manual review, never executed.
export function readCsvWorkbook(bytes:Uint8Array):ExcelSheet[]{
 if(!bytes.length||bytes.length>5*1024*1024)throw new Error('יש לבחור קובץ CSV עד 5MB.');
 let source:string;try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');}catch{throw new Error('קובץ CSV חייב להיות מקודד ב־UTF-8.');}
 if(source.includes('\0'))throw new Error('קובץ CSV מכיל תווים שאינם נתמכים.');
 // Count separators outside quoted fields over the first logical record.
 const counts=new Map([ [',',0],[';',0],['\t',0] ]);let quoted=false;
 for(let i=0;i<source.length;i++){
  const ch=source[i];if(ch==='"'){if(quoted&&source[i+1]==='"'){i++;continue;}quoted=!quoted;}
  else if(!quoted){if(ch==='\n'||ch==='\r'){if([...counts.values()].some(n=>n>0))break;continue;}if(counts.has(ch))counts.set(ch,counts.get(ch)!+1);}
 }
 const delimiter=[...counts].sort((a,b)=>b[1]-a[1])[0][0];
 const rows:ExcelCell[][]=[];let row:ExcelCell[]=[];let value='',state:'start'|'plain'|'quoted'|'closed'='start';let endedRecord=false;
 const addCell=()=>{
  if(row.length>=32)throw new Error('הייבוא תומך בעד 32 עמודות בגיליון.');
  const trimmed=value.trimStart();const formula=/^[=+@]/.test(trimmed)||(trimmed.startsWith('-')&&!/^-\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*$/.test(trimmed));
  row.push({value,formula});value='';state='start';
 };
 const addRow=()=>{addCell();if(rows.length>=500)throw new Error('הייבוא תומך בעד 500 שורות בגיליון.');rows.push(row);row=[];};
 for(let i=0;i<source.length;i++){
  const ch=source[i];endedRecord=false;
  if(state==='quoted'){
   if(ch==='"'){if(source[i+1]==='"'){value+='"';i++;}else state='closed';}else value+=ch;
  }else if(ch===delimiter){addCell();}
  else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&source[i+1]==='\n')i++;addRow();endedRecord=true;}
  else if(ch==='"'){if(state!=='start')throw quoteError();state='quoted';}
  else {if(state==='closed')throw quoteError();value+=ch;state='plain';}
  if(value.length>2000)throw new Error('תא בקובץ מכיל טקסט ארוך מדי.');
 }
 if(state==='quoted')throw quoteError();
 if(!endedRecord)addRow();
 return [{name:'CSV',rows}];
}

