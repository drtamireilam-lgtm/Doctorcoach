'use client';
import {useEffect,useState} from 'react';
import {Localize} from './language-provider';
import {careRequest,useCareResource,useCareAction} from '../hooks/use-care';
import {CareFeedback,CareGate} from './care-ui';
import {pushStep,readyPushWorker} from '../lib/browser-push';
type Status={configured:boolean;consented:boolean;publicKey:string|null;devices:{id:string}[]};
export function PushSettings(){
 const [phase,setPhase]=useState('');
 const r=useCareResource<Status>('/api/push'),a=useCareAction();const [supported,setSupported]=useState(false),[installed,setInstalled]=useState(true),[sub,setSub]=useState<PushSubscription|null>(null),[registered,setRegistered]=useState(false);
 async function refresh(){if(!('serviceWorker' in navigator))return;const registration=await navigator.serviceWorker.getRegistration();const current=await registration?.pushManager?.getSubscription()??null;setSub(current);setRegistered(false);if(current&&r.data){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(current.endpoint));const id=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');setRegistered(r.data.devices.some(d=>d.id===id));}}
 useEffect(()=>{setSupported('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window);const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;setInstalled(!ios||matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);void refresh();},[r.data]);
 async function enable(){try{await a.run(async()=>{
 if(!r.data?.publicKey)throw new Error('שירות Push עדיין אינו מוגדר.');
 if(!r.data.consented)throw new Error('יש לאשר עדכונים בתוך האפליקציה והתראות לטלפון באזור הפרטיות.');
 if(Notification.permission==='denied')throw new Error('ההתראות חסומות בהגדרות המכשיר.');
 setPhase('ממתינים לאישור ההתראות באייפון…');
 // Request permission directly within the tap, before any awaited operation.
 const permission=await pushStep(Notification.requestPermission(),'אישור ההתראות לא הושלם. נסו שוב ואשרו את החלון במכשיר.',30000);
 if(permission!=='granted')throw new Error('לא ניתן אישור להתראות.');
 setPhase('מכינים את שירות ההתראות במכשיר…');
 const registration=await readyPushWorker(navigator.serviceWorker);
 const key=r.data.publicKey,padded=key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'=');const bytes=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
 setPhase('רושמים את המכשיר להתראות…');
 const message='רישום ההתראות במכשיר לא הושלם בזמן. בדקו חיבור לאינטרנט ונסו שוב.';
 const subscription=await pushStep(registration.pushManager.getSubscription(),message)??await pushStep(registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes}),message,30000);
 setPhase('שומרים את רישום המכשיר בחשבון…');
 await pushStep(careRequest('/api/push',{action:'subscribe',endpoint:subscription.endpoint}),'שמירת המכשיר לא הושלמה בזמן. פתחו מחדש את המסך ובדקו את מצב Push.',30000);
 await pushStep(r.reload(),'רענון מצב Push לא הושלם. פתחו מחדש את המסך.');
 },'Push הופעל למכשיר הזה.');}finally{setPhase('');}}
 return <Localize><section className="panel care-form"><h2>התראות לטלפון גם כשהאפליקציה סגורה</h2><p>ההודעה מציגה עדכון כללי בלבד. התוכן מופיע אחרי כניסה לאפליקציה.</p>{!r.data?<CareGate {...r} section="settings"/>:!r.data.configured?<p>שירות Push עדיין אינו מוגדר.</p>:!installed?<p>באייפון: הוסיפו את DoctorCoach למסך הבית ופתחו אותו מהאייקון כדי להפעיל התראות.</p>:!supported?<p>הדפדפן הזה אינו תומך ב־Push. נסו מהאפליקציה במסך הבית או מדפדפן נתמך.</p>:<div className="care-actions"><button className="button primary" disabled={a.busy||registered} onClick={enable}>{registered?'Push פעיל במכשיר הזה':a.busy?'מפעילים Push…':'הפעלת Push למכשיר הזה'}</button>{registered&&sub&&<><button className="button secondary" disabled={a.busy} onClick={()=>a.run(()=>careRequest('/api/push',{action:'test',endpoint:sub.endpoint}),'השליחה אושרה על ידי שירות Push. בדקו את הטלפון.')}>שליחת התראת ניסיון</button><button className="button secondary" disabled={a.busy} onClick={async()=>{if(await a.run(async()=>{await careRequest('/api/push',{action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe();await r.reload();},'Push בוטל למכשיר הזה.'))void refresh();}}>ביטול Push במכשיר הזה</button></>}</div>}<p className="care-muted">נדרשת הסכמה לעדכונים באזור הפרטיות. קטגוריות ההתראות ושעות השקט חלות גם כאן. Push על עדכונים חדשים פועל בעקבות פעולות באפליקציה; תזכורות לפי שעה בלבד עדיין אינן פעילות. מסירת ההודעה תלויה בחיבור ובהגדרות המכשיר.</p><p role="status" aria-live="polite">{phase}</p><CareFeedback {...a}/></section></Localize>;
}
