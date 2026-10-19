import {TrainingError} from './training.ts';
import {inputRecord,textField} from './care.ts';
export const rehabStages=['הערכה','פעילות מותאמת','התקדמות בעומס','חזרה לפעילות'] as const;
export type RehabMilestone={id:string;stage:string;label:string;criteria:string;status:'pending'|'met'|'onHold'};
export const milestoneStatus={pending:'טרם אושר',met:'אושר שהושג',onHold:'מושהה לבירור'};
export function parseMilestones(value:unknown):string{
 if(value===undefined)return '[]';
 if(typeof value!=='string'||value.length>20000)throw new TrainingError('רשימת אבני הדרך אינה תקינה.');
 let items:unknown;try{items=JSON.parse(value);}catch{throw new TrainingError('רשימת אבני הדרך אינה תקינה.');}
 if(!Array.isArray(items)||items.length>12)throw new TrainingError('אפשר להגדיר עד 12 אבני דרך.');
 const ids=new Set<string>();
 const milestones=items.map(item=>{
  const p=inputRecord(item),id=textField(p.id,'מזהה אבן דרך',80,1);
  if(!/^[a-zA-Z0-9_-]+$/.test(id)||ids.has(id))throw new TrainingError('אבני הדרך צריכות מזהים נפרדים ותקינים.');
  ids.add(id);
  if(!rehabStages.includes(p.stage as typeof rehabStages[number]))throw new TrainingError('בחרו שלב תקין לאבן הדרך.');
  if(!['pending','met','onHold'].includes(String(p.status)))throw new TrainingError('בחרו מצב תקין לאבן הדרך.');
  return {id,stage:p.stage,label:textField(p.label,'שם אבן הדרך',150,2),criteria:textField(p.criteria,'תנאי לאישור אבן הדרך',1000,2),status:p.status};
 });
 return JSON.stringify(milestones);
}
export function readMilestones(value:unknown):RehabMilestone[]{
 try{return JSON.parse(parseMilestones(value));}catch{return [];}
}
