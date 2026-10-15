'use client';
import {useState} from 'react';
import type {Appointment} from '../lib/appointments';
import {feedbackEligible} from '../lib/appointment-navigation';
import {careRequest,useCareAction} from '../hooks/use-care';
import {CareFeedback,careDate} from './care-ui';
import {Localize,useLanguage} from './language-provider';

export function AppointmentFeedback({appointment:a,manage,reload}:{appointment:Appointment;manage:boolean;reload:()=>void}){
 const {language}=useLanguage();const [message,setMessage]=useState(language==='en'?'Thank you for meeting with DoctorCoach. We would appreciate your feedback: what helped you, and what could we improve? Please reply here without including medical details.':'תודה על המפגש עם DoctorCoach. נשמח לשמוע איך היה הייעוץ: מה עזר לך ומה אפשר לשפר? אפשר להשיב כאן, ללא פרטים רפואיים.');
 const [response,setResponse]=useState('');const action=useCareAction();
 async function send(name:string,content:string){if(await action.run(()=>careRequest('/api/appointments',{action:name,id:a.id,version:a.version,content}),name==='requestFeedback'?'בקשת המשוב נשלחה ומופיעה בתור של המתאמן.':'המשוב נשלח לצוות. תודה!'))reload();}
 if(!a.feedbackRequestedAt&&!manage)return null;
 if(!a.feedbackRequestedAt&&!feedbackEligible(a))return null;
 return <Localize><section className="appointment-feedback"><h4>משוב על המפגש</h4>{a.feedbackRequestedAt?<><p className="care-muted">בקשת משוב נשלחה · {careDate(a.feedbackRequestedAt)}</p><p className="care-preserve" data-no-translate>{a.feedbackMessage}</p>{a.feedbackRespondedAt?<div className="care-response"><strong>משוב התקבל · {careDate(a.feedbackRespondedAt)}</strong><p className="care-preserve" data-no-translate>{a.feedbackResponse}</p></div>:manage?<p className="care-muted">ממתינים לתשובת המתאמן.</p>:<form onSubmit={e=>{e.preventDefault();void send('submitFeedback',response);}}><label className="care-field">איך היה המפגש?<textarea required minLength={3} maxLength={2000} rows={3} value={response} onChange={e=>setResponse(e.target.value)}/></label><p className="care-muted">המשוב פרטי לצוות ואינו מפורסם באתר. אין לכלול כאן מידע רפואי; לשאלה רפואית פנו בערוץ המתאים.</p><button className="button primary" disabled={action.busy}>שליחת המשוב לצוות</button></form>}</>:<details><summary>הכנת הודעה לבקשת משוב</summary><form onSubmit={e=>{e.preventDefault();void send('requestFeedback',message);}}><p>ההודעה תישלח ל־<strong data-no-translate>{a.clientName}</strong> בתוך האפליקציה, ותופיע בתור הזה. ההתראה תלויה בהעדפות ההתראות של המתאמן.</p><label className="care-field">נוסח ההודעה<textarea required minLength={3} maxLength={600} rows={4} value={message} onChange={e=>setMessage(e.target.value)}/></label><button className="button primary" disabled={action.busy}>שליחת בקשת משוב</button></form></details>}<CareFeedback {...action}/></section></Localize>;
}
