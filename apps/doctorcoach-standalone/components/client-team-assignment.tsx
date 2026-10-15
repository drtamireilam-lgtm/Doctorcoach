'use client';
import {useState} from 'react';
import type {CareBundle} from '../lib/care';
import {careRequest,useCareAction} from '../hooks/use-care';
import {CareFeedback} from './care-ui';
export function ClientTeamAssignment({clientId,data}:{clientId:string;data:CareBundle}){
 const [selected,setSelected]=useState<string[]>([]),[invite,setInvite]=useState<{code:string;expiresAt:string}|null>(null);const action=useCareAction();
 if(!data.canManageTeamAssignments)return null;
 return <section className="panel care-form"><h2>שיוך מאמן למתאמן</h2><p>בחרו מאמנים שילוו את המתאמן הזה. ניצור קוד שמיועד לחשבון שלו בלבד. השיוך ייכנס לתוקף אחרי שהמתאמן יאשר את השמות והרשאות השיתוף.</p>
 {(data.assignableCoaches??[]).map(staff=><label className="care-check" key={staff.email}><input type="checkbox" checked={selected.includes(staff.email)} disabled={action.busy} onChange={e=>{setSelected(old=>e.target.checked?[...old,staff.email]:old.filter(v=>v!==staff.email));setInvite(null);}}/><span>{staff.name} · <bdi>{staff.email}</bdi></span></label>)}
 {!data.assignableCoaches?.length&&<p>הוסיפו תחילה חשבון מאמן פעיל ב״הזמנות וצוות״ באזור ניהול המתאמנים.</p>}
 <button type="button" className="button primary" disabled={action.busy||!selected.length||selected.length>4} onClick={async()=>{const result=await action.run(()=>careRequest<{code:string;expiresAt:string}>('/api/care/team',{action:'invite',clientId,emails:selected}),'');if(result)setInvite(result);}}>יצירת הזמנת שיוך למתאמן הזה</button>
 {invite&&<div className="care-code"><strong>קוד שיוך ייעודי למתאמן</strong><input readOnly dir="ltr" value={invite.code} aria-label="קוד שיוך ייעודי" onFocus={e=>e.target.select()}/><p>המתאמן מדביק את הקוד בתיק האישי שלו, ב״הצוות שלי״, ומאשר את השיתוף. התוכנית הפעילה נשארת עד שמפרסמים תוכנית חדשה.</p></div>}
 <CareFeedback {...action}/></section>;
}
