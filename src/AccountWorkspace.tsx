import TeamManagementWorkspace from './TeamManagementWorkspace';
import { exerciseLibrary } from './exercise-library';
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
  const [showTeam, setShowTeam] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [pendingCoaches, setPendingCoaches] = useState<Array<{ coach_id: string; coach_email: string }>>([]);
  const [coachBusy, setCoachBusy] = useState(false);
  const [cloudPlans, setCloudPlans] = useState<Array<{ id: string; title: string; version: number; status: string; athlete_id: string; coach_id: string | null }>>([]);
  const [plansBusy, setPlansBusy] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [cloningPlanId, setCloningPlanId] = useState<string | null>(null);
  async function cloneCloudPlan(planId: string) {
    if (!userId || cloningPlanId || !cloudPlans.some(plan => plan.id === planId && plan.coach_id === userId) || !window.confirm('ליצור טיוטה חדשה על בסיס תוכנית זו? התוכנית המקורית תישאר ללא שינוי.')) return;
    setCloningPlanId(planId); setError(''); setMessage('');
    try {
      const { error: rpcError } = await client.rpc('dc_clone_training_plan', { p_source_plan_id: planId });
      if (rpcError) throw rpcError;
      setMessage('נוצרה גרסת טיוטה חדשה בשרת. התוכנית המקורית לא שונתה.');
      await loadCloudPlans();
    } catch {
      setError('יצירת הגרסה נכשלה. רק מאמן משויך ופעיל רשאי לשכפל תוכנית שלו.');
    } finally { setCloningPlanId(null); }
  }
  type CloudExercise = { id: string; exercise_key: string; day_label: string; sort_order: number; sets: number; target_reps: number; target_load: number | null; effort_mode: string; target_effort: number };
  const [selectedCloudPlan, setSelectedCloudPlan] = useState<string | null>(null);
  const [cloudExercises, setCloudExercises] = useState<CloudExercise[]>([]);
  const [exercisesBusy, setExercisesBusy] = useState(false);
  async function loadCloudExercises(planId: string) {
    if (!userId || exercisesBusy) return;
    setExercisesBusy(true); setError('');
    setSelectedCloudPlan(null); setCloudExercises([]);
    const { data, error: queryError } = await client.from('dc_training_exercises')
      .select('id,exercise_key,day_label,sort_order,sets,target_reps,target_load,effort_mode,target_effort')
      .eq('plan_id', planId).order('day_label').order('sort_order');
    setExercisesBusy(false);
    if (queryError) { setError('לא ניתן לטעון את תרגילי התוכנית.'); return; }
    setSelectedCloudPlan(planId);
    setCloudExercises((data ?? []) as CloudExercise[]);
  }
  async function loadCloudPlans() {
    if (!userId || plansBusy) return;
    setPlansBusy(true); setError('');
    const { data, error: queryError } = await client.from('dc_training_plans')
      .select('id,title,version,status,athlete_id,coach_id').order('created_at', { ascending: false }).limit(100);
    setPlansBusy(false);
    if (queryError) { setError('לא ניתן לטעון תוכניות אימון מהשרת.'); return; }
    setCloudPlans((data ?? []) as Array<{ id: string; title: string; version: number; status: string; athlete_id: string; coach_id: string | null }>);
    setPlansLoaded(true);
    setSelectedCloudPlan(null); setCloudExercises([]);
  }
  async function loadPendingCoaches() {
    if (!userId) return;
    const { data, error: queryError } = await client.rpc('dc_list_my_pending_coach_assignments');
    if (queryError) { setError('לא ניתן לטעון בקשות שיוך.'); return; }
    setPendingCoaches((data ?? []) as Array<{ coach_id: string; coach_email: string }>);
  }
  async function respondToCoach(coachId: string, accept: boolean) {
    if (coachBusy || !userId) return;
    setCoachBusy(true); setError(''); setMessage('');
    const { error: rpcError } = await client.rpc('dc_respond_coach_assignment', {
      p_coach_id: coachId, p_accept: accept,
    });
    setCoachBusy(false);
    if (rpcError) setError('לא ניתן לעדכן את בקשת השיוך.');
    else { setMessage(accept ? 'אישרת את השיוך למאמן.' : 'דחית את בקשת השיוך.'); void loadPendingCoaches(); }
  }
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const generation = useRef(0);

  const clearProfile = () => { setShowTeam(false); setPendingCoaches([]); setCloudPlans([]); setCloningPlanId(null); setPlansLoaded(false); setSelectedCloudPlan(null); setCloudExercises([]); setProfile(null); setLoaded(false); setName(''); setMode('RPE'); setMessage(''); };
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
  async function acceptInvitation() {
    if (!userId || acceptingInvite) return;
    setAcceptingInvite(true); setError(''); setMessage('');
    try {
      const { data, error: rpcError } = await client.rpc('dc_accept_team_invitation');
      if (rpcError) throw rpcError;
      setMessage(`ההזמנה התקבלה. התפקיד שלך: ${String(data)}.`);
    } catch {
      setError('לא נמצאה הזמנה תקפה עבור כתובת האימייל המאומתת, או שקבלת ההזמנה נכשלה.');
    } finally { setAcceptingInvite(false); }
  }
  if (userId && showTeam) return <div dir="rtl"><nav className="topbar"><button className="outline-button" onClick={() => setShowTeam(false)}>חזרה לחשבון שלי</button></nav><TeamManagementWorkspace client={client}/></div>;
  return <main className="main-panel" dir="rtl"><section className="hero-card">
    <p className="eyebrow">DOCTORCOACH · ACCOUNT</p><h1>החשבון שלי</h1>
    <p>בשלב זה ניתן להתחבר ולשמור שם וסולם מאמץ בלבד. האימונים והמידע הרפואי עדיין אינם מחוברים לשירות זה.</p>
    <p>ההתחברות נשמרת בזיכרון הלשונית בלבד. לאחר רענון יש להתחבר שוב.</p>
    {error && <p className="alert" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {userId && <button className="outline-button" onClick={() => setShowTeam(true)}>ניהול צוות (LAB)</button>}
    {userId && <button className="outline-button" disabled={acceptingInvite} onClick={() => void acceptInvitation()}>{acceptingInvite ? 'מקבל הזמנה…' : 'קבלת הזמנה לצוות'}</button>}
    {userId && <details><summary>ספריית התרגילים הקיימת (קריאה בלבד)</summary><ul>{exerciseLibrary.map(exercise => <li key={exercise.id}>{exercise.name} · {exercise.region} · {exercise.equipment}</li>)}</ul></details>}
    {userId && <section aria-label="בקשות שיוך למאמן">
      <h2>בקשות שיוך למאמנים</h2>
      <button type="button" className="outline-button" onClick={() => void loadPendingCoaches()}>בדיקת בקשות ממתינות</button>
      {pendingCoaches.map(({ coach_id: coachId, coach_email: coachEmail }) => <div key={coachId}>
        <p>בקשת שיוך מאת: {coachEmail}</p>
        <button type="button" disabled={coachBusy} onClick={() => void respondToCoach(coachId, true)}>אישור שיוך</button>
        <button type="button" disabled={coachBusy} onClick={() => void respondToCoach(coachId, false)}>דחיית שיוך</button>
      </div>)}
    </section>}
    {userId && <section aria-label="תוכניות אימון בענן">
      <h2>תוכניות אימון בענן (LAB)</h2>
      <p>תצוגה לקריאה בלבד. עורך האימונים הקיים אינו מסונכרן עדיין עם הרשימה הזו.</p>
      <button type="button" className="outline-button" disabled={plansBusy} onClick={() => void loadCloudPlans()}>
        {plansBusy ? 'טוען תוכניות…' : 'טעינת תוכניות מהשרת'}
      </button>
      {plansLoaded && cloudPlans.length === 0 && <p>אין תוכניות זמינות בחשבון.</p>}
      {cloudPlans.map(plan => <article key={plan.id}>
        <strong>{plan.title}</strong> · גרסה {plan.version} · {plan.status} · {plan.coach_id ? 'תוכנית מאמן' : 'תוכנית עצמאית'}
        <button type="button" className="outline-button" disabled={exercisesBusy}
          onClick={() => void loadCloudExercises(plan.id)}>הצגת תרגילים</button>
        {plan.coach_id === userId && <button type="button" className="outline-button" disabled={cloningPlanId !== null}
          onClick={() => void cloneCloudPlan(plan.id)}>
          {cloningPlanId === plan.id ? 'יוצר גרסה…' : 'יצירת גרסת טיוטה'}
        </button>}
        {selectedCloudPlan === plan.id && <div>
          {cloudExercises.length === 0 ? <p>אין תרגילים בתוכנית זו.</p> :
            <ul>{cloudExercises.map(exercise => <li key={exercise.id}>
              {exercise.day_label} · {exercise.exercise_key} · {exercise.sets} סטים × {exercise.target_reps} חזרות
              {exercise.target_load !== null ? ` · ${exercise.target_load} ק״ג` : ''}
              { ` · ${exercise.effort_mode} ${exercise.target_effort}` }
            </li>)}</ul>}
        </div>}
      </article>)}
    </section>}
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
