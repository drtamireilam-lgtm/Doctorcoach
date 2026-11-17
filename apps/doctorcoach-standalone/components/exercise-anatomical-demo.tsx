'use client';

import './anatomy-stage.css';
import {useEffect,useId,useRef,useState} from 'react';
import {PressMotionPreview} from './press-motion-preview';
import {useLanguage} from './language-provider';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {anatomyRoleColors} from '../lib/anatomy-training';
import {anatomyModels} from '../lib/anatomy-models';
import {exercisePoseAngle,motionProfile,type ExerciseMotionProfile,type MotionMode} from '../lib/anatomy-exercise-motion';
import {interactiveExerciseAnimation,pressClipFor} from '../lib/exercise-animation-registry';
import type {createAnatomyCanvas} from '../lib/anatomy-canvas';

type Animation = NonNullable<ReturnType<typeof interactiveExerciseAnimation>>;
type Scene = Awaited<ReturnType<typeof createAnatomyCanvas>>;
type LoadState = 'loading'|'ready'|'unsupported'|'failed';

export function ExerciseAnatomicalDemo({exerciseId}:{exerciseId:string}){
 const {language}=useLanguage();
 const he=language==='he';
 const [open,setOpen]=useState(false);
 const playerId=useId();
 const clip=anatomy3dLabEnabled?pressClipFor(exerciseId):undefined;
 const animation=interactiveExerciseAnimation(exerciseId,anatomy3dLabEnabled);
 const profile=animation&&motionProfile(exerciseId);
 if(!anatomy3dLabEnabled&&!profile)return null;

 return <section className="care-stack" data-no-translate dir={he?'rtl':'ltr'}>
  {clip&&<PressMotionPreview key={exerciseId} clip={clip}/>}
  {animation&&profile?<><button className="button secondary" type="button" aria-expanded={open} aria-controls={open?playerId:undefined} onClick={()=>setOpen(value=>!value)}>{open?(he?'סגירת הדגמת תלת־ממד':'Close 3D demonstration'):(he?'הדגמה אנטומית בתלת־ממד':'3D Anatomical Demonstration')}</button>
   {open&&<MotionPlayer key={exerciseId} id={playerId} animation={animation} profile={profile}/>}</>:<p className="care-muted">{he?'אין הדגמה אינטראקטיבית זמינה לתרגיל הזה.':'Interactive animation is unavailable for this exercise.'}</p>}
 </section>;
}

