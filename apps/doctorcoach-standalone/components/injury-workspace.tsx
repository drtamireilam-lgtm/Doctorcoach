'use client';
import {Localize} from "../components/language-provider";
import {FeedbackButton} from './community-workspace';
import {ArrowLeft,ClipboardList} from 'lucide-react';
import {exercises,guides} from '../lib/content';
import type {TrainingController} from '../hooks/use-training';
import {ExerciseCard} from './exercise-library';
import {Tabs,TabsContent,TabsList,TabsTrigger} from './ui/tabs';

const SPINE='שיקום עמוד השדרה';
const regions=[{id:'cervical',label:'עמוד שדרה צווארי',short:'צווארי'},{id:'lumbar',label:'עמוד שדרה מותני — גב תחתון',short:'גב תחתון'}];

function SpineRehabWorkspace({controller,onDetails}:{controller:TrainingController;onDetails:(id:string)=>void}){
 const sets={cervical:['chin-tuck','deep-neck-flexor-hold','cervical-isometric-rotation'],lumbar:['bird-dog','dead-bug','mcgill-curl-up','hip-hinge-dowel','side-plank','roman-chair-ql-lateral-stretch']};
 return <Localize>{<section className="spine-rehab"><div className="injury-hero"><span className="eyebrow">שיקום לפי אזור</span><h2>שיקום עמוד השדרה</h2><p>הכירו תרגילים שהצוות יכול לשלב בתוכנית אישית. מינון והתקדמות נקבעים לאחר הערכה.</p></div><Tabs defaultValue="cervical" dir="rtl" className="care-tabs spine-tabs"><TabsList aria-label="אזור בעמוד השדרה">{regions.map(r=><TabsTrigger key={r.id} value={r.id}>{r.short}</TabsTrigger>)}</TabsList>{regions.map(r=><TabsContent key={r.id} value={r.id}><div className="exercise-grid two">{sets[r.id as keyof typeof sets].map(id=>exercises.find(e=>e.id===id)!).map(e=><ExerciseCard key={e.id} exercise={e} controller={controller} onDetails={onDetails}/>)}</div></TabsContent>)}</Tabs></section>}</Localize>;
}

export function InjuryWorkspace({controller,onDetails,selection,onSelect}:{controller:TrainingController;onDetails:(id:string)=>void;selection:string;onSelect:(name:string)=>void}){
 const guide=guides.find(g=>g.name===selection);
 return <Localize>{<>
  <div className="page-heading"><span className="eyebrow">תנועה מותאמת</span><h1>אימון סביב פציעה</h1><p>בוחרים אזור ומגלים תרגילים שאיש מקצוע יכול לשלב בתוכנית מותאמת.</p></div>
  <div className="injury-grid"><nav className="injury-nav" aria-label="אזורי תרגול ושיקום">
   {guides.map(g=><button className={selection===g.name?'active':''} aria-pressed={selection===g.name} key={g.name} onClick={()=>onSelect(g.name)}><span aria-hidden="true">{g.icon}</span>{g.name}<ArrowLeft size={16}/></button>)}
   <button className={selection===SPINE?'active':''} aria-pressed={selection===SPINE} onClick={()=>onSelect(SPINE)}><span aria-hidden="true">↕</span>{SPINE}<ArrowLeft size={16}/></button>
  </nav><div className="injury-main">{selection===SPINE?<SpineRehabWorkspace controller={controller} onDetails={onDetails}/>:guide&&<>
   <div className="injury-hero"><span className="eyebrow">אזור נבחר</span><h2>{guide.name}</h2><p>{guide.summary}</p><div className="progress-steps"><div><b>01</b><strong>לנוע בטווח נוח</strong><small>מתחילים בשליטה וקצב נעים.</small></div><div><b>02</b><strong>לבנות עומס</strong><small>מעלים בהדרגה לפי התגובה.</small></div><div><b>03</b><strong>לחזור לאימון</strong><small>מתקרבים למטרה האישית.</small></div></div></div>
   <div className="warning-box"><strong>מתי לפנות לבדיקה?</strong><span>{guide.avoid}</span></div><div className="section-heading"><div><span className="eyebrow">רעיונות לתנועה</span><h2>תרגילים לאזור זה</h2></div></div><div className="exercise-grid two">{guide.ids.map(id=>exercises.find(e=>e.id===id)).filter((e):e is typeof exercises[number]=>!!e).map(exercise=><ExerciseCard key={exercise.id} exercise={exercise} controller={controller} onDetails={onDetails}/>)}</div>
  </>}<FeedbackButton key={selection} context={'פציעה / שיקום: '+selection} section="rehab"/></div></div>
 </>}</Localize>;
}
