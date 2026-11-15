'use client';
import {useState} from 'react';
import {useLanguage} from './language-provider';
import {exerciseFor} from '../lib/anatomy';
import {anatomyLabels} from '../lib/anatomy-learning';
import {muscleExerciseLinks} from '../lib/anatomy-exercises';
export function MuscleExercises({slug,onExercise,language:requestedLanguage}:{slug:string;onExercise:(id:string)=>void;language?:'he'|'en'}){
 const {language:contextLanguage}=useLanguage();const language=requestedLanguage??contextLanguage;const he=language==='he';const [type,setType]=useState('all');
 const links=muscleExerciseLinks(slug).flatMap(link=>{const exercise=exerciseFor(link.id);return exercise?[{...link,exercise}]:[];});
 const visible=links.filter(link=>type==='all'||(type==='stretch'?link.role==='stretch':link.role!=='stretch'));
 return <section data-no-translate aria-label={anatomyLabels[language].exercises}><h3>{anatomyLabels[language].exercises}</h3>{links.length>0&&<label className="library-filter">{he?'סוג תרגיל':'Exercise type'}<select value={type} onChange={event=>setType(event.target.value)}><option value="all">{he?'הכל':'All'}</option><option value="strength">{he?'חיזוק ותנועה':'Strength and movement'}</option><option value="stretch">{he?'מתיחות':'Stretches'}</option></select></label>}<div className="atlas-exercises">{visible.map(({exercise,role})=><button type="button" className="panel" key={exercise.id} onClick={()=>onExercise(exercise.id)}><strong>{he?exercise.name:exercise.en}</strong><small>{role==='stretch'?(he?'שריר מטרה למתיחה':'Stretch target'):anatomyLabels[language][role]}</small><span aria-hidden="true">↗</span></button>)}</div>{!visible.length&&<p className="care-muted">{links.length?(he?'אין תרגילים מהסוג שנבחר.':'No exercises of this type.'):anatomyLabels[language].noExercises}</p>}</section>;
}
