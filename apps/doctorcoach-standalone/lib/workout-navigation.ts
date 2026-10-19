/** Only route/dirty metadata is retained here, never unsaved set values. */
export function workoutNavigation(){
 let current='',dirty=false;
 return {
  setDirty(value:boolean){dirty=value;},
  accept(target:string,confirmLeave:()=>boolean){
   if(dirty&&target!==current&&!confirmLeave())return false;
   current=target;return true;
  },
  current(){return current;},
 };
}

import type {TrainingSession,SessionExercise} from './training.ts';
import {workoutGroups} from './workout-sections.ts';
import {planItemKey} from './workout-days.ts';
export const workoutExerciseAnchor=(sessionId:string,item:SessionExercise)=>`workout-exercise-${encodeURIComponent(sessionId)}-${encodeURIComponent(planItemKey(item))}`;
export const workoutSetAnchor=(sessionId:string,item:SessionExercise,index:number)=>`${workoutExerciseAnchor(sessionId,item)}-set-${index}`;
export function workoutNavigationTargets(session:TrainingSession){
 const items=workoutGroups(session.items).flatMap(group=>group.items);
 const pending=items.map(item=>({item,index:item.results.findIndex(set=>!set.done)})).find(target=>target.index>=0)??null;
 return {items,pending};
}
/** Explicit navigation only: reveal a collapsed exercise, then focus without editing any field. */
export function revealWorkoutTarget(id:string,doc:Pick<Document,'getElementById'>=document,schedule:(callback:()=>void)=>void=requestAnimationFrame){
 const target=doc.getElementById(id);if(!target)return false;
 const exercise=target.closest('.exercise-disclosure');
 const toggle=exercise?.querySelector<HTMLButtonElement>('.exercise-disclosure-toggle');
 if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();
 schedule(()=>{if(!target.isConnected)return;target.focus({preventScroll:true});target.scrollIntoView({behavior:'smooth',block:'start'});});
 return true;
}
