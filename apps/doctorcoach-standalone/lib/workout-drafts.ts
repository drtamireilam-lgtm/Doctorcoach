import {isRecord, type SetResult} from './training.ts';
export type SetDraftFields=Pick<SetResult,'amount'|'weight'|'weightSource'> & {actualRpe:number|null;targetRpe:number|null;painDuring:number|null};
export type SetDraftContext={ownerId:string;sessionId:string;exerciseId:string;occurrenceId:string;setIndex:number};
export type CachedSetDraft=SetDraftContext & {key:string;revision:string;updatedAt:number;base:SetDraftFields & {done:boolean};fields:SetDraftFields};
export const cachedSetKey=(context:SetDraftContext)=>JSON.stringify([context.ownerId,context.sessionId,context.occurrenceId,context.exerciseId,context.setIndex]);
export function setDraftFields(value:Partial<SetResult>&{targetRpe?:number|null}):SetDraftFields {
 return {amount:value.amount??null,weight:value.weight??null,actualRpe:value.actualRpe??null,targetRpe:value.targetRpe??null,painDuring:value.painDuring??null,
  ...(value.weightSource?{weightSource:value.weightSource}:{})};
}
export const sameDraftFields=(a:Partial<SetResult>&{targetRpe?:number|null},b:Partial<SetResult>&{targetRpe?:number|null})=>JSON.stringify(setDraftFields(a))===JSON.stringify(setDraftFields(b));
export function makeWorkoutDraft(context:SetDraftContext,base:SetResult&{targetRpe:number|null},fields:SetResult&{targetRpe:number|null},previous?:CachedSetDraft,conflicted=false):CachedSetDraft {
 const keepBase=conflicted&&previous&&draftRecovery(previous,context,base)!=='ignore';
 return {...context,key:cachedSetKey(context),revision:crypto.randomUUID(),updatedAt:Date.now(),
  base:keepBase?structuredClone(previous.base):{...setDraftFields(base),done:base.done},fields:setDraftFields(fields)};
}
function validFields(value:unknown) {
 if(!isRecord(value))return false;
 for(const [key,max] of [['amount',3600],['weight',1000],['actualRpe',10],['targetRpe',10],['painDuring',10]] as const){
  if(key!=='painDuring'&&!Object.hasOwn(value,key))return false;
  const n=value[key];if(n!=null&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max))return false;
 }
 return value.weightSource===undefined||value.weightSource==='manual'||value.weightSource==='automatic';
}
/** Restore fields only, never a cached completion action or another owner's/session's/exercise's values. */
export function draftRecovery(record:unknown,context:SetDraftContext,saved:Partial<SetResult>&{targetRpe?:number|null}) {
 if(!isRecord(record)||record.key!==cachedSetKey(context)||!['ownerId','sessionId','exerciseId','occurrenceId','setIndex'].every(k=>record[k]===context[k as keyof SetDraftContext])||
  typeof record.revision!=='string'||!record.revision||!validFields(record.fields)||!validFields(record.base)||!isRecord(record.base)||typeof record.base.done!=='boolean')return 'ignore';
 const fields=record.fields as SetDraftFields,base=record.base as CachedSetDraft['base'];
 if(sameDraftFields(fields,saved))return 'synced';
 return base.done===saved.done&&sameDraftFields(base,saved)?'restore':'conflict';
}
