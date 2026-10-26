import {scoreImportHeader} from './program-import.ts';
import type {ExcelCell,ExcelSheet} from './excel-workbook';
const quoteError=()=>new Error('מבנה המירכאות בקובץ CSV אינו תקין. סגרו כל שדה במירכאות והכפילו מירכאות בתוך שדה.');
// Parse text only. Formula-looking values are marked for manual review, never executed.
export function readCsvWorkbook(bytes:Uint8Array):ExcelSheet[]{
 if(!bytes.length||bytes.length>5*1024*1024)throw new Error('יש לבחור קובץ CSV עד 5MB.');
 let source:string;try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');}catch{throw new Error('קובץ CSV חייב להיות מקודד ב־UTF-8.');}
 if(source.includes('\0'))throw new Error('קובץ CSV מכיל תווים שאינם נתמכים.');
 // Titles may contain punctuation from a different delimiter. Compare repeated
 // logical-record widths instead of committing to the first nonempty record.
 const delimiters=[',',';','\t'];
 const frequencies=delimiters.map(()=>new Map<number,number>()),headerScores=delimiters.map(()=>0);
 let counts=delimiters.map(()=>0),fields=delimiters.map(()=>[] as string[]),values=delimiters.map(()=>''),invalid=delimiters.map(()=>false),quoted=false,records=0;
 const append=(ch:string,split=-1)=>{values=values.map((value,n)=>{if(n===split)return '';if(value.length>=2000)invalid[n]=true;return value.length<=2000?value+ch:value;});};
 const record=()=>{
  counts.forEach((count,i)=>{if(count>0)frequencies[i].set(count,(frequencies[i].get(count)??0)+1);if(!invalid[i])headerScores[i]=Math.max(headerScores[i],scoreImportHeader([...fields[i],values[i]]));});
  counts=delimiters.map(()=>0);fields=delimiters.map(()=>[]);values=delimiters.map(()=>'');invalid=delimiters.map(()=>false);records++;
 };
 for(let i=0;i<source.length&&records<30;i++){
  const ch=source[i];if(ch==='"'){if(quoted&&source[i+1]==='"'){append('"');i++;continue;}quoted=!quoted;}
  else if(!quoted){
   if(ch==='\n'||ch==='\r'){if(ch==='\r'&&source[i+1]==='\n')i++;record();}
   else {const index=delimiters.indexOf(ch);if(index>=0){counts[index]++;if(counts[index]>=32)invalid[index]=true;if(fields[index].length<32)fields[index].push(values[index]);append(ch,index);}else append(ch);}
  }else append(ch);
  // If every dialect already violates source limits, no later header can rescue it.
  if(invalid.every(Boolean))break;
 }
 if(records<30)record();
 // Header evidence outranks punctuation in notes, including ragged rows with
 // optional trailing cells. Quoted text stays one field in each candidate.
 const candidates=delimiters.map((delimiter,i)=>{const [width=0,frequency=0]=[...frequencies[i]].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0]??[];return {delimiter,width,frequency,headerScore:headerScores[i]};});
 const delimiter=candidates.sort((a,b)=>b.headerScore-a.headerScore||b.frequency-a.frequency||b.width-a.width)[0].delimiter;
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

