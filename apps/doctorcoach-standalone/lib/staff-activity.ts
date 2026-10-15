import {matchesClientAttention,type ClientAttention} from './client-attention.ts';
export type StaffActivity={week:string;completedThisWeek:number;lastCompletedAt:string|null;programTitle:string|null;programStarted:boolean|null;pendingCheckins:number};
// Convert local midnight independently at each boundary; winter/summer offsets differ.
export function israelMidnight(day:string):string{
 const target=Date.parse(day+'T00:00:00Z');let at=target;
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){const p=Object.fromEntries(formatter.formatToParts(new Date(at)).map(p=>[p.type,p.value]));const local=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);at+=target-local;}
 return new Date(at).toISOString();
}
export type ActivityFilter='all'|'trained'|'notStarted'|'noWorkout'|'pending'|'new'|'noProgram'|'unread';
export function matchesActivity(activity:StaffActivity|null|undefined,filter:ActivityFilter){if(filter==='all')return true;if(!activity||filter==='new'||filter==='unread')return false;if(filter==='noProgram')return !activity.programTitle;return filter==='trained'?activity.completedThisWeek>0:filter==='notStarted'?activity.programStarted===false:filter==='noWorkout'?!!activity.programTitle&&activity.completedThisWeek===0:activity.pendingCheckins>0;}

export function matchesRosterActivity(client:ClientAttention&{activity?:StaffActivity|null},filter:ActivityFilter,at=new Date()){return filter==='new'||filter==='unread'||filter==='noProgram'?matchesClientAttention(client,filter,at):matchesActivity(client.activity,filter);}
