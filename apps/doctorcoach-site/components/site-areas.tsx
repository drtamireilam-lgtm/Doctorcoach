'use client';
import {DocumentRetention} from './document-retention';
import {BillingSandbox} from './billing-sandbox';
import {NotificationSettings} from './notification-settings';
import {Localize} from "../components/language-provider";
import {ArrowLeft,Home,UserRound,ClipboardList,History,Menu} from 'lucide-react';
import {areaFor,areaLinks,mobileTabFor,traineeAreas} from '../lib/mobile-navigation';
import {InstagramLinks} from './instagram-links';
type Go=(section:string)=>void;
export function HomeIntroduction({go,completed,returning}:{go:Go;completed:boolean;returning:boolean}){
 const introduction=<Localize>{<><SiteIntroduction go={go} completed={completed}/></>}</Localize>;
 return returning?<Localize>{<details className="panel returning-introduction"><summary>הצוות ואיך DoctorCoach עובד</summary>{introduction}</details>}</Localize>:introduction;
}
export function AreaNavigation({section,go}:{section:string;go:Go}){
 const area=areaFor(section),links=area&&areaLinks[area];
 const selected=['membership','privacy'].includes(section)?'settings':section;
 if(!links)return null;
 return <Localize>{<nav className="area-navigation" aria-label={`ניווט בתוך ${traineeAreas.find(a=>a.id===area)?.label}`}>
  {links.map(link=><button key={link.id} className={selected===link.id?'active':''} aria-current={selected===link.id?'page':undefined} onClick={()=>go(link.id)}>{link.label}</button>)}
 </nav>}</Localize>;
}
export function AreaMobileNav({section,go,openMenu}:{section:string;go:Go;openMenu:()=>void}){
 const current=mobileTabFor(section);
 return <Localize>{<nav className="mobile-bottom-nav seven-area-bottom" aria-label="ניווט בטלפון">{[
  {id:'home',label:'בית',icon:Home},{id:'care',label:'התיק שלי',icon:UserRound},
  {id:'plan',label:'התוכנית',icon:ClipboardList},{id:'history',label:'התקדמות',icon:History},
 ].map(item=><button key={item.id} className={current===item.id?'active':''} aria-current={current===item.id?'page':undefined} onClick={()=>go(item.id)}><item.icon size={20}/><span>{item.label}</span></button>)}<button className={current==='menu'?'active':''} onClick={openMenu} aria-label="פתיחת כל שבעת אזורי האתר"><Menu size={20}/><span>כל האזורים</span></button></nav>}</Localize>;
}
export function SiteIntroduction({go,completed}:{go:Go;completed:boolean}){
 return <Localize>{<div className="care-stack site-introduction"><section className="panel care-form"><span className="eyebrow">DoctorCoach · להמשיך לנוע בצורה חכמה</span><h1>אימון וליווי רפואי — במקום אחד</h1><p>תוכנית אישית, מעקב אחר האימונים וקשר עם הצוות לאורך הדרך.</p><div className="care-actions"><button className="button primary" onClick={()=>go(completed?'plan':'onboarding')}>{completed?'לתוכנית שלי':'הרשמה והיכרות'} <ArrowLeft size={18}/></button><button className="button secondary" onClick={()=>go('consult')}>ייעוץ ותיאום מפגש</button></div></section>
 <section className="team-grid" aria-label="הצוות שלנו"><article className="team-card"><span>אימון וכוח</span><h2>נדב רון</h2><p>מאמן כושר מוסמך, מר ישראל בפיתוח גוף תחרותי לשנת 2024. בניית תוכניות אימון וליווי מתאמנים.</p></article><article className="team-card"><span>רפואה ותנועה</span><h2>ד״ר תמיר עילם</h2><p>רופא ומאמן חדר כושר. התאמת פעילות גופנית סביב פציעות וחזרה הדרגתית לאימון.</p></article><article className="team-card"><span>תזונה קלינית וביצועים</span><h2>ליאור זליקסון</h2><p>דיאטן קליני. ליווי תזונתי אופציונלי, בהתאם לזמינות ולתיאום נפרד.</p></article></section>
 <section className="panel care-form"><h2>איך זה עובד?</h2><ol className="intro-steps"><li><strong>מכירים אותך</strong><p>ממלאים פרטים ושאלון, ובוחרים אילו נתונים לשתף עם הצוות.</p></li><li><strong>בונים דרך אישית</strong><p>בליווי נדב מתאמנים בתוכנית שהוקצתה לך. בנייה עצמאית זמינה במנוי אישי פעיל.</p></li><li><strong>מתאמנים ועוקבים</strong><p>מדווחים סטים ומאמץ, רואים התקדמות ונשארים בקשר עם הצוות.</p></li></ol><div className="care-actions"><button className="text-button" onClick={()=>go('stories')}>לסיפורי התקדמות שאושרו לשיתוף</button><button className="text-button" onClick={()=>go('settings')}>מידע על מנוי אישי</button></div></section></div>}</Localize>;
}
export function ContactArea({go}:{go:Go}){return <Localize>{<div className="care-stack"><div className="workspace-heading"><div><h1>יצירת קשר</h1><p>הודעות לצוות, תיאום מפגשים ומשוב על האפליקציה.</p></div></div><nav className="daily-links" aria-label="דרכים ליצור קשר">{[
 ['messages','הודעות לצוות','רפואה, אימון, תזונה ותיאום עם הצוות המשויך'],['appointments','התורים שלי','בקשות לתור ומעקב אחר מפגשים'],['consult','ייעוץ ותיאום','היכרות עם שירותי הליווי'],['feedback','משוב והצעות','עזרו לנו לשפר את החוויה'],
 ].map(([id,label,description])=><button key={id} onClick={()=>go(id)}><span><strong>{label}</strong><small>{description}</small></span><ArrowLeft size={18}/></button>)}</nav><section className="panel care-form"><InstagramLinks/></section></div>}</Localize>;}
export function SettingsArea({go,onTour}:{go:Go;onTour:()=>void}){return <Localize>{<div className="care-stack"><div className="workspace-heading"><div><h1>הגדרות וחשבון</h1><p>המנוי האישי, פרטי הפרופיל והעדפות הפרטיות שלך.</p></div></div><nav className="daily-links" aria-label="הגדרות חשבון">{[['onboarding','עדכון פרופיל ושאלון'],['membership','מסלול ומנוי אישי'],['privacy','פרטיות, הסכמות ונתונים']].map(([id,label])=><button key={id} onClick={()=>go(id)}><span>{label}</span><ArrowLeft size={18}/></button>)}</nav><button className="button secondary" onClick={onTour}>סיור בשבעת אזורי האפליקציה</button><NotificationSettings/><DocumentRetention manage/><BillingSandbox/></div>}</Localize>;}
