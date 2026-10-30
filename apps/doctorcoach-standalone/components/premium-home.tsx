'use client';
import type {ReactNode} from 'react';
import {ArrowLeft,ArrowRight,Activity,HeartPulse,Accessibility,BookOpen,Settings2,Dumbbell,TrendingUp,FolderHeart,Watch} from 'lucide-react';
import {useCareResource} from '../hooks/use-care';
import type {ActivityFeed} from '../lib/activity';
import type {WellnessBundle} from '../lib/wellness';
import {homeSummary} from '../lib/home-summary';
import {useLanguage} from './language-provider';
import {PremiumCard,ProgressRing} from './premium-ui';

type DashboardProps={go:(section:string)=>void;completed:boolean;returning:boolean;weeklyWorkouts:number|null;activeWorkout:boolean;trainingBlocked:boolean;workoutAction?:ReactNode;exerciseCount?:number;name?:string;programTitle?:string|null;workoutProgress?:{completed:number;planned:number}|null};
export function PremiumHome({go,completed,returning,weeklyWorkouts,activeWorkout,trainingBlocked,workoutAction,exerciseCount,name,programTitle,workoutProgress}:DashboardProps){
 const english=useLanguage().language==='en',Arrow=english?ArrowRight:ArrowLeft;
 const t=(he:string,en:string)=>english?en:he;
 const activity=useCareResource<ActivityFeed>('/api/activity'),wellness=useCareResource<WellnessBundle>('/api/wellness');
 const summary=homeSummary(returning&&!activity.error?activity.data:null,returning&&!wellness.error?wellness.data:null);
 const next=trainingBlocked?'messages':activeWorkout?'workout':completed?'plan':'onboarding';
 const connection=returning&&!activity.error?activity.data?.connection:null;
 const destinations=[
  {id:'plan',icon:Dumbbell,he:'התוכנית שלי',en:'My program'},
  {id:'history',icon:TrendingUp,he:'ההתקדמות שלי',en:'My progress'},
  {id:'library',icon:BookOpen,he:'ספריית התרגילים',en:'Exercise library'},
  {id:'consult',icon:HeartPulse,he:'ייעוץ רפואי עם ד״ר תמיר עילם',en:'Medical consultation with Dr. Tamir Eilam'},
  {id:'care',icon:FolderHeart,he:'התיק שלי',en:'My file'},
  {id:'learn',icon:Accessibility,he:'אנטומיה ולמידה',en:'Anatomy & learning'},
  {id:'recovery',icon:HeartPulse,he:'שיקום ומעקב כאב',en:'Pain & rehabilitation'},
  {id:'history',icon:Activity,he:'פעילות אירובית',en:'Cardio & activity'},
 ];
 return <div className="dc-premium dc-ui3-home" dir={english?'ltr':'rtl'}>
  <header className="dc-ui3-greeting"><div><span className="dc-premium-kicker">{t('תנועה חכמה. התקדמות אישית.','Move smarter. Progress personally.')}</span><h1>{t('שלום','Hello')}{name?`, ${name}`:''}</h1><p>{returning?t('טוב שחזרת. מתקדמים בקצב שלך.','Welcome back. Move at your own pace.'):t('בריאות ואימונים, יחד','Health and training, together')}</p></div><button type="button" className="dc-icon-button" onClick={()=>go('care')} aria-label={t('פתיחת הפרופיל שלי','Open my profile')}><Settings2 size={22}/></button></header>
  <PremiumCard className="dc-premium-hero"><img className="dc-ui3-hero-image" src="/premium-ui-3/workout-hero.webp" alt="" width="1536" height="1024" fetchPriority="high"/><div className="dc-premium-hero-content"><span className="dc-premium-kicker">{programTitle||t('האימון הבא שלך','Your next workout')}</span><h2>{activeWorkout?t('ממשיכים מאיפה שעצרת','Continue your workout'):t('האימון הבא מתחיל כאן','Your next workout starts here')}</h2><p>{trainingBlocked?t('ממתינים לבירור רפואי לפני אימון חדש','Medical review required before a new workout'):exerciseCount?`${exerciseCount} ${t('תרגילים בתוכנית','exercises in your program')}`:t('התוכנית והביצועים שלך, במקום אחד','Your program and performance, together')}</p>
  {activeWorkout&&workoutProgress&&workoutProgress.planned>0&&!trainingBlocked&&<div className="dc-ui3-workout-progress"><label htmlFor="home-workout-progress"><bdi dir="ltr">{workoutProgress.completed} / {workoutProgress.planned}</bdi> {t('סטים הושלמו','sets complete')}</label><progress id="home-workout-progress" value={workoutProgress.completed} max={workoutProgress.planned}/></div>}
  {workoutAction&&!trainingBlocked?workoutAction:<button type="button" className="button primary" onClick={()=>go(next)}>{trainingBlocked?t('ליצירת קשר עם הצוות','Contact the team'):activeWorkout?t('המשך אימון','Resume workout'):completed?t('לתוכנית האימון','My program'):t('מתחילים בהיכרות','Get started')}<Arrow size={18}/></button>}</div></PremiumCard>
  <PremiumCard className="dc-ui3-week"><h2>{t('ההתקדמות השבועית','Weekly progress')}</h2><div className="dc-ui3-rings">
   <button type="button" onClick={()=>go('history')}><ProgressRing value={weeklyWorkouts===null?'—':String(weeklyWorkouts)} label={t('אימונים','Workouts')} detail={t('ב־7 הימים האחרונים','Last 7 days')}/></button>
   <button type="button" onClick={()=>go('history')}><ProgressRing value={summary.steps===null?'—':summary.steps.toLocaleString(english?'en-US':'he-IL')} label={t('צעדים היום','Steps today')} progress={summary.steps!==null&&summary.stepGoal?summary.steps/summary.stepGoal*100:null} detail={summary.steps===null?t('אין נתון זמין','No data available'):t('מהמקור המאושר שלך','From your authorized source')}/></button>
   <button type="button" onClick={()=>go('readiness')}><ProgressRing value={summary.energy===null?'—':`${summary.energy}/10`} label={summary.energy===null?t('מוכנות','Readiness'):t('אנרגיה מדווחת','Reported energy')} detail={summary.energyDay??t('לבדיקת מוכנות','Check readiness')}/></button>
   <button type="button" onClick={()=>go('recovery')}><ProgressRing value={summary.recoveryPain===null?'—':`${summary.recoveryPain}/10`} label={t('מעקב כאב','Pain tracking')} detail={summary.recoveryDay?`${t('דיווח עצמי','Self-report')} · ${summary.recoveryDay}`:t('אין דיווח שיקום זמין','No recovery report available')}/></button>
  </div></PremiumCard>
  <PremiumCard className="dc-ui3-activity"><div className="dc-ui3-activity-heading"><Watch size={22} aria-hidden="true"/><div><h2>{t('הפעילות שלך, מסונכרנת','Your connected activity')}</h2><p>{!returning?t('לצפייה בפעילות, התחברו לחשבון','Sign in to view activity'):activity.error?t('מצב החיבור אינו זמין','Connection status unavailable'):activity.loading?t('בודקים את החיבור…','Checking connection…'):connection?`${connection.platform==='healthkit'?'Apple Health':'Health Connect'} · ${connection.status==='connected'?t('מחובר','Connected'):t('נדרשת בדיקת החיבור','Check connection')}`:t('אין מכשיר מחובר','No device connected')}</p></div></div>
   {returning&&activity.loading&&<p role="status">{t('טוענים את נתוני הפעילות…','Loading activity…')}</p>}
   {returning&&activity.error&&<div role="alert"><p>{t('נתוני הפעילות אינם זמינים כרגע.','Activity data is currently unavailable.')}</p><button type="button" className="button secondary" onClick={()=>void activity.reload()}>{t('ניסיון נוסף','Try again')}</button></div>}
   {connection?.lastSyncAt&&<p className="care-muted">{t('סנכרון אחרון','Last synced')}: <time dateTime={connection.lastSyncAt}>{new Date(connection.lastSyncAt).toLocaleString(english?'en-GB':'he-IL')}</time></p>}
   <p>{t('הצעדים מגיעים אוטומטית ממקור מאושר, בהתאם להרשאות שלך.','Steps sync automatically from an authorized source, with your permission.')}</p><button type="button" className="button secondary" onClick={()=>go('history')}>{t('פעילות, חיבורים ואימוני אירובי','Activity, connections & cardio')}<Arrow size={16}/></button>
  </PremiumCard>
  {returning&&wellness.error&&<p className="dc-ui3-data-notice" role="alert">{t('לא ניתן לטעון דיווחי מוכנות ושיקום כרגע.','Readiness and recovery reports are currently unavailable.')} <button type="button" className="text-button" onClick={()=>void wellness.reload()}>{t('ניסיון נוסף','Try again')}</button></p>}
  <section className="dc-premium-quick"><h2>{t('ממשיכים מכאן','Explore your space')}</h2><nav aria-label={t('פעולות מהירות','Quick actions')}>{destinations.map(({id,icon:Icon,he,en},index)=><button type="button" key={`${id}-${index}`} aria-label={id==='consult'?t('פתיחת אזור הייעוצים','Open consultations'):undefined} onClick={()=>go(id)}><Icon size={24} aria-hidden="true"/><span><strong>{english?en:he}</strong></span><Arrow size={15} aria-hidden="true"/></button>)}</nav></section>
 </div>;
}
