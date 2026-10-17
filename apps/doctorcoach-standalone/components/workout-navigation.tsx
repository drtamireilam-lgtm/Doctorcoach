'use client';
import type {TrainingSession,SessionExercise} from '../lib/training';
import {workoutNavigationTargets,workoutExerciseAnchor,workoutSetAnchor,revealWorkoutTarget} from '../lib/workout-navigation';
import {Localize} from './language-provider';
export function NextWorkoutSet({session,busy}:{session:TrainingSession;busy:boolean}){
 const {pending}=workoutNavigationTargets(session);
 return <Localize><section className="panel next-workout-set" aria-label="המשך האימון"><div role="status">{pending?<><strong>הסט הבא לביצוע</strong><p><span data-no-translate>{pending.item.name}</span> · סט {pending.index+1} מתוך {pending.item.results.length}</p></>:<><strong>כל הסטים סומנו כבוצעו</strong><p>אפשר לחזור ולערוך סט קודם, או לסכם ולשמור את האימון.</p></>}</div>{pending&&<button className="button primary" disabled={busy} onClick={()=>revealWorkoutTarget(workoutSetAnchor(session.id,pending.item,pending.index))}>לסט הבא</button>}</section></Localize>;
}
export function ExerciseJumpLinks({session,item,busy}:{session:TrainingSession;item:SessionExercise;busy:boolean}){
 const {items}=workoutNavigationTargets(session),index=items.indexOf(item),previous=items[index-1],next=items[index+1];
 return <Localize><nav className="exercise-jump-links" aria-label="מעבר בין תרגילים">{previous&&<button type="button" className="button secondary" disabled={busy} onClick={()=>revealWorkoutTarget(workoutExerciseAnchor(session.id,previous))}>לתרגיל הקודם: <span data-no-translate>{previous.name}</span></button>}{next&&<button type="button" className="button secondary" disabled={busy} onClick={()=>revealWorkoutTarget(workoutExerciseAnchor(session.id,next))}>לתרגיל הבא: <span data-no-translate>{next.name}</span></button>}</nav></Localize>;
}
