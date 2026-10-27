'use client';
import {ArrowLeft,ArrowRight,Activity,ChartNoAxesCombined,Dumbbell,HeartPulse,MessageCircle,ShieldCheck,Smartphone,UserRound} from 'lucide-react';
import {useLanguage} from './language-provider';
type Go=(section:string)=>void;
type DashboardProps={go:Go;completed:boolean;returning:boolean;weeklyWorkouts:number|null;activeWorkout:boolean;trainingBlocked:boolean};
function PremiumCard({children,className=''}:{children:React.ReactNode;className?:string}){return <section className={`dc-premium-card ${className}`}>{children}</section>}
function PremiumAction({children,onClick,primary=false}:{children:React.ReactNode;onClick:()=>void;primary?:boolean}){return <button type="button" className={`dc-premium-action ${primary?'is-primary':''}`} onClick={onClick}>{children}</button>}
export function PremiumHome({go,completed,returning,weeklyWorkouts,activeWorkout,trainingBlocked}:DashboardProps){
 const english=useLanguage().language==='en',Arrow=english?ArrowRight:ArrowLeft;
 const t=(he:string,en:string)=>english?en:he;
 const next=trainingBlocked?'messages':activeWorkout?'workout':completed?'plan':'onboarding';
 const nextLabel=trainingBlocked?t('יצירת קשר עם הצוות','Contact the team'):activeWorkout?t('המשך אימון','Resume workout'):completed?t('לתוכנית האימון','Open my program'):t('הרשמה והיכרות','Get started');
 const destinations=[
  {id:'plan',icon:Dumbbell,he:'התוכנית שלי',en:'My program'},
  {id:'history',icon:ChartNoAxesCombined,he:'ההתקדמות שלי',en:'My progress'},
  {id:'care',icon:UserRound,he:'התיק שלי',en:'My file'},
  {id:'contact',icon:MessageCircle,he:'צור קשר',en:'Contact'},
 ] as const;
 return <div className="dc-premium" dir={english?'ltr':'rtl'}>
  <div className="dc-premium-eyebrow"><ShieldCheck size={16} aria-hidden="true"/><span>DoctorCoach</span><span className="dc-premium-dot" aria-hidden="true"/> {t('בריאות ואימונים, יחד','Health and training, together')}</div>
  <header className="dc-premium-heading"><div><span>{t('האזור האישי','Your space')}</span><h1>{t('להתקדם עם ביטחון','Move forward with confidence')}</h1><p>{t('האימונים, הבריאות וההתקדמות שלך — במקום אחד.','Your training, health and progress — in one place.')}</p></div></header>
  <PremiumCard className="dc-premium-consult"><div className="dc-premium-consult-icon"><HeartPulse size={23} aria-hidden="true"/></div><div className="dc-premium-consult-copy"><strong>{t('ייעוץ רפואי עם ד״ר תמיר עילם','Medical consultation with Dr. Tamir Eilam')}</strong><span>{t('מענה מקצועי לשאלות רפואיות ותיאום פגישה.','Professional medical guidance and appointments.')}</span></div><button type="button" onClick={()=>go('consult')} aria-label={t('פתיחת אזור הייעוצים','Open consultations')}><Arrow size={21} aria-hidden="true"/></button></PremiumCard>
  <PremiumCard className="dc-premium-hero"><div className="dc-premium-orbit" aria-hidden="true"/><div className="dc-premium-hero-content"><span className="dc-premium-kicker">{t('התנועה הבאה שלך','Your next move')}</span><h2>{activeWorkout?t('האימון שלך מחכה לך','Your workout is waiting'):t('האימון הבא מתחיל כאן','Your next workout starts here')}</h2><p>{trainingBlocked?t('פתיחת אימון חדש ממתינה לבירור רפואי.','A medical review is required before starting a workout.'):completed?t('התוכנית שלך, הביצועים שלך והדרך שעשית.','Your program, performance and progress.'):t('מכירים אותך תחילה, ואז בונים דרך שמתאימה לך.','Start with your profile to build your path.')}</p><PremiumAction primary onClick={()=>go(next)}>{nextLabel}<Arrow size={19} aria-hidden="true"/></PremiumAction></div><div className="dc-premium-hero-art" aria-hidden="true"><Activity size={106} strokeWidth={0.8}/></div></PremiumCard>
  <div className="dc-premium-metrics" aria-label={t('סיכום אישי','Personal summary')}>
   <PremiumCard><span className="dc-premium-metric-icon"><HeartPulse size={21}/></span><span className="dc-premium-metric-title">{t('מוכנות לאימון','Readiness')}</span><strong>{t('טרם נמדדה','Not recorded')}</strong><button type="button" onClick={()=>go('readiness')}>{t('לבדיקת מוכנות','Check readiness')} <Arrow size={14}/></button></PremiumCard>
   <PremiumCard><span className="dc-premium-metric-icon"><ChartNoAxesCombined size={21}/></span><span className="dc-premium-metric-title">{t('התקדמות שבועית','Weekly progress')}</span><strong>{weeklyWorkouts===null?t('אין נתונים','No data'):`${weeklyWorkouts} ${t('אימונים','workouts')}`}</strong><button type="button" onClick={()=>go('history')}>{t('לצפייה בהתקדמות','View progress')} <Arrow size={14}/></button></PremiumCard>
   <PremiumCard><span className="dc-premium-metric-icon"><Activity size={21}/></span><span className="dc-premium-metric-title">{t('התאוששות','Recovery')}</span><strong>{t('טרם נמדדה','Not recorded')}</strong><button type="button" onClick={()=>go('recovery')}>{t('למעקב התאוששות','Track recovery')} <Arrow size={14}/></button></PremiumCard>
  </div>
  <PremiumCard className="dc-premium-steps"><div className="dc-premium-steps-visual" aria-hidden="true"><Smartphone size={46} strokeWidth={1}/></div><div className="dc-premium-steps-content"><div className="dc-premium-steps-heading"><span><Smartphone size={21}/>{t('הצעדים שלך','Your steps')}</span><span className="dc-premium-status">{t('נתונים לא זמינים','No data available')}</span></div><p>{t('נתוני צעדים יופיעו כאן כשהחיבור למקור הפעילות יהיה זמין ומאושר.','Your steps will appear here when an activity source is connected and authorized.')}</p><button type="button" onClick={()=>go('settings')}>{t('להגדרות החשבון','Account settings')} <Arrow size={16}/></button></div></PremiumCard>
  <section className="dc-premium-quick"><h2>{t('גישה מהירה','Quick access')}</h2><nav aria-label={t('פעולות מהירות','Quick actions')}>{destinations.map(({id,icon:Icon,he,en})=><button type="button" key={id} onClick={()=>go(id)}><Icon size={23} aria-hidden="true"/><span>{english?en:he}</span><Arrow className="dc-premium-tile-chevron" size={15} aria-hidden="true"/></button>)}</nav></section>
  {!returning&&<div className="dc-premium-further"><span>{t('עוד אפשרויות','Explore more')}</span><button type="button" onClick={()=>go('learn')}>{t('אנטומיה ולמידה','Anatomy & learning')} <Arrow size={16}/></button><button type="button" onClick={()=>go('library')}>{t('ספריית תרגילים','Exercise library')} <Arrow size={16}/></button></div>}
 </div>;
}
