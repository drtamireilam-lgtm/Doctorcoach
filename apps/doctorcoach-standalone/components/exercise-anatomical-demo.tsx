'use client';
import {useEffect,useRef,useState} from 'react';
import {useLanguage} from './language-provider';
import {anatomy3dLabEnabled} from '../lib/anatomy-lab';
import {anatomyModels} from '../lib/anatomy-models';
import {boundedDegrees,exercisePoseAngle,motionProfile,type ExerciseMotionProfile,type MotionMode} from '../lib/anatomy-exercise-motion';
import type {createAnatomyCanvas} from '../lib/anatomy-canvas';

export function ExerciseAnatomicalDemo({exerciseId}:{exerciseId:string}){
 const {language}=useLanguage();const [open,setOpen]=useState(false);const profile=motionProfile(exerciseId);
 if(!anatomy3dLabEnabled||!profile)return null;
 return <section className="care-stack" data-no-translate><button className="button secondary" type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?(language==='he'?'סגירת הדגמת תלת־ממד':'Close 3D demonstration'):(language==='he'?'הדגמה אנטומית בתלת־ממד':'3D Anatomical Demonstration')}</button>{open&&<MotionPlayer key={exerciseId} profile={profile}/>}</section>;
}

function MotionPlayer({profile}:{profile:ExerciseMotionProfile}){
 const {language}=useLanguage(),he=language==='he';
 const model=anatomyModels.find(m=>m.id===profile.modelId)!;
 const host=useRef<HTMLDivElement>(null),controller=useRef<Awaited<ReturnType<typeof createAnatomyCanvas>>|null>(null);
 const [loaded,setLoaded]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
 const [mode,setMode]=useState<MotionMode>('motion'),[bones,setBones]=useState(true),[muscles,setMuscles]=useState(true);
 const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[angle,setAngle]=useState(0),[reduced,setReduced]=useState(true),[picked,setPicked]=useState<string|null>(null);
 const phase=useRef(0),actualAngle=useRef(0),view=useRef({mode,bones,muscles});view.current={mode,bones,muscles};
 const apply=(value:number)=>{const v=view.current;controller.current?.setExercisePose(value,v.mode,v.bones,v.muscles);};
 useEffect(()=>{
  const abort=new AbortController();setLoaded(false);setError(false);
  import('../lib/anatomy-canvas').then(async m=>{
   if(abort.signal.aborted||!host.current)return;
   const scene=await m.createAnatomyCanvas(host.current,setPicked,abort.signal,{model,motion:profile});
   if(abort.signal.aborted){scene.dispose();return;}controller.current=scene;const v=view.current;scene.setExercisePose(actualAngle.current,v.mode,v.bones,v.muscles);setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted)setError(true);});
  return()=>{abort.abort();controller.current?.dispose();controller.current=null;};
 },[model,profile,attempt]);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>{setReduced(q.matches);if(q.matches)setPlaying(false);};const hide=()=>{if(document.hidden)setPlaying(false);};sync();q.addEventListener('change',sync);document.addEventListener('visibilitychange',hide);return()=>{q.removeEventListener('change',sync);document.removeEventListener('visibilitychange',hide);};},[]);
 useEffect(()=>{apply(actualAngle.current);},[mode,bones,muscles,loaded]);
 useEffect(()=>{
  if(!playing||!loaded||reduced||mode==='muscles')return;
  let frame=0,last=0,rendered=0,labelled=0;
  const tick=(now:number)=>{if(last)phase.current+=Math.min(now-last,100)/1000*speed;last=now;
   if(now-rendered>=1000/30){rendered=now;const a=exercisePoseAngle(phase.current,profile);actualAngle.current=a;const v=view.current;controller.current?.setExercisePose(a,v.mode,v.bones,v.muscles);if(host.current)host.current.dataset.motionAngle=a.toFixed(2);if(now-labelled>=200){labelled=now;setAngle(a);}}
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing,loaded,reduced,mode,speed,profile]);
 function seek(value:number){setPlaying(false);const a=boundedDegrees(value,profile.maxDegrees);actualAngle.current=a;phase.current=Math.acos(1-2*a/profile.maxDegrees)*profile.secondsPerRep/(2*Math.PI);setAngle(a);apply(a);if(host.current)host.current.dataset.motionAngle=a.toFixed(2);}
 function changeMode(value:MotionMode){seek(0);setMode(value);setPicked(null);}
 const roles=[['primary',he?'עיקריים':'Primary'],['secondary',he?'מסייעים':'Assisting'],['stabilizer',he?'מייצבים':'Stabilizers']] as const;
 return <section className="panel care-stack" dir={he?'rtl':'ltr'} aria-label={he?'אב־טיפוס תנועה אנטומית':'Anatomical motion prototype'} data-exercise-motion={profile.exerciseId} data-motion-playing={playing?'true':'false'} data-motion-mode={mode} data-no-translate>
  <h3>{he?'כפיפת מרפקים במוט — אב־טיפוס קינמטי':'Barbell Biceps Curl — kinematic prototype'}</h3>
  <p role="note">{he?'תנועת עצמות ניסיונית; כיול צירי המפרקים והסקירה הקלינית ממתינים. אין הדמיה של אחיזת מוט, כוחות או כיווץ שרירים.':'Experimental bone motion; joint-axis calibration and clinical review are pending. Bar grip, forces and muscle contraction are not simulated.'}</p>
  <nav className="anatomy-region-list" aria-label={he?'מצב ההדגמה':'Demonstration mode'}>{([['motion',he?'הדגמת תנועה':'Movement demonstration'],['muscles',he?'שרירים פעילים — מנח ייחוס':'Active muscles — reference pose'],['joints',he?'שלד ומפרקים':'Skeleton and joints']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={mode===id} onClick={()=>changeMode(id)}>{label}</button>)}</nav>
  {mode==='muscles'?<p role="status">{he?'העצמות והשרירים מוחזרים למנח המקורי. עיוות שרירים בתנועה חסום עד לאימות נקודות החיבור וה־Skinning.':'Bones and muscles return to the original pose. Moving muscle deformation is blocked until attachments and skinning are validated.'}</p>:<p>{he?'השרירים מוסתרים בזמן התנועה כדי לא להציג חיבורים שגויים. סמני המפרקים הם צירים סכמטיים, לא רקמות מפרק.':'Muscles are hidden during motion to avoid incorrect attachments. Joint markers are schematic axes, not joint tissues.'}</p>}
  {!loaded&&!error&&<p role="status">{he?'טוען את המודל האנטומי הקיים…':'Loading the existing anatomical model…'}</p>}
  {error&&<div role="alert"><p>{he?'המודל או נתוני המקור אינם זמינים להדגמה. האטלס וסרטון הביצוע נשארים זמינים.':'Model/source data unavailable for this demonstration. The atlas and execution video remain available.'}</p><button onClick={()=>{setPlaying(false);setAttempt(n=>n+1);}}>{he?'ניסיון נוסף':'Retry'}</button></div>}
  <div ref={host} className="anatomy-model-canvas" data-motion-angle="0" style={{display:error?'none':'block',height:'min(55vh,480px)',minHeight:280,width:'100%',borderRadius:20,overflow:'hidden',background:'#151d2b'}}/>
  <p className="care-muted">{he?'גרירה לסיבוב • צביטה או גלילה להגדלה':'Drag to rotate • Pinch or wheel to zoom'}</p>
  <div className="anatomy-region-list"><button type="button" disabled={!loaded||reduced||mode==='muscles'} aria-pressed={playing} onClick={()=>{setAngle(actualAngle.current);setPlaying(v=>!v);}}>{playing?(he?'עצירה':'Pause'):(he?'הפעלה':'Play')}</button><button type="button" disabled={!loaded} onClick={()=>{seek(0);setBones(true);setMuscles(true);controller.current?.setView('front');}}>{he?'איפוס תנועה':'Reset motion'}</button><button type="button" disabled={!loaded} onClick={()=>controller.current?.focus('right-radius')}>{he?'תקריב אמה':'Focus forearm'}</button><button type="button" disabled={!loaded} onClick={()=>controller.current?.setView('front')}>{he?'מבט קדמי':'Front view'}</button></div>
  <label>{he?'מהירות':'Speed'}<select aria-label={he?'מהירות האנימציה':'Animation speed'} value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.25,.5,1,1.5,2].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
  <label>{he?'כפיפה ביחס למנח המקור':'Flexion relative to source pose'} <output aria-live={playing?'off':'polite'}>{Math.round(angle)}°</output><input type="range" aria-label={he?'כפיפה ביחס למנח המקור':'Flexion relative to source pose'} min="0" max={profile.maxDegrees} step="1" disabled={!loaded||mode==='muscles'} value={angle} onChange={e=>seek(Number(e.target.value))}/></label>
  <p>{he?'טווח ההדגמה: 0–100° ביחס למנח המקור; אינו מדידת טווח מפרק או המלצה לטווח אישי.':'Demonstration range: 0–100° relative to the source pose; not a clinical joint measurement or prescribed personal range.'}</p>
  {reduced&&<p role="status">{he?'הפחתת תנועה פעילה. אפשר לבחור מנח סטטי במחוון.':'Reduced motion enabled. Explore a static pose with the slider.'}</p>}
  <div className="anatomy-region-list" aria-label={he?'שכבות אנטומיות':'Anatomical layers'}><button type="button" aria-pressed={bones} onClick={()=>setBones(v=>!v)}>{he?'עצמות':'Bones'}</button><button type="button" disabled={mode!=='muscles'} aria-pressed={mode==='muscles'&&muscles} onClick={()=>setMuscles(v=>!v)}>{he?'שרירים':'Muscles'}</button></div>
  <div aria-label={he?'תפקידי השרירים':'Muscle roles'}>{roles.map(([role,label])=><div key={role}><strong>{label}</strong><ul>{Object.entries(profile.roles).filter(([id,r])=>id.startsWith('right-')&&r===role).map(([id])=>{const s=model.structures.find(s=>s.id===id)!;return <li key={id}>{s[language].replace(/^Right /,'').replace(' — ימין','')}</li>;})}</ul></div>)}</div>
  <p className="care-muted">{he?'הצבעים מציינים תפקיד איכותי בלבד: כתום — עיקריים, צהוב — מסייעים, כחול — מייצבים. הם אינם מדידת הפעלה או כוח.':'Qualitative roles only: orange — primary, yellow — assisting, blue — stabilizing. Colors do not measure activation or force.'}</p>
  {picked&&<p role="status">{model.structures.find(s=>s.id===picked)?.[language]}</p>}
  <details><summary>{he?'מקור המודל והסקירה':'Model source and review'}</summary><p>{model.asset.attribution}</p><a href={model.asset.licenseEvidence} target="_blank" rel="noopener noreferrer">BodyParts3D · CC BY 4.0</a><p><a href="/anatomy/musculoskeletal-source-and-license.json">{he?'פרטי מקור ועיבוד':'Source and conversion metadata'}</a></p><p>{he?'המודל והכיול ממתינים לסקירה קלינית; אין שינוי בנכסי האטלס המקוריים.':'Model and calibration await clinical review; original atlas assets are unchanged.'}</p></details>
 </section>;
}