function MotionPlayer({id,animation,profile}:{id:string;animation:Animation;profile:ExerciseMotionProfile}){
 const {language}=useLanguage();
 const he=language==='he';
 const model=anatomyModels.find(value=>value.id===profile.modelId);
 const host=useRef<HTMLDivElement>(null);
 const controller=useRef<Scene|null>(null);
 const [status,setStatus]=useState<LoadState>('loading');
 const [attempt,setAttempt]=useState(0);
 const [mode,setMode]=useState<MotionMode>('motion');
 const [bones,setBones]=useState(true);
 const [muscles,setMuscles]=useState(true);
 const [playing,setPlaying]=useState(false);
 const [speed,setSpeed]=useState(1);
 const [progress,setProgress]=useState(0);
 const [reduced,setReduced]=useState(true);
 const [inView,setInView]=useState(false);
 const [picked,setPicked]=useState<string|null>(null);
 const time=useRef(0);
 const view=useRef({mode,bones,muscles,picked});
 view.current={mode,bones,muscles,picked};
 const ready=status==='ready';
 const reference=mode==='muscles';

 useEffect(()=>{
  const element=host.current;
  if(!element||!model){setStatus('failed');return;}
  const abort=new AbortController();
  setStatus('loading');
  let canvas:HTMLCanvasElement|null=null;
  function releaseScene(){
   canvas?.removeEventListener('webglcontextlost',contextLost);
   canvas=null;
   controller.current?.dispose();
   controller.current=null;
  }
  function contextLost(event:Event){
   event.preventDefault();
   releaseScene();
   setPlaying(false);
   setStatus('failed');
  }
  async function load(){
   try{
    const {createAnatomyCanvas,AnatomyRendererUnavailable}=await import('../lib/anatomy-canvas');
    if(abort.signal.aborted)return;
    try{
     const scene=await createAnatomyCanvas(element!,selectStructure,abort.signal,{model,motion:profile});
     if(abort.signal.aborted){scene.dispose();return;}
     controller.current=scene;
     canvas=element!.querySelector('canvas');
     canvas?.setAttribute('aria-label',animation.title[language]);
     canvas?.addEventListener('webglcontextlost',contextLost);
     setStatus('ready');
    }catch(error){
     if(!abort.signal.aborted)setStatus(error instanceof AnatomyRendererUnavailable?'unsupported':'failed');
    }
   }catch{
    if(!abort.signal.aborted)setStatus('failed');
   }
  }
  function selectStructure(structureId:string|null){
   setPicked(structureId&&Object.hasOwn(animation.roles,structureId)?structureId:null);
  }
  void load();
  return ()=>{
   abort.abort();
   releaseScene();
  };
 },[model,profile,attempt]);

 useEffect(()=>{
  host.current?.querySelector('canvas')?.setAttribute('aria-label',animation.title[language]);
 },[ready,animation,language]);

 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion(){setReduced(query.matches);if(query.matches)setPlaying(false);}
  function syncVisibility(){if(document.hidden)setPlaying(false);}
  syncMotion();
  query.addEventListener('change',syncMotion);
  document.addEventListener('visibilitychange',syncVisibility);
  const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting));
  if(host.current)observer.observe(host.current);
  return ()=>{
   query.removeEventListener('change',syncMotion);
   document.removeEventListener('visibilitychange',syncVisibility);
   observer.disconnect();
  };
 },[]);

 useEffect(()=>{
  if(ready)paint(time.current);
 },[ready,mode,bones,muscles,picked,profile]);

 useEffect(()=>{
  if(!playing||!ready||reduced||reference||!inView)return;
  let frame=0;
  let last=performance.now();
  let painted=0;
  let labelled=0;
  function tick(now:number){
   if(document.hidden)return;
   time.current=(time.current+Math.max(0,now-last)/1000*speed)%profile.secondsPerRep;
   last=now;
   if(now-painted>=1000/30){painted=now;paint(time.current);}
   if(now-labelled>=100){labelled=now;setProgress(100*time.current/profile.secondsPerRep);}
   frame=requestAnimationFrame(tick);
  }
  frame=requestAnimationFrame(tick);
  return ()=>cancelAnimationFrame(frame);
 },[playing,ready,reduced,reference,inView,speed,profile]);

 function paint(seconds:number){
  const {mode,bones,muscles,picked}=view.current;
  const angle=exercisePoseAngle(seconds,profile);
  controller.current?.setExercisePose(angle,mode,bones,muscles,picked);
  if(host.current)host.current.dataset.motionAngle=angle.toFixed(2);
 }

 function seek(percent:number){
  setPlaying(false);
  time.current=percent*profile.secondsPerRep/100;
  setProgress(percent);
  paint(time.current);
 }

 function changeMode(value:MotionMode){
  setPlaying(false);
  setPicked(null);
  setMode(value);
 }

 const phases=animation.phases;
 const phase=phases.reduce((current,next)=>next.start<=progress/100?next:current,phases[0]);
 const phaseLabel=progress===100?(he?'חזרה הושלמה':'Repetition complete'):phase?.label[language];
 const roles=[['primary',he?'עיקריים':'Primary'],['secondary',he?'מסייעים':'Assisting'],['stabilizer',he?'מייצבים':'Stabilizers']] as const;
 const muscleLabel=(structureId:string)=>model?.structures.find(structure=>structure.id===structureId)?.[language]??structureId;

 return <section id={id} className="panel care-stack" dir={he?'rtl':'ltr'} aria-label={animation.title[language]} data-exercise-motion={profile.exerciseId} data-motion-playing={playing?'true':'false'} data-motion-mode={mode} data-no-translate>
  <h3>{animation.title[language]}</h3>
  <p>{animation.variantLabel[language]}</p>
  {animation.review==='pending'&&<p role="note">{he?'אב־טיפוס לימודי · ממתין לסקירה אנטומית':'Teaching prototype · Anatomical review pending'}</p>}
  <p>{animation.notes[language]}</p>
  <div className="anatomy-region-list" role="group" aria-label={he?'מצב ההדגמה':'Demonstration mode'}>{([
   ['motion',he?'הדגמת תנועה':'Movement demonstration'],
   ['muscles',he?'שרירים במנח ייחוס':'Muscles in reference pose'],
   ['joints',he?'שלד ומפרקים':'Skeleton and joints'],
  ] as const).map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>changeMode(value)}>{label}</button>)}</div>
  <p>{reference?(he?'הדגשת השרירים מוצגת במנח הייחוס. תפקידי השרירים זמניים וממתינים לסקירה.':'Muscle highlights use the source reference pose. Muscle roles are provisional.'):(he?'בתצוגת התנועה מוצגות העצמות. אפשר לפתוח את מנח הייחוס כדי לזהות את השרירים.':'The movement view shows the bones. Open the reference pose to identify muscles.')}</p>
  {status==='loading'&&<p role="status">{he?'טוען את המודל האנטומי…':'Loading the anatomical model…'}</p>}
  {(status==='unsupported'||status==='failed')&&<div role="alert">
   <p>{status==='unsupported'?(he?'תצוגת תלת־ממד אינה זמינה במכשיר או בדפדפן הזה.':'3D rendering is unavailable on this device or browser.'):(he?'טעינת ההדגמה נכשלה. אפשר לנסות לטעון אותה שוב.':'The demonstration could not load. You can retry.')}</p>
   <button type="button" onClick={()=>{setPlaying(false);setAttempt(value=>value+1);}}>{he?'ניסיון נוסף':'Retry'}</button>
  </div>}
  <div ref={host} className="anatomy-model-canvas anatomy-studio-stage" data-motion-angle="0" hidden={status==='failed'||status==='unsupported'} style={{height:'min(55vh,480px)',minHeight:280,width:'100%',borderRadius:20,overflow:'hidden'}}/>
  <div className="anatomy-region-list" role="group" aria-label={he?'בקרת הפעלה':'Playback controls'}>
   <button type="button" disabled={!ready||reduced||reference} aria-pressed={playing} onClick={()=>{setProgress(100*time.current/profile.secondsPerRep);setPlaying(value=>!value);}}>{playing?(he?'עצירה':'Pause'):(he?'הפעלה':'Play')}</button>
   <button type="button" disabled={!ready} onClick={()=>seek(0)}>{he?'איפוס תנועה':'Reset motion'}</button>
  </div>
  <label>{he?'מהירות':'Speed'} <select aria-label={he?'מהירות האנימציה':'Animation speed'} disabled={!ready||reference} value={speed} onChange={event=>setSpeed(Number(event.target.value))}>{[.25,.5,1,1.5,2].map(value=><option key={value} value={value}>{value}×</option>)}</select></label>
  <label>{he?'התקדמות בחזרה':'Repetition progress'} <input type="range" disabled={!ready||reference} min={0} max={100} step={0.1} value={progress} aria-valuetext={phaseLabel} onChange={event=>seek(Number(event.target.value))}/></label>
  {!reference&&<output aria-live={playing?'off':'polite'}>{phaseLabel} · {Math.round(progress)}%</output>}
  {reduced&&<p role="status">{he?'הפחתת תנועה פעילה. אפשר לבחור מנח סטטי במחוון.':'Reduced motion enabled. Explore static poses with the slider.'}</p>}
  <div className="anatomy-region-list" role="group" aria-label={he?'מצלמה':'Camera'}>
   <button type="button" disabled={!ready} onClick={()=>controller.current?.setView(animation.camera)}>{he?'איפוס מצלמה':'Reset camera'}</button>
   <button type="button" disabled={!ready} onClick={()=>controller.current?.setView('left')}>{he?'מבט מהצד':'Side view'}</button>
   <button type="button" disabled={!ready} onClick={()=>controller.current?.zoom(.8)}>{he?'הגדלה':'Zoom in'}</button>
   <button type="button" disabled={!ready} onClick={()=>controller.current?.zoom(1.25)}>{he?'הקטנה':'Zoom out'}</button>
  </div>
  <p className="care-muted">{he?'גרירה לסיבוב · צביטה או גלילה להגדלה':'Drag to rotate · Pinch or wheel to zoom'}</p>
  <div className="anatomy-region-list" role="group" aria-label={he?'שכבות אנטומיות':'Anatomical layers'}>
   <button type="button" aria-pressed={bones} onClick={()=>setBones(value=>!value)}>{he?'עצמות':'Bones'}</button>
   <button type="button" disabled={!reference} aria-pressed={reference&&muscles} onClick={()=>{setMuscles(value=>!value);setPicked(null);}}>{he?'הדגשת שרירים':'Highlight muscles'}</button>
   <button type="button" disabled={!reference||!ready} onClick={()=>{setMuscles(true);setPicked(null);}}>{he?'איפוס הדגשה':'Reset highlighting'}</button>
  </div>
  <div role="group" aria-label={he?'תפקידי השרירים':'Muscle roles'}>
   {roles.map(([role,label])=>{
    const ids=Object.keys(animation.roles).filter(id=>animation.roles[id]===role);
    if(ids.length===0)return null;
    return <div key={role}><strong style={{borderInlineStart:`4px solid ${anatomyRoleColors[role]}`,paddingInlineStart:8}}>{label}</strong>
     <ul>{ids.map(id=><li key={id}>{reference&&muscles&&ready?<button className="button secondary" type="button" aria-pressed={picked===id} onClick={()=>setPicked(value=>value===id?null:id)}>{muscleLabel(id)}</button>:muscleLabel(id)}</li>)}</ul>
    </div>;
   })}
  </div>
  <p className="care-muted">{he?'הצבעים מציינים תפקיד לימודי איכותי. הם אינם מדידה של הפעלה או כוח.':'Colors indicate qualitative teaching roles. They do not measure activation or force.'}</p>
  {picked&&<p role="status">{he?'שריר נבחר':'Selected muscle'} · {muscleLabel(picked)}</p>}
  {model&&<details><summary>{he?'מקור המודל והסקירה':'Model source and review'}</summary><p>{model.asset.attribution}</p><a href={model.asset.licenseEvidence} target="_blank" rel="noopener noreferrer">BodyParts3D · CC BY 4.0</a><p><a href="/anatomy/musculoskeletal-source-and-license.json">{he?'פרטי מקור ועיבוד':'Source and conversion metadata'}</a></p></details>}
 </section>;
}
