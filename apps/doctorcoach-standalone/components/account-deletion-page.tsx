'use client';
import {useState} from 'react';
import {LanguageToggle,useLanguage} from './language-provider';
import {ThemeToggle} from './theme-provider';
import {chatGPTSignInPath} from '../app/chatgpt-auth-paths';
import {careRequest,useCareResource} from '../hooks/use-care';
import {requestId} from '../lib/request-id';
import {translateText} from '../lib/localization';

const copy={
  he:{title:'בקשת מחיקת חשבון ונתונים',intro:'אפשר לבקש מחיקה של חשבון DoctorCoach והנתונים המשויכים אליו גם בלי להתקין את האפליקציה.',scopeTitle:'מה כוללת הבקשה?',scope:'הבקשה מתייחסת לפרופיל ולשאלונים, נתוני אימונים ומעקב, הודעות וקבצים שהעלית ל־DoctorCoach. הצוות בודק גם נתונים שצריך לשמור בשל חובה חוקית או רגולטורית. פרטי המידע שנשמר, הסיבה ומשך השמירה יימסרו במסגרת הטיפול.',process:'שליחת הבקשה אינה מוחקת מידע מיד. הבקשה נשמרת לטיפול הצוות; לאחר הטיפול נעדכן אותך בתוצאה. בקשה זו אינה מוחקת את חשבון ChatGPT שלך.',billing:'בקשת מחיקה אינה מבטלת אוטומטית מנוי או חיוב אצל ספק חיצוני. אפשר לבקש מהצוות עזרה בביטול לצד בקשת המחיקה.',formTitle:'שליחת בקשה',confirm:'אני מבקש/ת למחוק את חשבון DoctorCoach שלי ואת הנתונים המשויכים אליו.',send:'שליחת בקשת מחיקה',busy:'שומרים את הבקשה…',signin:'התחברות לשליחת הבקשה',signinfo:'התחברו לחשבון ששימש אתכם ב־DoctorCoach כדי שנוכל לזהות את הנתונים הנכונים.',loading:'טוענים את מצב הבקשות…',error:'לא ניתן לטעון את הבקשות כרגע. אפשר לנסות שוב או לפנות לצוות.',retry:'ניסיון נוסף',saved:'הבקשה נשמרה וממתינה לטיפול הצוות. המידע עדיין לא נמחק.',history:'הבקשות שלי',pending:'ממתינה לטיפול',handled:'סומנה כטופלה בידי הצוות',receipt:'מספר בקשה',contactTitle:'אין גישה לחשבון?',contact:'אפשר לפנות לצוות דרך WhatsApp ולבקש מחיקת חשבון. ציינו את כתובת המייל של החשבון; אין צורך לשלוח מסמכים רפואיים. הצוות יבדוק את זהות המבקש לפני טיפול.',whatsapp:'פנייה לצוות בנושא מחיקה',whatsappText:'שלום, אני מבקש/ת מחיקת חשבון DoctorCoach והנתונים המשויכים אליו. אשמח להנחיות לאימות החשבון.',back:'חזרה ל־DoctorCoach',privacy:'פרטיות והסכמות'},
  en:{title:'Request account and data deletion',intro:'You can request deletion of your DoctorCoach account and associated data without installing the app.',scopeTitle:'What does the request cover?',scope:'The request covers your profile and questionnaires, training and progress records, messages and files uploaded to DoctorCoach. The team also reviews any data that must be retained for legal or regulatory reasons. Details of retained data, the reason and retention period will be provided during handling.',process:'Submitting a request does not immediately delete data. It is saved for the team to handle; we will let you know the outcome. This request does not delete your ChatGPT account.',billing:'A deletion request does not automatically cancel subscriptions or charges with an external provider. You can ask the team for cancellation assistance alongside your deletion request.',formTitle:'Submit a request',confirm:'I request deletion of my DoctorCoach account and its associated data.',send:'Submit deletion request',busy:'Saving request…',signin:'Sign in to submit your request',signinfo:'Sign in with the account you used in DoctorCoach so we can identify the correct records.',loading:'Loading request status…',error:'We could not load your requests. Try again or contact the team.',retry:'Try again',saved:'Your request was saved and is awaiting the team. Your data has not been deleted yet.',history:'My requests',pending:'Awaiting the team',handled:'Marked as handled by the team',receipt:'Request ID',contactTitle:'Cannot access your account?',contact:'Contact the team through WhatsApp to request account deletion. Include your account email address; do not send medical documents. The team will verify your identity before handling the request.',whatsapp:'Contact the team about deletion',whatsappText:'Hello, I would like to delete my DoctorCoach account and associated data. Please help me verify my account.',back:'Back to DoctorCoach',privacy:'Privacy and consents'}
};
type RequestRow={id:string;kind:string;state:string;createdAt:string;identityVerified?:number};
export function AccountDeletionPage(){
  const {language}=useLanguage(),t=copy[language];
  const resource=useCareResource<{requests:RequestRow[];deletion?:{state:string;completedAt:string|null}|null}>('/api/privacy');
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
  const pending=resource.data?.requests.some(r=>r.kind==='deletion'&&r.state==='pending'&&r.identityVerified!==0)??false;
  const deletionMessage=resource.data?.deletion?.state==='deleted'
    ?(language==='he'?'נתוני החשבון והקבצים נמחקו מהאחסון הפעיל. נשמרת קבלה טכנית מצומצמת למניעת פתיחת החשבון מחדש. חשבון ChatGPT אינו נמחק.':'Account data and files were deleted from live storage. A minimal technical receipt prevents account recreation. Your ChatGPT account is not deleted.')
    :(language==='he'?'מחיקה מתבצעת. הגישה לנתוני החשבון חסומה. אם התהליך נעצר, הצוות יכול להמשיך מאותה בקשה.':'Deletion is in progress. Account data access is blocked. If interrupted, the team can resume the same request.');
  async function submit(event:React.FormEvent){
    event.preventDefault();if(!confirmed||busy||pending)return;
    setBusy(true);setError('');
    try{await careRequest('/api/privacy',{id:requestId(),kind:'deletion',confirmed:true});setSaved(true);setConfirmed(false);await resource.reload();}
    catch(e){setError(e instanceof Error?translateText(e.message,language):t.error);}finally{setBusy(false);}
  }
  return <main className="deletion-page care-stack" data-no-translate>
    <header className="care-actions"><a href="/" className="brand"><img src="/branding/doctorcoach-drc-v1.webp" width="64" height="64" alt="DoctorCoach"/></a><LanguageToggle/><ThemeToggle/></header>
    <section className="panel care-form"><h1>{t.title}</h1><p>{t.intro}</p><h2>{t.scopeTitle}</h2><p>{t.scope}</p><p>{t.process}</p><p>{t.billing}</p></section>
    <section className="panel care-form"><h2>{t.formTitle}</h2>
      {resource.loading&&!resource.data?<p role="status">{t.loading}</p>:resource.status===401?<><p>{t.signinfo}</p><a className="button primary" target="_top" href={chatGPTSignInPath('/account-deletion')}>{t.signin}</a></>:!resource.data?<><p role="alert">{t.error}</p><button className="button secondary" onClick={()=>void resource.reload()}>{t.retry}</button></>:<>
        {resource.data.deletion?<p role="status">{deletionMessage}</p>:saved||pending?<p role="status">{t.saved}</p>:<form onSubmit={submit} className="care-form"><label className="care-check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/><span>{t.confirm}</span></label><button className="button primary" type="submit" disabled={!confirmed||busy}>{busy?t.busy:t.send}</button></form>}
        {error&&<p role="alert">{error}</p>}
        {resource.data.requests.some(r=>r.kind==='deletion')&&<div><h3>{t.history}</h3>{resource.data.requests.filter(r=>r.kind==='deletion').map(r=><article key={r.id}><p>{r.state==='pending'?t.pending:r.state==='deleted'?(language==='he'?'נמחק':'Deleted'):r.state==='deleting'?(language==='he'?'מחיקה בתהליך':'Deletion in progress'):t.handled} · <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString(language==='he'?'he-IL':'en-GB')}</time></p><p>{t.receipt}: <span dir="ltr">{r.id}</span></p></article>)}</div>}
      </>}
    </section>
    <section className="panel care-form"><h2>{t.contactTitle}</h2><p>{t.contact}</p><a className="button secondary" rel="noreferrer" href={'https://wa.me/972546753959?text='+encodeURIComponent(t.whatsappText)}>{t.whatsapp}</a></section>
    <footer className="care-actions"><a href="/">{t.back}</a><a href="/#privacy">{t.privacy}</a></footer>
  </main>;
}
