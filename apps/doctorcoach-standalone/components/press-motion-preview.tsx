'use client';
import {useState} from 'react';
import {useLanguage} from './language-provider';
import {anatomyRoleColors} from '../lib/anatomy-training';

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
   <figcaption><b>{title}</b><p>{he?'הדמיית תנועה משוערת מהאטלס. סימון תפקידי השרירים ממתין לסקירה אנטומית.':'Illustrative atlas motion. Muscle-role labels are provisional and await anatomical review.'}</p>
    {chest&&<p>{he?'הסרטון מציג תנועת לחיצה בשכיבה ללא ספסל, מוט או אחיזה מודליים.':'The clip illustrates supine pressing without a modeled bench, bar or grip.'}</p>}
    <ul><li><strong style={{color:anatomyRoleColors.primary}}>{he?'אגוניסט':'Agonist'}</strong> · {primary}</li>
    <li><strong style={{color:anatomyRoleColors.secondary}}>{he?'סינרגיסטים':'Synergists'}</strong> · {assisting}</li>
    {!chest&&<li><strong style={{color:anatomyRoleColors.stabilizer}}>{he?'מייצב':'Stabilizer'}</strong> · {he?'התת־שכמתי':'Subscapularis'}</li>}</ul>
    <small>BodyParts3D © The Database Center for Life Science · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></small>
   </figcaption>
  </figure>}
 </section>;
}
