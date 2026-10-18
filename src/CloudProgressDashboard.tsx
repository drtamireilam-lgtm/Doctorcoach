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
  const [truncated, setTruncated] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [exerciseId, setExerciseId] = useState('');
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('90');
  async function refresh() {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const sessionResult = await client.from('dc_workout_sessions')
        .select('id,started_at,completed_at').eq('plan_id', planId)
        .order('started_at', { ascending: false }).limit(100);
      if (sessionResult.error) throw sessionResult.error;
      const rows = (sessionResult.data ?? []) as Session[];
      if (!rows.length) { setSessions([]); setSets([]); setTruncated(false); setLoaded(true); return; }
      const setResult = await client.from('dc_workout_sets')
        .select('session_id,exercise_id,load_kg,reps,effort,effort_mode')
        .in('session_id', rows.map(row => row.id))
        .order('logged_at', { ascending: false }).limit(1000);
      if (setResult.error) throw setResult.error;
      setTruncated(rows.length === 100 || (setResult.data ?? []).length === 1000);
      setSessions(rows); setSets((setResult.data ?? []) as SetRow[]); setLoaded(true);
    } catch { setError('לא ניתן לטעון נתוני התקדמות מהענן.'); }
    finally { setLoading(false); }
  }
  const cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 24 * 60 * 60 * 1000;
  const visibleSessions = sessions.filter(session => new Date(session.started_at).getTime() >= cutoff);
  const visibleIds = new Set(visibleSessions.map(session => session.id));
  const visibleSets = sets.filter(set => visibleIds.has(set.session_id));
  const finished = visibleSessions.filter(session => session.completed_at !== null);
  const selected = exercises.find(exercise => exercise.cloudId === exerciseId);
  const bySession = new Map(visibleSessions.map(session => [session.id, session]));
  const points: Point[] = Array.from(
    visibleSets.filter(set => set.exercise_id === exerciseId && bySession.has(set.session_id))
      .reduce((map, set) => {
        const date = bySession.get(set.session_id)!.started_at;
        const key = set.session_id;
        const previous = map.get(key);
        const e1rm = estimateE1RM({ load: set.load_kg, reps: set.reps, effort: set.effort }, set.effort_mode === 'RIR' ? 'RIR' : 'RPE');
        map.set(key, { date, load: Math.max(previous?.load ?? 0, set.load_kg), e1rm: Math.max(previous?.e1rm ?? 0, e1rm) });
        return map;
      }, new Map<string, Point>()).values()
  ).sort((a, b) => a.date.localeCompare(b.date));
  const totalVolume = visibleSets.reduce((sum, set) => sum + set.load_kg * set.reps, 0);
  const weekly = new Map<string, { date: string; volume: number; workouts: Set<string> }>();
  for (const session of visibleSessions) {
    const date = new Date(session.started_at);
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const key = monday.toISOString().slice(0, 10);
    if (!weekly.has(key)) weekly.set(key, { date: key, volume: 0, workouts: new Set() });
    if (session.completed_at) weekly.get(key)!.workouts.add(session.id);
  }
  for (const set of visibleSets) {
    const session = bySession.get(set.session_id);
    if (!session) continue;
    const date = new Date(session.started_at);
    const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
    const key = monday.toISOString().slice(0, 10);
    const week = weekly.get(key);
    if (week) week.volume += set.load_kg * set.reps;
  }
  const weeklyRows = [...weekly.values()].sort((a, b) => a.date.localeCompare(b.date));
  return <section aria-label="התקדמות באימונים">
    <h4>התקדמות באימונים</h4>
    <button type="button" disabled={loading} onClick={() => void refresh()}>{loading ? 'טוען…' : 'רענון נתוני התקדמות'}</button>
    {error && <p role="alert">{error}</p>}
    {loaded && <>
      <label>טווח זמן <select value={period} onChange={event => setPeriod(event.target.value as '30' | '90' | 'all')}><option value="30">30 ימים</option><option value="90">90 ימים</option><option value="all">כל הנתונים שנטענו</option></select></label>
      <p>אימונים שהושלמו: {finished.length} · סטים שנרשמו: {visibleSets.length} · נפח אימון מצטבר: {totalVolume.toFixed(1)} ק״ג × חזרות</p>
      <p>הנתונים מבוססים על עד 100 אימונים אחרונים ועד 1,000 סטים בתוכנית זו.{truncated ? ' הגעת למגבלת הטעינה: ייתכן שהסיכום חלקי.' : ''}</p>
      <h5>נפח אימון שבועי</h5>
      {weeklyRows.length > 0 ? <><Trend values={weeklyRows.map(row => row.volume)} label="מגמת נפח אימון שבועי" /><ol>{weeklyRows.map(row => <li key={row.date}>שבוע {row.date} · {row.volume.toFixed(1)} ק״ג × חזרות · {row.workouts.size} אימונים שהושלמו</li>)}</ol></> : <p>אין אימונים בטווח הזמן שנבחר.</p>}
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
