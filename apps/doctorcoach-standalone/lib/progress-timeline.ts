import {performedCardioSeconds} from './cardio.ts';
import type {TrainingFeed} from './training.ts';
import type {WellnessRecord} from './wellness.ts';
import {israelDay,duringPain} from './workout-context.ts';
export type ProgressCategory='training'|'nutrition'|'recovery'|'readiness';
export type ProgressEvent={id:string;day:string;category:ProgressCategory;title:string;details:string[];destination:'history'|'nutrition'|'recovery'|'readiness'};
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value:null;
const measurement=(label:string,value:unknown,unit:string)=>number(value)===null?null:`${label}: ${value}${unit}`;
const compact=(values:(string|null)[])=>values.filter((v):v is string=>v!==null);
export function progressTimeline(feed:TrainingFeed,records:WellnessRecord[]):ProgressEvent[]{
 const events:ProgressEvent[]=[];
 for(const s of feed.history){
  if(s.status!=='completed')continue;
  const at=s.finishedAt??s.startedAt;if(!Number.isFinite(Date.parse(at)))continue;
  const cardio=s.items.filter(i=>i.cardio&&i.cardioResult?.status==='completed');
  events.push({id:'workout:'+s.id,day:israelDay(at),category:'training',title:'אימון הושלם',destination:'history',details:compact([
   s.plannedSets?`${s.completedSets} מתוך ${s.plannedSets} סטים`:null,cardio.length?`${cardio.length} פעילויות אירובי · ${Math.round(cardio.reduce((n,i)=>n+performedCardioSeconds(i.cardioResult!)/60,0)*10)/10} דקות`:null,measurement('כאב לפני',s.before,'/10'),measurement('כאב במהלך — הגבוה שדווח',duringPain(s.items),'/10'),measurement('כאב אחרי',s.after,'/10'),
  ])});
  if(s.followup)events.push({id:'followup:'+s.id,day:s.followup.day,category:'recovery',title:'דיווח למחרת האימון',destination:'history',details:[`כאב: ${s.followup.pain}/10`,`האימון: ${israelDay(at)}`]});
 }
 // Only the already-authorized response is accepted. Never infer private data
 // from summary fields or include free text, clinical notes, plans or assessments.
 for(const r of records){const d=r.data;
  if(r.kind==='daily')events.push({id:'wellness:'+r.id,day:r.day,category:'nutrition',title:'תזונה ומדידות',destination:'nutrition',details:compact([measurement('משקל גוף',d.weight,' ק״ג'),measurement('התמדה בתזונה',d.adherence,'/10'),measurement('היקף מותניים',d.waist,' ס״מ'),measurement('היקף אגן',d.hip,' ס״מ')])});
  if(r.kind==='rehab')events.push({id:'wellness:'+r.id,day:r.day,category:'recovery',title:`${d.region} · ${d.side} · ${d.motion}`,destination:'recovery',details:compact([String(d.response),measurement('כאב',d.pain,'/10'),measurement('טווח תנועה',d.rom,'°'),measurement('תפקוד',d.functionScore,'/10')])});
  if(r.kind==='readiness')events.push({id:'wellness:'+r.id,day:r.day,category:'readiness',title:'מוכנות לאימון',destination:'readiness',details:compact([measurement('שינה',d.sleep,' שעות'),measurement('אנרגיה',d.energy,'/10'),measurement('עומס מורגש',d.stress,'/10')])});
 }
 return [...new Map(events.map(e=>[e.id,e])).values()].sort((a,b)=>b.day.localeCompare(a.day)||a.id.localeCompare(b.id));
}
export function filterProgress(events:ProgressEvent[],category:ProgressCategory|'all',from:string,to:string){return events.filter(e=>(category==='all'||e.category===category)&&(!from||e.day>=from)&&(!to||e.day<=to));}
