'use client';
import {useLanguage} from './language-provider';
import {exerciseMuscles,anatomyHash,learningCard,anatomyLabels} from '../lib/anatomy-learning';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {modelRegionForMuscle} from '../lib/anatomy-models';
import {muscles} from '../lib/anatomy';
import {stretchingTargets} from '../lib/stretch-anatomy-targets';
export function ExerciseAnatomyLinks({exerciseId}:{exerciseId:string}){
 const {language}=useLanguage();const links=[...exerciseMuscles(exerciseId),...stretchingTargets(exerciseId).filter(slug=>!exerciseMuscles(exerciseId).some(link=>link.slug===slug)).map(slug=>({slug,role:'stretch' as const}))];const t=anatomyLabels[language];
 if(!links.length)return null;
 return <nav className="atlas-exercise-links" aria-label={language==='he'?'ללמוד על השרירים':'Learn about the muscles'} data-no-translate><h3>{language==='he'?'ללמוד על השרירים':'Learn about the muscles'}</h3>{links.map(link=>{const m=muscles.find(m=>m.slug===link.slug),card=learningCard(link.slug);return m&&card?<a className="care-pill" key={m.slug} href={anatomyHash({region:modelRegionForMuscle(m.slug,card.region,anatomy3dLabEnabled),muscle:m.slug,side:'both',view:card.view})} onClick={e=>{if(window.location.hash===e.currentTarget.hash){e.preventDefault();window.dispatchEvent(new HashChangeEvent('hashchange'));}}}>{language==='he'?m.name:m.en} · {link.role==='stretch'?(language==='he'?'שריר מטרה למתיחה':'Stretch target'):t[link.role]} ↗</a>:null;})}</nav>;
}
