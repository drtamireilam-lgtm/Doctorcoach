'use client';
import {nutritionRevenuePreview} from '../lib/nutrition-commercial';
import {Localize} from "../components/language-provider";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, Clock3, ExternalLink, Link2, LoaderCircle, MapPin, Pencil, Plus, ShieldCheck, Video, X } from 'lucide-react';
import { AppointmentsWorkspace } from './appointments-workspace';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from './ui/alert-dialog';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { bookingLink, coachingPackages, formatNames, parseService, providerNames, publicService, servicePrice, statusNames } from '../lib/services';
import type { ConsultationService, PublicService, ServiceFormat, ServiceProvider, ServiceStatus } from '../lib/services';
import { ServiceRequestError, serviceRequest, useServiceCatalog } from '../hooks/use-services';
import type { StaffAccess } from '../hooks/use-services';

export function ServiceCard({ service, preview = false, onRequest }: { service:PublicService; preview?:boolean; onRequest?:(id:string)=>void }) {
  const Icon = service.format === 'video' ? Video : MapPin;
  const ready = service.status === 'bookable';
  return <Localize>{<article className={`service-card ${ready ? 'booking-ready' : ''}`}>
    <div className="service-card-top"><span className="service-format-icon"><Icon size={25}/></span><span className={`service-tag ${ready ? 'ready' : ''}`}>{preview && service.status === 'draft' ? 'טיוטה · לא מוצגת לקהל' : ready ? 'הזמנה אונליין' : 'תיאום באישור הצוות'}</span></div>
    <span className="service-provider">{providerNames[service.provider]}</span>
    <h2>{service.title}</h2>
    <p className="service-description">{service.description}</p>
    <div className="service-facts"><span><Clock3 size={16}/>{service.durationMinutes} דקות{service.id==='medical-followup'?' לעיון':''}</span><span>{service.id==='medical-followup'?'עיון בחומר שהועבר':<><Icon size={16}/>{formatNames[service.format]}</>}</span></div>
    <div className="service-price"><span>{service.id==='medical-followup'?'מחיר לעיון בבדיקות':service.priceConfirmed ? 'מחיר למפגש' : 'מחיר מוצע למפגש'}</span><strong>{servicePrice(service.priceAgorot)}</strong></div>
    {ready && !preview && <a className="button primary wide" href={service.bookingUrl} target="_blank" rel="noopener noreferrer">בחירת מועד ב־Calendly <ExternalLink size={17}/></a>}
    {!preview && onRequest && <button className={`button ${ready?'secondary':'primary'} wide`} onClick={()=>onRequest(service.id)} aria-label={`בקשת תור: ${service.title}`}><CalendarDays size={17}/> בקשת תור לשירות הזה</button>}
    {preview && <button className="button wide service-unavailable" disabled>{service.status==='draft'?'השירות בטיוטה':'תצוגה מקדימה של השירות'}</button>}
    {ready && <small className="service-link-note">היומן נפתח בלשונית חדשה</small>}
  </article>}</Localize>;
}

