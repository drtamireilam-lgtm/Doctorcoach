import {currentWeek} from './care.ts';
import {estimated1RM,type TrainingSession} from './training.ts';
import type {WellnessRecord} from './wellness.ts';
import {israelDay} from './workout-context.ts';
export const shiftDay=(day:string,days:number)=>new Date(Date.parse(day+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const average=(values:number[])=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null;
const numeric=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
export function weeklyProgress(sessions:TrainingSession[],records:WellnessRecord[],week=currentWeek(),planned:number|null=null,previousPlanned:number|null=null){
 function period(start:string,target:number|null){
  const end=shiftDay(start,7),inWeek=(day:string)=>day>=start&&day<end;
  const completed=sessions.filter(s=>s.status==='completed'&&inWeek(israelDay(s.finishedAt??s.startedAt)));
  const measurements=records.filter(r=>inWeek(r.day)),rehab=measurements.filter(r=>r.kind==='rehab'),readiness=measurements.filter(r=>r.kind==='readiness');
  // Readiness snapshots are immutable; use each day once, preferring an explicit report.
  const readinessDays=new Map(readiness.map(r=>[r.day,r.data]));
  for(const s of completed)if(s.readiness&&inWeek(s.readiness.day)&&!readinessDays.has(s.readiness.day))readinessDays.set(s.readiness.day,s.readiness.data);
  const sets=completed.flatMap(s=>s.items.flatMap(i=>i.results.filter(r=>r.done).map(r=>({r,i}))));
  const loaded=sets.filter(({r,i})=>i.unit==='reps'&&numeric(r.weight)&&numeric(r.amount));
  const exercises=new Map<string,{id:string;name:string;weight:number;e1rm:number|null}>();
  for(const {r,i} of loaded){const old=exercises.get(i.exerciseId);const estimate=(r.painDuring??0)>0?null:estimated1RM(r.weight,r.amount);exercises.set(i.exerciseId,{id:i.exerciseId,name:i.name,weight:Math.max(old?.weight??0,r.weight),e1rm:estimate===null?old?.e1rm??null:Math.max(old?.e1rm??0,estimate)});}
  // Never merge different regions/sides/movements or measurement timings.
  const rom=new Map<string,{key:string;region:string;side:string;motion:string;response:string;value:number;count:number}>();
  for(const r of rehab)if(numeric(r.data.rom)){const d=r.data,key=JSON.stringify([d.episodeId??'',d.region,d.side,d.motion,d.response]);const prev=rom.get(key);rom.set(key,{key,region:String(d.region),side:String(d.side),motion:String(d.motion),response:String(d.response),value:(prev?.value??0)+Number(d.rom),count:(prev?.count??0)+1});}
  const reportedPain=rehab.map(r=>r.data.pain).filter(numeric);
  const rd=[...readinessDays.values()];
  return {start,end:shiftDay(end,-1),completed:completed.length,planned:target,adherence:target!==null&&target>0?Math.round(completed.length/target*100):null,sets:sets.length,volume:loaded.length?Math.round(loaded.reduce((n,{r})=>n+r.weight*r.amount,0)*10)/10:null,exercises:[...exercises.values()],pain:average(reportedPain),painCount:reportedPain.length,rom:[...rom.values()].map(r=>({...r,value:Math.round(r.value/r.count*10)/10})),sleep:average(rd.map(r=>r.sleep).filter(numeric)),energy:average(rd.map(r=>r.energy).filter(numeric)),stress:average(rd.map(r=>r.stress).filter(numeric)),readinessDays:rd.length,rehabReports:rehab.length};
 }
 const current=period(week,planned),previous=period(shiftDay(week,-7),previousPlanned);
 const exerciseChanges=current.exercises.map(e=>{const old=previous.exercises.find(p=>p.id===e.id);return {...e,weightChange:old?Math.round((e.weight-old.weight)*10)/10:null,e1rmChange:old?.e1rm!=null&&e.e1rm!=null?Math.round((e.e1rm-old.e1rm)*10)/10:null};});
 return {week,current,previous,exerciseChanges,painChange:current.pain!==null&&previous.pain!==null?Math.round((current.pain-previous.pain)*10)/10:null,romChanges:current.rom.map(r=>({...r,change:previous.rom.some(p=>p.key===r.key)?Math.round((r.value-previous.rom.find(p=>p.key===r.key)!.value)*10)/10:null})),rehabStages:records.filter(r=>r.kind==='return'&&r.day<=current.end).map(r=>({episodeId:r.data.episodeId??null,stage:String(r.data.stage),updatedAt:r.updatedAt})),generatedAt:new Date().toISOString()};
}
export type WeeklyProgress=ReturnType<typeof weeklyProgress>;
