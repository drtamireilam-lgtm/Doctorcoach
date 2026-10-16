'use client';
import {useState} from 'react';
import {Localize} from './language-provider';
import {useCareResource} from '../hooks/use-care';
import {useServiceCatalog} from '../hooks/use-services';
import {CareGate} from './care-ui';
import {ServiceCard,ServiceEditor,NutritionRevenuePreview} from './service-workspace';
import {AppointmentsWorkspace} from './appointments-workspace';
import type {ConsultationService} from '../lib/services';
export function NutritionServiceCatalog(){
 const catalog=useServiceCatalog(),services=catalog.services.filter(service=>service.provider==='lior'),[selected,setSelected]=useState('');
 return <Localize><section className="nutrition-pricing"><h2>תזונה עם ליאור זליקסון</h2><p>פגישת תזונה, ייעוץ או חבילת ליווי בהתאם להצעות של ליאור. הוא קובע את המחיר, התכולה ומשך השירות. שליחת בקשה אינה אישור תור.</p>{catalog.state==='loading'?<p role="status">טוענים שירותי תזונה…</p>:catalog.state==='error'?<p role="alert">{catalog.error}</p>:services.length?<div className="service-grid">{services.map(service=><ServiceCard key={service.id} service={service} onRequest={setSelected}/>)}</div>:<p className="care-muted">שירותי התזונה והמחירים יופיעו לאחר שליאור יגדיר אותם. אין כרגע חבילות או מחירים מאושרים להצגה.</p>}{selected&&<AppointmentsWorkspace initialServiceId={selected}/>}</section></Localize>;
}
export function NutritionServiceManager(){
 const resource=useCareResource<{services:ConsultationService[]}>('/api/nutrition-services'),[editing,setEditing]=useState<ConsultationService|null>(null);
 function create(){setEditing({id:crypto.randomUUID(),title:'',description:'',provider:'lior',format:'video',durationMinutes:45,priceAgorot:0,priceConfirmed:false,status:'draft',bookingUrl:'',paymentUrl:'',paymentInstructions:'',version:0,updatedAt:null});}
 return <Localize><section className="panel care-form"><h2>שירותי התזונה והמחירים שלי</h2><p>אפשר להגדיר פגישה, ייעוץ או הצעת חבילה בתיאור השירות. אין חבילות חודשיות או מחירים קבועים מראש.</p>{!resource.data||resource.error?<CareGate {...resource} section="dashboard"/>:<><button className="button primary" onClick={create}>הוספת שירות תזונה</button>{resource.data.services.map(service=><article key={service.id}><h3>{service.title}</h3><NutritionRevenuePreview priceAgorot={service.priceAgorot}/><button className="button secondary" onClick={()=>setEditing(service)}>עריכת השירות והמחיר</button></article>)}</>}{editing&&<ServiceEditor service={editing} endpoint="/api/nutrition-services" providerLocked onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);void resource.reload();}}/>}</section></Localize>;
}
