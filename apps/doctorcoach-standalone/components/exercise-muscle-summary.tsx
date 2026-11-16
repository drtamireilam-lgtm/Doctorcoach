'use client';
import {Localize} from './language-provider';
import {exerciseAnatomyLinks} from '../lib/anatomy-exercises';
import {anatomyRoleColors,exerciseMuscleName} from '../lib/anatomy-training';
import {anatomyLabels} from '../lib/anatomy-learning';
import type {ExerciseMuscleLink} from '../lib/anatomy-exercise-profiles';
export function ExerciseMuscleSummary({exerciseId,language,muscleHref,onMuscle}:{exerciseId:string;language:'he'|'en';muscleHref?:(link:ExerciseMuscleLink)=>string|undefined;onMuscle?:(link:ExerciseMuscleLink)=>void}){
 const he=language==='he',links=exerciseAnatomyLinks(exerciseId),labels=anatomyLabels[language];
 if(!links.length)return <p role="status">{he?'מיפוי שרירים לתרגיל זה עדיין אינו זמין.':'Muscle mapping is not available for this exercise yet.'}</p>;
 return <section className="anatomy-exercise-summary" aria-label={he?'שרירים בתרגיל לפי תפקיד':'Exercise muscles by role'} data-no-translate><h3>{he?'אילו שרירים משתתפים?':'Which muscles participate?'}</h3>
  <div className="anatomy-exercise-role-grid">{(['primary','secondary','stabilizer','stretch'] as const).map(role=>{const members=links.filter(link=>link.role===role);if(!members.length)return null;const label=role==='stretch'?(he?'שריר מטרה למתיחה':'Stretch target'):labels[role];return <section key={role} className={'anatomy-exercise-role anatomy-exercise-role--'+role} style={{borderInlineStartColor:anatomyRoleColors[role]}}><h4><span className="anatomy-role-swatch" aria-hidden="true" style={{background:anatomyRoleColors[role]}}/>{label}</h4><small>{({primary:he?'מטרת התנועה בתרגיל':'Target of the exercise',secondary:he?'מסייע בביצוע התנועה':'Assists the movement',stabilizer:he?'מסייע בשמירת היציבות':'Helps maintain stability',stretch:he?'מטרת המתיחה; אינו דירוג של פעילות שריר':'Stretch target; not an activation ranking'})[role]}</small><ul>{members.map(link=>{const name=exerciseMuscleName(link,language),href=muscleHref?.(link);return <li key={link.slug+':'+(link.part??'')}>{href?<a href={href} onClick={event=>{if(window.location.hash===event.currentTarget.hash){event.preventDefault();window.dispatchEvent(new HashChangeEvent('hashchange'));}}}>{name} ↗</a>:onMuscle?<button type="button" className="text-button" onClick={()=>onMuscle(link)}>{name}</button>:<span>{name}</span>}</li>;})}</ul></section>;})}</div>
  <small className="care-muted">{he?'מיפוי לימודי של תפקידים בתנועה, ללא אחוזי הפעלה. התפקיד עשוי להשתנות עם טכניקה ווריאציה; הרשימה אינה בהכרח ממצה. סקירה קלינית ממתינה.':'Educational movement roles, not activation percentages. Roles can vary with technique and variation; the list is not necessarily exhaustive. Clinical review pending.'}</small>
 </section>;
}

/** Preserve authored descriptions even where the geometry mapping is partial. */
export function ExerciseCatalogMuscleNotes({primary,secondary}:{primary?:string;secondary?:string}){return primary||secondary?<Localize><dl className="care-definition"><dt>שרירים עיקריים</dt><dd>{primary}</dd><dt>שרירים מסייעים</dt><dd>{secondary}</dd></dl></Localize>:null;}
