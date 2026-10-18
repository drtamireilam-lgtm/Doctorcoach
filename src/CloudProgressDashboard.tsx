import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { estimateE1RM } from './domain';
import type { EditorExercise } from './platform/cloud-training';

type Session = { id: string; started_at: string; completed_at: string | null };
type SetRow = { session_id: string; exercise_id: string; load_kg: number; reps: number; effort: number; effort_mode: string };
type Point = { date: string; load: number; e1rm: number };
function Trend({ values, label }: { values: number[]; label: string }) {
  if (!values.length) return null;
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, 1);
  const points = values.map((value, i) => `${values.length === 1 ? 50 : 5 + 90 * i / (values.length - 1)},${90 - 80 * (value - min) / span}`).join(' ');
  return <svg role="img" aria-label={label} viewBox="0 0 100 100" width="100%" height="125" preserveAspectRatio="none">
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    {values.length === 1 && <circle cx="50" cy="90" r="2" fill="currentColor" />}
  </svg>;
}
export default function CloudProgressDashboard({ client, planId, exercises }: {
  client: SupabaseClient; planId: string; exercises: EditorExercise[];
}) {
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [exerciseId, setExerciseId] = useState('');
  async function refresh() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const sessionResult = await client.from('dc_workout_sessions')
        .select('id,started_at,completed_at').eq('plan_id', planId)
        .order('started_at', { ascending: false }).limit(100);
      if (sessionResult.error) throw sessionResult.error;
      const rows = (sessionResult.data ?? []) as Session[];
      if (!rows.length) { setSessions([]); setSets([]); setLoaded(true); return; }
      const setResult = await client.from('dc_workout_sets')
        .select('session_id,exercise_id,load_kg,reps,effort,effort_mode')
        .in('session_id', rows.map(row => row.id)).limit(1000);
      if (setResult.error) throw setResult.error;
      setSessions(rows); setSets((setResult.data ?? []) as SetRow[]); setLoaded(true);
    } catch { setError('לא ניתן לטעון נתוני התקדמות מהענן.'); }
    finally { setLoading(false); }
  }
  const finished = sessions.filter(session => session.completed_at !== null);
  const selected = exercises.find(exercise => exercise.cloudId === exerciseId);
  const bySession = new Map(sessions.map(session => [session.id, session]));
  const points: Point[] = Array.from(
    sets.filter(set => set.exercise_id === exerciseId && bySession.has(set.session_id))
      .reduce((map, set) => {
        const date = bySession.get(set.session_id)!.started_at;
        const key = set.session_id;
        const previous = map.get(key);
        const e1rm = estimateE1RM({ load: set.load_kg, reps: set.reps, effort: set.effort }, set.effort_mode === 'RIR' ? 'RIR' : 'RPE');
        map.set(key, { date, load: Math.max(previous?.load ?? 0, set.load_kg), e1rm: Math.max(previous?.e1rm ?? 0, e1rm) });
        return map;
      }, new Map<string, Point>()).values()
  ).sort((a, b) => a.date.localeCompare(b.date));
  const totalVolume = sets.reduce((sum, set) => sum + set.load_kg * set.reps, 0);
  return <section aria-label="התקדמות באימונים">
    <h4>התקדמות באימונים</h4>
    <button type="button" disabled={loading} onClick={() => void refresh()}>{loading ? 'טוען…' : 'רענון נתוני התקדמות'}</button>
    {error && <p role="alert">{error}</p>}
    {loaded && <>
      <p>אימונים שהושלמו: {finished.length} · סטים שנרשמו: {sets.length} · נפח אימון מצטבר: {totalVolume.toFixed(1)} ק״ג × חזרות</p>
      <p>הנתונים מבוססים על עד 100 אימונים אחרונים ועד 1,000 סטים בתוכנית זו. אם יש יותר רשומות, הסיכום חלקי.</p>
      <label>תרגיל למעקב <select value={exerciseId} onChange={event => setExerciseId(event.target.value)}>
        <option value="">בחר תרגיל</option>
        {exercises.map(exercise => <option key={exercise.cloudId} value={exercise.cloudId}>{exercise.name} · {exercise.day}</option>)}
      </select></label>
      {selected && (points.length === 0 ? <p>עדיין אין סטים שמורים לתרגיל זה.</p> : <div>
        <p>{selected.name} — {points.length} אימונים עם נתונים</p>
        <strong>e1RM משוער לפי אימון (ק״ג)</strong>
        <Trend values={points.map(point => point.e1rm)} label="מגמת e1RM לפי סדר האימונים" />
        <strong>משקל עבודה מרבי לפי אימון (ק״ג)</strong>
        <Trend values={points.map(point => point.load)} label="מגמת משקל עבודה לפי סדר האימונים" />
        <ol>{points.map((point, index) => <li key={index}>{new Date(point.date).toLocaleDateString('he-IL')} · משקל {point.load} ק״ג · e1RM {point.e1rm.toFixed(1)} ק״ג</li>)}</ol>
      </div>)}
      {sessions.length === 0 && <p>עדיין אין אימונים שמורים בתוכנית.</p>}
    </>}
  </section>;
}
