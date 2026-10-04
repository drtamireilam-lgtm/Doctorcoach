import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountService, createAccountClient, type AccountProfile } from './platform/account';

export default function AccountWorkspace({ url, publishableKey }: { url: string; publishableKey: string }) {
  const [client] = useState(() => createAccountClient(url, publishableKey));
  const [service] = useState(() => new AccountService(client));
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'RPE' | 'RIR'>('RPE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const generation = useRef(0);

  const clearProfile = () => { setProfile(null); setLoaded(false); setName(''); setMode('RPE'); setMessage(''); };
  useEffect(() => {
    client.auth.startAutoRefresh();
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { generation.current++; setUserId(null); clearProfile(); }
    });
    return () => { generation.current++; data.subscription.unsubscribe(); client.auth.stopAutoRefresh(); };
  }, [client]);

  function applyProfile(saved: AccountProfile | null) {
    setProfile(saved); setName(saved?.display_name ?? ''); setMode(saved?.effort_mode ?? 'RPE'); setLoaded(true);
  }
  async function run(task: (current: () => boolean) => Promise<void>) {
    const id = ++generation.current;
    const current = () => generation.current === id;
    setBusy(true); setError(''); setMessage('');
    try { await task(current); }
    catch (e) { if (current()) setError(e instanceof Error ? e.message : 'הפעולה נכשלה.'); }
    finally { setBusy(false); }
  }
  function login(e: FormEvent) {
    e.preventDefault(); const secret = password; setPassword(''); clearProfile();
    void run(async current => {
      const id = await service.signIn(email, secret);
      if (!current()) return;
      setUserId(id);
      const saved = await service.load();
      if (current()) applyProfile(saved);
    });
  }
  function save(e: FormEvent) {
    e.preventDefault();
    void run(async current => {
      const saved = await service.save({ display_name: name, effort_mode: mode }, profile?.version ?? null);
      if (current()) { applyProfile(saved); setMessage('הפרופיל נשמר בחשבון.'); }
    });
  }
  return <main className="main-panel" dir="rtl"><section className="hero-card">
    <p className="eyebrow">DOCTORCOACH · ACCOUNT</p><h1>החשבון שלי</h1>
    <p>בשלב זה ניתן להתחבר ולשמור שם וסולם מאמץ בלבד. האימונים והמידע הרפואי עדיין אינם מחוברים לשירות זה.</p>
    <p>ההתחברות נשמרת בזיכרון הלשונית בלבד. לאחר רענון יש להתחבר שוב.</p>
    {error && <p className="alert" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {!userId ? <form onSubmit={login} className="form-grid">
      <label>דוא״ל<input type="email" dir="ltr" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
      <label>סיסמה<input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
      <button className="primary-button" disabled={busy}>{busy?'מתחברים…':'כניסה'}</button>
      <p>מיועד לחשבון קיים ומאומת. הרשמה ושחזור סיסמה יתווספו בשלב הבא.</p>
    </form> : <>
      <button className="outline-button" disabled={busy} onClick={()=>void run(async()=>{await service.signOut();setUserId(null);clearProfile();})}>יציאה</button>
      <button className="outline-button" disabled={busy} onClick={()=>{
        if (loaded && (name !== (profile?.display_name ?? '') || mode !== (profile?.effort_mode ?? 'RPE')) && !window.confirm('לטעון מחדש ולוותר על השינויים שלא נשמרו?')) return;
        void run(async current=>{const saved=await service.load();if(current())applyProfile(saved);});
      }}>טעינה מחדש</button>
      {loaded && <form onSubmit={save} className="form-grid">
        <label>שם לתצוגה<input required maxLength={100} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
        <label>סולם מאמץ מועדף<select value={mode} disabled={busy} onChange={e=>setMode(e.target.value as 'RPE'|'RIR')}><option>RPE</option><option>RIR</option></select></label>
        <button className="primary-button" disabled={busy}>{busy?'שומרים…':'שמירת פרופיל'}</button>
      </form>}
    </>}
  </section></main>;
}
