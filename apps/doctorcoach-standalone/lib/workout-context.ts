import type {SessionExercise} from './training.ts';

export function duringPain(items:SessionExercise[]):number|null{
 const values=items.flatMap(item=>[...item.results,...(item.warmupResults??[])]).map(set=>set.painDuring).filter((n):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10);
 return values.length?Math.max(...values):null;
}
export function israelDay(at:string){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));}
export function followupDay(finishedAt:string){const day=israelDay(finishedAt);return new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
