'use client';
import {exerciseAtlasHash} from '../lib/anatomy-training';
import {useLanguage} from './language-provider';
import {anatomyHash,learningCard} from '../lib/anatomy-learning';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {modelRegionForMuscle} from '../lib/anatomy-models';
import {exerciseAnatomyLinks} from '../lib/anatomy-exercises';
import {ExerciseMuscleSummary} from './exercise-muscle-summary';
export function ExerciseAnatomyLinks({exerciseId,includePainLink=true}:{exerciseId:string;includePainLink?:boolean}){
 const {language}=useLanguage(),he=language==='he',links=exerciseAnatomyLinks(exerciseId),atlas=exerciseAtlasHash(exerciseId);
 return <nav className="atlas-exercise-links" aria-label={he?'ללמוד על השרירים':'Learn about the muscles'} data-no-translate>
  <ExerciseMuscleSummary exerciseId={exerciseId} language={language} muscleHref={link=>{if(link.part&&anatomy3dLabEnabled)return atlas??undefined;const card=learningCard(link.slug);return card?anatomyHash({region:modelRegionForMuscle(link.slug,card.region,anatomy3dLabEnabled),muscle:link.slug,exercise:exerciseId,side:'both',view:card.view}):undefined;}}/>
  {anatomy3dLabEnabled&&includePainLink&&<a className="care-pill" href={atlas?'#learn?pain=1&exercise='+encodeURIComponent(exerciseId):'#learn?pain=1'}>{he?'דיווח כאב בהקשר לתרגיל':'Report pain in this exercise context'}</a>}
  {anatomy3dLabEnabled&&atlas&&links.length>0&&<a className="button secondary" href={atlas}>{he?'הצגת כל השרירים על מודל הגוף':'Show all muscles on the body model'}</a>}
 </nav>;
}
