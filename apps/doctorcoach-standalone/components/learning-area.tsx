'use client';
import {Localize,useLanguage} from "../components/language-provider";
import {useEffect,useState} from 'react';
import {AnatomyWorkspace} from './anatomy-workspace';
import {LearningWorkspace} from './learning-workspace';
import {learningTopic,learningArticleHref,learningSection} from '../lib/learning-navigation';
import {ClinicalLearning} from './clinical-learning';
import type {LearningTopic} from '../lib/learning-navigation';
export function LearningArea({onExercise}:{onExercise:(id:string)=>void}){
 const [topic,setTopic]=useState<LearningTopic|null>(null);
 const [section,setSection]=useState<ReturnType<typeof learningSection>|null>(null);
 const {language}=useLanguage(),en=language==='en';
 useEffect(()=>{const sync=()=>{setTopic(learningTopic(window.location.hash));setSection(learningSection(window.location.hash));};sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[]);
 return <div className="care-stack clinical-learning-area"><nav className="panel learning-view-nav clinical-sections" aria-label={en?'Learning sections':'מדורי הלמידה'}>{([['anatomy',en?'Anatomy':'אנטומיה'],['physiology',en?'Physiology':'פיזיולוגיה'],['supplements',en?'Supplements':'תוספים']] as const).map(([id,label])=><a key={id} href={id==='anatomy'?'#learn':'#learn?section='+id} aria-current={section===id?'page':undefined}>{label}</a>)}</nav>{section===null?<p role="status">{en?'Loading learning area…':'טוענים את אזור הלמידה…'}</p>:section==='anatomy'?<Localize><div className="care-stack"><nav className="learning-view-nav" aria-label="ניווט באנטומיה ולמידה"><a href="#learn" aria-current={!topic?'page':undefined}>מפת הגוף והשרירים</a><a href={learningArticleHref(topic&&topic!=='doctorcoach'?topic:'rpe')} aria-current={topic&&topic!=='doctorcoach'?'page':undefined}>מדריכים ומאמץ</a><a href="#learn?article=doctorcoach" aria-current={topic==='doctorcoach'?'page':undefined}>איך DoctorCoach עובד</a></nav>{topic?<LearningWorkspace topic={topic}/>:<AnatomyWorkspace onExercise={onExercise}/>}</div></Localize>:<ClinicalLearning section={section} topic={topic}/>}</div>;
}
