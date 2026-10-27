import {completeCardioMetrics,type CardioMetrics,type CardioMetricSources,type CardioPrescription} from './cardio.ts';
export type CardioExecution={status:'running'|'paused'|'interrupted'|'completed';elapsedSeconds:number;checkpointAt:string;startedAt:string;finishedAt:string|null;metrics:CardioMetrics;metricSources?:CardioMetricSources;actionIds:string[];actionPayloads?:Record<string,string>};
export function applyCardioAction(p:CardioPrescription,previous:CardioExecution|undefined,payload:Record<string,unknown>,now=new Date().toISOString()):CardioExecution{
 const fail=():never=>{throw Object.assign(new Error('פעולת האירובי אינה תקינה.'),{status:400});};
 if(typeof payload.actionId!=='string'||!/^[a-zA-Z0-9:_-]{1,160}$/.test(payload.actionId)||!Number.isFinite(Date.parse(now)))fail();
 if(previous?.actionIds.includes(String(payload.actionId))){if(previous.actionPayloads?.[String(payload.actionId)]!==cardioActionFingerprint(payload))fail();return previous;}
 const command=payload.command;
 if(!['start','pause','resume','checkpoint','finish','recover','edit-results'].includes(String(command)))fail();
 if(previous?.status==='completed'&&command!=='edit-results'||command==='edit-results'&&previous?.status!=='completed'||(!previous&&command!=='start')||(previous&&command==='start'))fail();
 const r:CardioExecution=previous?structuredClone(previous):{status:'paused',elapsedSeconds:0,checkpointAt:now,startedAt:now,finishedAt:null,metrics:{},actionIds:[]};
 const delta=Math.max(0,(Date.parse(now)-Date.parse(r.checkpointAt))/1000);
 if(command==='edit-results'){if(payload.metrics===undefined)fail();}
 else if(command==='recover'){if(typeof payload.recoverySeconds!=='number'||!Number.isFinite(payload.recoverySeconds)||payload.recoverySeconds<0||payload.recoverySeconds>Math.min(delta,86400))fail();r.elapsedSeconds+=Number(payload.recoverySeconds);r.status='paused';}
 else{
  if(command==='resume'&&r.status==='running'||command==='pause'&&r.status!=='running')fail();
  if(r.status==='running'){if(delta>120)fail();r.elapsedSeconds+=delta;}
  if(command==='start'||command==='resume')r.status='running';if(command==='pause')r.status='paused';if(command==='finish'){r.status='completed';r.finishedAt=now;}
 }
 if(r.elapsedSeconds>86400)fail();
 if(payload.metrics!==undefined||command==='finish'){
  const result=completeCardioMetrics(p.activityId,payload.metrics??r.metrics,payload.metricSources??(payload.metrics===undefined?r.metricSources:undefined),r.elapsedSeconds,r.status==='completed');
  r.metrics=result.metrics;r.metricSources=result.metricSources;
 }
 if(command!=='edit-results')r.checkpointAt=now;
 r.actionIds.push(String(payload.actionId));r.actionPayloads={...r.actionPayloads,[String(payload.actionId)]:cardioActionFingerprint(payload)};if(r.actionIds.length>2000)fail();return r;
}
export function cardioIntervalPosition(p:CardioPrescription,elapsedSeconds:number){const round=(p.intervals??[]).flatMap(i=>Array.from({length:i.repeat??1},()=>i)),sequence=Array.from({length:p.rounds??1},()=>round).flat();let elapsed=Math.max(0,elapsedSeconds);for(let index=0;index<sequence.length;index++){if(elapsed<sequence[index].durationSeconds)return {index,interval:sequence[index],remainingSeconds:sequence[index].durationSeconds-elapsed,next:sequence[index+1]??null};elapsed-=sequence[index].durationSeconds;}return {index:sequence.length,interval:null,remainingSeconds:0,next:null};}
export function cardioActionFingerprint(payload:Record<string,unknown>):string{const sorted=(v:unknown)=>v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v;const fields=[payload.command,payload.exerciseId??null,payload.occurrenceId??null,sorted(payload.metrics)??null,payload.recoverySeconds??null];if(payload.metricSources!==undefined)fields.push(sorted(payload.metricSources));return JSON.stringify(fields);}
