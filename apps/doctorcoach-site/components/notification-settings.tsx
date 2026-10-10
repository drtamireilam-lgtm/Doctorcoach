'use client';
import {useEffect,useState} from 'react';
import {Localize} from './language-provider';
import {useCareResource,useCareAction,careRequest} from '../hooks/use-care';
import {CareFeedback,CareGate} from './care-ui';
import {notificationCategories,type NotificationPreferences} from '../lib/notification-preferences';
const labels={training:'תזכורות אימון',rehab:'תזכורות שיקום ומעקב',progress:'סיכומי התקדמות ויעדים',team:'הודעות ועדכוני צוות',appointments:'תזכורות למפגשים'};
export function NotificationSettings(){
 const r=useCareResource<{preferences:NotificationPreferences;version:number;pushSupported:boolean}>('/api/notifications?settings=1'),a=useCareAction(),[draft,setDraft]=useState<NotificationPreferences|null>(null);
 useEffect(()=>{if(r.data)setDraft(r.data.preferences);},[r.data]);
 return <Localize><section className="panel care-form"><h2>העדפות התראות</h2><p>העדפות אלה חלות רק לאחר הסכמה לעדכונים באזור הפרטיות.</p>{!r.data||!draft?<CareGate {...r} section="settings"/>:<form onSubmit={async e=>{e.preventDefault();if(await a.run(()=>careRequest('/api/notifications',{preferences:draft,version:r.data!.version}),'העדפות ההתראות נשמרו.'))void r.reload();}}><div className="care-stack">{notificationCategories.map(category=><label key={category} className="care-check"><input type="checkbox" checked={draft.categories[category]} onChange={e=>setDraft({...draft,categories:{...draft.categories,[category]:e.target.checked}})}/>{labels[category]}</label>)}</div><label className="care-check"><input type="checkbox" checked={draft.quietEnabled} onChange={e=>setDraft({...draft,quietEnabled:e.target.checked})}/>שעות שקטות לפי שעון ישראל</label><div className="care-grid"><label className="care-field">מתחילת השקט<input type="time" required value={draft.quietStart} disabled={!draft.quietEnabled} onChange={e=>setDraft({...draft,quietStart:e.target.value})}/></label><label className="care-field">עד סיום השקט<input type="time" required value={draft.quietEnd} disabled={!draft.quietEnabled} onChange={e=>setDraft({...draft,quietEnd:e.target.value})}/></label></div><p className="care-muted">התראות מוצגות בתוך האפליקציה בעת פתיחתה. Push למכשיר אינו פעיל; לא נשלח מידע למסך הנעילה.</p><button className="button primary" disabled={a.busy}>שמירת העדפות התראות</button></form>}<CareFeedback {...a}/></section></Localize>;
}
