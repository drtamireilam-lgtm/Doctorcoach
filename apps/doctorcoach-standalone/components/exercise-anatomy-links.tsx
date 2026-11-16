'use client';
import {exerciseAtlasHash} from '../lib/anatomy-training';
import {useLanguage} from './language-provider';
import {anatomyHash,learningCard,anatomyLabels} from '../lib/anatomy-learning';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {modelRegionForMuscle} from '../lib/anatomy-models';
import {muscles} from '../lib/anatomy';
import {exerciseAnatomyLinks} from '../lib/anatomy-exercises';
export function ExerciseAnatomyLinks({exerciseId}:{exerciseId:string}){
 const {language}=useLanguage();const links=exerciseAnatomyLinks(exerciseId);const t=anatomyLabels[language];

 return <nav className="atlas-exercise-links" aria-label={language==='he'?'ללמוד על השרירים':'Learn about the muscles'} data-no-translate><h3>{language==='he'?'ללמוד על השרירים':'Learn about the muscles'}</h3>{!links.length&&<p>{language==='he'?'מיפוי שרירים לתרגיל זה עדיין אינו זמין.':'Muscle mapping is not available for this exercise yet.'}</p>}<a hidden={!anatomy3dLabEnabled} className="care-pill" href={'#learn?pain=1&exercise='+encodeURIComponent(exerciseId)}>{language==='he'?'דיווח כאב בהקשר לתרגיל':'Report pain in this exercise context'}</a><a hidden={!anatomy3dLabEnabled} className="button secondary" href={exerciseAtlasHash(exerciseId)??'#learn'}>{language==='he'?'הצגת כל השרירים על מודל הגוף':'Show all muscles on the body model'}</a>{links.map(link=>{const m=muscles.find(m=>m.slug===link.slug),card=learningCard(link.slug);return m&&card?<a className="care-pill" key={m.slug} href={anatomyHash({region:modelRegionForMuscle(m.slug,card.region,anatomy3dLabEnabled),muscle:m.slug,exercise:exerciseId,side:'both',view:card.view})} onClick={e=>{if(window.location.hash===e.currentTarget.hash){e.preventDefault();window.dispatchEvent(new HashChangeEvent('hashchange'));}}}>{language==='he'?m.name:m.en} · {link.role==='stretch'?(language==='he'?'שריר מטרה למתיחה':'Stretch target'):t[link.role]} ↗</a>:null;})}</nav>;
}
