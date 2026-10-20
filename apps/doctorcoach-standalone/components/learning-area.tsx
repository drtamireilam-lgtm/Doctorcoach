'use client';
import {Localize} from "../components/language-provider";
import {useEffect,useState} from 'react';
import {AnatomyWorkspace} from './anatomy-workspace';
import {LearningWorkspace} from './learning-workspace';
import {learningTopic,learningArticleHref} from '../lib/learning-navigation';
import type {LearningTopic} from '../lib/learning-navigation';
export function LearningArea({onExercise}:{onExercise:(id:string)=>void}){
 const [topic,setTopic]=useState<LearningTopic|null>(null);
 useEffect(()=>{const sync=()=>setTopic(learningTopic(window.location.hash));sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync);};},[]);
 return <Localize>{<div className="care-stack"><nav className="learning-view-nav" aria-label="ניווט באנטומיה ולמידה"><a href="#learn" aria-current={!topic?'page':undefined}>מפת הגוף והשרירים</a><a href={learningArticleHref(topic&&topic!=='doctorcoach'?topic:'rpe')} aria-current={topic&&topic!=='doctorcoach'?'page':undefined}>מדריכים ומאמץ</a><a href="#learn?article=doctorcoach" aria-current={topic==='doctorcoach'?'page':undefined}>איך DoctorCoach עובד</a></nav>{topic?<LearningWorkspace topic={topic}/>:<AnatomyWorkspace onExercise={onExercise}/>}</div>}</Localize>;
}
