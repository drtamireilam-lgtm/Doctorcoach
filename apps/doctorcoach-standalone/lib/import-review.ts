import {importRowItem,type ImportRow} from './program-import.ts';
import type {Exercise} from './content.ts';
export function importRowReview(row:ImportRow&{matchConfirmed?:boolean},catalog:Exercise[]){
 if(row.ignored)return {level:'ignored' as const,error:''};
 if(!row.exerciseId)return {level:row.matchStatus==='suggested'||row.matchStatus==='ambiguous'?'review' as const:'unmatched' as const,error:'יש לבחור תרגיל מהספרייה.'};
 try{importRowItem(row,catalog);}catch(error){return {level:'invalid' as const,error:(error as Error).message};}
 const confirmed=row.matchConfirmed||['exact','alias','normalized'].includes(row.matchStatus??'');
 return {level:confirmed?'matched' as const:'review' as const,error:''};
}
