import type {PlanItem} from './training.ts';
import type {CareProgram} from './care.ts';
import {workoutDayId,workoutDays,planItemKey} from './workout-days.ts';

export function copyWorkoutDay(items:PlanItem[],source:string,target:string){
 if(source===target||![source,target].every(id=>workoutDays.some(day=>day.value===id)))throw new Error('בחרו יום יעד שונה מיום המקור.');
 const original=items.filter(item=>workoutDayId(item)===source),replaced=items.filter(item=>workoutDayId(item)===target);
 if(!original.length)throw new Error('אין תרגילים ביום המקור להעתקה.');
 if(new Set(original.map(planItemKey)).size!==original.length)throw new Error('תקנו כפילויות ביום המקור לפני ההעתקה.');
 if(items.length-replaced.length+original.length>30)throw new Error('ההעתקה תחרוג ממגבלת 30 התרגילים בתוכנית.');
 const copied=original.map(item=>({...structuredClone(item),dayId:target}));
 const insertion=items.findIndex(item=>workoutDayId(item)===target);
 return {items:insertion<0?[...items,...copied]:items.flatMap((item,index)=>index===insertion?copied:workoutDayId(item)===target?[]:[item]),sourceCount:original.length,replacedCount:replaced.length};
}
/** A copy within one authorized client file carries only program data, never author/client metadata. */
export function copiedProgramDraft(program:CareProgram,activeProgramId:string|null,suffix='עותק'){
 if(!program.items.length||program.items.length>30)throw new Error('התוכנית להעתקה צריכה להכיל 1–30 תרגילים.');
 return {title:program.title.slice(0,100-suffix.length-3)+' — '+suffix,items:structuredClone(program.items),revisionOf:activeProgramId};
}
