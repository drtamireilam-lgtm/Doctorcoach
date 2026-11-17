'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';
import {Localize} from './language-provider';
import {MuscleExercises} from './anatomy-exercises';
import {WorkoutDemo} from './workout-demo';
import {ExerciseMuscleSummary} from './exercise-muscle-summary';
import {exerciseFor,muscleFor} from '../lib/anatomy-catalog';
import {learningCard,anatomyLabels} from '../lib/anatomy-learning';
import type {WorkoutLearningTarget} from '../lib/workout-learning';
export type WorkoutLearningReturn={element:HTMLElement|null;x:number;y:number};
type ContentProps={target:WorkoutLearningTarget;language:'he'|'en';onNavigate:(target:WorkoutLearningTarget)=>void};
export function WorkoutLearningContent({target,language,onNavigate}:ContentProps){
 const he=language==='he',t=anatomyLabels[language];
 if(target.kind==='muscle'){
  const card=learningCard(target.slug);if(!card)return <p role="status">{he?'כרטיס למידה למבנה זה עדיין אינו זמין.':'A learning card is not available for this structure yet.'}</p>;
  return <article className="care-stack workout-learning-muscle" data-no-translate>
   <p role="note">{he?'המידע והתרגילים מתייחסים לשריר השלם, ולא לתת־החלק שנבחר במודל.':'Information and exercises refer to the whole muscle, not only the selected model subdivision.'}</p>
   <dl className="atlas-definitions">{(['location','action','training','origin','insertion','joints'] as const).map(field=><div key={field}><dt>{t[field]}</dt><dd>{card[field][language]}</dd></div>)}{card.innervation&&<div><dt>{he?'עצבוב':'Innervation'}</dt><dd>{card.innervation[language]}</dd></div>}</dl>
   <MuscleExercises slug={target.slug} language={language} onExercise={id=>onNavigate({kind:'exercise',id,fromMuscle:target.slug})}/>
   <a href={card.source} target="_blank" rel="noopener noreferrer">{t.source} ↗</a><p className="care-muted">{t.reviewPending}</p>
  </article>;
 }
 const exercise=exerciseFor(target.id);if(!exercise)return <p role="status">{he?'ההסבר לתרגיל הזה עדיין אינו זמין.':'Instructions for this exercise are not available yet.'}</p>;
 return <Localize><article className="care-stack workout-learning-exercise">
  {target.fromMuscle&&<button type="button" className="text-button" onClick={()=>onNavigate({kind:'muscle',slug:target.fromMuscle!})}>{he?'חזרה לכרטיס השריר':'Back to muscle card'}</button>}
  <h3>{he?'על התרגיל':'About this exercise'}</h3><p>{exercise.desc}</p>
  <h3>{he?'דגשים לביצוע':'Technique cues'}</h3><ul>{exercise.cues.map((cue,index)=><li key={index}>{cue}</li>)}</ul>
  <WorkoutDemo key={exercise.id} exerciseId={exercise.id}/>
  <ExerciseMuscleSummary exerciseId={exercise.id} language={language} onMuscle={link=>onNavigate({kind:'muscle',slug:link.slug})}/>
  <p className="care-muted">{he?'מידע לימודי בלבד. פתיחת ההסבר אינה מוסיפה תרגיל או משנה את המינון בתוכנית.':'Educational information only. Opening these instructions does not add an exercise or change its program prescription.'}</p>
 </article></Localize>;
}
export function WorkoutLearningDialog({target,language,onNavigate,onClose,returnTo}:ContentProps&{onClose:()=>void;returnTo:RefObject<WorkoutLearningReturn|null>}){
 const he=language==='he',content=useRef<HTMLDivElement|null>(null),title=useRef<HTMLHeadingElement|null>(null),id=target.kind==='muscle'?target.slug:target.id;
 const muscle=target.kind==='muscle'?muscleFor(target.slug):undefined,exercise=target.kind==='exercise'?exerciseFor(target.id):undefined;
 const heading=muscle?(he?muscle.name:muscle.en):exercise?(he?exercise.name:exercise.en):(he?'למידה מתוך התוכנית':'Program learning');
 useEffect(()=>{if(content.current)content.current.scrollTop=0;title.current?.focus({preventScroll:true});},[target.kind,id,language]);
 return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent ref={content} className="dc-dialog workout-learning-dialog" dir={he?'rtl':'ltr'} showCloseButton={false} data-no-translate onCloseAutoFocus={event=>{event.preventDefault();requestAnimationFrame(()=>{const saved=returnTo.current;if(!saved?.element?.isConnected)return;saved.element.focus({preventScroll:true});window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});});}}>
  <button type="button" className="button secondary" onClick={onClose}>{he?'חזרה למפה':'Back to map'}</button>
  <DialogTitle ref={title} tabIndex={-1}>{heading}</DialogTitle><DialogDescription>{he?'למידה ליד התוכנית — אפשר לחזור לאותה בחירה במפת השרירים.':'Learn alongside your program and return to the same muscle-map selection.'}</DialogDescription>
  <WorkoutLearningContent target={target} language={language} onNavigate={onNavigate}/>
 </DialogContent></Dialog>;
}
