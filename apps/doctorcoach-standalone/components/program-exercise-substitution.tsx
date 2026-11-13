'use client';
import {useState} from 'react';
import type {Exercise} from '../lib/content';
import type {PlanItem} from '../lib/training';
import {programExerciseUnit,substituteProgramExercise} from '../lib/program-substitution';
import {searchExerciseNames,bilingualExerciseName} from '../lib/exercise-search';
import {useLanguage} from './language-provider';

export function ProgramExerciseSubstitution({item,catalog,onChange}:{item:PlanItem;catalog:Exercise[];onChange:(patch:Partial<PlanItem>)=>void}){
 const [selected,setSelected]=useState(''),[query,setQuery]=useState('');const english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 const eligible=catalog.filter(e=>e.id!==item.exerciseId&&!e.id.startsWith('cardio:')&&programExerciseUnit(e)===item.unit);
 const replacement=eligible.find(e=>e.id===selected),filtered=searchExerciseNames(eligible,query);
 return <details className="panel"><summary>{t('החלפת תרגיל בטיוטה','Replace draft exercise')}</summary><label className="care-field">{t('חיפוש תרגיל חלופי','Search replacement exercises')}<input type="search" dir="auto" value={query} onChange={e=>{setQuery(e.target.value);setSelected('');}}/></label><label className="care-field">{t('תרגיל חלופי','Replacement exercise')}<select dir="auto" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('בחרו תרגיל','Choose an exercise')}</option>{filtered.map(e=><option value={e.id} key={e.id}>{bilingualExerciseName(e)}</option>)}</select></label>{!filtered.length&&<p role="status">{t('לא נמצאו תרגילים מתאימים. נסו שם אחר.','No matching exercises. Try another name.')}</p>}<p className="care-muted">{t('הסטים, החזרות ויעדי המאמץ יישמרו. משקל הפתיחה, סטי החימום והחלופות הקודמות יימחקו ויש להתאימם לתרגיל החדש. אימונים קודמים אינם משתנים.','Sets, repetitions and effort targets are retained. Starting load, warm-up sets and previous alternatives are cleared so you can adapt them to the new exercise. Previous workouts stay unchanged.')}</p><button type="button" className="button secondary" disabled={!replacement} onClick={()=>{if(replacement){onChange(substituteProgramExercise(item,replacement));setSelected('');}}}>{t('החלת החלפת התרגיל','Apply exercise replacement')}</button></details>;
}
