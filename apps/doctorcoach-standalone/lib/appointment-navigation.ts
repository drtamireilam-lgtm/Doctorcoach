import type {Appointment} from './appointments.ts';
export function appointmentGroup(a:Appointment,now=Date.now()):'attention'|'upcoming'|'past'{
 if(['requested','cancel_requested','followup'].includes(a.state)||['reported','refund_pending'].includes(a.paymentState)||a.calendarStatus==='error'||a.state==='scheduled'&&!!a.endsAt&&new Date(a.endsAt).getTime()<=now)return 'attention';
 return ['completed','cancelled'].includes(a.state)?'past':'upcoming';
}
export function appointmentGroups(appointments:Appointment[],query='',provider='all',now=Date.now()){
 const text=query.trim().toLocaleLowerCase();const groups:{attention:Appointment[];upcoming:Appointment[];past:Appointment[]}={attention:[],upcoming:[],past:[]};
 for(const a of appointments)if((provider==='all'||a.provider===provider)&&(a.clientName+' '+a.title).toLocaleLowerCase().includes(text))groups[appointmentGroup(a,now)].push(a);
 groups.upcoming.sort((a,b)=>(a.startsAt??'').localeCompare(b.startsAt??''));
 return groups;
}
export function feedbackEligible(a:Appointment,now=Date.now()){return ['completed','followup'].includes(a.state)&&!!a.endsAt&&new Date(a.endsAt).getTime()<=now;}
