'use client';
import type {ImportRow} from '../lib/program-import';
import {useLanguage} from './language-provider';
export function ImportUnmappedColumns({rows}:{rows:readonly ImportRow[]}){
 const he=useLanguage().language==='he';
 const groups=new Map<string,{sheet:string;column:number;label:string;samples:{row:number;value:string;formula:boolean}[];count:number;formulas:number}>();
 for(const row of rows){if(row.ignored)continue;for(const cell of row.unmappedColumns??[]){const key=JSON.stringify([row.sourceSheet??'',cell.column,cell.label]),group=groups.get(key)??{sheet:row.sourceSheet??'',column:cell.column,label:cell.label,samples:[],count:0,formulas:0};group.count++;if(cell.formula)group.formulas++;if(group.samples.length<3)group.samples.push({row:row.row,value:cell.value,formula:cell.formula});groups.set(key,group);}}
 if(!groups.size)return null;
 const column=(n:number)=>{let text='';for(let i=n+1;i>0;i=Math.floor((i-1)/26))text=String.fromCharCode(65+(i-1)%26)+text;return text;};
 return <section className="panel care-stack import-unmapped-columns" style={{overflowWrap:"anywhere",minWidth:0}} role="alert" data-no-translate><h3>{he?'נתונים בעמודות שלא מופו':'Data in unmapped columns'}</h3><p>{he?'העמודות הבאות מכילות נתונים שאינם משויכים לשדות התוכנית. נתוני המקור נשמרו, אך אינם משמשים כמינון. בדקו את מיפוי העמודות וקראו מחדש, או אשרו שבדקתם אותם לפני הייבוא.':'These columns contain data not assigned to program fields. Source values are retained but are not used as prescriptions. Check the column mapping and read again, or confirm you reviewed them before importing.'}</p><ul>{[...groups].map(([key,g])=><li key={key}><strong dir="auto">{g.sheet} · {column(g.column)} · {g.label||(he?'ללא כותרת':'No header')}</strong><p>{he?'שורות עם נתונים: ':'Rows with data: '}{g.count}</p>{g.formulas>0&&<p>{he?'נוסחאות שלא חושבו: ':'Unevaluated formulas: '}{g.formulas}</p>}<ul>{g.samples.map(s=><li key={s.row} style={{overflowWrap:'anywhere'}}>{he?'שורה ':'Row '}{s.row}: <bdi>{s.value||'—'}</bdi>{s.formula&&<span> · {he?'נוסחה שלא חושבה':'Formula not evaluated'}</span>}</li>)}</ul></li>)}</ul></section>;
}
