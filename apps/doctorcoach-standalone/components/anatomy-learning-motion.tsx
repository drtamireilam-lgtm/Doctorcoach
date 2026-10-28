'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './language-provider';
// Original two-segment diagram; illustrates the named joint action only, not muscle deformation.
export function LearningMotion({slug}:{slug:string}){
 const {language}=useLanguage();const en=language==='en';
 const elbow=['biceps-brachii','brachialis','brachioradialis'].includes(slug);
 const knee=['rectus-femoris','vastus-lateralis','vastus-medialis','vastus-intermedius'].includes(slug);
 const [playing,setPlaying]=useState(false),[angle,setAngle]=useState(0),[reduced,setReduced]=useState(true);
 useEffect(()=>{const q=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>{setReduced(q.matches);if(q.matches)setPlaying(false);};sync();q.addEventListener('change',sync);return()=>q.removeEventListener('change',sync);},[]);
 useEffect(()=>{setPlaying(false);setAngle(0);},[slug]);
 useEffect(()=>{if(!playing||reduced)return;let frame=0,start=0;const step=(time:number)=>{if(!start)start=time;setAngle((1-Math.cos((time-start)*Math.PI/2500))*45);frame=requestAnimationFrame(step);};frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);},[playing,reduced]);
 if(!elbow&&!knee)return null;
 const title=elbow?(en?'Elbow flexion':'כפיפת מרפק'):(en?'Knee extension':'יישור ברך');
 const degrees=elbow?angle:90-angle;
 return <figure className="atlas-motion"><h3>{title}</h3><svg viewBox="0 0 280 240" width="280" height="240" role="img" aria-label={title}><path d="M140 25V115" className="motion-bone"/><circle cx="140" cy="115" r="11" className="motion-joint"/><g transform={'rotate('+(-degrees)+' 140 115)'}><path d="M140 126V215" className="motion-bone"/><circle cx="140" cy="219" r="7" className="motion-joint"/></g><path d="M124 35Q95 72 124 106" className="motion-target"/></svg>
  <div className="atlas-switch"><button type="button" disabled={reduced} aria-pressed={playing} onClick={()=>setPlaying(v=>!v)}>{playing?(en?'Pause':'עצירה'):(en?'Play':'הפעלה')}</button><button type="button" onClick={()=>{setPlaying(false);setAngle(0);}}>{en?'Restart':'התחלה מחדש'}</button></div>
  <label>{en?'Explore the movement':'בדיקת התנועה'}<input type="range" aria-label={title} min="0" max="90" value={angle} onChange={e=>{setPlaying(false);setAngle(Number(e.target.value));}}/></label>
  <figcaption>{en?'Schematic joint-action diagram. It does not show muscle shape, attachments, forces or an individual’s range of motion.':'תרשים סכמטי של פעולת מפרק. אינו מציג צורת שריר, נקודות חיבור, כוחות או טווח תנועה אישי.'}{reduced&&<p>{en?'Reduced motion is enabled. Use the slider to explore static positions.':'הפחתת תנועה פעילה. אפשר לבחור מנח סטטי באמצעות המחוון.'}</p>}</figcaption>
 </figure>;
}
