import {importRowItem,type ImportRow} from './program-import.ts';
import type {Exercise} from './content.ts';
export function importRowReview(row:ImportRow,catalog:Exercise[]){
 if(row.ignored)return {level:'ignored' as const,error:''};
 let item;try{item=importRowItem(row,catalog);}catch(error){return {level:'invalid' as const,error:(error as Error).message};}
 if(!row.exerciseId)return {level:['suggested','ambiguous'].includes(row.matchStatus??'')?'review' as const:'unmatched' as const,error:''};
 const confirmed=row.matchConfirmed||['exact','alias','normalized'].includes(row.matchStatus??'');
 return {level:confirmed&&!item.importSource?.warnings.length?'matched' as const:'review' as const,error:''};
}
