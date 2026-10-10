'use client';
import {Localize} from "../components/language-provider";
import {ArrowLeft,HeartPulse,Users} from 'lucide-react';
import type {TrainingController} from '../hooks/use-training';



type Go=(section:string)=>void;
export function TraineeToday({controller,blocked,go}:{controller:TrainingController;blocked:boolean;go:Go}){
 const active=controller.feed.active,canTrain=!!controller.access?.canStart&&controller.plan.length>0;
 return <Localize>{<div className="trainee-today">
  <div className="workspace-heading"><div><span className="eyebrow">DoctorCoach · האזור האישי</span><h1>היום שלך</h1><p>האימון, המוכנות והצוות שלך.</p></div></div>
  <section className="panel care-form"><h2>{active?'יש לך אימון פתוח':blocked?'ממתינים למענה הרופא':canTrain?'מוכנים לאימון הבא?':'התוכנית הבאה שלך'}</h2>
   <p>{active?`${active.completedSets} מתוך ${active.plannedSets} סטים סומנו.`:blocked?'אפשר לפנות לצוות ולעדכן איך מרגישים.':canTrain?'לפני שמתחילים אפשר לדווח על כאב, שינה ואנרגיה.':controller.access?.canBuild?'אפשר לבנות תוכנית במסלול העצמאי שלך.':'התוכנית שנדב יקצה לך תופיע כאן.'}</p>
   <button className="button primary wide" onClick={()=>go(blocked?'messages':'plan')}>{blocked?'להודעות לצוות':active?'להמשך האימון מתוך התוכנית':'לתוכנית שלי'}</button>
  </section>
  <nav className="daily-links" aria-label="פעולות יומיות"><button onClick={()=>go('care')}><HeartPulse size={22}/><span><strong>התיק שלי</strong><small>פרטים אישיים, שאלונים ועדכון מצב הגוף</small></span><ArrowLeft size={18}/></button><button onClick={()=>go('messages')}><Users size={22}/><span><strong>הצוות שלי</strong><small>הודעות, שאלות והמשך הליווי</small></span><ArrowLeft size={18}/></button></nav>
  <p className="care-muted">{controller.feed.stats.week} אימונים הושלמו בשבעת הימים האחרונים. <button className="text-button" onClick={()=>go('history')}>לצפייה בהתקדמות</button></p>
 </div>}</Localize>;
}
