import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EditorExercise } from './platform/cloud-training';
import { startCloudWorkout, logCloudWorkoutSet, finishCloudWorkout } from './platform/cloud-workouts';

export default function CloudWorkoutSession({ client, planId, exercises }: {
  client: SupabaseClient; planId: string; exercises: EditorExercise[];
}) {
  const [day, setDay] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [setNumber, setSetNumber] = useState(1);
  const [load, setLoad] = useState(0);
  const [reps, setReps] = useState(8);
  const [effort, setEffort] = useState(8);
  const [pain, setPain] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [completed, setCompleted] = useState(false);
  const days = [...new Set(exercises.map(exercise => exercise.day))];
  const dayExercises = exercises.filter(exercise => exercise.day === day);
  const selected = dayExercises.find(exercise => exercise.cloudId === selectedId);
  async function start() {
    if (!day || busy) return;
    setBusy(true); setNotice('');
    try {
      const result = await startCloudWorkout(client, planId, day);
      setSessionId(result.id); setSelectedId(''); setCompleted(false);
      setNotice('האימון התחיל ונשמר בענן.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'שגיאה'); }
    finally { setBusy(false); }
  }
  async function saveSet(event: React.FormEvent) {
    event.preventDefault();
    if (!sessionId || !selected || busy) return;
    setBusy(true); setNotice('');
    try {
      await logCloudWorkoutSet(client, {
        sessionId, exerciseId: selected.cloudId, setNumber, loadKg: load,
        reps, effort, effortMode: selected.effortMode === 'RIR' ? 'RIR' : 'RPE', pain,
      });
      setSetNumber(number => number + 1);
      setNotice('הסט נשמר בענן.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'שגיאה'); }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!sessionId || busy) return;
    setBusy(true); setNotice('');
    try {
      await finishCloudWorkout(client, sessionId);
      setCompleted(true); setNotice('האימון הסתיים ונשמר בענן.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'שגיאה'); }
    finally { setBusy(false); }
  }
  return <section aria-label="רישום אימון בענן">
    <h4>רישום אימון בענן</h4>
    <p>רישום הסטים אינו משנה את התוכנית שהמאמן הקצה.</p>
    <label>יום אימון <select value={day} disabled={Boolean(sessionId) || busy} onChange={event => setDay(event.target.value)}>
      <option value="">בחר יום</option>{days.map(value => <option key={value} value={value}>{value}</option>)}
    </select></label>
    {!sessionId && <button type="button" disabled={!day || busy} onClick={() => void start()}>התחלת אימון</button>}
    {sessionId && !completed && <>
      <form onSubmit={event => void saveSet(event)}>
        <label>תרגיל <select value={selectedId} required onChange={event => { setSelectedId(event.target.value); setSetNumber(1); }}>
          <option value="">בחר תרגיל</option>{dayExercises.map(exercise => <option key={exercise.cloudId} value={exercise.cloudId}>{exercise.name}</option>)}
        </select></label>
        <label>סט <input type="number" min="1" max="30" required value={setNumber} onChange={event => setSetNumber(Number(event.target.value))}/></label>
        <label>משקל בק״ג <input type="number" min="0" step="any" required value={load} onChange={event => setLoad(Number(event.target.value))}/></label>
        <label>חזרות <input type="number" min="0" max="100" required value={reps} onChange={event => setReps(Number(event.target.value))}/></label>
        <label>{selected?.effortMode === 'RIR' ? 'RIR' : 'RPE'} <input type="number" min="0" max="10" step="0.5" required value={effort} onChange={event => setEffort(Number(event.target.value))}/></label>
        <label>כאב 0–10 <input type="number" min="0" max="10" value={pain} onChange={event => setPain(Number(event.target.value))}/></label>
        <button type="submit" disabled={!selected || busy}>שמירת סט</button>
      </form>
      <button type="button" disabled={busy} onClick={() => void finish()}>סיום אימון</button>
    </>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
