import React, { useMemo, useState } from 'react';
import { AthleteProfile, EffortMode, estimateE1RM, suggestedNextLoad } from './domain';

type LibraryExercise = { id: string; name: string; region: string; pattern: string };
type PlannedExercise = LibraryExercise & { day: string; sets: number; reps: number; load: number; targetEffort: number };
type LoggedSet = { exerciseId: string; setNumber: number; load: number; reps: number; effort: number };

const library: LibraryExercise[] = [
  { id: 'leg-press', name: 'Leg Press', region: 'Lower body', pattern: 'Knee dominant' },
  { id: 'rdl', name: 'Romanian Deadlift', region: 'Lower body', pattern: 'Hip hinge' },
  { id: 'split-squat', name: 'Split Squat', region: 'Lower body', pattern: 'Single-leg' },
  { id: 'leg-curl', name: 'Seated Leg Curl', region: 'Lower body', pattern: 'Knee flexion' },
  { id: 'calf-raise', name: 'Standing Calf Raise', region: 'Lower body', pattern: 'Plantar flexion' },
  { id: 'bench', name: 'Bench Press', region: 'Chest', pattern: 'Horizontal push' },
  { id: 'incline-db', name: 'Incline Dumbbell Press', region: 'Chest', pattern: 'Incline push' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', region: 'Back', pattern: 'Vertical pull' },
  { id: 'row', name: 'Chest Supported Row', region: 'Back', pattern: 'Horizontal pull' },
  { id: 'shoulder-press', name: 'Machine Shoulder Press', region: 'Shoulders', pattern: 'Vertical push' },
  { id: 'lateral-raise', name: 'Cable Lateral Raise', region: 'Shoulders', pattern: 'Abduction' },
  { id: 'curl', name: 'Cable Curl', region: 'Arms', pattern: 'Elbow flexion' },
  { id: 'pushdown', name: 'Triceps Pushdown', region: 'Arms', pattern: 'Elbow extension' },
  { id: 'pallof', name: 'Pallof Press', region: 'Core', pattern: 'Anti-rotation' },
];

const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4'];

const defaultPlan: PlannedExercise[] = [
  { ...library[0], day: 'Day 1', sets: 3, reps: 8, load: 80, targetEffort: 8 },
  { ...library[1], day: 'Day 1', sets: 3, reps: 8, load: 60, targetEffort: 8 },
];

export default function TrainingWorkspace({ profile, setProfile }: { profile: AthleteProfile; setProfile: React.Dispatch<React.SetStateAction<AthleteProfile>> }) {
  const [view, setView] = useState<'coach' | 'trainee'>('coach');
  const [day, setDay] = useState('Day 1');
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [plan, setPlan] = useState<PlannedExercise[]>(defaultPlan);
  const [logs, setLogs] = useState<LoggedSet[]>([]);

  const regions = ['All', ...Array.from(new Set(library.map((e) => e.region)))];
  const filtered = useMemo(() => library.filter((e) => (region === 'All' || e.region === region) && e.name.toLowerCase().includes(query.toLowerCase())), [region, query]);
  const dayPlan = plan.filter((e) => e.day === day);

  const addExercise = (exercise: LibraryExercise) => {
    if (plan.some((p) => p.id === exercise.id && p.day === day)) return;
    setPlan((p) => [...p, { ...exercise, day, sets: 3, reps: 10, load: 0, targetEffort: profile.trainingMode === 'RPE' ? 8 : 2 }]);
  };

  const patchExercise = (id: string, patch: Partial<PlannedExercise>) => setPlan((p) => p.map((e) => e.id === id && e.day === day ? { ...e, ...patch } : e));
  const removeExercise = (id: string) => setPlan((p) => p.filter((e) => !(e.id === id && e.day === day)));
  const changeMode = (mode: EffortMode) => setProfile((p) => ({ ...p, trainingMode: mode }));

  return <div className="training-workspace">
    <section className="module-card training-header">
      <div><p className="eyebrow">TRAINING SYSTEM</p><h2>{view === 'coach' ? 'Coach Workout Builder' : 'Trainee Workout'}</h2><p>{view === 'coach' ? 'Nadav selects exercises, assigns them to a day, and only then configures sets, reps, load and target effort.' : 'The trainee sees only the assigned program and logs actual performance.'}</p></div>
      <div className="builder-toolbar"><button className={view === 'coach' ? 'choice selected' : 'choice'} onClick={() => setView('coach')}>Coach view</button><button className={view === 'trainee' ? 'choice selected' : 'choice'} onClick={() => setView('trainee')}>Trainee view</button></div>
    </section>

    <section className="card training-controls">
      <div className="day-tabs">{days.map((d) => <button key={d} className={day === d ? 'region-button selected' : 'region-button'} onClick={() => setDay(d)}>{d}</button>)}</div>
      <div className="mode-switch compact-switch"><button className={profile.trainingMode === 'RPE' ? 'choice selected' : 'choice'} onClick={() => changeMode('RPE')}>RPE</button><button className={profile.trainingMode === 'RIR' ? 'choice selected' : 'choice'} onClick={() => changeMode('RIR')}>RIR</button></div>
    </section>

    {view === 'coach' ? <div className="builder-grid">
      <section className="card library-panel">
        <div className="panel-title"><div><p className="eyebrow">EXERCISE LIBRARY</p><h3>Add exercises</h3></div><span>{filtered.length} exercises</span></div>
        <input className="library-search" placeholder="Search exercise" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="filter-row">{regions.map((r) => <button key={r} className={region === r ? 'filter-chip active' : 'filter-chip'} onClick={() => setRegion(r)}>{r}</button>)}</div>
        <div className="exercise-library-list">{filtered.map((exercise) => {
          const selected = plan.some((p) => p.id === exercise.id && p.day === day);
          return <div className="library-row" key={exercise.id}><div><strong>{exercise.name}</strong><span>{exercise.region} · {exercise.pattern}</span></div><button className={selected ? 'add-button added' : 'add-button'} onClick={() => addExercise(exercise)}>{selected ? '✓' : '+'}</button></div>;
        })}</div>
      </section>

      <section className="card plan-panel">
        <div className="panel-title"><div><p className="eyebrow">{day.toUpperCase()}</p><h3>Selected exercises</h3></div><span>{dayPlan.length} selected</span></div>
        {dayPlan.length === 0 && <div className="empty-state">Use the + button in the library to assign exercises to this workout day.</div>}
        <div className="plan-list">{dayPlan.map((exercise, index) => <div className="plan-exercise" key={exercise.id}><div className="plan-exercise-head"><div><span className="exercise-index">{index + 1}</span><strong>{exercise.name}</strong><small>{exercise.pattern}</small></div><button className="remove-button" onClick={() => removeExercise(exercise.id)}>Remove</button></div><div className="prescription-grid"><label>Sets<input type="number" min="1" value={exercise.sets} onChange={(e) => patchExercise(exercise.id, { sets: Number(e.target.value) })} /></label><label>Reps<input type="number" min="1" value={exercise.reps} onChange={(e) => patchExercise(exercise.id, { reps: Number(e.target.value) })} /></label><label>Starting load<input type="number" min="0" step="0.5" value={exercise.load} onChange={(e) => patchExercise(exercise.id, { load: Number(e.target.value) })} /></label><label>Target {profile.trainingMode}<input type="number" min="0" max="10" step="0.5" value={exercise.targetEffort} onChange={(e) => patchExercise(exercise.id, { targetEffort: Number(e.target.value) })} /></label></div><div className="substitution-note">Coach-approved substitutions: next implementation will let Nadav pre-approve alternatives per exercise.</div></div>)}</div>
        <div className="builder-save"><button className="primary-button">Save & assign {day}</button><small>Prototype state is local for now; backend persistence is the next data-layer step.</small></div>
      </section>
    </div> : <TraineeSession day={day} plan={dayPlan} mode={profile.trainingMode} logs={logs} setLogs={setLogs} />}
  </div>;
}

function TraineeSession({ day, plan, mode, logs, setLogs }: { day: string; plan: PlannedExercise[]; mode: EffortMode; logs: LoggedSet[]; setLogs: React.Dispatch<React.SetStateAction<LoggedSet[]>> }) {
  const updateLog = (exerciseId: string, setNumber: number, patch: Partial<LoggedSet>, defaults: LoggedSet) => {
    setLogs((current) => {
      const exists = current.some((l) => l.exerciseId === exerciseId && l.setNumber === setNumber);
      if (!exists) return [...current, { ...defaults, ...patch }];
      return current.map((l) => l.exerciseId === exerciseId && l.setNumber === setNumber ? { ...l, ...patch } : l);
    });
  };
  const getLog = (exercise: PlannedExercise, setNumber: number): LoggedSet => logs.find((l) => l.exerciseId === exercise.id && l.setNumber === setNumber) || { exerciseId: exercise.id, setNumber, load: exercise.load, reps: exercise.reps, effort: exercise.targetEffort };

  return <section className="module-card trainee-session"><p className="eyebrow">ASSIGNED PROGRAM</p><h2>{day}</h2><div className="permission-note">You can log your performance. Exercise selection and substitutions remain controlled by the coach.</div>{plan.length === 0 && <div className="empty-state">No exercises assigned to this day yet.</div>}<div className="session-exercises">{plan.map((exercise) => <div className="exercise-card session-card" key={exercise.id}><div className="session-title"><div><h3>{exercise.name}</h3><small>{exercise.sets} × {exercise.reps} · Target {mode} {exercise.targetEffort}</small></div><button className="outline-button" disabled>Request substitution</button></div><div className="set-table"><div className="set-row set-head"><span>Set</span><span>Load</span><span>Reps</span><span>{mode}</span><span>e1RM</span><span>Next set</span></div>{Array.from({ length: exercise.sets }, (_, i) => i + 1).map((setNumber) => {
          const log = getLog(exercise, setNumber);
          const e1rm = estimateE1RM({ load: log.load, reps: log.reps, effort: log.effort }, mode);
          const next = suggestedNextLoad({ load: log.load, reps: log.reps, effort: log.effort }, exercise.targetEffort, mode);
          return <div className="set-row" key={setNumber}><strong>{setNumber}</strong><input type="number" step="0.5" value={log.load} onChange={(e) => updateLog(exercise.id, setNumber, { load: Number(e.target.value) }, log)} /><input type="number" value={log.reps} onChange={(e) => updateLog(exercise.id, setNumber, { reps: Number(e.target.value) }, log)} /><input type="number" step="0.5" value={log.effort} onChange={(e) => updateLog(exercise.id, setNumber, { effort: Number(e.target.value) }, log)} /><strong>{e1rm || '—'}</strong><span>{next}</span></div>;
        })}</div></div>)}</div></section>;
}
