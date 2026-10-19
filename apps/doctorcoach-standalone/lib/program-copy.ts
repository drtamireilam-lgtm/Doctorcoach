import {workoutSection} from './workout-sections.ts';
import type {PlanItem} from './training.ts';
import type {CareProgram} from './care.ts';
import {workoutDayId,workoutDays,planItemKey} from './workout-days.ts';

export function copyWorkoutDay(items:PlanItem[],source:string,target:string){
 if(source===target||![source,target].every(id=>workoutDays.some(day=>day.value===id)))throw new Error('בחרו יום יעד שונה מיום המקור.');
 const original=items.filter(item=>workoutDayId(item)===source),replaced=items.filter(item=>workoutDayId(item)===target);
 if(!original.length)throw new Error('אין תרגילים ביום המקור להעתקה.');
 if(items.length-replaced.length+original.length>30)throw new Error('ההעתקה תחרוג ממגבלת 30 התרגילים בתוכנית.');
 const copied=original.map(item=>({...structuredClone(item),dayId:target,occurrenceId:crypto.randomUUID()}));
 const insertion=items.findIndex(item=>workoutDayId(item)===target);
 return {items:insertion<0?[...items,...copied]:items.flatMap((item,index)=>index===insertion?copied:workoutDayId(item)===target?[]:[item]),sourceCount:original.length,replacedCount:replaced.length};
}
/** A copy within one authorized client file carries only program data, never author/client metadata. */
export function copiedProgramDraft(program:CareProgram,activeProgramId:string|null,suffix='עותק'){
 if(!program.items.length||program.items.length>30)throw new Error('התוכנית להעתקה צריכה להכיל 1–30 תרגילים.');
 return {title:program.title.slice(0,100-suffix.length-3)+' — '+suffix,items:structuredClone(program.items).map(item=>({...item,occurrenceId:crypto.randomUUID()})),revisionOf:activeProgramId};
}


/** Reorder an occurrence within its day and section without changing prescriptions or other days. */
export function moveProgramOccurrence(items:PlanItem[],key:string,direction:-1|1):PlanItem[]{
 const index=items.findIndex(i=>planItemKey(i)===key);if(index<0)return items;
 const item=items[index],peers=items.map((i,n)=>({i,n})).filter(({i})=>workoutDayId(i)===workoutDayId(item)&&workoutSection(i)===workoutSection(item));
 const target=peers[peers.findIndex(p=>p.n===index)+direction];if(!target)return items;
 const moved=[...items];[moved[index],moved[target.n]]=[moved[target.n],moved[index]];return moved;
}
