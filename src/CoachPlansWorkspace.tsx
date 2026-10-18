import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Plan = { id: string; athlete_id: string; title: string; version: number; status: string };
export default function CoachPlansWorkspace({ client }: { client: SupabaseClient }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function refresh() {
    setError('');
    const { data, error: queryError } = await client.from('dc_training_plans')
      .select('id,athlete_id,title,version,status').order('created_at', { ascending: false });
    if (queryError) { setError('טעינת התוכניות נכשלה.'); return; }
    setPlans((data ?? []) as Plan[]);
  }
  useEffect(() => { void refresh(); }, [client]);
  async function clone(planId: string) {
    if (busy || !window.confirm('ליצור גרסת טיוטה חדשה מהתוכנית הזו?')) return;
    setBusy(true); setError(''); setNotice('');
    const { data, error: rpcError } = await client.rpc('dc_clone_training_plan', { p_source_plan_id: planId });
    setBusy(false);
    if (rpcError) { setError('לא ניתן ליצור גרסה חדשה. ודא שהשיוך למתאמן פעיל.'); return; }
    setNotice('נוצרה טיוטה חדשה. מזהה תוכנית: ' + String(data));
    await refresh();
  }
  return <section className="hero-card" dir="rtl" aria-label="ניהול תוכניות אימון">
    <h2>תוכניות אימון</h2>
    <p>מאמנים רואים רק תוכניות של מתאמנים המשויכים אליהם, בהתאם להרשאות השרת.</p>
    <button className="outline-button" type="button" disabled={busy} onClick={() => void refresh()}>רענון תוכניות</button>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {plans.length === 0 && <p>אין תוכניות זמינות לחשבון זה.</p>}
    {plans.map(plan => <article key={plan.id}>
      <h3>{plan.title} · גרסה {plan.version}</h3>
      <p>מצב: {plan.status} · מתאמן: {plan.athlete_id}</p>
      <button className="outline-button" type="button" disabled={busy}
        onClick={() => void clone(plan.id)}>יצירת גרסה חדשה</button>
    </article>)}
  </section>;
}
