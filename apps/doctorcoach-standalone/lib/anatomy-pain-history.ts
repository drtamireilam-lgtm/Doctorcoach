import type {AnatomyPainRecord,AnatomyPainData} from './anatomy-pain.ts';
export type PainHistoryScope={structureId:string;side:string;modelVersion:string};
export type PainHistoryFilter=PainHistoryScope&{exerciseId?:string;timing?:AnatomyPainData['timing']};
const valid=(r:AnatomyPainRecord)=>Number.isFinite(Date.parse(r.data.occurredAt))&&Number.isInteger(r.data.intensity)&&r.data.intensity>=0&&r.data.intensity<=10;
export function painHistoryScopes(records:readonly AnatomyPainRecord[]){const scopes=new Map<string,PainHistoryScope&{key:string}>();for(const r of records){if(!valid(r))continue;const {structureId,side,modelVersion}=r.data,key=JSON.stringify([structureId,side,modelVersion]);if(!scopes.has(key))scopes.set(key,{key,structureId,side,modelVersion});}return [...scopes.values()];}
export function painComparison(input:readonly AnatomyPainRecord[],filter:PainHistoryFilter){
 const records=input.filter(r=>valid(r)&&r.data.structureId===filter.structureId&&r.data.side===filter.side&&r.data.modelVersion===filter.modelVersion&&(filter.exerciseId===undefined||r.data.exerciseId===filter.exerciseId)&&(filter.timing===undefined||r.data.timing===filter.timing)).sort((a,b)=>Date.parse(a.data.occurredAt)-Date.parse(b.data.occurredAt)||a.id.localeCompare(b.id));
 const first=records[0],last=records.at(-1),difference=first&&last&&Date.parse(first.data.occurredAt)<Date.parse(last.data.occurredAt)&&records.filter(r=>Date.parse(r.data.occurredAt)===Date.parse(first.data.occurredAt)).length===1&&records.filter(r=>Date.parse(r.data.occurredAt)===Date.parse(last.data.occurredAt)).length===1?last.data.intensity-first.data.intensity:null;
 return {records,difference};
}
