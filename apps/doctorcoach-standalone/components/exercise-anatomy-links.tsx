'use client';
import {useLanguage} from './language-provider';
import {exerciseMuscles,anatomyHash,learningCard,anatomyLabels} from '../lib/anatomy-learning';
import {muscles} from '../lib/anatomy';
export function ExerciseAnatomyLinks({exerciseId}:{exerciseId:string}){
 const {language}=useLanguage();const links=exerciseMuscles(exerciseId);const t=anatomyLabels[language];
 if(!links.length)return null;
 return <nav className="atlas-exercise-links" aria-label={language==='he'?'ללמוד על השרירים':'Learn about the muscles'} data-no-translate><h3>{language==='he'?'ללמוד על השרירים':'Learn about the muscles'}</h3>{links.map(link=>{const m=muscles.find(m=>m.slug===link.slug),card=learningCard(link.slug)!;return m?<a className="care-pill" key={m.slug} href={anatomyHash({region:card.region,muscle:m.slug,side:'both',view:card.view})} onClick={e=>{if(window.location.hash===e.currentTarget.hash){e.preventDefault();window.dispatchEvent(new HashChangeEvent('hashchange'));}}}>{language==='he'?m.name:m.en} · {t[link.role]} ↗</a>:null;})}</nav>;
}
