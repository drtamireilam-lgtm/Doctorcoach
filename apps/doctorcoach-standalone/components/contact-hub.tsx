'use client';
import {useEffect} from 'react';
import {ArrowLeft,ArrowRight,MessagesSquare,CalendarDays,MessageCircle,RefreshCw} from 'lucide-react';
import {authHref} from '../lib/auth-language';
import {useLanguage} from './language-provider';
import {useCareResource} from '../hooks/use-care';
import {InstagramLinks} from './instagram-links';
import type {Thread} from '../lib/messaging';
import type {Appointment} from '../lib/appointments';
export function ContactHub({go}:{go:(section:string)=>void}){
 const english=useLanguage().language==='en',t=(he:string,en:string)=>english?en:he;
 const messages=useCareResource<{threads:Thread[]}>('/api/messages'),appointments=useCareResource<{appointments:Appointment[]}>('/api/appointments');
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible'){void messages.reload();void appointments.reload();}};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[messages.reload,appointments.reload]);
 const unread=messages.data&&!messages.error?messages.data.threads.reduce((sum,thread)=>sum+thread.unread,0):null;
 const pending=appointments.data&&!appointments.error?appointments.data.appointments.filter(a=>a.state==='requested').length:null;
 const cancellation=appointments.data&&!appointments.error?appointments.data.appointments.filter(a=>a.state==='cancel_requested').length:null;
 const next=appointments.data&&!appointments.error?appointments.data.appointments.filter(a=>a.state==='scheduled'&&a.startsAt&&Date.parse(a.startsAt)>Date.now()).sort((a,b)=>a.startsAt!.localeCompare(b.startsAt!))[0]:null;
 const error=messages.error||appointments.error,authRequired=messages.status===401||appointments.status===401;
 const Arrow=english?ArrowRight:ArrowLeft;
 return <section className="care-stack contact-hub" dir={english?'ltr':'rtl'}><div className="workspace-heading"><div><h1>{t('יצירת קשר','Contact')}</h1><p>{t('בחרו במה נוכל לעזור.','Choose how we can help.')}</p></div><button type="button" className="text-button" disabled={messages.loading||appointments.loading} onClick={()=>{void messages.reload();void appointments.reload();}}><RefreshCw size={16}/>{t('רענון מצב','Refresh status')}</button></div>
 <nav className="contact-options" aria-label={t('דרכים ליצור קשר','Contact options')}>
 <button type="button" onClick={()=>go('messages')}><MessagesSquare size={28}/><span><strong>{t('הודעה לצוות שלי','Message my team')}</strong><small>{t('שאלה או עדכון לצוות המשויך שלך','A question or update for your assigned team')}</small><span className="contact-status" role="status">{unread===null?messages.loading?t('טוענים הודעות…','Loading messages…'):t('מצב ההודעות אינו זמין כרגע','Message status is currently unavailable'):unread>0?t(`${unread} הודעות שלא נקראו`,`${unread} unread messages`):t('אין הודעות שלא נקראו','No unread messages')}</span></span><Arrow size={20}/></button>
 <button type="button" onClick={()=>go('appointments')}><CalendarDays size={28}/><span><strong>{t('קביעת תור והתורים שלי','Book & view appointments')}</strong><small>{t('בקשה למפגש ומעקב אחר אישור המועד','Request a meeting and track its confirmation')}</small><span className="contact-status" role="status">{pending===null?appointments.loading?t('טוענים תורים…','Loading appointments…'):t('מצב התורים אינו זמין כרגע','Appointment status is currently unavailable'):pending>0?t(`${pending} בקשות ממתינות לתיאום`,`${pending} requests awaiting scheduling`):t('אין בקשות ממתינות לתיאום','No requests awaiting scheduling')}{!!cancellation&&t(` · ${cancellation} בקשות ביטול ממתינות`,` · ${cancellation} cancellation requests pending`)}</span>{next&&<small>{t('המפגש הבא: ','Next meeting: ')}{new Intl.DateTimeFormat(english?'en-GB':'he-IL',{timeZone:'Asia/Jerusalem',dateStyle:'short',timeStyle:'short'}).format(new Date(next.startsAt!))}{t(' · שעון ישראל',' · Israel time')}</small>}</span><Arrow size={20}/></button>
 <button type="button" onClick={()=>go('feedback')}><MessageCircle size={28}/><span><strong>{t('משוב על האפליקציה','App feedback')}</strong><small>{t('דיווח על תקלה או הצעה לשיפור','Report an issue or suggest an improvement')}</small></span><Arrow size={20}/></button></nav>
 {authRequired?<p className="note">{t('התחברו כדי לראות את מצב ההודעות והתורים האישיים.','Sign in to view your personal message and appointment status.')} <a href={authHref('/signin-with-chatgpt?return_to=%2F%23contact',english?'en':'he')} target="_top">{t('התחברות לחשבון','Sign in')}</a></p>:error?<p className="care-error" role="alert">{t('לא ניתן לעדכן את הסיכום כרגע. אפשר לפתוח את ההודעות או התורים ולנסות שוב.','The summary could not be refreshed. Open Messages or Appointments to retry.')}</p>:null}
 <button className="text-button" onClick={()=>go('consult')}>{t('היכרות עם שירותי הייעוץ והליווי','Explore consultation and coaching services')}<Arrow size={18}/></button><p className="care-muted">{t('המערכת אינה מיועדת למקרי חירום ואין התחייבות לזמן מענה.','This service is not for emergencies and does not guarantee a response time.')}</p><details className="panel browse-advanced"><summary>{t('קישורי Instagram','Instagram links')}</summary><InstagramLinks/></details></section>;
}
