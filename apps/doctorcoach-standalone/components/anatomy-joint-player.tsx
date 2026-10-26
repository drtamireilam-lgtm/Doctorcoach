'use client';
import {useEffect,useRef,useState} from 'react';
import {anatomyModels} from '../lib/anatomy-models';
import {jointMovements,jointRegions,movementById,channelsFor,type JointSide} from '../lib/anatomy-joint-movements';
import {initialPlayback,advancePlayback,resetPlayback,setPlaybackSpeed,togglePlayback,loopProgress} from '../lib/anatomy-joint-playback';
import type {createAnatomyCanvas} from '../lib/anatomy-canvas';
import type {JointScope} from '../lib/anatomy-joint-context';

const model=anatomyModels.find(m=>m.id==='musculoskeletal')!;
export function AnatomyJointPlayer({language}:{language:'en'|'he'}){
 const he=language==='he',host=useRef<HTMLDivElement>(null),controller=useRef<Awaited<ReturnType<typeof createAnatomyCanvas>>|null>(null);
 const [region,setRegion]=useState('elbow'),[movementId,setMovementId]=useState('elbow-flexion'),[side,setSide]=useState<JointSide>('both');
 const movement=movementById(movementId)!;
 const [loaded,setLoaded]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[phase,setPhase]=useState(0),[reduced,setReduced]=useState(true);
 const [reference,setReference]=useState(false),[bones,setBones]=useState(true),[muscles,setMuscles]=useState(true);
 const [scope,setScope]=useState<JointScope>('body');
 const playback=useRef(initialPlayback(movement)),latest=useRef({movement,side,reference,bones,muscles});latest.current={movement,side,reference,bones,muscles};
 function draw(){const v=latest.current;if(v.reference||v.movement.status==='blocked')controller.current?.setJointNeutral(v.bones,v.reference&&v.muscles,v.movement,v.side);else controller.current?.setJointPose(playback.current.phase,false,v.bones,false);if(host.current)host.current.dataset.jointPhase=playback.current.phase.toFixed(5);}
 function stop(){playback.current={...playback.current,playing:false};setPlaying(false);setPhase(playback.current.phase);}
 function changeScope(value:JointScope){controller.current?.setJointScope(value);setScope(value);if(value==='joint')controller.current?.focusJointContext();else controller.current?.setView('front');}
 useEffect(()=>{
  const abort=new AbortController();setLoaded(false);setError(false);
  import('../lib/anatomy-canvas').then(async module=>{
   if(abort.signal.aborted||!host.current)return;
   const scene=await module.createAnatomyCanvas(host.current,()=>{},abort.signal,{model,jointMotion:{movement:movementById('elbow-flexion')!,side:'both'}});
   if(abort.signal.aborted){scene.dispose();return;}controller.current=scene;setLoaded(true);
  }).catch(()=>{if(!abort.signal.aborted){stop();setError(true);}});
  return()=>{abort.abort();controller.current?.dispose();controller.current=null;};
 },[attempt]);
 useEffect(()=>{
  stop();playback.current=resetPlayback(playback.current,movement);setPhase(playback.current.phase);
  if(loaded&&movement.status==='prototype'){try{controller.current?.setJointMovement(movement,side);setError(false);}catch{setError(true);}}else if(movement.status==='blocked')changeScope('body');
  draw();
  if(loaded&&scope==='joint'&&movement.status==='prototype'){controller.current?.setJointScope('joint');controller.current?.focusJointContext();}
 },[movement,side,loaded]);
 useEffect(()=>{stop();draw();},[reference]);
 useEffect(()=>{draw();},[bones,muscles]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>{setReduced(media.matches);if(media.matches)stop();};const hide=()=>{if(document.hidden)stop();};sync();media.addEventListener('change',sync);document.addEventListener('visibilitychange',hide);return()=>{media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',hide);};},[]);
 useEffect(()=>{
  if(!playing||!loaded||error||reduced||reference||movement.status==='blocked')return;
  let frame=0,last=0,rendered=0,labelled=0;
  const tick=(now:number)=>{if(last)playback.current=advancePlayback(playback.current,(now-last)/1000,latest.current.movement);last=now;if(now-rendered>=1000/30){rendered=now;draw();if(now-labelled>=200){labelled=now;setPhase(playback.current.phase);}}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing,loaded,error,reduced,reference,movement]);
 function reset(){stop();playback.current=resetPlayback(playback.current,movement);setPhase(playback.current.phase);draw();}
 const available=jointMovements.filter(m=>m.status==='prototype').length,channels=channelsFor(movement,side),first=channels[0],excursion=first?Math.abs(first.to-first.from):0;
 const associated=model.structures.filter(s=>s.layer==='muscle'&&s.side===(side==='both'?'right':side)&&movement.muscles.includes(s.learningId??s.id.replace(/^(left|right)-/,'')));
 return <section className="panel care-stack" data-joint-player data-movement={movementId} data-side={side} data-scope={scope} data-playing={playing?'true':'false'} data-reference={reference?'true':'false'} dir={he?'rtl':'ltr'} data-no-translate>
  <h2>{he?'תנועות מפרקים — מעבדת עצמות':'Joint movements — bone motion lab'}</h2>
  <p role="note">{he?'אב־טיפוס לימודי: צירי העצמות דורשים כיול אנטומי. זו אינה הדגמה קלינית מאומתת.':'Learning prototype: bone axes require anatomical calibration. This is not a clinically validated demonstration.'}</p>
  <div className="anatomy-region-list"><label>{he?'אזור':'Region'}<select aria-label={he?'אזור תנועה':'Movement region'} value={region} onChange={e=>{stop();setRegion(e.target.value);setMovementId(jointMovements.find(m=>m.region===e.target.value)!.id);}}>{jointRegions.map(([id,en,heName])=><option key={id} value={id}>{he?heName:en}</option>)}</select></label><label>{he?'תנועה':'Movement'}<select aria-label={he?'תנועת מפרק':'Joint movement'} value={movementId} onChange={e=>{stop();setMovementId(e.target.value);}}>{jointMovements.filter(m=>m.region===region).map(m=><option key={m.id} value={m.id}>{m[language]}{m.status==='blocked'?(he?' · לא זמין':' · Unavailable'):''}</option>)}</select></label><button type="button" className="button primary" disabled={!loaded||error||reduced||reference||movement.status==='blocked'} aria-pressed={playing} onClick={()=>{playback.current=togglePlayback(playback.current);setPlaying(playback.current.playing);setPhase(playback.current.phase);}}>{playing?(he?'⏸ עצירה':'⏸ Pause'):(he?'▶ הפעלה':'▶ Play')}</button></div>
  <div className="anatomy-region-list"><label>{he?'צד':'Side'}<select aria-label={he?'צד התנועה':'Movement side'} value={side} onChange={e=>{stop();setSide(e.target.value as JointSide);}}>{(['left','right','both'] as const).map((id,i)=><option value={id} key={id}>{he?['שמאל','ימין','שני הצדדים'][i]:['Left','Right','Both'][i]}</option>)}</select></label><label>{he?'מהירות':'Speed'}<select aria-label={he?'מהירות תנועה':'Movement speed'} value={speed} onChange={e=>{const value=Number(e.target.value);playback.current=setPlaybackSpeed(playback.current,value);setSpeed(playback.current.speed);}}>{[.5,1,2].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><button type="button" disabled={!loaded} onClick={reset}>{he?'איפוס':'Reset'}</button></div>
  <p role="status">{movement.reason[language]}</p>
  {!loaded&&!error&&<p role="status">{he?'טוען את המודל הקיים…':'Loading the existing model…'}</p>}
  {error&&<p role="alert">{he?'נתוני המודל או התנועה אינם זמינים.':'Model or movement data unavailable.'}<button onClick={()=>{stop();setAttempt(n=>n+1);}}>{he?'ניסיון נוסף':'Retry'}</button></p>}
  <div className="anatomy-region-list" aria-label={he?'היקף התצוגה':'View scope'}><button type="button" disabled={!loaded} aria-pressed={scope==='body'} onClick={()=>changeScope('body')}>{he?'גוף מלא':'Full body'}</button><button type="button" disabled={!loaded||movement.status==='blocked'} aria-pressed={scope==='joint'} onClick={()=>changeScope('joint')}>{he?'אזור המפרק':'Joint region'}</button></div>
  <p className="care-muted">{he?'תצוגת אזור המפרק מסתירה אזורים לא קשורים כדי להפחית עומס ציור, ושומרת את גאומטריית המקור ואת שלב התנועה.':'Joint region hides unrelated anatomy to reduce rendering work, preserving source geometry and playback phase.'}</p>
  <div className="anatomy-model-canvas" ref={host} data-joint-phase="0" style={{height:'min(52vh,440px)',minHeight:280,width:'100%',overflow:'hidden',borderRadius:20,background:'#151d2b'}}/>
  <label>{he?'מיקום במחזור':'Cycle position'} <input type="range" aria-label={he?'מיקום במחזור':'Cycle position'} min="0" max="100" step="1" value={Math.round(loopProgress(phase)*100)} disabled={!loaded||reference||movement.status==='blocked'} onChange={e=>{stop();playback.current={...playback.current,phase:Math.acos(1-Number(e.target.value)/50)/(2*Math.PI)};setPhase(playback.current.phase);draw();}}/></label>
  {first&&<p>{he?'טווח שינוי בהדגמה':'Demonstration excursion'}: {excursion}° · {he?'ביחס למנח המקור, לא מדידת ROM. איפוס מחזיר למנח המקור, שאינו בהכרח מנח אנטומי ניטרלי.':'Relative to source pose, not clinical ROM. Reset returns to the source pose, which is not necessarily anatomical neutral.'}</p>}
  {movement.physiologicalRom&&<details><summary>{he?'טווח ייחוס מספרות':'Textbook ROM reference'}</summary><p>{movement.physiologicalRom.degrees}° · {he?'ערך ייחוס תלוי מנח בדיקה; לא כיול למודל או המלצה אישית.':'Position-dependent reference; not model calibration or a personal prescription.'}</p><p lang="en" dir="ltr">{movement.physiologicalRom.context}</p><a href={movement.physiologicalRom.source} target="_blank" rel="noopener noreferrer">{he?'מקור לטווח הייחוס':'ROM reference source'}</a></details>}
  <div className="anatomy-region-list"><button type="button" aria-pressed={!reference} onClick={()=>setReference(false)}>{he?'תנועת עצמות':'Bone motion'}</button><button type="button" aria-pressed={reference} onClick={()=>setReference(true)}>{he?'עצמות ושרירים — מנח מקור':'Bones and muscles — source pose'}</button><button type="button" aria-pressed={bones} onClick={()=>setBones(v=>!v)}>{he?'עצמות':'Bones'}</button><button type="button" aria-pressed={reference&&muscles} disabled={!reference} onClick={()=>setMuscles(v=>!v)}>{he?'שרירים':'Muscles'}</button></div>
  <p>{he?'השרירים מוצגים במנח המקור בלבד: חסרים חיבורי מוצא ואחז ונתוני Skinning מאומתים. אין חישוב הפעלה או כיווץ שריר. הפיקות מוסתרות בתנועת עצמות כי מסלולן לא ממודל.':'Muscles are shown only in the source pose: validated attachments and skinning are missing. No activation or contraction is calculated. Patellae are hidden during bone motion because their tracking is unmodeled.'}</p>
  <div className="anatomy-region-list" aria-label={he?'מצלמה':'Camera'}>{([['front','Front','קדמי'],['back','Back','אחורי'],['left','Left view','מבט משמאל'],['right','Right view','מבט מימין']] as const).map(([id,en,label])=><button type="button" key={id} disabled={!loaded} onClick={()=>controller.current?.setView(id)}>{he?label:en}</button>)}<button type="button" disabled={!loaded||!first} onClick={()=>controller.current?.focusJointContext()}>{he?'התמקדות במפרק':'Focus joint'}</button></div>
  <p className="care-muted">{he?'גרירה לסיבוב • צביטה או גלילה לזום. המצלמה אינה מאפסת את התנועה.':'Drag to rotate • Pinch or wheel to zoom. Camera interaction does not reset movement.'}</p>
  {reduced&&<p role="status">{he?'הפחתת תנועה פעילה; אפשר לבחור מנח ידנית.':'Reduced motion enabled; select a pose manually.'}</p>}
  <details><summary>{he?'שרירים הקשורים לתנועה ומגבלות':'Associated muscles and limitations'}</summary><ul>{associated.map(s=><li key={s.id}>{s[language]}</li>)}</ul>{movement.muscles.some(id=>!model.structures.some(s=>s.layer==='muscle'&&s.learningId===id))&&<p>{he?'חלק משרירי התנועה אינם קיימים במודל המקור ולכן אינם מוצגים.':'Some associated muscles are absent from the source model and cannot be displayed.'}</p>}<p>{he?'קשר אנטומי איכותני בלבד; כתום במנח המקור מציין קשר לתנועה, לא אומדן הפעלה מדוד.':'Qualitative anatomical associations; orange in source pose indicates association, not measured activation.'}</p><a href={movement.reference} target="_blank" rel="noopener noreferrer">{he?'מקור לתנועה':'Movement reference'}</a><p>{available} / {jointMovements.length} {he?'הדגמות עצם זמינות; כל ההדגמות ממתינות לכיול. שאר התנועות חסומות עם הסבר.':'bone demonstrations available; all await calibration. Remaining movements are blocked with a reason.'}</p></details>
  <details><summary>{he?'מקור המודל':'Model source'}</summary><p>{model.asset.attribution}</p><a href={model.asset.licenseEvidence} target="_blank" rel="noopener noreferrer">BodyParts3D · CC BY 4.0</a><p><a href="/anatomy/musculoskeletal-source-and-license.json">{he?'פרטי מקור ועיבוד':'Source and conversion metadata'}</a></p></details>
 </section>;
}
