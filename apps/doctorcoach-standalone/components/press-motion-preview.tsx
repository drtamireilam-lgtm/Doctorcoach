'use client';
import {useState} from 'react';
import {useLanguage} from './language-provider';
import {anatomyRoleColors} from '../lib/anatomy-training';

const chestIds=new Set(['bench','barbell-bench','movement-chest-press']);
const shoulderIds=new Set(['overhead-press','movement-overhead-press']);
export function pressClipFor(id:string){
 if(chestIds.has(id))return 'bench';
 if(shoulderIds.has(id))return 'overhead';
}
export function PressMotionPreview({clip}:{clip:'bench'|'overhead'}){
 const {language}=useLanguage();
 const he=language==='he',chest=clip==='bench';
 const [open,setOpen]=useState(false);
 const title=chest?(he?'לחיצת חזה בשכיבה':'Flat bench press'):(he?'לחיצה מעל הראש':'Overhead press');
 const primary=chest?(he?'החזה הגדול':'Pectoralis major'):(he?'שריר הדלתא':'Deltoid');
 const assisting=chest?(he?'התלת־ראשי והחלק הקדמי של הדלתא':'Triceps and anterior deltoid'):(he?'התלת־ראשי, הטרפז והקורקוברכיאליס':'Triceps, trapezius and coracobrachialis');
 return <section data-no-translate className="care-stack">
  <button className="button secondary" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{he?'הדגמת תנועה ושרירים':'Movement and muscle demonstration'} · {title}</button>
  {open&&<figure className="panel care-stack" style={{margin:0}}>
   <video key={clip} controls loop playsInline preload="metadata" aria-label={title} src={'/anatomy/motion/'+clip+'.mp4'} style={{width:'100%',borderRadius:12}}/>
   <figcaption><b>{title}</b><p>{he?'הדמיית תנועה משוערת מהאטלס. הצבעים מציינים את תפקיד השריר לאורך החזרה.':'Illustrative atlas motion. Colors identify muscle roles throughout the repetition.'}</p>
    <ul><li><strong style={{color:anatomyRoleColors.primary}}>{he?'אגוניסט':'Agonist'}</strong> · {primary}</li>
    <li><strong style={{color:anatomyRoleColors.secondary}}>{he?'סינרגיסטים':'Synergists'}</strong> · {assisting}</li>
    {!chest&&<li><strong style={{color:anatomyRoleColors.stabilizer}}>{he?'מייצב':'Stabilizer'}</strong> · {he?'התת־שכמתי':'Subscapularis'}</li>}</ul>
    <small>BodyParts3D © The Database Center for Life Science · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></small>
   </figcaption>
  </figure>}
 </section>;
}
