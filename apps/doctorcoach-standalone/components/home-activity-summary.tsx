'use client';
import {useEffect} from 'react';
import {useCareResource} from '../hooks/use-care';
import {useLanguage} from './language-provider';
import type {TrainingController} from '../hooks/use-training';
import type {Thread} from '../lib/messaging';

export function HomeActivitySummary({controller,go}:{controller:TrainingController;go:(section:string)=>void}){
 const en=useLanguage().language==='en';
 const messages=useCareResource<{threads:Thread[]}>('/api/messages');
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')void messages.reload();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[messages.reload]);
 const unread=messages.data&&!messages.error?messages.data.threads.reduce((sum,thread)=>sum+thread.unread,0):null;
 return <div className="home-activity-summary" dir={en?'ltr':'rtl'}><section className="panel"><h2>{en?'Messages from my team':'הודעות מהצוות שלי'}</h2><p role="status">{messages.loading?(en?'Checking messages…':'בודקים הודעות…'):unread===null?(en?'Message status is unavailable.':'מצב ההודעות אינו זמין כרגע.'):unread>0?`${unread} ${en?'unread messages':'הודעות שלא נקראו'}`:en?'No unread messages.':'אין הודעות שלא נקראו.'}</p>{messages.error&&<button className="text-button" onClick={()=>void messages.reload()} disabled={messages.loading}>{en?'Try again':'ניסיון נוסף'}</button>}<button className="button secondary" onClick={()=>go('messages')}>{en?'Open messages':'לפתיחת ההודעות'}</button></section><section className="panel"><h2>{en?'My progress':'ההתקדמות שלי'}</h2><p><strong>{controller.feed.stats.week}</strong> {en?'workouts in the last seven days':'אימונים בשבעת הימים האחרונים'}</p><p><strong>{controller.feed.stats.total}</strong> {en?'completed workouts in total':'אימונים שהושלמו בסך הכול'}</p><button className="button secondary" onClick={()=>go('history')}>{en?'View history & progress':'להיסטוריה ולהתקדמות'}</button></section></div>;
}