export function ConsultationWorkspace({ canManage, openAdmin }: { canManage:boolean; openAdmin:()=>void }) {
  const catalog = useServiceCatalog();
  const [requestedService,setRequestedService]=useState('');
  const requestArea=useRef<HTMLDivElement>(null);
  function requestAppointment(id:string){setRequestedService(id);requestAnimationFrame(()=>requestArea.current?.scrollIntoView({behavior:'smooth',block:'start'}));}
  const hasBookings = catalog.services.some(service => service.status === 'bookable');
  return <Localize>{<div className="consultation-workspace">
    <div className="workspace-heading"><div><span className="eyebrow">נפגשים ומתקדמים</span><h1>ייעוץ וליווי</h1><p>מפגש אישי עם ד״ר תמיר עילם או נדב רון, לפי השירות שבחרתם.</p></div>{canManage && <button className="button secondary" onClick={openAdmin}><Pencil size={17}/>ניהול השירותים</button>}</div>
    {catalog.state === 'loading' ? <div className="panel service-feedback" role="status"><LoaderCircle className="spin" size={24}/>טוענים את השירותים…</div> : catalog.state === 'error' ? <div className="panel service-feedback" role="alert"><p>{catalog.error}</p><button className="button secondary" onClick={catalog.reload}>ניסיון נוסף</button></div> : !catalog.services.length ? <div className="panel service-feedback"><CalendarDays size={30}/><h2>השירותים מתעדכנים</h2><p>אין כרגע מפגשים מוצגים להזמנה. אפשר לחזור לכאן בהמשך.</p></div> : <>
      <div className="service-catalog">{catalog.services.filter(service=>service.provider!=='lior').map(service => <ServiceCard key={service.id} service={service} onRequest={requestAppointment}/>)}</div>
      <div className="service-booking-note"><CalendarDays size={24}/><div><h2>{hasBookings ? 'בחירת מועד או בקשת תיאום' : 'בקשת תור דרך האפליקציה'}</h2><p>{hasBookings ? 'אפשר לבחור מועד ביומן החיצוני או לשלוח בקשה לצוות בטופס כאן.' : 'לחצו על בקשת תור בשירות הרצוי, מלאו שם וימים ושעות מועדפים ושלחו. הצוות יאשר את המועד ברשימת התורים שלכם.'}</p></div></div>
    </>}
    <section aria-label="מסלולי ליווי עם נדב" className="care-stack"><h2>ליווי אימונים עם נדב רון</h2><p>תוכנית אימונים אישית וליווי לאורך התקופה שנבחרה. המחיר הוא לכל התקופה.</p><div className="service-catalog">{coachingPackages.map(p=><article className="service-card" key={p.months}><span className="service-provider">נדב רון · מאמן כושר</span><h3>{p.months===12?'ליווי לשנה':`ליווי ל־${p.months} חודשים`}</h3><div className="service-price"><span>מחיר לכל התקופה</span><strong>{servicePrice(p.priceAgorot)}</strong></div>{p.priceAgorot<p.regularPriceAgorot&&<p>במקום <del>{servicePrice(p.regularPriceAgorot)}</del> · חיסכון של {servicePrice(p.regularPriceAgorot-p.priceAgorot)}</p>}<a className="button secondary wide" href={`https://wa.me/972546753959?text=${encodeURIComponent(`שלום, אשמח לתאם ליווי עם נדב רון ל־${p.months} חודשים במחיר ${p.priceAgorot/100} ₪.`)}`} target="_blank" rel="noopener noreferrer">לתיאום ליווי</a></article>)}</div></section>
    <div ref={requestArea} style={{scrollMarginTop:'110px'}}><AppointmentsWorkspace initialServiceId={requestedService}/></div>
    <div className="warning-box"><strong>זקוקים לטיפול דחוף?</strong><span>האפליקציה אינה שירות חירום. במקרה של תסמינים חדשים, חריפים או מדאיגים יש לפנות לשירות רפואי מתאים.</span></div>
  </div>}</Localize>;
}

function StaffGate({ access, retry }: { access:StaffAccess; retry:()=>void }) {
  return <Localize>{<div className="panel service-feedback staff-gate"><ShieldCheck size={34}/><h1>אזור ניהול לצוות</h1>
    {access === 'loading' ? <p role="status">בודקים את הרשאת החשבון…</p> : access === 'signedOut' ? <><p>התחברו לחשבון הצוות כדי לערוך שירותים, מחירים וקישורי תורים.</p><a className="button primary" href="/signin-with-chatgpt?return_to=%2F%23admin" target="_top">כניסת צוות <ArrowLeft size={17}/></a></> : access === 'error' ? <><p role="alert">לא ניתן לבדוק את הרשאת החשבון כרגע.</p><button className="button secondary" onClick={retry}>ניסיון נוסף</button></> : <p>החשבון המחובר אינו מורשה לערוך שירותים.</p>}
  </div>}</Localize>;
}

