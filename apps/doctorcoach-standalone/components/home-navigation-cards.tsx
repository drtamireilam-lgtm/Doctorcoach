'use client';
import {Dumbbell,ChartNoAxesCombined,FolderHeart,BookOpen,Accessibility,MessagesSquare,ArrowLeft,ArrowRight} from 'lucide-react';
import {useLanguage} from './language-provider';
const cards=[
 {id:'plan',icon:Dumbbell,he:'האימון שלי',en:'My workout',detailHe:'התוכנית האישית והאימון הבא שלך',detailEn:'Your personal program and next workout'},
 {id:'history',icon:ChartNoAxesCombined,he:'ההתקדמות שלי',en:'My progress',detailHe:'האימונים, המשקלים והמגמות לאורך הדרך',detailEn:'Workouts, working weights and trends over time'},
 {id:'care',icon:FolderHeart,he:'התיק שלי',en:'My file',detailHe:'הפרטים האישיים, השאלונים והליווי שלך',detailEn:'Your personal details, questionnaires and care'},
 {id:'library',icon:BookOpen,he:'ספריית התרגילים',en:'Exercise library',detailHe:'תרגילים, מתיחות והדגמות במקום אחד',detailEn:'Exercises, stretches and demonstrations in one place'},
 {id:'learn',icon:Accessibility,he:'אנטומיה ולמידה',en:'Anatomy & learning',detailHe:'להכיר את הגוף ולהבין את התנועה',detailEn:'Explore your body and understand movement'},
 {id:'contact',icon:MessagesSquare,he:'יצירת קשר',en:'Contact',detailHe:'הודעות לצוות, תיאום מפגשים ומשוב',detailEn:'Team messages, appointments and feedback'},
] as const;
export function HomeNavigationCards({go}:{go:(section:string)=>void}){const {language}=useLanguage(),english=language==='en';return <section className="home-shortcuts" dir={english?'ltr':'rtl'}><div className="home-shortcuts-heading"><span className="eyebrow">DoctorCoach</span><h2>{english?'Your space, one tap away':'המרחב שלך, בלחיצה אחת'}</h2><p>{english?'Choose where you want to go today.':'בחרו לאן מתקדמים היום.'}</p></div><nav className="home-shortcuts-grid" aria-label={english?'Home navigation':'ניווט ממסך הבית'}>{cards.map(card=><button type="button" key={card.id} className={`home-shortcut home-shortcut-${card.id}`} onClick={()=>go(card.id)}><span className="home-shortcut-art" aria-hidden="true"><span className="home-shortcut-orbit"/><card.icon size={78} strokeWidth={1.5}/></span><span className="home-shortcut-copy"><strong>{english?card.en:card.he}</strong><span>{english?card.detailEn:card.detailHe}</span></span><span className="home-shortcut-arrow" aria-hidden="true">{english?<ArrowRight size={22}/>:<ArrowLeft size={22}/>}</span></button>)}</nav></section>;}
