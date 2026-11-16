'use client';
import {useId,useState} from 'react';
import {inlineLearningFor} from '../lib/anatomy-inline-learning';
import {anatomyLabels} from '../lib/anatomy-learning';
export function AnatomyLearningPreview({slug,language,parentScope=false,onExercise}:{slug:string;language:'he'|'en';parentScope?:boolean;onExercise:(id:string)=>void}){
 const he=language==='he',id=useId(),[group,setGroup]=useState<'strength'|'stretch'|null>(null);
 const preview=inlineLearningFor(slug);
 if(!preview.card)return <p>{he?'מידע לימודי מפורט למבנה זה עדיין אינו זמין.':'Detailed learning information is not yet available for this structure.'}</p>;
 return <section className="anatomy-learning-preview" aria-label={he?'למידה ליד השריר':'Inline muscle learning'} data-no-translate>
  {parentScope&&<small role="note">{he?'המידע והקישורים מתייחסים לשריר השלם, ולא לתת־החלק בלבד.':'Information and links refer to the whole muscle, not this subdivision alone.'}</small>}
  <p><b>{he?'תפקיד עיקרי: ':'Main actions: '}</b>{preview.card.action[language]}</p>
  <small>{he?'מידע לימודי · סקירה קלינית ממתינה':'Educational information · clinical review pending'}</small>
  <div className="anatomy-preview-actions">{(['strength','stretch'] as const).map(value=><button type="button" key={value} aria-expanded={group===value} aria-controls={`${id}-${value}`} onClick={()=>setGroup(old=>old===value?null:value)}>{value==='strength'?(he?'חיזוק ותנועה':'Strength and movement'):(he?'מתיחות':'Stretches')}</button>)}</div>
  {(['strength','stretch'] as const).map(value=><div key={value} id={`${id}-${value}`} hidden={group!==value} className={group===value?'anatomy-preview-links':undefined} aria-label={value==='strength'?(he?'תרגילי חיזוק ותנועה':'Strength and movement exercises'):(he?'תרגילי מתיחה':'Stretch exercises')}>
   {group===value&&(preview[value].length?preview[value].map(({exercise,role})=><button type="button" key={exercise.id} onClick={()=>onExercise(exercise.id)}><span>{he?exercise.name:exercise.en}</span><small>{role==='stretch'?(he?'מטרת מתיחה':'Stretch target'):anatomyLabels[language][role]}</small></button>):<p role="status">{he?'טרם הוגדר קישור מהסוג הזה לשריר.':'No exercise link of this type has been defined for this muscle.'}</p>)}
  </div>)}
 </section>;
}