export function ServiceEditor({ service, onClose, onSaved, endpoint='/api/admin/services',providerLocked=false }: { service:ConsultationService; onClose:()=>void; onSaved:(service:ConsultationService)=>void;endpoint?:string;providerLocked?:boolean }) {
  const prefix = useId();
  const [base, setBase] = useState(service);
  const [draft, setDraft] = useState(service);
  const [price, setPrice] = useState(service.title ? String(service.priceAgorot / 100) : '');
  const [duration, setDuration] = useState(String(service.durationMinutes));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<ConsultationService | null>(null);
  const [discard, setDiscard] = useState(false);
  const initialPrice = base.title ? String(base.priceAgorot / 100) : '';
  const dirty = JSON.stringify(draft) !== JSON.stringify(base) || price !== initialPrice || duration !== String(base.durationMinutes);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event:BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function close() { if (!busy) { if (dirty) setDiscard(true); else onClose(); } }
  const change = (patch:Partial<ConsultationService>, reconfirm=false) => setDraft(old => ({ ...old, ...patch, ...(reconfirm ? { priceConfirmed:false } : {}) }));
  const preview = { ...draft, title:draft.title || 'שם השירות', description:draft.description || 'תיאור המפגש יופיע כאן.', priceAgorot:Math.round(Number(price) * 100) || 0, durationMinutes:Number(duration) || 0 };
  async function save(event:React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    setError(''); setConflict(null);
    let payload:ConsultationService;
    try { payload = parseService({ ...draft, priceAgorot:Math.round(Number(price) * 100), durationMinutes:Number(duration) }); }
    catch (failure) { setError((failure as Error).message); return; }
    lock.current = true; setBusy(true);
    try { const result = await serviceRequest<{service:ConsultationService}>(endpoint, payload); onSaved(result.service); }
    catch (failure) { setError((failure as Error).message); if (failure instanceof ServiceRequestError && failure.current) setConflict(failure.current); }
    finally { lock.current = false; setBusy(false); }
  }
  const matchingLink = (() => { try { return bookingLink(draft.bookingUrl); } catch { return ''; } })();
  return <Localize>{<>
    <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent className="dc-dialog service-editor" dir="rtl" showCloseButton={false} onEscapeKeyDown={event => { if (busy || discard) event.preventDefault(); }} onInteractOutside={event => { if (busy || discard) event.preventDefault(); }}>
      <button className="install-close" aria-label="סגירת עריכת שירות" onClick={close} disabled={busy}><X size={20}/></button>
      <DialogTitle>{service.title ? 'עריכת שירות' : 'שירות חדש'}</DialogTitle><DialogDescription>הפרטים יופיעו בעמוד הייעוץ בהתאם למצב התצוגה שתבחרו.</DialogDescription>
      <form className="service-form" onSubmit={save}>
        <fieldset disabled={busy}>
          <label className="service-field" htmlFor={`${prefix}-title`}>שם השירות<input id={`${prefix}-title`} required minLength={3} maxLength={100} value={draft.title} onChange={event=>change({title:event.target.value})} placeholder="לדוגמה: מפגש ליווי אישי"/></label>
          <div className="service-form-grid">
            <div className="service-field"><label htmlFor={`${prefix}-provider`}>נותן השירות</label><Select dir="rtl" value={draft.provider} disabled={busy||providerLocked} onValueChange={value=>change({provider:value as ServiceProvider},true)}><SelectTrigger className="service-select" id={`${prefix}-provider`}><SelectValue/></SelectTrigger><SelectContent className="service-select-options">{Object.entries(providerNames).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div className="service-field"><label htmlFor={`${prefix}-format`}>אופן המפגש</label><Select dir="rtl" value={draft.format} disabled={busy} onValueChange={value=>change({format:value as ServiceFormat},true)}><SelectTrigger className="service-select" id={`${prefix}-format`}><SelectValue/></SelectTrigger><SelectContent className="service-select-options">{Object.entries(formatNames).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <label className="service-field" htmlFor={`${prefix}-duration`}>משך בדקות<input id={`${prefix}-duration`} required type="number" inputMode="numeric" min={5} max={180} step={1} value={duration} onChange={event=>{setDuration(event.target.value);change({},true);}}/></label>
            <label className="service-field" htmlFor={`${prefix}-price`}>מחיר בשקלים<input id={`${prefix}-price`} required type="number" inputMode="decimal" min={0} max={10000} step="0.01" value={price} onChange={event=>{setPrice(event.target.value);change({},true);}}/></label>
          </div>
          <label className="service-field" htmlFor={`${prefix}-description`}>מה כולל המפגש?<textarea id={`${prefix}-description`} required minLength={5} maxLength={1200} rows={3} value={draft.description} onChange={event=>change({description:event.target.value})}/><small>{draft.description.length}/1,200 תווים</small></label>
          <div className="service-calendar-fields"><h3><Link2 size={18}/>חיבור ליומן</h3>
            <label className="service-field" htmlFor={`${prefix}-url`}>קישור לאירוע ב־Calendly<input id={`${prefix}-url`} type="url" dir="ltr" maxLength={1000} value={draft.bookingUrl} onChange={event=>change({bookingUrl:event.target.value},true)} placeholder="https://calendly.com/your-name/consultation"/><small>קישור לעמוד האירוע, ללא פרטי מטופל או תוספות אחרי סימן שאלה.</small></label>
            {matchingLink && <a className="text-button" href={matchingLink} target="_blank" rel="noopener noreferrer">בדיקת הקישור בלשונית חדשה <ExternalLink size={15}/></a>}
            <label className="service-confirm"><Checkbox className="dc-checkbox" checked={draft.priceConfirmed} disabled={busy} onCheckedChange={checked=>change({priceConfirmed:checked===true})}/><span>אני מאשר/ת את המחיר. בדקתי שקישור התשלום גובה את המחיר בשקלים, ואם חובר יומן — שגם משך המפגש ונותן השירות תואמים.</span></label>
          </div>
          <div className="service-calendar-fields"><h3>תשלום ותנאי הזמנה</h3><label className="service-field">קישור תשלום מאובטח בשקלים<input type="url" dir="ltr" maxLength={1500} value={draft.paymentUrl} onChange={event=>change({paymentUrl:event.target.value},true)} placeholder="https://..."/><small>קישור מספק הסליקה שלכם. יש לוודא שהסכום בשקלים תואם למחיר השירות ולאסוף תשלום רק לאחר אישור המועד.</small></label><label className="service-field">הוראות תשלום וביטול<textarea rows={3} maxLength={1200} value={draft.paymentInstructions} onChange={event=>change({paymentInstructions:event.target.value})}/></label><p className="care-muted">אישור תשלום מתבצע בצוות לאחר בדיקה אצל ספק הסליקה. הזנת קישור אינה מחברת סנכרון תשלומים אוטומטי.</p></div>
          <div className="service-field"><label htmlFor={`${prefix}-status`}>מצב תצוגה</label><Select dir="rtl" value={draft.status} disabled={busy} onValueChange={value=>change({status:value as ServiceStatus})}><SelectTrigger className="service-select" id={`${prefix}-status`}><SelectValue/></SelectTrigger><SelectContent className="service-select-options">{Object.entries(statusNames).map(([value,label])=><SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><small>{draft.status === 'draft' ? 'רק הצוות יראה את השירות.' : draft.status === 'listed' ? 'השירות יוצג לקהל ללא כפתור הזמנה פעיל.' : 'הזמנות ייפתחו עם קישור תקין ואישור המחיר.'}</small></div>
        </fieldset>
        {draft.provider==='lior'&&<NutritionRevenuePreview priceAgorot={preview.priceAgorot}/>}<details className="service-preview"><summary>תצוגה מקדימה של כרטיס השירות</summary><ServiceCard service={publicService(preview)} preview/></details>
        {error && <div className="service-form-error" role="alert"><p>{error}</p>{conflict && <><small>טעינת הגרסה השמורה תחליף את הערכים בטופס.</small><button type="button" className="button secondary" onClick={()=>{setBase(conflict);setDraft(conflict);setPrice(String(conflict.priceAgorot/100));setDuration(String(conflict.durationMinutes));setError('');setConflict(null);}}>טעינת הגרסה השמורה</button></>}</div>}
        <div className="service-editor-actions"><button type="submit" className="button primary" disabled={busy||(!dirty&&!!service.title)}>{busy ? <LoaderCircle className="spin" size={18}/> : <Check size={18}/>} {draft.status==='draft'?'שמירת טיוטה':draft.status==='listed'?'שמירה ועדכון עמוד הייעוץ':'שמירה ופתיחת הזמנות'}</button><button type="button" className="button secondary" disabled={busy} onClick={close}>ביטול</button></div>
      </form>
    </DialogContent></Dialog>
    <AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent className="dc-dialog service-discard" dir="rtl"><AlertDialogTitle>לצאת בלי לשמור?</AlertDialogTitle><AlertDialogDescription>השינויים שבטופס לא יישמרו. השירות המוצג כרגע יישאר כפי שהיה.</AlertDialogDescription><div className="dialog-actions"><AlertDialogCancel className="button secondary">חזרה לעריכה</AlertDialogCancel><button className="button danger" onClick={onClose}>יציאה בלי שמירה</button></div></AlertDialogContent></AlertDialog>
  </>}</Localize>;
}

export function ServiceAdminWorkspace({ access, retryAccess, viewCatalog }: { access:StaffAccess; retryAccess:()=>void; viewCatalog:()=>void }) {
  const [services, setServices] = useState<ConsultationService[]>([]);
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<ConsultationService|null>(null);
  const [notice, setNotice] = useState('');
  const reload = useCallback(async () => {
    setState('loading');
    try { const data = await serviceRequest<{services:ConsultationService[]}>('/api/admin/services');setServices(data.services);setState('ready');setError(''); }
    catch (failure) { setError((failure as Error).message);setState('error'); }
  }, []);
  useEffect(()=>{if(access==='staff')void reload()},[access,reload]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),7000);return()=>clearTimeout(timer)},[notice]);
  if (access!=='staff') return <Localize>{<StaffGate access={access} retry={retryAccess}/>}</Localize>;
  function create() { setEditing({ id:crypto.randomUUID(), title:'', description:'', provider:'tamir', format:'video', durationMinutes:40, priceAgorot:0, priceConfirmed:false, status:'draft', bookingUrl:'', paymentUrl:'', paymentInstructions:'', version:0, updatedAt:null }); }
  function saved(service:ConsultationService) {
    setServices(old=>old.some(item=>item.id===service.id)?old.map(item=>item.id===service.id?service:item):[...old,service]);setEditing(null);
    setNotice(service.status==='draft'?'הטיוטה נשמרה לצוות בלבד.':service.status==='bookable'?'השירות נשמר ונפתח לקביעת תורים.':'השירות עודכן בעמוד הייעוץ.');
  }
  return <Localize>{<div className="service-admin">
    <div className="workspace-heading"><div><span className="eyebrow">DoctorCoach · ניהול צוות</span><h1>השירותים שלכם</h1><p>עריכת מפגשים, מחירים וקישורי הזמנה במקום אחד.</p></div><div className="workspace-actions"><button className="button secondary" onClick={viewCatalog}>לעמוד הייעוץ <ArrowLeft size={17}/></button><button className="button primary" onClick={create} disabled={state!=='ready'}><Plus size={18}/>שירות חדש</button></div></div>
    {notice && <div className="service-saved" role="status"><Check size={18}/>{notice}</div>}
    {state==='loading'?<div className="panel service-feedback" role="status"><LoaderCircle className="spin" size={24}/>טוענים את השירותים…</div>:state==='error'?<div className="panel service-feedback" role="alert"><p>{error}</p><button className="button secondary" onClick={reload}>ניסיון נוסף</button></div>:<section className="panel service-admin-list" aria-label="רשימת שירותים לניהול">
      {services.map(service=><article className="service-admin-row" key={service.id}><span className="service-format-icon">{service.format==='video'?<Video size={23}/>:<MapPin size={23}/>}</span><div className="service-admin-title"><h2>{service.title}</h2><p>{providerNames[service.provider]} · {service.durationMinutes} דקות · {formatNames[service.format]}</p></div><div className="service-admin-price"><strong>{servicePrice(service.priceAgorot)}</strong><small>{service.priceConfirmed?'מחיר מאושר':'מחיר מוצע'}</small></div><span className={`service-state state-${service.status}`}>{statusNames[service.status]}</span><button className="button secondary" onClick={()=>setEditing(service)} aria-label={`עריכת ${service.title}`}><Pencil size={16}/>עריכה</button></article>)}
    </section>}
    <section className="service-setup"><div className="service-setup-title"><CalendarDays size={25}/><div><h2>מוכנים לחבר את היומן?</h2><p>שלושה צעדים לכל שירות שרוצים לפתוח להזמנות.</p></div></div><ol><li><b>1</b><div><strong>הכינו אירוע ב־Calendly</strong><p>קבעו בו זמינות, משך, מיקום או קישור למפגש. אם רוצים גבייה בזמן ההזמנה, מגדירים אותה בחשבון Calendly.</p></div></li><li><b>2</b><div><strong>הדביקו ובדקו את הקישור</strong><p>פתחו עריכת שירות, הוסיפו את קישור האירוע ובדקו את המחיר ואת פרטי המפגש.</p></div></li><li><b>3</b><div><strong>פתחו להזמנות</strong><p>אשרו את המחיר, בחרו ״פתוח להזמנות״ ושמרו. כפתור ההזמנה יופיע בעמוד הייעוץ.</p></div></li></ol><p className="service-setup-footnote">תורים, אישורי תשלום וביטולים מנוהלים ביומן החיצוני. בשלב זה הם אינם מסתנכרנים חזרה ל־DoctorCoach.</p></section>
    {editing && <ServiceEditor service={editing} onClose={()=>setEditing(null)} onSaved={saved}/>}
  </div>}</Localize>;
}

export function NutritionRevenuePreview({priceAgorot}:{priceAgorot:number}){
 if(!Number.isSafeInteger(priceAgorot)||priceAgorot<0||priceAgorot>1000000)return null;
 const split=nutritionRevenuePreview(priceAgorot);
 return <div className="note"><strong>טיוטת חלוקה מסחרית: 80% לליאור / 20% לאפליקציה</strong><p>מתוך {servicePrice(split.grossAgorot)}: לליאור {servicePrice(split.providerAgorot)}, לאפליקציה {servicePrice(split.platformAgorot)}.</p><small>תצוגת חישוב בלבד. אינה מפעילה חיוב, העברה או חוב. חלוקת חלק האפליקציה בין תמיר ונדב טרם הוגדרה; תנאי ביטול, החזר, מסים ועמלות טרם נקבעו.</small></div>;
}
