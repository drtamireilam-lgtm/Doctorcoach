import type {ExcelSheet} from './excel-workbook.ts';
import {detectImportColumns} from './program-import.ts';
export type PdfTextToken={str:string;x:number;y:number;width:number;height:number;dir?:string};
const cell=(value:string)=>({value,formula:false});
// PDF text has positions, not table cells. Preserve visual lines and use the
// detected header's column boundaries; the coach always reviews the result.
export function pdfPageTable(tokens:PdfTextToken[],page:number):ExcelSheet{
 if(tokens.length>16000)throw new Error('עמוד ה־PDF מכיל יותר מדי פרטי טקסט. פצלו את הקובץ.');
 const valid=tokens.filter(t=>t.str.trim()).map(t=>({...t,str:t.str.replace(/[\t\r\n]/g,' ').trim()}));
 if(valid.some(t=>![t.x,t.y,t.width,t.height].every(Number.isFinite)||t.str.length>2000))throw new Error('טקסט ה־PDF אינו תקין.');
 const lines:{y:number;tokens:PdfTextToken[]}[]=[];
 for(const t of valid.sort((a,b)=>b.y-a.y||a.x-b.x)){
  let line=lines.find(l=>Math.abs(l.y-t.y)<=Math.min(4,Math.max(2,t.height*.25)));
  if(!line){line={y:t.y,tokens:[]};lines.push(line);}line.tokens.push(t);
 }
 if(lines.length>500)throw new Error('עמוד ה־PDF מכיל מעל 500 שורות. פצלו את הקובץ.');
 const segments=lines.map(line=>{
  const parts:PdfTextToken[]=[];
  for(const token of line.tokens.sort((a,b)=>a.x-b.x)){
   const prev=parts.at(-1),gap=prev?token.x-(prev.x+prev.width):Infinity;
   if(prev&&gap<Math.max(4,Math.min(prev.height,token.height)*.5)){
    prev.str=prev.dir==='rtl'&&token.dir==='rtl'?`${token.str} ${prev.str}`:`${prev.str} ${token.str}`;
    prev.width=Math.max(prev.x+prev.width,token.x+token.width)-prev.x;
   }else parts.push({...token});
  }return parts;
 });
 const candidate={name:`עמוד ${page}`,rows:segments.map(parts=>parts.map(t=>cell(t.str)))};
 const detected=detectImportColumns(candidate);
 if(detected.score<8)return candidate;
 const anchors=segments[detected.header];if(anchors.length>32)throw new Error('טבלת ה־PDF רחבה מדי.');
 const bounds=anchors.slice(1).map((t,i)=>(anchors[i].x+anchors[i].width+t.x)/2);
 const rows=segments.map(parts=>{
  const values=Array.from({length:anchors.length},()=>'');
  for(const t of parts){
   const left=t.x,right=t.x+t.width;let index=0,best=-Infinity;
   for(let i=0;i<anchors.length;i++){
    const overlap=Math.max(0,Math.min(right,bounds[i]??Infinity)-Math.max(left,bounds[i-1]??-Infinity));
    if(overlap>best){index=i;best=overlap;}
   }
   values[index]=[values[index],t.str].filter(Boolean).join(' ');
  }
  return values.map(cell);
 });
 return {name:candidate.name,rows};
}
export function tableText(sheet:ExcelSheet){return sheet.rows.map(r=>r.map(c=>c?.value??'').join('\t')).join('\n');}
export function editedPdfTable(text:string,name:string):ExcelSheet{
 if(text.length>100000)throw new Error('הטבלה גדולה מדי.');
 const rows=text.replace(/\r/g,'').split('\n').map(line=>line.split('\t').map(v=>cell(v.trim())));
 if(rows.length>500||rows.some(r=>r.length>32||r.some(c=>c.value.length>2000)))throw new Error('אפשר עד 500 שורות, 32 עמודות ו־2,000 תווים בתא.');
 if(!rows.some(r=>r.some(c=>c.value)))throw new Error('הטבלה ריקה.');return {name,rows};
}
