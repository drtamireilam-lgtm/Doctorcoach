'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Bell,Palette,FolderHeart,HelpCircle,ShieldCheck,UserRound,CreditCard,Settings2} from 'lucide-react';
import {authHref} from '../lib/auth-language';
import {useLanguage,LanguageToggle} from './language-provider';
import {AppearancePicker} from './theme-provider';
import {NotificationSettings} from './notification-settings';
import {DocumentRetention} from './document-retention';
import {BillingSandbox} from './billing-sandbox';
import {AppInstall} from './app-install';
export function AccountSettingsHub({go,onTour,canAdmin=false}:{go:(section:string)=>void;onTour:()=>void;canAdmin?:boolean}){
 const english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he,[topic,setTopic]=useState('overview'),[visited,setVisited]=useState<string[]>([]);
 const Arrow=english?ArrowRight:ArrowLeft,Back=english?ArrowLeft:ArrowRight;
 const choices=[
 ['membership','מסלול ומנוי','Plan & membership','המסלול הפעיל והגישה שלך','Your current plan and access',CreditCard],
 ['privacy','פרטיות והסכמות','Privacy & consents','הנתונים שלך והרשאות השיתוף','Your data and sharing permissions',ShieldCheck],
 ['notifications','התראות ושעות שקטות','Notifications & quiet hours','עדכוני צוות, תזכורות והתראות למכשיר','Team updates, reminders and device notifications',Bell],
 ['appearance','שפה ותצוגה','Language & appearance','שפה, ערכות עיצוב וצבעים אישיים','Language, themes and custom colors',Palette],
 ['security','אבטחת חשבון','Account security','כניסה מאובטחת וניהול הגישה לחשבון','Secure sign-in and account access',ShieldCheck],
 ['help','עזרה והתקנה','Help & installation','סיור באפליקציה והוספה למסך הבית','App tour and home screen installation',HelpCircle],
 ...canAdmin?[['admin','כלי ניהול','Administration','בקשות מסמכים וסביבת בדיקות תשלום','Document requests and payment testing',Settings2] as const]:[],
 ] as const;
 function choose(id:string){if(['membership','privacy'].includes(id)){go(id);return;}setVisited(old=>old.includes(id)?old:[...old,id]);setTopic(id);window.scrollTo({top:0,behavior:'auto'});}
 return <section className="care-stack account-settings-hub" dir={english?'ltr':'rtl'}><div className="workspace-heading"><div><h1>{topic==='overview'?t('הגדרות','Settings'):choices.find(x=>x[0]===topic)?.[english?2:1]}</h1><p>{topic==='overview'?t('בחרו נושא. כל אפשרות נפתחת בנפרד.','Choose a topic. Each option opens separately.'):choices.find(x=>x[0]===topic)?.[english?4:3]}</p></div></div>{topic!=='overview'&&<button className="back-link" onClick={()=>setTopic('overview')}><Back size={18}/>{t('חזרה להגדרות','Back to settings')}</button>}
 {topic==='overview'&&<nav className="compact-menu" aria-label={t('נושאי הגדרות','Settings topics')}>{choices.map(([id,he,en,dh,de,Icon])=><button type="button" key={id} onClick={()=>choose(id)}><Icon size={26} aria-hidden="true"/><span><strong>{english?en:he}</strong><small>{english?de:dh}</small></span><Arrow size={18} aria-hidden="true"/></button>)}</nav>}
 {visited.includes('notifications')&&<div className="settings-topic" hidden={topic!=='notifications'}><NotificationSettings/></div>}
 {visited.includes('appearance')&&<div className="settings-topic panel care-form" hidden={topic!=='appearance'}><h2>{t('השפה שלך','Your language')}</h2><LanguageToggle/><AppearancePicker active={topic==='appearance'}/><p className="care-muted">{t('בחירת השפה נשמרת במכשיר הזה.','Language is saved on this device.')}</p></div>}
 {visited.includes('security')&&<section className="settings-topic panel care-form" hidden={topic!=='security'}><h2>{t('אבטחת החשבון','Account security')}</h2><p>{t('הכניסה מתבצעת דרך ספק הזהות המאובטח. אל תשתפו קודי כניסה עם אחרים.','Sign-in uses the secure identity provider. Never share sign-in codes.')}</p><a className="button secondary" href={authHref('/signin-with-chatgpt?return_to=%2F%23settings',english?'en':'he')}>{t('פתיחת מסך ההתחברות','Open sign-in')}</a></section>}
 {visited.includes('help')&&<section className="settings-topic panel care-form" hidden={topic!=='help'}><h2>{t('היכרות עם האפליקציה','Find your way around')}</h2><button className="button primary" onClick={onTour}>{t('סיור באפליקציה','App tour')}</button><h2>{t('הוספה למסך הבית','Add to home screen')}</h2><AppInstall/><p className="care-muted">{t('אפשרויות ההתקנה תלויות במכשיר ובדפדפן.','Installation options depend on your device and browser.')}</p><a className="button secondary" href="/coaching">{t('סביבת מאמן והצטרפות למאמן','Coach workspace and joining a coach')}</a><button className="text-button" onClick={()=>go('contact')}>{t('יצירת קשר ותמיכה','Contact & support')}<Arrow size={16}/></button></section>}
 {visited.includes('admin')&&canAdmin&&<div className="settings-topic care-stack" hidden={topic!=='admin'}><DocumentRetention manage expanded/><BillingSandbox/></div>}
 <a className="button secondary settings-signout" href={authHref('/signout-with-chatgpt?return_to=%2F',english?'en':'he')} target="_top">{t('התנתקות','Sign out')}</a>
 {topic==='overview'&&<details className="panel browse-advanced"><summary>{t('בקשת מחיקת חשבון ונתונים','Request account and data deletion')}</summary><p>{t('פתחו את תהליך בקשת המחיקה כדי לעיין בפרטים ולהגיש בקשה.','Open the deletion request process to review the details and submit a request.')}</p><a className="button secondary" href="/account-deletion">{t('לתהליך בקשת המחיקה','Open deletion request process')}</a></details>}</section>;
}
