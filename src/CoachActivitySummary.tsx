import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Plan = { id: string; athlete_id: string; coach_id: string | null };
type Session = { id: string; athlete_id: string; started_at: string; completed_at: string | null };
export default function CoachActivitySummary({ client, plans, coachId }: { client: SupabaseClient; plans: Plan[]; coachId: string }) {
  const [rows, setRows] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const owned = plans.filter(plan => plan.coach_id === coachId);
  const athletes = [...new Set(owned.map(plan => plan.athlete_id))];
  async function refresh() {
    if (busy || !owned.length) return;
    setBusy(true); setError('');
    try {
      const result = await client.from('dc_workout_sessions').select('id,athlete_id,started_at,completed_at')
        .in('plan_id', owned.map(plan => plan.id)).order('started_at', { ascending: false }).limit(500);
      if (result.error) throw result.error;
      setRows((result.data ?? []) as Session[]); setLoaded(true);
    } catch { setError('לא ניתן לטעון פעילות אימונים.'); }
    finally { setBusy(false); }
  }
  if (!owned.length) return null;
  return <section aria-label="פעילות מתאמני המאמן">
    <h3>פעילות המתאמנים</h3>
    <button type="button" disabled={busy} onClick={() => void refresh()}>{busy ? 'טוען…' : 'טעינת סיכום פעילות'}</button>
    {error && <p role="alert">{error}</p>}
    {loaded && <><p>הסיכום מוגבל ל־500 רשומות האימון האחרונות בתוכניות המשויכות.{rows.length === 500 ? ' הגעת למגבלה, ולכן ייתכן שחסרים אימונים ישנים.' : ''}</p>
      <ul>{athletes.map(id => {
        const athleteRows = rows.filter(row => row.athlete_id === id);
        const finished = athleteRows.filter(row => row.completed_at !== null);
        return <li key={id}>מתאמן {id.slice(0, 8)}… · {finished.length} אימונים שהושלמו · אימון אחרון: {athleteRows.length ? new Date(athleteRows[0].started_at).toLocaleDateString('he-IL') : 'אין נתונים'}</li>;
      })}</ul>
    </>}
  </section>;
}
