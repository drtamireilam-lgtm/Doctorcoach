'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AnatomyPainWorkspace} from './anatomy-pain-workspace';
import {useLanguage} from './language-provider';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import type {TrainingController} from '../hooks/use-training';
import type {PainWorkoutContext} from '../lib/anatomy-pain-context';
export function WorkoutPainReport({controller,context,onDirty}:{controller:TrainingController;context:PainWorkoutContext;onDirty?:(dirty:boolean)=>void}){
 const {language}=useLanguage(),he=language==='he';const [open,setOpen]=useState(false),[dirty,setDirty]=useState(false);const parent=useRef(onDirty);parent.current=onDirty;
 const token=useRef({});
 useEffect(()=>{window.dispatchEvent(new CustomEvent('dc-pain-draft',{detail:{token:token.current,dirty}}));const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};if(dirty)window.addEventListener('beforeunload',warn);return()=>{window.dispatchEvent(new CustomEvent('dc-pain-draft',{detail:{token:token.current,dirty:false}}));window.removeEventListener('beforeunload',warn);};},[dirty]);
 const changed=useCallback((value:boolean)=>{setDirty(value);parent.current?.(value);},[]);
 useEffect(()=>()=>parent.current?.(false),[]);
 if(!anatomy3dLabEnabled||!['ready','error','loading'].includes(controller.auth)||!controller.feed.ownerId)return null;
 function close(){if(dirty&&!window.confirm(he?'יש דיווח כאב שטרם התקבל אישור לשמירתו. סגירה תמחק את הטיוטה; בקשה שכבר הגיעה לשרת עשויה להופיע בהיסטוריה. לסגור?':'This pain report has no save confirmation. Closing discards the draft; a request that reached the server may appear in history. Close?'))return;setOpen(false);changed(false);}
 return <section hidden={controller.auth!=='ready'} inert={controller.auth!=='ready'} className="workout-pain-report care-stack" data-no-translate><button type="button" className="button secondary" aria-expanded={open} onClick={()=>open?close():setOpen(true)}>{open?(he?'סגירת מפת הכאב וחזרה לאימון':'Close pain map and return to workout'):context.timing==='before'?(he?'סימון כאב לפני האימון — רשות':'Mark pain before workout — optional'):context.timing==='after'?(he?'סימון כאב אחרי האימון — רשות':'Mark pain after workout — optional'):(he?'סימון כאב בתרגיל — רשות':'Mark pain in this exercise — optional')}</button>{open&&<AnatomyPainWorkspace key={controller.feed.ownerId} expectedOwner={controller.feed.ownerId} auth={controller.auth} context={context} embedded onDirty={changed}/>}</section>;
}
