'use client';
import {HomeNavigationCards} from './home-navigation-cards';
import {DocumentRetention} from './document-retention';
import {BillingSandbox} from './billing-sandbox';
import {NotificationSettings} from './notification-settings';
import {Localize,useLanguage} from "../components/language-provider";
import {ArrowLeft,Home,UserRound,ClipboardList,History,Menu,BookOpen,Accessibility,MessagesSquare,Settings2,Users,CalendarDays,HeartPulse,Film} from 'lucide-react';
import {areaFor,areaLinks,mobileTabFor,traineeAreas} from '../lib/mobile-navigation';
import {InstagramLinks} from './instagram-links';
import {TeamProfiles} from './team-profiles';
type Go=(section:string)=>void;
export function HomeIntroduction({go,completed,returning}:{go:Go;completed:boolean;returning:boolean}){
 const introduction=<Localize>{<><SiteIntroduction go={go} completed={completed}/></>}</Localize>;
 return returning?<Localize>{<><HomeNavigationCards go={go}/><button className="text-button" onClick={()=>go('pro')}>הצוות ואיך DoctorCoach עובד <ArrowLeft size={18}/></button></>}</Localize>:introduction;
}
export function AreaNavigation({section,go}:{section:string;go:Go}){
 const area=areaFor(section),links=area&&areaLinks[area];
 if(section==='more')return null;
 if(!area)return <Localize><button className="back-link" onClick={()=>go('home')}><ArrowLeft size={18}/>חזרה לבית</button></Localize>;
 if(area&&section!==area)return <Localize><nav className="context-navigation" aria-label="חזרה לאזור הראשי"><button className="back-link" onClick={()=>go(area)}><ArrowLeft size={18}/>חזרה ל{traineeAreas.find(a=>a.id===area)?.label}</button></nav></Localize>;
 const secondary=links?.filter(link=>link.id!==section);
 if(!secondary?.length||['home','care','contact'].includes(section))return null;
 return <Localize><nav className="context-navigation" aria-label="פעולות נוספות באזור">{secondary.map(link=><button className="text-button" key={link.id} onClick={()=>go(link.id)}>{link.label}<ArrowLeft size={16}/></button>)}</nav></Localize>;
}
export function AreaMobileNav({section,go,openMenu}:{section:string;go:Go;openMenu:()=>void}){
 const current=mobileTabFor(section);
 return <Localize><nav className="mobile-bottom-nav streamlined-bottom" aria-label="ניווט בטלפון">{[
  {id:'home',label:'בית',icon:Home},{id:'plan',label:'התוכנית שלי',icon:ClipboardList},{id:'care',label:'התיק שלי',icon:UserRound},
 ].map(item=><button key={item.id} className={current===item.id?'active':''} aria-current={current===item.id?'page':undefined} onClick={()=>go(item.id)}><item.icon size={20}/><span>{item.label}</span></button>)}<button className={current==='menu'?'active':''} aria-current={section==='more'?'page':undefined} onClick={()=>go('more')}><Menu size={20}/><span>עוד</span></button></nav></Localize>;
}
export function MoreArea({go,staffLinks=[],signedIn=false}:{go:Go;staffLinks?:{id:string;label:string}[];signedIn?:boolean}){
 const english=useLanguage().language==='en';
 const entries=[
 ['history','ההתקדמות שלי','My progress','אימונים, ביצועים ומגמות','Workouts, performance and trends',History],
 ['library','ספריית התרגילים','Exercise library','תרגילים, מתיחות והדגמות','Exercises, stretches and demos',BookOpen],
 ['learn','אנטומיה ולמידה','Anatomy & learning','הגוף, השרירים והתנועה','Body, muscles and movement',Accessibility],
 ['contact','יצירת קשר','Contact','הודעות, תורים ומשוב','Messages, appointments and feedback',MessagesSquare],
 ['settings','הגדרות וחשבון','Settings & account','מנוי, שפה, פרטיות והתראות','Membership, language, privacy and notifications',Settings2],
 ['stories','סיפורי התקדמות','Progress stories','סיפורים שאושרו לשיתוף','Stories approved for sharing',History],
 ['pro','הצוות ואיך זה עובד','Team & how it works','היכרות עם DoctorCoach','Meet DoctorCoach',Users],
 ] as const;
 return <section className="navigation-hub" dir={english?'ltr':'rtl'}><div className="workspace-heading"><div><h1>{english?'More':'עוד'}</h1><p>{english?'Choose where you want to go.':'כל האזורים במקום ברור אחד.'}</p></div></div><nav className="navigation-hub-grid" aria-label={english?'More destinations':'אזורים נוספים'}>{entries.map(([id,he,en,dh,de,Icon])=><button key={id} onClick={()=>go(id)}><Icon size={26} aria-hidden="true"/><span><strong>{english?en:he}</strong><small>{english?de:dh}</small></span><ArrowLeft size={18} aria-hidden="true"/></button>)}</nav>{staffLinks.length>0&&<section><h2>{english?'Team workspace':'סביבת הצוות'}</h2><nav className="navigation-hub-grid" aria-label={english?'Authorized staff tools':'כלי צוות מורשים'}>{staffLinks.map(link=><button key={link.id} onClick={()=>go(link.id)}><Users size={24}/><span><strong>{english?({team:'Manage trainees',dashboard:'Team dashboard',admin:'Manage services'}[link.id]??link.label):link.label}</strong></span><ArrowLeft size={18}/></button>)}</nav></section>}{signedIn&&<a className="button secondary" href="/signout-with-chatgpt?return_to=%2F" target="_top">{english?'Sign out':'יציאה מהחשבון'}</a>}</section>;
}
export function SiteIntroduction({go,completed}:{go:Go;completed:boolean}){
 return <Localize>{<div className="care-stack site-introduction"><section className="panel care-form"><span className="eyebrow">DoctorCoach · להמשיך לנוע בצורה חכמה</span><h1>אימון וליווי רפואי — במקום אחד</h1><p>תוכנית אישית, מעקב אחר האימונים וקשר עם הצוות לאורך הדרך.</p><div className="care-actions"><button className="button primary" onClick={()=>go(completed?'plan':'onboarding')}>{completed?'לתוכנית שלי':'הרשמה והיכרות'} <ArrowLeft size={18}/></button><button className="button secondary" onClick={()=>go('consult')}>ייעוץ ותיאום מפגש</button></div></section>
 <HomeNavigationCards go={go}/><TeamProfiles/>
 <section className="panel care-form"><h2>איך זה עובד?</h2><ol className="intro-steps"><li><strong>מכירים אותך</strong><p>ממלאים פרטים ושאלון, ובוחרים אילו נתונים לשתף עם הצוות.</p></li><li><strong>בונים דרך אישית</strong><p>בליווי נדב מתאמנים בתוכנית שהוקצתה לך. בנייה עצמאית זמינה במנוי אישי פעיל.</p></li><li><strong>מתאמנים ועוקבים</strong><p>מדווחים סטים ומאמץ, רואים התקדמות ונשארים בקשר עם הצוות.</p></li></ol><div className="care-actions"><button className="text-button" onClick={()=>go('stories')}>לסיפורי התקדמות שאושרו לשיתוף</button><button className="text-button" onClick={()=>go('settings')}>מידע על מנוי אישי</button></div></section></div>}</Localize>;
}
export {ContactHub as ContactArea} from './contact-hub';
export {AccountSettingsHub as SettingsArea} from './account-settings-hub';

export function HowItWorks({go}:{go:Go}){return <Localize><section className="panel care-form"><h2>איך זה עובד?</h2><ol className="intro-steps"><li><strong>מכירים אותך</strong><p>ממלאים פרטים ושאלון, ובוחרים אילו נתונים לשתף עם הצוות.</p></li><li><strong>בונים דרך אישית</strong><p>בליווי נדב מתאמנים בתוכנית שהוקצתה לך. בנייה עצמאית זמינה במנוי אישי פעיל.</p></li><li><strong>מתאמנים ועוקבים</strong><p>מדווחים סטים ומאמץ, רואים התקדמות ונשארים בקשר עם הצוות.</p></li></ol><button className="text-button" onClick={()=>go('stories')}>לסיפורי התקדמות שאושרו לשיתוף</button></section></Localize>;}
