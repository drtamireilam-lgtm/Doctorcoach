'use client';
import {AnatomyModelViewer} from './anatomy-model-viewer';
import {anatomyModels,modelForRegion} from '../lib/anatomy-models';
import type {AnatomyOverview} from '../lib/anatomy-overview';
export function AnatomyAtlasViewer({language,region,muscle,overview,overviewModel,onOverviewModel,onOverview,onRegion,onExercise,onMuscle}:{language:'he'|'en';region:string;muscle?:string;overview:boolean;overviewModel:AnatomyOverview;onOverviewModel:(id:AnatomyOverview)=>void;onOverview:()=>void;onRegion:(id:string)=>void;onExercise:(id:string)=>void;onMuscle:(id:string)=>void}){
 const he=language==='he',model=overview?anatomyModels.find(m=>m.id===overviewModel):modelForRegion(region);
 return <div className="care-stack" data-atlas-view={overview?'body':'region'}>
  {overview&&<nav className="anatomy-region-list" aria-label={he?'תצוגת הגוף המלא':'Full-body view'}><button type="button" aria-pressed={overviewModel==='musculoskeletal'} onClick={()=>onOverviewModel('musculoskeletal')}>{he?'שלד ושרירים':'Bones and muscles'}</button><button type="button" aria-pressed={overviewModel==='skeleton'} onClick={()=>onOverviewModel('skeleton')}>{he?'שלד גוף מלא':'Full-body skeleton'}</button><button type="button" aria-pressed={overviewModel==='body'} onClick={()=>onOverviewModel('body')}>{he?'מפת אזורי הגוף':'Body region map'}</button></nav>}
  {!overview&&<button className="back-link" onClick={onOverview}>{he?'חזרה לגוף המלא':'Back to full body'}</button>}
  {model?<AnatomyModelViewer key={model.id} model={model} language={language} autoOpen initialSelection={overview?undefined:muscle} onRegion={onRegion} onExercise={onExercise} onMuscle={onMuscle}/>:<div className="panel" role="status"><h2>{he?'המודל המפורט לאזור זה עדיין אינו זמין':'The detailed model for this region is not available yet'}</h2><p>{he?'אפשר ללמוד על השרירים והתרגילים ברשימה שבהמשך.':'The muscle and exercise learning list is available below.'}</p></div>}

 </div>;
}
