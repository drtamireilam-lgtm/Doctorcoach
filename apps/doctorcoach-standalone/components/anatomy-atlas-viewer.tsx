'use client';
import {AnatomyModelViewer} from './anatomy-model-viewer';
import {anatomyModels,modelForRegion} from '../lib/anatomy-models';
export function AnatomyAtlasViewer({language,region,muscle,overview,onOverview,onRegion,onExercise,onMuscle}:{language:'he'|'en';region:string;muscle?:string;overview:boolean;onOverview:()=>void;onRegion:(id:string)=>void;onExercise:(id:string)=>void;onMuscle:(id:string)=>void}){
 const he=language==='he',model=overview?anatomyModels[0]:modelForRegion(region);
 return <div className="care-stack" data-atlas-view={overview?'body':'region'}>
  {!overview&&<button className="back-link" onClick={onOverview}>{he?'חזרה לגוף המלא':'Back to full body'}</button>}
  {model?<AnatomyModelViewer key={model.id} model={model} language={language} autoOpen initialSelection={overview?undefined:muscle} onRegion={onRegion} onExercise={onExercise} onMuscle={onMuscle}/>:<div className="panel" role="status"><h2>{he?'המודל המפורט לאזור זה עדיין אינו זמין':'The detailed model for this region is not available yet'}</h2><p>{he?'אפשר ללמוד על השרירים והתרגילים ברשימה שבהמשך.':'The muscle and exercise learning list is available below.'}</p></div>}

 </div>;
}
