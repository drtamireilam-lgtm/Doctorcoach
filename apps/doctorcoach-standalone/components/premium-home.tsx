'use client';
import type {ReactNode} from 'react';
import {ArrowLeft,ArrowRight,Activity,HeartPulse,Accessibility,BookOpen,Settings2} from 'lucide-react';
import {useCareResource} from '../hooks/use-care';
import type {ActivityFeed} from '../lib/activity';
import type {WellnessBundle} from '../lib/wellness';
import {homeSummary} from '../lib/home-summary';
import {useLanguage} from './language-provider';
import {PremiumCard,ProgressRing} from './premium-ui';
type DashboardProps={go:(section:string)=>void;completed:boolean;returning:boolean;weeklyWorkouts:number|null;activeWorkout:boolean;trainingBlocked:boolean;workoutAction?:ReactNode;exerciseCount?:number;name?:string};
export function PremiumHome({go,completed,returning,weeklyWorkouts,activeWorkout,trainingBlocked,workoutAction,exerciseCount,name}:DashboardProps){
 const english=useLanguage().language==='en',Arrow=english?ArrowRight:ArrowLeft;
 const t=(he:string,en:string)=>english?en:he;
 const activity=useCareResource<ActivityFeed>('/api/activity'),wellness=useCareResource<WellnessBundle>('/api/wellness');
 const summary=homeSummary(returning&&!activity.error?activity.data:null,returning&&!wellness.error?wellness.data:null);
 const next=trainingBlocked?'messages':activeWorkout?'workout':completed?'plan':'onboarding';
 const destinations=[
  {id:'recovery',icon:HeartPulse,he:'שיקום ומעקב כאב',en:'Pain & rehabilitation'},
  {id:'history',icon:Activity,he:'פעילות אירובית',en:'Cardio & activity'},
  {id:'consult',icon:HeartPulse,he:'ייעוץ רפואי עם ד״ר תמיר עילם',en:'Medical consultation with Dr. Tamir Eilam'},
  {id:'learn',icon:Accessibility,he:'ספריית אנטומיה',en:'Anatomy library'},
 ];
 return <div className="dc-premium dc-ui3-home" dir={english?'ltr':'rtl'}>
  <header className="dc-ui3-greeting"><div><span className="dc-premium-kicker">{t('תנועה חכמה. התקדמות אישית.','Move smarter. Progress personally.')}</span><h1>{t('שלום','Hello')}{name?`, ${name}`:''} <span aria-hidden="true">👋</span></h1><p>{returning?t('טוב שחזרת. מתקדמים בקצב שלך.','Welcome back. Move at your own pace.'):t('בריאות ואימונים, יחד','Health and training, together')}</p></div><button type="button" className="dc-icon-button" onClick={()=>go('care')} aria-label={t('פתיחת הפרופיל שלי','Open my profile')}><Settings2 size={22}/></button></header>
  <PremiumCard className="dc-premium-hero"><img className="dc-ui3-hero-image" src="/premium-ui-3/workout-hero.png" alt="" width="1536" height="1024" fetchPriority="high"/><div className="dc-premium-hero-content"><span className="dc-premium-kicker">{t('האימון הבא שלך','Your next workout')}</span><h2>{activeWorkout?t('ממשיכים מאיפה שעצרת','Continue your workout'):t('התוכנית האישית שלך','Your personal program')}</h2><p>{trainingBlocked?t('ממתינים לבירור רפואי לפני אימון חדש','Medical review required before a new workout'):exerciseCount?`${exerciseCount} ${t('תרגילים בתוכנית','exercises in your program')}`:t('התוכנית והביצועים שלך, במקום אחד','Your program and performance, together')}</p>{workoutAction&&!trainingBlocked?workoutAction:<button type="button" className="button primary" onClick={()=>go(next)}>{trainingBlocked?t('ליצירת קשר עם הצוות','Contact the team'):activeWorkout?t('המשך אימון','Resume workout'):completed?t('לתוכנית האימון','My program'):t('מתחילים בהיכרות','Get started')}<Arrow size={18}/></button>}</div></PremiumCard>
  <PremiumCard className="dc-ui3-week"><h2>{t('ההתקדמות השבועית','Weekly progress')}</h2><div className="dc-ui3-rings">
   <button type="button" onClick={()=>go('history')}><ProgressRing value={weeklyWorkouts===null?'—':String(weeklyWorkouts)} label={t('אימונים','Workouts')} detail={t('ב־7 הימים האחרונים','Last 7 days')}/></button>
   <button type="button" onClick={()=>go('history')}><ProgressRing value={summary.steps===null?'—':summary.steps.toLocaleString(english?'en-US':'he-IL')} label={t('צעדים היום','Steps today')} progress={summary.steps!==null&&summary.stepGoal?summary.steps/summary.stepGoal*100:null} detail={summary.steps===null?t('אין נתון זמין','No data available'):t('מהמקור המאושר שלך','From your authorized source')}/></button>
   <button type="button" onClick={()=>go('readiness')}><ProgressRing value={summary.energy===null?'—':`${summary.energy}/10`} label={summary.energy===null?t('מוכנות','Readiness'):t('אנרגיה מדווחת','Reported energy')} detail={summary.energyDay??t('לבדיקת מוכנות','Check readiness')}/></button>
  </div></PremiumCard>
  <section className="dc-premium-quick"><h2>{t('ממשיכים מכאן','Explore your space')}</h2><nav aria-label={t('פעולות מהירות','Quick actions')}>{destinations.map(({id,icon:Icon,he,en})=><button type="button" key={id} aria-label={id==='consult'?t('פתיחת אזור הייעוצים','Open consultations'):undefined} onClick={()=>go(id)}><Icon size={28} aria-hidden="true"/><span><strong>{english?en:he}</strong></span><Arrow size={15} aria-hidden="true"/></button>)}</nav></section>
  <div className="dc-premium-further"><button type="button" onClick={()=>go('library')}><BookOpen size={18}/>{t('ספריית התרגילים','Exercise library')}</button><button type="button" onClick={()=>go('care')}>{t('התיק האישי והצוות שלך','Your personal file & team')}<Arrow size={16}/></button></div>
 </div>;
}
